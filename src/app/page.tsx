"use client";

import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { CharitySection } from "@/components/CharitySection";
import { StickyVoteBar } from "@/components/StickyVoteBar";
import { VoteFlowProvider } from "@/components/VoteFlowContext";
import { VoteFlowModal } from "@/components/VoteFlowModal";

export default function Home() {
  return (
    <VoteFlowProvider>
      <main className="min-h-screen">
        <HeroSection />
        <HowItWorksSection />
        <CharitySection />
        <StickyVoteBar />
        <VoteFlowModal />
      </main>
    </VoteFlowProvider>
  );
}
