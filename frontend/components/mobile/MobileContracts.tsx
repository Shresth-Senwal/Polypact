/**
 * @file MobileContracts.tsx
 * @description Professional animated contract audit console for PolyPact mobile.
 * @module frontend/components/mobile
 */

"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    X,
    Menu,
    FileText,
    Check,
    Download,
    PenLine,
    Flag,
    Plus,
    Share2,
    Search,
    Bot,
    ChevronRight,
    Sparkles,
    Trash2,

    AlertCircle
} from "lucide-react";
import { ThinkingLawyer } from "../shared/ThinkingLawyer";
import { motion, AnimatePresence } from "framer-motion";

export interface MobileContractsProps {
    docs: any[];
    activeDocId: string | null;
    setActiveDocId: (id: string | null) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAudit: (docId: string) => void;
    analysisResult: any;
    redraftedText: string | null;
    activeRedline: string | null;
    setActiveRedline: (id: string | null) => void;
    isLoading: boolean;
    isRedrafting: boolean;
    onRedraft: () => void;
    onShowReport: () => void;
    onDownload: (text: string, filename: string, ext: string, attestation?: any) => Promise<void>;
    onDelete: (docId: string) => void;
}

export function MobileContracts({
    docs,
    activeDocId,
    setActiveDocId,
    onUpload,
    onAudit,
    analysisResult,
    redraftedText,
    activeRedline,
    setActiveRedline,
    isLoading,
    isRedrafting,
    onRedraft,
    onShowReport,
    onDownload,
    onDelete
}: MobileContractsProps) {
    const { toggleMobileSidebar } = useAppStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'Original' | 'Tactical' | 'OCR'>('Original');
    const mobileDocRef = useRef<HTMLDivElement>(null);

    const activeDoc = docs.find(d => d.id === activeDocId);

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white font-sans relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[100%] h-[100%] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="flex h-[calc(env(safe-area-inset-top)+4.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] items-center justify-between px-6 bg-surface/60 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleMobileSidebar}
                        className="size-11 flex items-center justify-center rounded-xl bg-white/5 text-white active:bg-white/10 transition-colors border border-white/5"
                    >
                        <Menu className="w-5 h-5" />
                    </motion.button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black text-white/40 uppercase tracking-[0.3em] italic">PolyPact</h1>
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter">Contract Audit</h2>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(true)}
                        className="size-11 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_rgba(29,185,84,0.1)]"
                    >
                        <FileText className="w-5 h-5" />
                    </motion.button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                <div className="p-6">
                    <div className="flex flex-col gap-8">
                        {/* Selector Controls */}
                        <div className="flex p-1.5 bg-surface/40 backdrop-blur-md rounded-2xl border border-white/5 relative shadow-xl overflow-x-auto no-scrollbar">
                            <motion.div
                                layoutId="audit-tab"
                                className="absolute inset-y-1.5 bg-primary rounded-xl z-0 shadow-lg shadow-primary/20"
                                style={{
                                    width: '33.33%',
                                    left: viewMode === 'Original' ? '6px' :
                                        viewMode === 'Tactical' ? '33.33%' : '66.66%'
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            />
                            <button
                                onClick={() => setViewMode('Original')}
                                className={cn(
                                    "flex-1 min-w-[60px] py-2.5 text-[8px] font-black uppercase tracking-widest relative z-10 transition-colors",
                                    viewMode === 'Original' ? "text-background" : "text-white/40"
                                )}
                            >
                                Source
                            </button>

                            <button
                                onClick={() => setViewMode('Tactical')}
                                className={cn(
                                    "flex-1 min-w-[60px] py-2.5 text-[8px] font-black uppercase tracking-widest relative z-10 transition-colors",
                                    viewMode === 'Tactical' ? "text-background" : "text-white/40"
                                )}
                            >
                                Tactical
                            </button>
                            <button
                                onClick={() => setViewMode('OCR')}
                                className={cn(
                                    "flex-1 min-w-[60px] py-2.5 text-[8px] font-black uppercase tracking-widest relative z-10 transition-colors",
                                    viewMode === 'OCR' ? "text-background" : "text-white/40"
                                )}
                            >
                                OCR
                            </button>
                        </div>

                        {/* Paper Output */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="bg-surface rounded-3xl p-6 md:p-10 min-h-[400px] shadow-[0_30px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group border border-white/5"
                        >
                            <AnimatePresence mode="wait">
                                {activeDoc ? (
                                    <motion.div
                                        key={viewMode + activeDocId}
                                        initial={{ opacity: 0, y: 15, rotate: -0.5 }}
                                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                                        transition={{ duration: 0.4, ease: "circOut" as const }}
                                        className="text-white"
                                    >
                                        <div className="text-center font-black mb-10 text-[10px] uppercase tracking-[0.5em] border-b border-white/5 pb-6 opacity-30 italic">
                                            {activeDoc.name} | {viewMode}
                                        </div>

                                        {viewMode === 'Tactical' ? (
                                            <div className="space-y-8">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                        <Sparkles className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-tighter text-white">Strategic Insights</h3>
                                                </div>
                                                {analysisResult ? (
                                                    <div className="space-y-6">
                                                        {analysisResult.risks?.map((risk: any, i: number) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: i * 0.1 }}
                                                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <AlertCircle className="w-4 h-4 text-primary mt-1" />
                                                                    <div className="space-y-1">
                                                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">{risk.tag || "RISK"}</span>
                                                                        <p className="text-xs font-bold text-white/80 leading-relaxed italic">{risk.description || risk.desc}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-20 text-center opacity-20 italic text-xs text-white">No analysis available. Initiate audit to extract insights.</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {viewMode === 'OCR' && (
                                                    <div className="mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Engine: Vision AI OCR</span>
                                                        <span className="text-[8px] text-white/30 italic">Handwriting & Print</span>
                                                    </div>
                                                )}
                                                {viewMode === 'Original' ? (
                                                    (activeDoc.originalExt?.toLowerCase() === 'pdf' || activeDoc.name.toLowerCase().endsWith('.pdf')) && activeDoc.url ? (
                                                        <div className="flex flex-col gap-4">
                                                            <div className="w-full h-[550px] border border-white/10 rounded-2xl overflow-hidden bg-black/40 shadow-inner group relative">
                                                                <iframe
                                                                    src={activeDoc.url + "#view=FitH"}
                                                                    className="w-full h-full border-0 rounded-2xl"
                                                                    title={activeDoc.name}
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Interactive PDF active</p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={activeDoc.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 active:bg-white/10"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                View full document
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <p className="text-white/80 leading-[1.8] text-[15px] whitespace-pre-wrap font-legal tracking-tight opacity-90 animate-in fade-in duration-500">
                                                            {activeDoc.text && activeDoc.text !== "[Content stored in Firebase Storage. Click 'Open' to view.]"
                                                                ? activeDoc.text
                                                                : "Synchronizing legal instrument from vault..."}
                                                        </p>
                                                    )
                                                ) : (
                                                    <div className="space-y-4">
                                                        {activeDoc.text && activeDoc.text !== "[Content stored in Firebase Storage. Click 'Open' to view.]" ? (
                                                            <p className="text-white/80 leading-[1.8] text-[15px] whitespace-pre-wrap font-legal tracking-tight opacity-90 animate-in slide-in-from-bottom-2 duration-700">
                                                                {activeDoc.text}
                                                            </p>
                                                        ) : (
                                                            <div className="py-20 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in duration-500">
                                                                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
                                                                    <Sparkles className="w-8 h-8 text-primary" />
                                                                </div>
                                                                <div className="space-y-2 max-w-[240px]">
                                                                    <p className="text-sm font-black uppercase tracking-widest text-white">OCR In Progress</p>
                                                                    <p className="text-[10px] font-medium text-white/40 leading-relaxed">
                                                                        AI text extraction complete. Analyzing legal tokens from vectorized source. Initiate Audit to finalize semantic mapping.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {/* Texture Effects */}
                                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-[500px] flex flex-col items-center justify-center opacity-10 text-white text-center"
                                    >
                                        <Bot className="w-24 h-24 mb-8 translate-y-[-20%]" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] italic">Matter Vault Secured</p>
                                        <p className="text-[10px] mt-4 font-bold max-w-[200px] leading-relaxed">Select a legal instrument from the repository to initiate audit</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Watermark/Footer */}
                            <div className="absolute bottom-6 right-10 opacity-10 font-black text-[9px] uppercase tracking-[0.5em] text-white">
                                POLYPACT CERTIFIED
                            </div>

                            {/* Texture Effects */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
                        </motion.div>
                    </div>
                </div>

                <div className="h-48 shrink-0" />
            </main>

            {/* Bottom Floating Console */}
            < div className="fixed bottom-[84px] inset-x-6 z-40 bg-transparent pointer-events-none" >
                <div className="max-w-[400px] mx-auto pointer-events-auto">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-[#1a1a1a]/95 backdrop-blur-2xl border-2 border-primary/20 rounded-[2rem] p-4 flex items-center justify-between shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
                    >
                        <div className="flex flex-col pl-4">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Selected Matter</span>
                            <span className="text-xs font-black text-white truncate max-w-[130px]">
                                {activeDoc?.name || "Ready..."}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {activeDocId && !analysisResult && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onAudit(activeDocId)}
                                    disabled={isLoading}
                                    className="bg-primary text-background px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20 transition-all"
                                >
                                    {isLoading ? <Bot className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    Audit
                                </motion.button>
                            )}

                        </div>
                    </motion.div>
                </div>
            </div >

            {/* Document Drawer */}
            <AnimatePresence>
                {
                    isMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100]"
                            />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed bottom-0 inset-x-0 h-[80%] bg-[#121212] border-t-2 border-primary/20 rounded-t-[3rem] z-[101] flex flex-col p-8 overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Case Vault</h3>
                                    <button onClick={() => setIsMenuOpen(false)} className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                                        <X className="w-5 h-5 text-white/40" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] py-12 px-6 group active:bg-white/5 transition-all cursor-pointer relative overflow-hidden">
                                        <input type="file" className="hidden" onChange={(e) => { onUpload(e); setIsMenuOpen(false); }} />
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Plus className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white transition-colors">Integrate New Matter</span>
                                    </label>

                                    <div className="space-y-4">
                                        <h4 className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] ml-2">Available Intelligence</h4>
                                        {docs.map((doc) => (
                                            <motion.div
                                                key={doc.id}
                                                whileTap={{ scale: 0.96 }}
                                                className={cn(
                                                    "p-6 rounded-3xl border transition-all flex items-center justify-between gap-4 group",
                                                    activeDocId === doc.id ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5"
                                                )}
                                            >
                                                <div
                                                    className="flex-1 flex items-center gap-4 cursor-pointer"
                                                    onClick={() => { setActiveDocId(doc.id); setIsMenuOpen(false); }}
                                                >
                                                    <div className={cn(
                                                        "size-10 rounded-2xl flex items-center justify-center border transition-all",
                                                        activeDocId === doc.id ? "bg-primary text-background border-primary" : "bg-black/40 text-primary border-white/5"
                                                    )}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col max-w-[200px]">
                                                        <span className={cn(
                                                            "text-xs font-black uppercase tracking-tight transition-colors",
                                                            activeDocId === doc.id ? "text-primary" : "text-white/80"
                                                        )}>{doc.name}</span>
                                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">{doc.id.slice(-8).toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                                                    className="size-11 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 active:bg-red-500/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >

            {/* Global Audit Loading State */}
            <AnimatePresence>
                {
                    isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[200] flex items-center justify-center"
                        >
                            <ThinkingLawyer message="Executing Semantic Audit..." className="scale-75" />
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
