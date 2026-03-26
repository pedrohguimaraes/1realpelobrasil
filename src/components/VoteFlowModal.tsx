"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Loader2, QrCode, X, Heart } from "lucide-react";
import Image from "next/image";
import type { CandidateId } from "@/lib/types/api";
import { useCandidates } from "@/lib/hooks/usePublicApi";
import {
  useVoteFlow,
  minCentsFor,
} from "./VoteFlowContext";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const FALLBACK_META: Record<
  CandidateId,
  { name: string; photo: string; color: string; ring: string }
> = {
  flavio: {
    name: "Flávio Bolsonaro",
    photo: "/flavio-bolsonaro.jpg",
    color: "text-blue-600",
    ring: "ring-blue-400",
  },
  lula: {
    name: "Lula",
    photo: "/lula.jpg",
    color: "text-red-600",
    ring: "ring-red-400",
  },
  isentao: {
    name: "Nenhum dos dois",
    photo: "/luciano-huck.png",
    color: "text-amber-600",
    ring: "ring-amber-400",
  },
};

const PRESETS_POLITICO = [100, 200, 500, 1000, 2000, 5000];
const PRESETS_ISENTAO = [50, 100, 200, 500, 1000, 2000, 5000];

function parseBrazilianMoney(raw: string): number {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return 0;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let normalized = t;
  if (lastComma > lastDot) {
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = t.replace(/,/g, "");
  } else if (t.includes(",")) {
    normalized = t.replace(",", ".");
  }
  const v = parseFloat(normalized);
  return Number.isNaN(v) ? 0 : v;
}

function formatInputFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function useCandidateUi(candidate: CandidateId) {
  const { data: list } = useCandidates();
  const row = list?.find((c) => c.id === candidate);
  const meta = row
    ? {
        name: row.name,
        photo: row.photoPath,
        color: row.colorClass,
        ring: row.ringClass,
      }
    : FALLBACK_META[candidate];
  const minCents = row?.minCents ?? minCentsFor(candidate);
  const presets =
    row?.amountPresets?.length ?
      row.amountPresets
    : candidate === "isentao" ?
      PRESETS_ISENTAO
    : PRESETS_POLITICO;
  return { meta, minCents, presets };
}

const stepTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

const STEPPER_ORDER = ["amount", "generating", "qrcode", "confirming", "confirmed"] as const;

function StepAmount({ candidate }: { candidate: CandidateId }) {
  const { amountCents, setAmountCents, proceedWithAmount, close } = useVoteFlow();
  const { meta, minCents, presets } = useCandidateUi(candidate);

  const [inputStr, setInputStr] = useState(() => formatInputFromCents(amountCents));

  const syncInputFromCents = (cents: number) => {
    setInputStr(formatInputFromCents(cents));
  };

  const handleContinue = () => {
    const typed = Math.round(parseBrazilianMoney(inputStr) * 100);
    proceedWithAmount(inputStr.trim() === "" ? amountCents : typed, minCents);
  };

  const parsedPreview = Math.round(parseBrazilianMoney(inputStr) * 100);
  const effectiveForLabel = Math.max(
    minCents,
    inputStr.trim() === "" ? amountCents : parsedPreview > 0 ? parsedPreview : amountCents
  );

  return (
    <motion.div
      key="amount"
      {...stepTransition}
      className="flex flex-1 flex-col px-5 pb-6 pt-2 overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-4 ${meta.ring} shadow-lg`}>
          <Image src={meta.photo} alt={meta.name} fill className="object-cover" sizes="64px" />
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">Quanto você vai contribuir?</p>
          <p className="mt-1 text-sm text-slate-500">
            Voto em <span className={`font-bold ${meta.color}`}>{meta.name}</span>
            {candidate === "isentao" && (
              <span className="block text-xs font-medium text-amber-700/90 mt-1">
                Mínimo {formatBRL(minCents)} nesta opção.
              </span>
            )}
          </p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-2">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setAmountCents(c);
                syncInputFromCents(c);
              }}
              className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition-colors active:scale-95 ${
                amountCents === c
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {formatBRL(c)}
            </button>
          ))}
        </div>

        <div className="w-full">
          <label
            htmlFor="pix-custom-amount"
            className="mb-1 block text-center text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            Outro valor (R$)
          </label>
          <input
            id="pix-custom-amount"
            inputMode="decimal"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-lg font-black text-slate-800 outline-none focus:border-emerald-400"
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
            onBlur={() => {
              const c = Math.max(0, Math.round(parseBrazilianMoney(inputStr) * 100));
              setAmountCents(c);
              setInputStr(formatInputFromCents(c));
            }}
          />
          <p className="mt-1 text-center text-[10px] text-slate-400">
            Mínimo {formatBRL(minCents)} • use vírgula ou ponto para centavos
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-4 text-base font-black text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98]"
          >
            Continuar com {formatBRL(effectiveForLabel)}
          </button>
          <button type="button" onClick={close} className="py-2 text-sm font-semibold text-slate-400">
            Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StepGenerating({
  candidate,
  amountCents,
}: {
  candidate: CandidateId;
  amountCents: number;
}) {
  const { meta } = useCandidateUi(candidate);
  return (
    <motion.div
      key="generating"
      {...stepTransition}
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6"
    >
      <div className={`relative h-20 w-20 overflow-hidden rounded-full ring-4 ${meta.ring} shadow-xl`}>
        <Image src={meta.photo} alt={meta.name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-slate-800">Gerando QR Code...</p>
        <p className="mt-1 text-sm text-slate-500">
          {formatBRL(amountCents)} para{" "}
          <span className={`font-bold ${meta.color}`}>{meta.name}</span>
        </p>
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </motion.div>
  );
}

function StepQRCode({
  candidate,
  amountCents,
}: {
  candidate: CandidateId;
  amountCents: number;
}) {
  const { setStep, votePayment } = useVoteFlow();
  const { meta } = useCandidateUi(candidate);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const brl = formatBRL(amountCents);

  const pix = votePayment?.pixCopiaCola ?? "";
  const qrB64 = votePayment?.pixQrcodeBase64 ?? "";
  const gatewayTxId = votePayment?.gatewayTxId;

  const copyPixCode = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const simulatePay = async () => {
    if (!gatewayTxId) return;
    setSimulating(true);
    try {
      await fetch("/api/webhooks/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatewayTxId }),
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <motion.div
      key="qrcode"
      {...stepTransition}
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6 overflow-y-auto pb-4"
    >
      <div className="text-center">
        <p className="text-lg font-black text-slate-800">Escaneie o QR Code</p>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-bold text-slate-700">{brl}</span> para{" "}
          <span className={`font-bold ${meta.color}`}>{meta.name}</span>
        </p>
      </div>

      {qrB64 ?
        <div className="relative mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-lg sm:h-60 sm:w-60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrB64}`}
            alt="QR Code Pix"
            className="h-full w-full object-contain"
          />
        </div>
      : <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />}

      <div className="w-full max-w-xs">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Ou copie o Pix copia e cola
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="max-h-16 overflow-y-auto break-all font-mono text-[9px] leading-relaxed text-slate-600">
            {pix || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={copyPixCode}
          disabled={!pix}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white py-3 text-sm font-black text-emerald-600 shadow-sm transition-colors active:scale-[0.98] hover:bg-emerald-50 disabled:opacity-50"
        >
          {copied ?
            <>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Código copiado!
            </>
          : <>
              <Copy className="h-4 w-4" strokeWidth={2.5} />
              Copiar código Pix
            </>
          }
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-slate-500">Aguardando pagamento...</span>
      </div>

      <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
        Abra o app do seu banco, escaneie o QR Code ou cole o código na opção Pix copia e cola, e confirme{" "}
        <span className="font-semibold text-slate-500">{brl}</span>
      </p>

      <button
        type="button"
        onClick={simulatePay}
        disabled={simulating || !gatewayTxId}
        className="mt-2 rounded-xl border border-dashed border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-400 transition-colors hover:border-emerald-400 hover:text-emerald-600 active:scale-95 disabled:opacity-50"
      >
        {simulating ? "Confirmando..." : "Simular pagamento (mock)"}
      </button>
    </motion.div>
  );
}

function StepConfirming({ candidate }: { candidate: CandidateId }) {
  const { meta } = useCandidateUi(candidate);
  return (
    <motion.div
      key="confirming"
      {...stepTransition}
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6"
    >
      <div className={`relative h-20 w-20 overflow-hidden rounded-full ring-4 ${meta.ring} shadow-xl`}>
        <Image src={meta.photo} alt={meta.name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-slate-800">Confirmando Pix...</p>
        <p className="mt-1 text-sm text-slate-500">Quase lá!</p>
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </motion.div>
  );
}

function StepConfirmed({
  candidate,
  amountCents,
}: {
  candidate: CandidateId;
  amountCents: number;
}) {
  const { close } = useVoteFlow();
  const { meta } = useCandidateUi(candidate);
  const brl = formatBRL(amountCents);

  return (
    <motion.div
      key="confirmed"
      {...stepTransition}
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 250, delay: 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
      >
        <Check className="h-10 w-10 text-white" strokeWidth={3} />
      </motion.div>

      <div className="text-center">
        <p className="text-2xl font-black text-slate-800">Voto confirmado!</p>
        <p className="mt-2 text-sm text-slate-500">
          Você votou em <span className={`font-bold ${meta.color}`}>{meta.name}</span>
        </p>
        <p className="mt-1 text-sm font-bold text-slate-700">{brl}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25 }}
        className="w-full max-w-xs rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center"
      >
        <Heart className="mx-auto mb-2 h-5 w-5 text-red-400" />
        <p className="text-sm font-bold text-slate-700">
          Seus {brl} entram no total que usarei para comprar alimentos e utensílios e levar à Caritas
          Arquidiocesana de São Paulo.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Obrigado por transformar sua opinião em ajuda concreta.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.2 }}
        type="button"
        onClick={close}
        className="mt-2 w-full max-w-xs rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-4 text-base font-black text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
      >
        Voltar para o site
      </motion.button>
    </motion.div>
  );
}

export function VoteFlowModal() {
  const {
    step,
    candidate,
    close,
    setStep,
    amountCents,
    setVotePayment,
    votePayment,
  } = useVoteFlow();
  const isOpen = step !== "idle";

  const stepperIndex = useMemo(() => {
    return STEPPER_ORDER.indexOf(step as (typeof STEPPER_ORDER)[number]);
  }, [step]);

  useEffect(() => {
    if (step !== "generating" || !candidate) return;
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: candidate,
            amountCents,
          }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error(err);
          setStep("amount");
          return;
        }
        const data = (await res.json()) as {
          voteId: string;
          gatewayTxId: string;
          pixCopiaCola: string;
          pixQrcodeBase64: string;
        };
        if (ac.signal.aborted) return;
        setVotePayment({
          voteId: data.voteId,
          gatewayTxId: data.gatewayTxId,
          pixCopiaCola: data.pixCopiaCola,
          pixQrcodeBase64: data.pixQrcodeBase64,
        });
        setStep("qrcode");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStep("amount");
      }
    })();
    return () => ac.abort();
  }, [step, candidate, amountCents, setStep, setVotePayment]);

  useEffect(() => {
    if (step !== "qrcode" || !votePayment?.voteId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/votes/${votePayment.voteId}`);
        if (!r.ok) return;
        const j = (await r.json()) as { status: string };
        if (stopped) return;
        if (j.status === "paid") setStep("confirming");
      } catch {
        /* ignore */
      }
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [step, votePayment?.voteId, setStep]);

  useEffect(() => {
    if (step !== "confirming") return;
    const t = window.setTimeout(() => setStep("confirmed"), 700);
    return () => clearTimeout(t);
  }, [step, setStep]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && candidate && (
        <motion.div
          key="vote-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-white"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-600">1 Real pelo Brasil</span>
            </div>
            {(step === "amount" || step === "qrcode" || step === "confirmed") && (
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors active:bg-slate-200"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 px-4 py-3">
            {STEPPER_ORDER.map((s, i) => {
              const isActive = stepperIndex >= 0 && i <= stepperIndex;
              return (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    isActive ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === "amount" && <StepAmount candidate={candidate} />}
            {step === "generating" && (
              <StepGenerating candidate={candidate} amountCents={amountCents} />
            )}
            {step === "qrcode" && <StepQRCode candidate={candidate} amountCents={amountCents} />}
            {step === "confirming" && <StepConfirming candidate={candidate} />}
            {step === "confirmed" && (
              <StepConfirmed candidate={candidate} amountCents={amountCents} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
