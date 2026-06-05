import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertJsonBodyWithinLimit,
  compareSecretConstantTime,
  isProduction,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import {
  markVotePaidByGatewayTxId,
  markVotePaidById,
} from "@/lib/db/vote-status";
import { webhookEvents } from "@/lib/db/schema";
import {
  checkAbacatePayPixStatus,
  getAbacatePayWebhookSecret,
  isAbacatePayGateway,
  isAbacatePayPaidStatus,
  parseAbacatePayTransparentWebhook,
  shouldRequireAbacatePayWebhookSignature,
  simulateAbacatePayPixPayment,
  verifyAbacatePayWebhookSignature,
} from "@/lib/pix-gateway";

const bodySchema = z.object({
  gatewayTxId: z.string().min(1),
});

const uuidSchema = z.string().uuid();

function payloadAsRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return { payload };
}

function receivedWebhookSecret(request: Request): string | null {
  const url = new URL(request.url);
  return (
    url.searchParams.get("webhookSecret") ??
    request.headers.get("x-webhook-secret")
  );
}

/**
 * A rota de simulação (corpo { gatewayTxId }) só pode marcar votos como pagos
 * sem pagamento real. Em produção fica desligada por padrão; só liga com a
 * flag explícita — espelha o comportamento do botão no front.
 */
function isPixSimulationEnabled(): boolean {
  if (!isProduction()) return true;
  return process.env.NEXT_PUBLIC_ENABLE_PIX_SIMULATION?.trim() === "true";
}

function ensureWebhookSecret(request: Request): NextResponse | null {
  const secret = getAbacatePayWebhookSecret();
  if (isProduction() && !secret?.trim()) {
    return NextResponse.json(
      { error: "Webhook não configurado." },
      { status: 503 }
    );
  }

  if (secret?.trim()) {
    const received = receivedWebhookSecret(request);
    if (!compareSecretConstantTime(received, secret)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  return null;
}

function ensureAbacatePaySignature(
  request: Request,
  rawBody: string
): NextResponse | null {
  if (!shouldRequireAbacatePayWebhookSignature()) return null;

  const signature = request.headers.get("x-webhook-signature");
  if (!verifyAbacatePayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  return null;
}

async function recordWebhookEvent(gatewayTxId: string, payload: unknown) {
  const db = getDb();
  await db.insert(webhookEvents).values({
    gatewayTxId,
    payload: payloadAsRecord(payload),
  });
}

export async function POST(request: Request) {
  try {
    const sizeCheck = await assertJsonBodyWithinLimit(request, 65_536);
    if (!sizeCheck.ok) return sizeCheck.response;

    const rawBody = await request.text();
    let json: unknown;
    try {
      json = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const mockPayload = bodySchema.safeParse(json);
    if (mockPayload.success) {
      if (!isPixSimulationEnabled()) {
        return NextResponse.json(
          { error: "Simulação de pagamento desativada." },
          { status: 403 }
        );
      }

      const { gatewayTxId } = mockPayload.data;
      // Exige segredo em qualquer ambiente quando ele estiver configurado.
      const secretError = ensureWebhookSecret(request);
      if (secretError) return secretError;

      await recordWebhookEvent(gatewayTxId, json);

      if (isAbacatePayGateway()) {
        await simulateAbacatePayPixPayment(gatewayTxId);
        const gatewayStatus = await checkAbacatePayPixStatus(gatewayTxId);
        if (gatewayStatus !== "paid") {
          return NextResponse.json({ ok: true, status: gatewayStatus });
        }
      }

      const result = await markVotePaidByGatewayTxId(gatewayTxId);
      if (!result.found) {
        return NextResponse.json({ error: "Voto não encontrado" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, duplicate: result.duplicate });
    }

    const secretError = ensureWebhookSecret(request);
    if (secretError) return secretError;

    const signatureError = ensureAbacatePaySignature(request, rawBody);
    if (signatureError) return signatureError;

    const webhook = parseAbacatePayTransparentWebhook(json);
    if (!webhook) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    await recordWebhookEvent(webhook.gatewayTxId, json);

    const isPaidEvent =
      webhook.event === "transparent.completed" ||
      webhook.event === "billing.paid";

    if (!isPaidEvent || !isAbacatePayPaidStatus(webhook.status)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const externalVoteId = uuidSchema.safeParse(webhook.externalId).success
      ? webhook.externalId
      : null;
    const result = externalVoteId
      ? await markVotePaidById(externalVoteId, webhook.paidAt ?? new Date())
      : await markVotePaidByGatewayTxId(
          webhook.gatewayTxId,
          webhook.paidAt ?? new Date()
        );

    if (!result.found) {
      return NextResponse.json({ error: "Voto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}
