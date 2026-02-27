/**
 * @file MobileStrategy.tsx
 * @description Professional animated strategy console for PolyPact mobile.
 * @module frontend/components/mobile
 */

"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Menu,
    Shield,
    FileText,
    Sparkles,
    ChevronDown,
    Lightbulb,
    Gavel,
    Copy,
    Download,
    Stamp,
    ShieldCheck
} from "lucide-react";
import { ThinkingLawyer } from "../shared/ThinkingLawyer";
import { useState, useRef } from "react";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";

interface MobileStrategyProps {
    strategy: any;
    onGenerate: () => void;
    isGenerating: boolean;
    activeCase: any;
    input: string;
    setInput: (val: string) => void;
    onDownload?: () => void;
    attestation: any;
    onAttest: () => void;
    onUpdateAttestation?: (val: any) => void;
}

export function MobileStrategy({
    strategy,
    onGenerate,
    isGenerating,
    activeCase,
    input,
    setInput,
    onDownload,
    attestation,
    onAttest,
    onUpdateAttestation
}: MobileStrategyProps) {
    const { toggleMobileSidebar } = useAppStore();
    const [activeTab, setActiveTab] = useState<'strategy' | 'document'>('strategy');
    const mobileDocRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        if (strategy?.draft) {
            navigator.clipboard.writeText(strategy.draft);
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[150%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
            </div>

            <header className="flex h-[calc(env(safe-area-inset-top)+4.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-20 shrink-0 sticky top-0">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMobileSidebar}
                    className="size-11 flex items-center justify-center rounded-xl bg-white/5 text-white active:bg-white/10 transition-colors border border-white/5"
                >
                    <Menu className="w-5 h-5" />
                </motion.button>

                <div className="flex-1 flex justify-center px-4">
                    <div className="bg-black/40 p-1 rounded-2xl flex border border-white/5 w-full max-w-[240px] relative">
                        <motion.div
                            layoutId="tab-highlight"
                            className="absolute inset-y-1 bg-primary rounded-xl z-0"
                            style={{
                                width: 'calc(50% - 4px)',
                                left: activeTab === 'strategy' ? '4px' : 'calc(50%)'
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        <button
                            onClick={() => setActiveTab('strategy')}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative z-10",
                                activeTab === 'strategy' ? "text-background" : "text-white/40"
                            )}
                        >
                            Tactical
                        </button>
                        <button
                            onClick={() => setActiveTab('document')}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative z-10",
                                activeTab === 'document' ? "text-background" : "text-white/40"
                            )}
                        >
                            Draft
                        </button>
                    </div>
                </div>

                <div className="size-11 flex items-center justify-center">
                    <div className="size-3 rounded-full bg-primary animate-ping shadow-[0_0_15px_rgba(29,185,84,0.8)]" />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto z-10 no-scrollbar overscroll-contain pb-40">
                <AnimatePresence mode="wait">
                    {activeTab === 'strategy' ? (
                        <motion.div
                            key="tactical-view"
                            initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="px-6 py-8 flex flex-col gap-10"
                        >
                            {/* Header Section */}
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">Live Intelligence</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                </motion.div>
                                <h2 className="text-[clamp(1.5rem,7vw,2.5rem)] md:text-3xl font-black text-white leading-[0.9] tracking-tighter uppercase italic">
                                    Strategic Analysis
                                </h2>
                                <p className="text-white/30 text-[11px] font-black uppercase tracking-[0.2em]">
                                    Matter Ref: {activeCase?.id?.slice(-8).toUpperCase() || "DEFAULT-99"}
                                </p>
                            </div>

                            {/* Main CTA */}
                            <button
                                className="w-full h-14 md:h-16 bg-primary text-background text-[clamp(0.65rem,3vw,0.85rem)] md:text-sm font-black rounded-2xl md:rounded-[1.5rem] shadow-[0_20px_60px_rgba(29,185,84,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-[0.2em] relative overflow-hidden group transition-all active:scale-95"
                                onClick={onGenerate}
                                disabled={isGenerating}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                {isGenerating ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    >
                                        <Sparkles className="w-6 h-6" />
                                    </motion.div>
                                ) : (
                                    <Sparkles className="w-6 h-6" />
                                )}
                                {isGenerating ? "Reasoning..." : "Launch Analysis"}
                            </button>

                            {/* Strategic Results */}
                            <div className="space-y-6">
                                {strategy ? (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-surface/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                            <div className="flex items-center gap-3 mb-6">
                                                <Lightbulb className="w-5 h-5 text-primary" />
                                                <h3 className="text-white font-black text-[11px] uppercase tracking-widest">Executive Summary</h3>
                                            </div>
                                            <p className="text-white/80 text-[15px] leading-relaxed font-medium italic opacity-90">
                                                {strategy.summary || strategy.content}
                                            </p>
                                        </motion.div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-2">Risk Identifiers</h4>
                                            {strategy.risks && strategy.risks.map((risk: any, i: number) => (
                                                <motion.details
                                                    key={i}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="group bg-surface/30 backdrop-blur-md border border-white/5 rounded-[1.8rem] overflow-hidden transition-all shadow-xl"
                                                >
                                                    <summary className="flex cursor-pointer items-center justify-between p-6 list-none select-none hover:bg-white/5 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                                                                <Shield className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                                            </div>
                                                            <span className="text-white font-black text-xs uppercase tracking-tight italic opacity-70 group-hover:opacity-100 transition-opacity">{risk.title}</span>
                                                        </div>
                                                        <ChevronDown className="w-5 h-5 text-white/20 group-open:rotate-180 transition-transform" />
                                                    </summary>
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        className="px-8 pb-8 pt-2"
                                                    >
                                                        <div className="pl-6 border-l-2 border-primary/20">
                                                            <p className="text-white/40 text-[13px] leading-relaxed font-medium italic">
                                                                {risk.desc}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                </motion.details>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="py-32 flex flex-col items-center justify-center opacity-10 border-2 border-dashed border-white/5 rounded-[3rem]"
                                    >
                                        <div className="relative">
                                            <Sparkles className="w-16 h-16 mb-6 animate-pulse" />
                                            <motion.div
                                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
                                            />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] italic">Intelligence Queue Empty</p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="draft-view"
                            initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="px-6 py-8 flex flex-col gap-8"
                        >
                            <div className="flex flex-col gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Generated Manuscript</span>
                                {strategy?.draft && (
                                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleCopy}
                                            className="px-3 py-2.5 bg-white/5 text-white text-[9px] font-black rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copy
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onAttest}
                                            className={cn(
                                                "px-3 py-2.5 text-[9px] font-black rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 border",
                                                attestation ? "bg-primary/20 border-primary/40 text-primary" : "bg-primary text-background border-primary shadow-[0_10px_30px_rgba(29,185,84,0.3)]"
                                            )}
                                        >
                                            <Stamp className="w-3.5 h-3.5" /> {attestation ? "Re-Attest" : "Attest"}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onDownload}
                                            className="col-span-2 xs:col-span-1 px-3 py-2.5 bg-primary text-background text-[9px] font-black rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(29,185,84,0.3)]"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Export
                                        </motion.button>
                                    </div>
                                )}
                            </div>

                            <motion.div
                                ref={mobileDocRef}
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-surface rounded-3xl p-6 md:p-10 min-h-[500px] shadow-[0_30px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group border border-white/5"
                            >
                                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                                {strategy?.draft ? (
                                    <div className="text-white">
                                        <div className="text-center font-black mb-10 text-[10px] uppercase tracking-[0.5em] border-b border-white/5 pb-6 opacity-30 italic">
                                            {activeCase?.title || "Legal Instrument"}
                                        </div>
                                        <MarkdownRenderer
                                            content={strategy.draft}
                                            className="!text-white/90 !text-[14px] leading-[1.8] font-legal tracking-tight"
                                        />

                                        {/* Mobile Draggable Sign */}
                                        {attestation && (
                                            <motion.div
                                                drag
                                                dragConstraints={mobileDocRef}
                                                dragElastic={0}
                                                dragMomentum={false}
                                                onDragEnd={(_, info) => {
                                                    onUpdateAttestation?.({ ...attestation, x: info.point.x, y: info.point.y });
                                                }}
                                                className="absolute bottom-10 right-4 cursor-move z-40 p-2 group"
                                            >
                                                <div className="relative">
                                                    <div className="h-16 w-32">
                                                        <img src={attestation.image} alt="Signature" className="h-full w-full object-contain filter invert brightness-200" />
                                                    </div>
                                                    <div className="absolute -top-3 -left-3 size-6 bg-primary text-black flex items-center justify-center rounded-full shadow-lg">
                                                        <span className="material-symbols-outlined text-[14px]">open_with</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-40 opacity-10 text-white text-center">
                                        <Gavel className="w-20 h-20 mb-8" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.4em] italic">Draft Feed Offline</p>
                                        <p className="text-[10px] mt-4 font-bold italic">Activate analysis to generate drafted clauses</p>
                                    </div>
                                )}

                                <div className="absolute bottom-6 right-10 opacity-10 font-black text-[9px] uppercase tracking-[0.4em] text-white">
                                    POLYPACT ANALYSIS SUITE
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Prompt Input Fixed Bar */}
            <div className="fixed bottom-24 md:bottom-28 inset-x-6 z-40 bg-transparent pointer-events-none">
                <motion.form
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onSubmit={(e) => { e.preventDefault(); onGenerate(); }}
                    className="max-w-[400px] mx-auto pointer-events-auto"
                >
                    <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl border-2 border-primary/20 rounded-[1.8rem] p-3 flex items-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] focus-within:border-primary/60 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Refine strategic focus..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] text-white placeholder-white/20 px-5 py-2 font-medium"
                        />
                        <motion.button
                            type="submit"
                            disabled={isGenerating}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            className="size-12 rounded-2xl bg-primary text-background flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all disabled:opacity-50"
                        >
                            <Sparkles className="w-6 h-6" />
                        </motion.button>
                    </div>
                </motion.form>
            </div>

            {/* Neural Loading System */}
            <AnimatePresence>
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-3xl z-[100] flex items-center justify-center"
                    >
                        <ThinkingLawyer message="Reasoning Strategic Outlines..." className="scale-75" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
