import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientIp,
  rateLimitVotePoll,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { votes } from "@/lib/db/schema";

const uuidParam = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = rateLimitVotePoll(ip);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const { id } = await context.params;
    const parsed = uuidParam.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = getDb();
    const [row] = await db
      .select({
        id: votes.id,
        status: votes.status,
        candidateId: votes.candidateId,
        amountCents: votes.amountCents,
        gatewayTxId: votes.gatewayTxId,
        paidAt: votes.paidAt,
      })
      .from(votes)
      .where(eq(votes.id, parsed.data))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Voto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      status: row.status,
      candidateId: row.candidateId,
      amountCents: row.amountCents,
      gatewayTxId: row.gatewayTxId,
      paidAt: row.paidAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao consultar voto." }, { status: 503 });
  }
}
