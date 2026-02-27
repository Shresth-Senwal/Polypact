/**
 * @file MobileCases.tsx
 * @description Mobile-first case management interface for PolyPact.
 * @module frontend/components/mobile
 */

"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Menu,
    Search,
    Plus,
    Briefcase,
    ChevronRight,
    SearchX,
    Trash2
} from "lucide-react";
import { ThinkingLawyer } from "../shared/ThinkingLawyer";
import { CaseContainer } from "../../../shared/types";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface MobileCasesProps {
    cases: CaseContainer[];
    isLoading: boolean;
    error: string | null;
    onCreateCase: () => void;
    onDeleteCase: (e: React.MouseEvent, id: string) => void;
}

export function MobileCases({ cases, isLoading, error, onCreateCase, onDeleteCase }: MobileCasesProps) {
    const { toggleMobileSidebar } = useAppStore();

    // Motion Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 120,
                damping: 18
            }
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-white font-sans relative overflow-hidden pb-[72px]">
            {/* Neural Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[130px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[110px] rounded-full" />
            </div>

            <header className="flex h-[calc(env(safe-area-inset-top)+4.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] items-center justify-between px-6 bg-surface/80 backdrop-blur-xl border-b border-white/5 z-20 shrink-0">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMobileSidebar}
                    className="size-10 flex items-center justify-center rounded-xl bg-white/5 text-white border border-white/10"
                >
                    <Menu className="w-5 h-5" />
                </motion.button>
                <div className="flex flex-col items-center">
                    <h1 className="text-[9px] font-black tracking-[0.3em] uppercase text-white/40">Nexus Repository</h1>
                    <h2 className="text-base font-black tracking-tight text-white uppercase italic">Case Clusters</h2>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="size-10 flex items-center justify-center rounded-xl bg-white/5 text-white border border-white/10"
                >
                    <Search className="w-5 h-5" />
                </motion.button>
            </header>

            <main className="flex-1 overflow-y-auto relative no-scrollbar z-10 pb-32">
                {/* Tabs */}
                <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md px-6 py-4 border-b border-white/5">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar">
                        <button className="flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-2 transition-all">
                            <span className="text-black text-[9px] font-black uppercase tracking-widest">Active</span>
                        </button>
                        {["Inquiry", "Evidence", "Trial", "Archived"].map((tab) => (
                            <button
                                key={tab}
                                className="flex shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 px-5 py-2"
                            >
                                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{tab}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="m-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                        >
                            <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-6 p-6">
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
                        ))
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-6"
                        >
                            {cases.length === 0 ? (
                                <motion.div
                                    variants={itemVariants}
                                    className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center px-10"
                                >
                                    <SearchX className="size-12 text-white/5 mb-4" />
                                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Vault Empty</p>
                                    <p className="text-white/10 text-[9px] italic mt-2">No neural clusters initialized</p>
                                </motion.div>
                            ) : (
                                cases.map((c) => (
                                    <motion.div
                                        key={c.id}
                                        variants={itemVariants}
                                        className="group"
                                    >
                                        <div className="block bg-surface/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-6 relative overflow-hidden transition-all hover:bg-surface/60 active:scale-[0.98] shadow-lg">
                                            <div className="absolute top-0 right-0 p-5 z-20 flex items-center gap-2">
                                                <div className={cn(
                                                    "px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest border",
                                                    c.status === 'DISCOVERY' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/40"
                                                )}>
                                                    {c.status}
                                                </div>
                                                {c.legalSide && (
                                                    <div className="px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-white/40">
                                                        {c.legalSide}
                                                    </div>
                                                )}
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => onDeleteCase(e, c.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                    title="Delete Space"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </motion.button>
                                            </div>

                                            <Link
                                                href={`/?caseId=${c.id}`}
                                                className="flex flex-col gap-5"
                                            >
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-black text-white leading-tight tracking-tight uppercase group-hover:text-primary transition-colors pr-16">
                                                        {c.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 opacity-30">
                                                        <span className="text-[8px] font-black uppercase tracking-widest">SID: {c.id.slice(-6).toUpperCase()}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                                                        <Briefcase className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-white/20 uppercase">Subject/Client</span>
                                                        <span className="text-xs font-bold text-white/80">{c.client}</span>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <p className="text-[13px] text-white/40 leading-relaxed font-medium line-clamp-2 italic pr-6 opacity-60">
                                                        {c.description || "Analyzing matter context..."}
                                                    </p>
                                                    <ChevronRight className="absolute right-0 bottom-1 w-4 h-4 text-white/10 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                                </div>
                                            </Link>

                                            {/* Glow Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </div>
            </main>

            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onCreateCase}
                className="fixed bottom-36 right-6 z-[60] flex items-center justify-center size-14 bg-primary text-background rounded-2xl shadow-[0_15px_40px_rgba(29,185,84,0.4)] md:hidden"
            >
                <Plus className="w-7 h-7 font-black" />
            </motion.button>

            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[100] flex items-center justify-center"
                    >
                        <ThinkingLawyer message="Syncing Nodes..." className="scale-75" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
