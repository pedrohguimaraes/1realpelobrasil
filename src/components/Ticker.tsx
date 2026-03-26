"use client";

const TICKER_ITEMS = [
  "A direita acabou de votar. E você, esquerda?",
  "+423 votos na última hora",
  "A esquerda respondeu. A direita vai ficar para trás?",
  "Alguém de SP votou agora",
  "Cada voto vira alimentos e utensílios na Caritas. Quem não vota não ajuda ninguém.",
  "A direita está puxando. Vai deixar?",
  "+1.200 votos hoje",
  "Alguém do RJ acabou de votar",
  "Esquerda na frente por pouco. A direita vai aceitar isso?",
  "Não votar é concordar com o outro lado.",
  "O isentão está somando. Direita e esquerda vão deixar?",
];

export function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="w-full overflow-hidden bg-slate-800 border-y border-slate-700 py-2.5">
      <div className="animate-marquee flex w-max gap-8">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 text-xs font-medium text-white/85"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
