"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Menu,
    Search,
    SlidersHorizontal,
    Library,
    ArrowRight,
    Gavel,
    FileText,
    History,
    Sparkles,
    ShieldCheck,
    ChevronLeft,
    X,
    Plus,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingLawyer } from "../shared/ThinkingLawyer";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface MobileResearchProps {
    query: string;
    setQuery: (val: string) => void;
    onSearch: () => void;
    isLoading: boolean;
    result: any;
    researchHistory?: any[];
    onSelectHistory?: (query: string, result: any) => void;
    onNewResearch?: () => void;
    onDeleteHistory?: (id: string) => void;
}

export function MobileResearch({
    query,
    setQuery,
    onSearch,
    isLoading,
    result,
    researchHistory,
    onSelectHistory,
    onNewResearch,
    onDeleteHistory
}: MobileResearchProps) {
    const { toggleMobileSidebar } = useAppStore();
    const [showHistory, setShowHistory] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [query]);

    return (
        <div className="flex flex-col h-[100dvh] bg-[#08090a] text-white font-sans relative overflow-hidden pb-[72px]">
            {/* Animated Neural Background Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-20 left-0 w-48 h-48 bg-primary/5 blur-[100px] pointer-events-none" />

            <header className="flex h-[calc(env(safe-area-inset-top)+4.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-20 shrink-0 sticky top-0">
                <button
                    onClick={toggleMobileSidebar}
                    className="size-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all"
                >
                    <Menu className="w-5 h-5 text-white" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-white text-xs font-black tracking-[0.3em] uppercase italic font-display">Research Pro</h1>
                    <div className="h-0.5 w-8 bg-primary/40 rounded-full mt-1" />
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowHistory(true)}
                        className="size-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all text-white/40"
                    >
                        <History className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onNewResearch}
                        className="size-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all text-primary"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* History Overlay for Mobile */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 bg-[#08090a] z-[100] flex flex-col"
                    >
                        <header className="h-20 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/10">
                            <div className="flex flex-col">
                                <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em] italic">Knowledge History</h2>
                                <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-1 opacity-60">Synchronized Logs</p>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="size-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"
                            >
                                <X className="w-5 h-5 text-white/40" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
                            {researchHistory?.map((item: any, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="rounded-2xl border border-white/5 active:bg-primary/10 active:border-primary/30 transition-all flex items-stretch group overflow-hidden"
                                >
                                    <button
                                        onClick={() => {
                                            onSelectHistory?.(item.query, item.result);
                                            setShowHistory(false);
                                        }}
                                        className="flex-1 p-5 text-left flex items-center justify-between"
                                    >
                                        <div className="flex flex-col gap-1 pr-4 min-w-0">
                                            <p className="text-sm font-bold text-white leading-tight line-clamp-2 italic">{item.query}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="size-1 rounded-full bg-primary/40" />
                                                <p className="text-[8px] text-white/30 uppercase tracking-widest font-black">
                                                    {new Date(item.timestamp).toLocaleDateString()} // LOG_SYNC
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-primary/40 group-active:text-primary shrink-0" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Delete this research entry?")) {
                                                onDeleteHistory?.(item.id);
                                            }
                                        }}
                                        className="p-5 text-white/20 hover:text-red-400 active:bg-red-500/10 transition-colors border-l border-white/5"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="flex-1 overflow-y-auto relative hide-scrollbar pb-24 px-6 pt-10">
                {!result && !isLoading ? (
                    <div className="space-y-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <h2 className="text-[clamp(1.75rem,8vw,3rem)] font-black text-white tracking-tighter leading-none italic font-display">
                                Access 4.5M <br />
                                <span className="text-primary italic">Case Files.</span>
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="h-px w-8 bg-primary/30" />
                                <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed italic">
                                    Cross-Referencing Statutory Law
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative group shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                        >
                            <div className="glass border border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-primary/40 transition-all overflow-hidden p-3 relative sweep-container">
                                <div className="sweep-element" />
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 pl-1">
                                        <div className="size-9 flex items-center justify-center bg-black/40 rounded-lg border border-white/10 shrink-0">
                                            <Search className="w-4 h-4 text-primary" />
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            className="w-full bg-transparent border-0 text-white placeholder-white/20 py-1 text-base font-bold outline-none italic tracking-tight resize-none no-scrollbar overflow-y-auto min-h-[32px] max-h-[100px] leading-tight"
                                            placeholder="Research Directive..."
                                            rows={1}
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    onSearch();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={onSearch}
                                        className="w-full py-3.5 bg-primary text-[#0a200f] font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(29,185,84,0.3)] flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="size-3.5" />
                                        <span>Advanced Search</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-4 mt-12">
                            {[
                                { icon: Library, label: "Federal", sub: "District Courts" },
                                { icon: Gavel, label: "Supreme", sub: "Constitutional" },
                                { icon: History, label: "Precedents", sub: "Historical" },
                                { icon: FileText, label: "Statutes", sub: "Federal Code" }
                            ].map((item, idx) => (
                                <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.05 }}
                                    className="flex flex-col items-start p-6 glass border border-white/5 rounded-3xl active:scale-95 transition-all gap-4 active:border-primary/30 group"
                                >
                                    <div className="size-10 flex items-center justify-center bg-black/40 rounded-xl border border-white/10 group-active:border-primary/50 transition-colors">
                                        <item.icon className="w-5 h-5 text-primary group-active:animate-pulse" />
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">{item.label}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">{item.sub}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex items-center justify-center pt-8 opacity-20 text-white/30">
                            <ShieldCheck className="size-4 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Encrypted AI Architecture</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 pb-32">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-4"
                        >
                            <button
                                onClick={() => { window.location.reload(); }} // Simple back for now
                                className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-primary" />
                            </button>
                            <div className="flex flex-col min-w-0 pr-4">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic mb-1">Active Research</span>
                                <span className="text-sm font-bold text-white italic truncate opacity-80">{query}</span>
                            </div>
                        </motion.div>

                        {isLoading ? (
                            <div className="space-y-6 pt-10">
                                <div className="h-64 glass rounded-3xl animate-pulse" />
                                <div className="h-24 glass rounded-2xl animate-pulse" />
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-8"
                            >
                                <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative overflow-hidden sweep-container">
                                    <div className="sweep-element" />
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="size-8 flex items-center justify-center bg-primary/10 rounded-lg border border-primary/20">
                                            <Library className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Legal Synthesis Result</span>
                                    </div>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <MarkdownRenderer content={result?.content || result?.answer} className="text-white/90" />
                                    </div>
                                    <div className="h-px w-full bg-white/5 my-8" />
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
                                        <span>Confidence Score</span>
                                        <span className="text-primary italic">A+ // AI Enhanced</span>
                                    </div>
                                </div>

                                {/* Citations */}
                                {result?.citations && result.citations.length > 0 && (
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3 px-2">
                                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Telemetry Sources</h3>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            {result.citations.map((cite: any, i: number) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-5 glass border border-white/5 rounded-3xl flex items-center justify-between group active:bg-white/5 transition-all"
                                                >
                                                    <div className="flex gap-5 items-center min-w-0">
                                                        <div className="size-10 bg-black/60 rounded-xl flex items-center justify-center text-[11px] font-black text-primary border border-white/10 shrink-0 shadow-2xl">
                                                            {i + 1}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[13px] font-bold text-white group-active:text-primary transition-colors truncate italic pr-2">{cite.title || 'Legal Premise'}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] text-white/20 uppercase font-black truncate max-w-[150px] tracking-widest">{cite.url}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="size-4 text-white/20 group-active:text-primary shrink-0 transition-colors" />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#08090a]/95 backdrop-blur-3xl z-[200] flex items-center justify-center"
                    >
                        <ThinkingLawyer message="Executing Legal Search..." className="scale-90" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
