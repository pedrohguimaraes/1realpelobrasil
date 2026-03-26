import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  getClientIp,
  rateLimitCandidatesRead,
  tooManyRequests,
} from "@/lib/api-security";
import { getDb } from "@/lib/db";
import { candidates, statsCache } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimitCandidatesRead(ip);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const db = getDb();
    const rows = await db
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
        totalVotes: statsCache.totalVotes,
        totalCents: statsCache.totalCents,
      })
      .from(candidates)
      .leftJoin(statsCache, eq(candidates.id, statsCache.candidateId))
      .orderBy(asc(candidates.sortOrder));

    const body = rows.map((r) => ({
      id: r.id,
      name: r.name,
      photoPath: r.photoPath,
      colorClass: r.colorClass,
      ringClass: r.ringClass,
      minCents: r.minCents,
      amountPresets: r.amountPresets ?? [],
      provocation: r.provocation,
      sortOrder: r.sortOrder,
      totalVotes: r.totalVotes ?? 0,
      totalCents: r.totalCents ?? 0,
    }));

    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível carregar candidatos. Verifique DATABASE_URL." },
      { status: 503 }
    );
  }
}
