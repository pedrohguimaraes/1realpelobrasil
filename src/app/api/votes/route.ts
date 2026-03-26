import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertJsonBodyWithinLimit,
  getClientIp,
  MAX_AMOUNT_CENTS,
  rateLimitVoteCreate,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { candidates, votes } from "@/lib/db/schema";
import { buildMockPixPayload } from "@/lib/pix-mock";

const postBody = z.object({
  candidateId: z.enum(["flavio", "lula", "isentao"]),
  amountCents: z
    .number()
    .int()
    .positive()
    .max(MAX_AMOUNT_CENTS, { message: "Valor acima do máximo permitido." }),
});

export async function POST(request: Request) {
  try {
    const sizeCheck = await assertJsonBodyWithinLimit(request);
    if (!sizeCheck.ok) return sizeCheck.response;

    const ip = getClientIp(request);
    const rl = rateLimitVoteCreate(ip);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const json = await request.json();
    const parsed = postBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    const { candidateId, amountCents } = parsed.data;
    const db = getDb();

    const [cand] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!cand) {
      return NextResponse.json({ error: "Candidato não encontrado" }, { status: 404 });
    }

    if (amountCents < cand.minCents) {
      return NextResponse.json(
        {
          error: "Valor abaixo do mínimo",
          minCents: cand.minCents,
        },
        { status: 400 }
      );
    }

    const { gatewayTxId, pixCopiaCola, pixQrcodeBase64 } =
      await buildMockPixPayload(amountCents);

    const [row] = await db
      .insert(votes)
      .values({
        candidateId,
        amountCents,
        status: "pending",
        gatewayTxId,
        pixCopiaCola,
        pixQrcodeBase64,
      })
      .returning({
        id: votes.id,
        gatewayTxId: votes.gatewayTxId,
        amountCents: votes.amountCents,
        candidateId: votes.candidateId,
        pixCopiaCola: votes.pixCopiaCola,
        pixQrcodeBase64: votes.pixQrcodeBase64,
      });

    return NextResponse.json({
      voteId: row.id,
      gatewayTxId: row.gatewayTxId,
      amountCents: row.amountCents,
      candidateId: row.candidateId,
      pixCopiaCola: row.pixCopiaCola,
      pixQrcodeBase64: row.pixQrcodeBase64,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao criar voto." },
      { status: 503 }
    );
  }
}
