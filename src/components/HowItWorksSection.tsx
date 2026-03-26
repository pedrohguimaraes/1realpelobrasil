"use client";

import { ChevronDown } from "lucide-react";
import { FadeInUp } from "./AnimatedSection";

const STEPS = [
  {
    number: "1",
    title: "Escolha seu candidato",
    description:
      "Toque na foto de quem você quer apoiar. Sem cadastro, sem enrolação.",
    color: "text-red-500",
    numberBg: "bg-red-500",
  },
  {
    number: "2",
    title: "Pague R$1 no Pix",
    description: "Um real. Menos que um café. Escaneie o QR Code e pronto.",
    color: "text-blue-500",
    numberBg: "bg-blue-500",
  },
  {
    number: "3",
    title: "Voto registrado — vira compra na Caritas",
    description:
      "Ninguém sabe em quem você votou. Seu real entra no caixa para comprar alimentos e utensílios que vão para a Caritas.",
    color: "text-emerald-500",
    numberBg: "bg-emerald-500",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-blue-100/50 blur-[80px] hidden sm:block" />
      <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-red-100/50 blur-[80px] hidden sm:block" />

      <FadeInUp className="text-center mb-12">
        <h2 className="text-2xl font-black leading-tight sm:text-4xl text-slate-800">
          Se você não vota,
          <br />
          <span className="bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            o outro lado agradece.
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-sm text-slate-500">
          3 passos e pronto.
        </p>
      </FadeInUp>

      {/* PASSOS COM SETA */}
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {STEPS.map((step, i) => (
          <FadeInUp key={step.number} delay={i * 0.15} className="w-full">
            {/* Seta entre passos */}
            {i > 0 && (
              <div className="flex justify-center py-3">
                <ChevronDown className="h-6 w-6 text-slate-300" />
              </div>
            )}

            {/* Passo solto */}
            <div className="flex items-start gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.numberBg} text-base font-black text-white shadow-md`}
              >
                {step.number}
              </span>
              <div className="flex-1 pt-0.5">
                <h3 className={`text-base font-black ${step.color} sm:text-lg`}>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.5} className="mt-12 text-center">
        <p className="mx-auto max-w-xs text-sm font-bold text-slate-400">
          Enquanto você pensa, o outro lado já votou.
        </p>
      </FadeInUp>
    </section>
  );
}
