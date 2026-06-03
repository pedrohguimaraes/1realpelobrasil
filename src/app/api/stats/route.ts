import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  getClientIp,
  rateLimitStatsRead,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { votes } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimitStatsRead(ip);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const db = getDb();

    const [agg] = await db
      .select({
        totalVotes: sql<number>`count(*)::int`,
        totalCents: sql<number>`coalesce(sum(${votes.amountCents}), 0)::int`,
        updatedAt: sql<string | null>`max(${votes.paidAt})::text`,
      })
      .from(votes)
      .where(eq(votes.status, "paid"));

    const byCandidate = await db
      .select({
        candidateId: votes.candidateId,
        votes: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${votes.amountCents}), 0)::int`,
      })
      .from(votes)
      .where(eq(votes.status, "paid"))
      .groupBy(votes.candidateId);

    const candidatesMap: Record<string, { votes: number; cents: number }> = {};
    for (const row of byCandidate) {
      candidatesMap[row.candidateId] = { votes: row.votes, cents: row.cents };
    }

    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const [todayRow] = await db
      .select({
        todayCents: sql<number>`coalesce(sum(${votes.amountCents}), 0)::int`,
      })
      .from(votes)
      .where(
        and(eq(votes.status, "paid"), gte(votes.paidAt, startOfDayUtc))
      );

    return NextResponse.json({
      totalVotes: agg?.totalVotes ?? 0,
      totalCents: agg?.totalCents ?? 0,
      todayCents: todayRow?.todayCents ?? 0,
      candidates: candidatesMap,
      updatedAt: agg?.updatedAt ?? new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível carregar estatísticas." },
      { status: 503 }
    );
  }
}
