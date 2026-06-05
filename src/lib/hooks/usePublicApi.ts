import useSWR from "swr";
import type { ApiCandidate, ApiStats } from "@/lib/types/api";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (!text) {
    throw new Error(`Resposta vazia de ${url}`);
  }
  return JSON.parse(text) as T;
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
