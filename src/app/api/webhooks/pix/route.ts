import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertJsonBodyWithinLimit,
  compareSecretConstantTime,
  isProduction,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { statsCache, votes, webhookEvents } from "@/lib/db/schema";

const bodySchema = z.object({
  gatewayTxId: z.string().uuid(),
});

/**
 * Webhook mock / futuro gateway Pix.
 * Em produção: validar assinatura do provedor (header) antes de processar.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (isProduction() && !secret?.trim()) {
      return NextResponse.json(
        { error: "Webhook não configurado." },
        { status: 503 }
      );
    }
    if (secret?.trim()) {
      const hdr = request.headers.get("x-webhook-secret");
      if (!compareSecretConstantTime(hdr, secret)) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const sizeCheck = await assertJsonBodyWithinLimit(request, 65_536);
    if (!sizeCheck.ok) return sizeCheck.response;

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const { gatewayTxId } = parsed.data;
    const db = getDb();

    await db.insert(webhookEvents).values({
      gatewayTxId,
      payload: json as Record<string, unknown>,
    });

    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.gatewayTxId, gatewayTxId))
      .limit(1);

    if (!vote) {
      return NextResponse.json({ error: "Voto não encontrado" }, { status: 404 });
    }

    if (vote.status === "paid") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const paidAt = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(votes)
        .set({ status: "paid", paidAt })
        .where(eq(votes.id, vote.id));

      await tx
        .update(statsCache)
        .set({
          totalVotes: sql`${statsCache.totalVotes} + 1`,
          totalCents: sql`${statsCache.totalCents} + ${vote.amountCents}`,
          updatedAt: paidAt,
        })
        .where(eq(statsCache.candidateId, vote.candidateId));
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}
