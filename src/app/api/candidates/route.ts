import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  getClientIp,
  rateLimitCandidatesRead,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { candidates, votes } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimitCandidatesRead(ip);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const db = getDb();
    const candidateRows = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        photoPath: candidates.photoPath,
        colorClass: candidates.colorClass,
        ringClass: candidates.ringClass,
        minCents: candidates.minCents,
        amountPresets: candidates.amountPresets,
        provocation: candidates.provocation,
        sortOrder: candidates.sortOrder,
      })
      .from(candidates)
      .orderBy(asc(candidates.sortOrder));

    const voteRows = await db
      .select({
        candidateId: votes.candidateId,
        totalVotes: sql<number>`count(*)::int`,
        totalCents: sql<number>`coalesce(sum(${votes.amountCents}), 0)::int`,
      })
      .from(votes)
      .where(eq(votes.status, "paid"))
      .groupBy(votes.candidateId);

    const totalsByCandidate = new Map(
      voteRows.map((r) => [
        r.candidateId,
        { totalVotes: r.totalVotes, totalCents: r.totalCents },
      ])
    );

    const body = candidateRows.map((r) => {
      const totals = totalsByCandidate.get(r.id);
      return {
        id: r.id,
        name: r.name,
        photoPath: r.photoPath,
        colorClass: r.colorClass,
        ringClass: r.ringClass,
        minCents: r.minCents,
        amountPresets: r.amountPresets ?? [],
        provocation: r.provocation,
        sortOrder: r.sortOrder,
        totalVotes: totals?.totalVotes ?? 0,
        totalCents: totals?.totalCents ?? 0,
      };
    });

    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível carregar candidatos. Verifique DATABASE_URL." },
      { status: 503 }
    );
  }
}
