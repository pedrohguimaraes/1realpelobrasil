import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientIp,
  rateLimitVotePoll,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { markVotePaidById } from "@/lib/db/vote-status";
import { votes } from "@/lib/db/schema";
import {
  checkAbacatePayPixStatus,
  isAbacatePayGateway,
} from "@/lib/pix-gateway";

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

    let status = row.status;
    let paidAt = row.paidAt;

    if (status !== "paid" && isAbacatePayGateway()) {
      try {
        const gatewayStatus = await checkAbacatePayPixStatus(row.gatewayTxId);
        if (gatewayStatus === "paid") {
          const paid = await markVotePaidById(row.id);
          if (paid.found) {
            status = paid.vote.status;
            paidAt = paid.vote.paidAt;
          }
        } else if (gatewayStatus) {
          status = gatewayStatus;
        }
      } catch (e) {
        console.error(e);
      }
    }

    return NextResponse.json({
      id: row.id,
      status,
      candidateId: row.candidateId,
      amountCents: row.amountCents,
      gatewayTxId: row.gatewayTxId,
      paidAt: paidAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao consultar voto." }, { status: 503 });
  }
}
