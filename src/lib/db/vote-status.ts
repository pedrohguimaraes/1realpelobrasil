import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from ".";
import { statsCache, votes } from "./schema";

type VoteStatusSnapshot = {
  id: string;
  candidateId: string;
  amountCents: number;
  status: string;
  paidAt: Date | null;
};

type MarkVotePaidResult =
  | { found: false }
  | { found: true; duplicate: boolean; vote: VoteStatusSnapshot };

export async function markVotePaidById(
  voteId: string,
  paidAt = new Date()
): Promise<MarkVotePaidResult> {
  const db = getDb();
  const [vote] = await db
    .select()
    .from(votes)
    .where(eq(votes.id, voteId))
    .limit(1);

  if (!vote) return { found: false };
  if (vote.status === "paid") {
    return {
      found: true,
      duplicate: true,
      vote: {
        id: vote.id,
        candidateId: vote.candidateId,
        amountCents: vote.amountCents,
        status: vote.status,
        paidAt: vote.paidAt,
      },
    };
  }

  let updatedVote: VoteStatusSnapshot | null = null;
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(votes)
      .set({ status: "paid", paidAt })
      .where(and(eq(votes.id, vote.id), ne(votes.status, "paid")))
      .returning({
        id: votes.id,
        candidateId: votes.candidateId,
        amountCents: votes.amountCents,
        status: votes.status,
        paidAt: votes.paidAt,
      });

    if (!updated) return;
    updatedVote = updated;

    await tx
      .insert(statsCache)
      .values({
        candidateId: updated.candidateId,
        totalVotes: 1,
        totalCents: updated.amountCents,
        updatedAt: paidAt,
      })
      .onConflictDoUpdate({
        target: statsCache.candidateId,
        set: {
          totalVotes: sql`${statsCache.totalVotes} + 1`,
          totalCents: sql`${statsCache.totalCents} + ${updated.amountCents}`,
          updatedAt: paidAt,
        },
      });
  });

  if (!updatedVote) {
    return {
      found: true,
      duplicate: true,
      vote: {
        id: vote.id,
        candidateId: vote.candidateId,
        amountCents: vote.amountCents,
        status: "paid",
        paidAt: vote.paidAt ?? paidAt,
      },
    };
  }

  return { found: true, duplicate: false, vote: updatedVote };
}

export async function markVotePaidByGatewayTxId(
  gatewayTxId: string,
  paidAt = new Date()
): Promise<MarkVotePaidResult> {
  const db = getDb();
  const [vote] = await db
    .select({ id: votes.id })
    .from(votes)
    .where(eq(votes.gatewayTxId, gatewayTxId))
    .limit(1);

  if (!vote) return { found: false };
  return markVotePaidById(vote.id, paidAt);
}
