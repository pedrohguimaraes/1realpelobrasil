"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Ticker } from "./Ticker";
import { useVoteFlow } from "./VoteFlowContext";
import { useCandidates, useStats } from "@/lib/hooks/usePublicApi";
import type { ApiCandidate, CandidateId } from "@/lib/types/api";

/** Fallback visual quando a API não responde (sem DATABASE_URL, etc.). */
const FALLBACK = {
  totalVotes: 12_340,
  flavio: { votes: 5_610, pct: 45.4 },
  isentao: { votes: 1_200, pct: 9.7 },
  lula: { votes: 5_530, pct: 44.9 },
} as const;

function fmtVotes(n: number) {
  return n.toLocaleString("pt-BR");
}

function pctPart(votes: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((votes / total) * 1000) / 10;
}

function pickCandidate(
  list: ApiCandidate[] | undefined,
  id: CandidateId
): ApiCandidate | undefined {
  return list?.find((c) => c.id === id);
}

export function HeroSection() {
  const { openVoteFlow } = useVoteFlow();
  const [showIsentao, setShowIsentao] = useState(false);
  const {
    data: candidates,
    error: candidatesError,
    isLoading: candidatesLoading,
  } = useCandidates();
  const { data: stats, error: statsError, isLoading: statsLoading } = useStats();

  const apiDown = Boolean(candidatesError || statsError);
  const loading = !apiDown && (candidatesLoading || statsLoading);
  const hasApiData = Boolean(
    candidates && candidates.length > 0 && stats != null
  );

  const totalVotes = stats?.totalVotes ?? 0;

  const row = useMemo(() => {
    if (!hasApiData) {
      return {
        flavio: { votes: FALLBACK.flavio.votes, pct: FALLBACK.flavio.pct },
        isentao: { votes: FALLBACK.isentao.votes, pct: FALLBACK.isentao.pct },
        lula: { votes: FALLBACK.lula.votes, pct: FALLBACK.lula.pct },
      };
    }
    const f = pickCandidate(candidates, "flavio");
    const i = pickCandidate(candidates, "isentao");
    const l = pickCandidate(candidates, "lula");
    const fv = f?.totalVotes ?? 0;
    const iv = i?.totalVotes ?? 0;
    const lv = l?.totalVotes ?? 0;
    const tv = stats?.totalVotes ?? fv + iv + lv;
    return {
      flavio: { votes: fv, pct: pctPart(fv, tv) },
      isentao: { votes: iv, pct: pctPart(iv, tv) },
      lula: { votes: lv, pct: pctPart(lv, tv) },
    };
  }, [hasApiData, candidates, stats]);

  const displayTotal = hasApiData ? totalVotes : FALLBACK.totalVotes;

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-red-100 via-white to-blue-100">
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-red-200/50 blur-[80px] hidden sm:block" />
      <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-amber-200/40 blur-[80px] hidden sm:block" />
      <div className="absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-blue-200/50 blur-[80px] hidden sm:block" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 pt-10 pb-6 sm:px-4">

        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="viral-badge mb-4 rounded-full border-2 border-emerald-400 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-600 shadow-sm"
        >
          O Brasil inteiro está votando
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="text-center text-[2rem] font-black leading-[1.1] sm:text-5xl"
        >
          <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
            Aqui até brigando
          </span>
          <br />
          <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
            você faz o bem.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.27 }}
          className="mt-4 mb-5 max-w-sm text-center text-base font-bold text-slate-600 leading-snug sm:text-lg px-1"
        >
          Vote, opine e transforme sua opinião em{" "}
          <span className="text-emerald-600">
            alimentos e utensílios levados para quem precisa.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.42 }}
          className="w-full max-w-xl"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-xl ring-[3px] ring-blue-400/60">
                <Image
                  src="/flavio-bolsonaro.jpg"
                  alt="Flávio Bolsonaro"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 44vw, 240px"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pb-2 pt-8 px-2">
                  <p className="text-center text-[11px] font-bold text-white sm:text-xs">
                    Flávio Bolsonaro
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-white shadow-md sm:h-11 sm:w-11 sm:text-sm">
                VS
              </span>
            </div>

            <div className="flex-1">
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-xl ring-[3px] ring-red-400/60">
                <Image
                  src="/lula.jpg"
                  alt="Lula"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 44vw, 240px"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pb-2 pt-8 px-2">
                  <p className="text-center text-[11px] font-bold text-white sm:text-xs">
                    Lula
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2 sm:gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-600">{fmtVotes(row.flavio.votes)} votos</span>
                <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                  {row.flavio.pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="bar-shimmer h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                  style={{ width: `${Math.max(row.flavio.pct, 3)}%` }}
                />
              </div>
              <p className="text-center text-[9px] font-semibold text-blue-500/80 leading-tight">
                {pickCandidate(candidates, "flavio")?.provocation ??
                  "Se a direita não vota, quem defende os seus valores?"}
              </p>
              <button
                type="button"
                onClick={() => openVoteFlow("flavio")}
                className="w-full rounded-xl border-2 border-blue-500 bg-white py-3 text-sm font-black text-blue-600 shadow-md shadow-blue-500/15 transition-transform active:scale-95"
              >
                Votar
              </button>
            </div>

            <div className="shrink-0 w-9 sm:w-11" />

            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-600">{fmtVotes(row.lula.votes)} votos</span>
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                  {row.lula.pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="bar-shimmer h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  style={{ width: `${Math.max(row.lula.pct, 3)}%` }}
                />
              </div>
              <p className="text-center text-[9px] font-semibold text-red-500/80 leading-tight">
                {pickCandidate(candidates, "lula")?.provocation ??
                  "Se a esquerda não vota, quem ajuda quem mais precisa?"}
              </p>
              <button
                type="button"
                onClick={() => openVoteFlow("lula")}
                className="w-full rounded-xl border-2 border-red-500 bg-white py-3 text-sm font-black text-red-600 shadow-md shadow-red-500/15 transition-transform active:scale-95"
              >
                Votar
              </button>
            </div>
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              {!showIsentao ? (
                <motion.button
                  key="cta-isentao"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  type="button"
                  onClick={() => setShowIsentao(true)}
                  className="w-full rounded-xl border-2 border-amber-500 bg-white py-3 text-sm font-black text-amber-700 shadow-md shadow-amber-500/15 transition-transform active:scale-95"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-0.5">
                    Terceira via — vote também
                  </span>
                  Os dois erram, mas eu ajudo
                </motion.button>
              ) : (
                <motion.div
                  key="card-isentao"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50 to-white p-3 shadow-lg sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl ring-[3px] ring-amber-400/70 shadow-lg sm:h-28 sm:w-24">
                        <Image
                          src="/luciano-huck.png"
                          alt="Nenhum dos dois — o isentão"
                          fill
                          className="object-cover object-top"
                          sizes="96px"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 sm:text-base">Nenhum dos dois</p>
                        <p className="text-[10px] font-semibold text-amber-600 sm:text-xs">
                          {pickCandidate(candidates, "isentao")?.provocation ??
                            "O isentão também ajuda. Mas sem opinião."}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-700">
                            {fmtVotes(row.isentao.votes)} votos
                          </span>
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                            {row.isentao.pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="bar-shimmer h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.3)]"
                            style={{ width: `${Math.max(row.isentao.pct, 8)}%` }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => openVoteFlow("isentao")}
                          className="mt-2.5 w-full rounded-xl border-2 border-amber-500 bg-white py-2.5 text-xs font-black text-amber-700 shadow-md shadow-amber-500/15 transition-transform active:scale-95 sm:py-3 sm:text-sm"
                        >
                          Desde R$0,50
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-4 flex flex-col items-center gap-2"
        >
          <p className="text-[10px] text-slate-400 font-medium">
            {loading ? (
              <span className="inline-block h-3 w-24 animate-pulse rounded bg-slate-200 align-middle" />
            ) : (
              <>
                {fmtVotes(displayTotal)} votos no total • atualizado agora
              </>
            )}
            {apiDown && (
              <span className="block text-[9px] text-amber-600 font-semibold mt-0.5">
                (dados de exemplo — API indisponível)
              </span>
            )}
            {loading && (
              <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
                Carregando placar…
              </span>
            )}
          </p>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">
            <p className="text-center text-[11px] font-semibold text-slate-600">
              R$1 via Pix • 100% anônimo • compra + entrega na Cáritas
            </p>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10">
        <Ticker />
      </div>
    </section>
  );
}
