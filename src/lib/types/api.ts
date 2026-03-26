export type CandidateId = "flavio" | "lula" | "isentao";

export type ApiCandidate = {
  id: CandidateId;
  name: string;
  photoPath: string;
  colorClass: string;
  ringClass: string;
  minCents: number;
  amountPresets: number[];
  provocation: string;
  sortOrder: number;
  totalVotes: number;
  totalCents: number;
};

export type ApiStats = {
  totalVotes: number;
  totalCents: number;
  todayCents: number;
  candidates: Record<string, { votes: number; cents: number }>;
  updatedAt: string;
};
