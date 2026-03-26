"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { mutate } from "swr";
import type { CandidateId } from "@/lib/types/api";

export type FlowStep = "idle" | "amount" | "generating" | "qrcode" | "confirming" | "confirmed";

export type VotePayment = {
  voteId: string;
  gatewayTxId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
};

/** Fallback se a API de candidatos ainda não carregou. */
export function minCentsFor(candidate: CandidateId): number {
  return candidate === "isentao" ? 50 : 100;
}

export function defaultCentsFor(candidate: CandidateId): number {
  return minCentsFor(candidate);
}

interface VoteFlowState {
  step: FlowStep;
  candidate: CandidateId | null;
  amountCents: number;
  votePayment: VotePayment | null;
  setAmountCents: (cents: number) => void;
  setVotePayment: (p: VotePayment) => void;
  openVoteFlow: (candidate: CandidateId) => void;
  confirmAmountAndContinue: () => void;
  proceedWithAmount: (cents: number, minCentsOverride?: number) => void;
  setStep: (step: FlowStep) => void;
  close: () => void;
}

const VoteFlowContext = createContext<VoteFlowState | null>(null);

export function VoteFlowProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [candidate, setCandidate] = useState<CandidateId | null>(null);
  const [amountCents, setAmountCentsState] = useState(100);
  const [votePayment, setVotePaymentState] = useState<VotePayment | null>(null);

  const setAmountCents = useCallback((cents: number) => {
    setAmountCentsState(Math.max(0, Math.round(cents)));
  }, []);

  const clearVotePayment = useCallback(() => {
    setVotePaymentState(null);
  }, []);

  const setVotePayment = useCallback((p: VotePayment) => {
    setVotePaymentState(p);
  }, []);

  const openVoteFlow = useCallback((c: CandidateId) => {
    clearVotePayment();
    setCandidate(c);
    setAmountCentsState(defaultCentsFor(c));
    setStep("amount");
  }, [clearVotePayment]);

  const confirmAmountAndContinue = useCallback(() => {
    if (!candidate) return;
    const min = minCentsFor(candidate);
    const next = Math.max(min, amountCents);
    setAmountCentsState(next);
    setStep("generating");
  }, [candidate, amountCents]);

  const proceedWithAmount = useCallback((cents: number, minCentsOverride?: number) => {
    if (!candidate) return;
    const min = minCentsOverride ?? minCentsFor(candidate);
    const next = Math.max(min, Math.round(cents));
    setAmountCentsState(next);
    setStep("generating");
  }, [candidate]);

  const close = useCallback(() => {
    setStep("idle");
    setCandidate(null);
    clearVotePayment();
    setAmountCentsState(100);
    void mutate("/api/candidates");
    void mutate("/api/stats");
  }, [clearVotePayment]);

  return (
    <VoteFlowContext.Provider
      value={{
        step,
        candidate,
        amountCents,
        votePayment,
        setAmountCents,
        setVotePayment,
        openVoteFlow,
        confirmAmountAndContinue,
        proceedWithAmount,
        setStep,
        close,
      }}
    >
      {children}
    </VoteFlowContext.Provider>
  );
}

export function useVoteFlow() {
  const ctx = useContext(VoteFlowContext);
  if (!ctx) throw new Error("useVoteFlow must be used within VoteFlowProvider");
  return ctx;
}
