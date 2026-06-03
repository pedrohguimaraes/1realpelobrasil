"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUp,
  Calendar,
  Eye,
  Heart,
  Shield,
  Video,
} from "lucide-react";
import { FadeInUp, ScaleIn } from "./AnimatedSection";
import { useStats } from "@/lib/hooks/usePublicApi";

const X_URL = "https://x.com/pedroguimaraess";

const TIMELINE_STEPS = [
  "Você vota",
  "Dinheiro acumulado",
  "Compra filmada",
  "Entrega documentada",
];

const FALLBACK_TOTAL_CENTS = 0;
const FALLBACK_TODAY_CENTS = 0;

function formatBrlFromCents(cents: number) {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CharitySection() {
  const { data: stats, error, isLoading } = useStats();
  const apiDown = Boolean(error);
  const totalCents =
    stats != null && !apiDown ? stats.totalCents : FALLBACK_TOTAL_CENTS;
  const todayCents =
    stats != null && !apiDown ? stats.todayCents : FALLBACK_TODAY_CENTS;
  const loading = isLoading && !apiDown;

  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:py-20 bg-gradient-to-b from-slate-50 via-emerald-50/40 to-white"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="absolute -top-20 left-0 h-48 w-48 rounded-full bg-emerald-100/60 blur-[80px] hidden sm:block" />
      <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-amber-100/50 blur-[80px] hidden sm:block" />

      <div className="relative z-10 mx-auto max-w-sm">

        {/* TITULO */}
        <FadeInUp className="text-center mb-10">
          <h2 className="text-2xl font-black leading-tight sm:text-4xl">
            <span className="text-slate-800">Seu voto vira</span>{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
              comida na mesa de alguém.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500 leading-relaxed">
            Cada R$1 arrecadado vira compra de{" "}
            <span className="font-semibold text-slate-600">alimentos e utensílios</span>, que eu levo
            para a Caritas Arquidiocesana de São Paulo. Não é repasse em dinheiro à instituição.
            <br />
            <span className="mt-1 block">
              Não importa o candidato: o que importa é que você participou.
            </span>
          </p>
        </FadeInUp>

        {/* CONTADOR */}
        <ScaleIn>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Total arrecadado
              </span>
            </div>
            <p className="counter-glow text-5xl font-black text-slate-800 sm:text-6xl">
              {loading ? (
                <span className="inline-block h-12 w-40 animate-pulse rounded-lg bg-slate-200 align-middle sm:h-14 sm:w-48" />
              ) : (
                formatBrlFromCents(totalCents)
              )}
            </p>
            <div className="mt-3 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center justify-center gap-1.5">
                <ArrowUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">
                  {loading ? (
                    <span className="inline-block h-3 w-28 animate-pulse rounded bg-emerald-100" />
                  ) : (
                    <>+{formatBrlFromCents(todayCents)} hoje</>
                  )}
                </span>
              </div>
              {apiDown && (
                <span className="text-[10px] font-medium text-amber-600">
                  API indisponível
                </span>
              )}
            </div>
          </div>
        </ScaleIn>

        {/* ONG — sem "parceiro oficial", com nota pessoal */}
        <FadeInUp delay={0.1} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-32 shrink-0 sm:h-16 sm:w-36">
                <Image
                  src="/caritas-logo.png"
                  alt="Caritas Arquidiocesana de São Paulo"
                  fill
                  className="object-contain object-left"
                  sizes="144px"
                />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-black text-slate-800 leading-tight">
                  Caritas Arquidiocesana de São Paulo
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  Rede de ação social da Igreja Católica que acolhe e apoia pessoas e famílias em
                  situação de vulnerabilidade, com trabalho de caridade e promoção da dignidade em
                  São Paulo e no Brasil.
                </p>
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* QUEM ESTA POR TRAS — foto + @ + transparência */}
        <FadeInUp delay={0.14} className="mt-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">

            {/* Perfil */}
            <div className="flex items-center gap-3">
              <Image
                src="/pedro-profile.png"
                alt="Pedro Guimarães"
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-emerald-400"
              />
              <div className="min-w-0">
                <Link
                  href={X_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-black text-slate-800 underline decoration-emerald-500 underline-offset-2"
                >
                  @pedroguimaraess
                </Link>
                <p className="text-xs text-slate-500">Criador do 1 Real pelo Brasil</p>
              </div>
            </div>

            {/* Itens de transparência */}
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-slate-600 leading-snug">
                  Vou filmar a compra de alimentos e utensílios e a entrega desses itens na Caritas.{" "}
                  <span className="font-bold text-slate-800">Sem edição, sem cortes.</span>
                </p>
              </div>
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-sm text-slate-600 leading-snug">
                  A compra e a entrega na Caritas serão feitas{" "}
                  <span className="font-bold text-slate-800">1 semana após as eleições.</span>{" "}
                  Tudo documentado e postado no X.
                </p>
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* TIMELINE — vertical, limpa, sem boxes */}
        <FadeInUp delay={0.18} className="mt-6">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            O caminho do seu voto
          </p>
          <div className="flex flex-col items-start gap-0 pl-5">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-start gap-3">
                {/* Bolinha + linha vertical */}
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-sm">
                    {i + 1}
                  </span>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className="h-5 w-px bg-emerald-300" />
                  )}
                </div>
                <p className="pt-1 text-sm font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </FadeInUp>

        {/* PILARES DE CONFIANÇA — destaque grande, não badges */}
        <FadeInUp delay={0.22} className="mt-8">
          <div className="space-y-4">
            <div className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-black text-slate-800">Sem intermediários</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                  O valor do Pix vira alimentos e utensílios; eu compro e levo na Caritas. Nenhuma
                  empresa no meio.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-black text-slate-800">Comprovante público</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                  Recibos, notas fiscais e vídeo da entrega. Tudo postado abertamente no X.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Heart className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-black text-slate-800">Build in Public</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                  Esse projeto inteiro está sendo construído e documentado publicamente. Zero
                  segredo.
                </p>
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* DETALHE DO R$1 */}
        <FadeInUp delay={0.26} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-center text-sm text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700">R$1 por voto.</span>{" "}
              <span className="font-bold text-emerald-600">
                100% viram compra de alimentos e utensílios para a Caritas.
              </span>{" "}
              Você briga pelo seu lado e quem ganha é quem precisa de ajuda.
            </p>
          </div>
        </FadeInUp>

        {/* CTA FINAL */}
        <FadeInUp delay={0.3} className="mt-8 text-center">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-4 px-8 text-base font-black text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
          >
            Vote agora por R$1
          </button>
          <p className="mt-3 mx-auto max-w-xs text-xs text-slate-400 font-semibold">
            Não votar é deixar o outro lado ganhar de graça. Vai deixar?
          </p>
        </FadeInUp>

        <FadeInUp delay={0.36}>
          <footer className="mt-12 border-t border-slate-200 pt-6 text-center">
            <p className="text-[11px] text-slate-300">
              1 Real pelo Brasil © {new Date().getFullYear()} • Votação beneficente
            </p>
          </footer>
        </FadeInUp>
      </div>
    </section>
  );
}
