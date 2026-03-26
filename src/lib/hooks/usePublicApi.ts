import useSWR from "swr";
import type { ApiCandidate, ApiStats } from "@/lib/types/api";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export function useCandidates() {
  return useSWR<ApiCandidate[]>("/api/candidates", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15_000,
  });
}

export function useStats() {
  return useSWR<ApiStats>("/api/stats", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15_000,
  });
}
