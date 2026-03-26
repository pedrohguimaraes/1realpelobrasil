"use client";

import { motion } from "framer-motion";

export function StickyVoteBar() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ y: 120 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45, delay: 1.4, ease: "easeOut" }}
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">
              Vote no seu candidato agora
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              R$1 via Pix • votação anônima • alimentos e utensílios na Caritas
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-600/25 transition-transform active:scale-95"
          >
            Votar R$1
          </button>
        </div>
      </div>
    </motion.div>
  );
}
