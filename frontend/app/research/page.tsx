"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { searchLegalPrecedents, fetchCases, fetchCaseById, deleteResearchItem } from "@/lib/api";
import { MobileResearch } from "@/components/mobile/MobileResearch";
import { useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ThinkingLawyer } from "@/components/shared/ThinkingLawyer";
import { PanelLeft, Trash2 } from "lucide-react";

export default function ResearchPage() {
    const { role, activeCase, setActiveCase, isResearchHistoryCollapsed, setResearchHistoryCollapsed, toggleResearchHistory } = useAppStore();
    const searchParams = useSearchParams();
    const urlCaseId = searchParams.get("caseId");
    const caseId = urlCaseId || activeCase?.id;

    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleNewResearch = () => {
        setQuery("");
        setResult(null);
        setError(null);
    };

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
        }
    }, [query]);

    // Sync activeCase if caseId is in URL but not in store
    useEffect(() => {
        if (caseId && (!activeCase || activeCase.id !== caseId)) {
            fetchCaseById(caseId).then(current => {
                if (current) setActiveCase(current);
            });
        }
    }, [caseId, activeCase, setActiveCase]);

    // Handle Deep Link History & Query
    useEffect(() => {
        if (searchParams.get("history") === "true") {
            setShowHistory(true);
        }

        const q = searchParams.get("q");
        if (q) {
            setQuery(q);
        }
    }, [searchParams]);

    const handleSearch = async () => {
        if (!query.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await searchLegalPrecedents(query, activeCase?.id || caseId || undefined);
            console.log("[RESEARCH] Result:", data);

            if (data.error) {
                setError(data.error);
                setResult(null);
            } else {
                setResult(data);

                // Refresh case to sync history to store
                if (activeCase?.id || caseId) {
                    const idToFetch = (activeCase?.id || caseId) as string;
                    fetchCaseById(idToFetch).then(current => {
                        if (current) setActiveCase(current);
                    });
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteResearch = async (e: React.MouseEvent, researchId: string) => {
        e.stopPropagation();
        if (!caseId || !confirm("Delete this research item?")) return;

        try {
            await deleteResearchItem(caseId, researchId);
            // Refresh case to sync history
            const current = await fetchCaseById(caseId);
            if (current) setActiveCase(current);

            // If the deleted item was currently displayed, clear it
            if (result && activeCase?.researchHistory) {
                const item = activeCase.researchHistory.find((h: any) => h.id === researchId);
                if (item && item.query === query && JSON.stringify(item.result) === JSON.stringify(result)) {
                    setQuery("");
                    setResult(null);
                }
            }
        } catch (err: any) {
            console.error("Failed to delete research item:", err);
            alert("Failed to delete research item.");
        }
    };

    if (role === 'COMMUNITY') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center px-8">
                <div className="size-20 rounded-3xl bg-surface border border-border flex items-center justify-center mb-6 shadow-2xl">
                    <span className="material-symbols-outlined text-primary text-4xl">travel_explore</span>
                </div>
                <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Access Restricted</h1>
                <p className="text-text-muted max-w-md mx-auto mb-8 font-medium italic">
                    The Research Engine is a Professional tool.
                    Please upgrade to <span className="text-primary font-bold">Lawyer Mode</span> to deep-dive into case law and statutory databases.
                </p>
                <Link href="/" className="px-8 py-3 bg-primary text-background font-black uppercase tracking-widest text-xs rounded hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Layout */}
            <div className="hidden md:flex h-full bg-background md:-m-8 md:-mb-14 overflow-hidden relative">
                {/* Research History Sidebar (Desktop) */}
                <div className={cn(
                    "hidden md:flex flex-col border-r border-white/5 bg-[#0d0d0d] overflow-x-hidden transition-all duration-500 ease-in-out relative",
                    isResearchHistoryCollapsed ? "w-0 border-none" : "w-[280px]"
                )}>
                    {/* Collapse button for Research History */}
                    <div className="p-4 flex items-center gap-2">
                        <button
                            onClick={handleNewResearch}
                            className="flex-1 h-11 flex items-center gap-3 px-4 bg-surface hover:bg-white/5 border border-white/10 rounded-xl transition-all group"
                        >
                            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add</span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/80">New Research</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1 no-scrollbar">
                        <div className="px-4 py-3">
                            <h3 className="text-[10px] font-black text-text-muted/40 uppercase tracking-[0.3em]">Knowledge History</h3>
                        </div>

                        {activeCase?.researchHistory && activeCase.researchHistory.length > 0 ? (
                            activeCase.researchHistory.slice().reverse().map((item: any) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setQuery(item.query);
                                        setResult(item.result);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden text-left cursor-pointer",
                                        query === item.query && result === item.result
                                            ? "bg-primary/10 text-primary border border-primary/20"
                                            : "text-text-muted hover:bg-white/[0.03] hover:text-white"
                                    )}
                                >
                                    <span className={cn("material-symbols-outlined text-[18px] shrink-0 transition-transform group-hover:scale-110", query === item.query ? "text-primary" : "text-white/20")}>travel_explore</span>
                                    <span className="text-[13px] font-bold truncate tracking-tight flex-1">{item.query}</span>

                                    <button
                                        onClick={(e) => handleDeleteResearch(e, item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                                        title="Delete Research"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    {query === item.query && result === item.result && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-10 text-center opacity-20">
                                <span className="material-symbols-outlined text-4xl mb-2">history</span>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No Previous Research</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 px-3 py-2 text-primary">
                                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">Active: {activeCase?.title || "Standalone"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
                    {/* Header */}
                    <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-border bg-background/50 backdrop-blur-md z-10 sticky top-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleResearchHistory}
                                title={isResearchHistoryCollapsed ? "Show History" : "Hide History"}
                                className={cn(
                                    "p-2 rounded-lg transition-all active:scale-95",
                                    isResearchHistoryCollapsed ? "text-primary bg-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <PanelLeft className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-white text-[11px] font-black tracking-[0.2em] uppercase">
                                    Research Engine Pro
                                </h2>
                                <p className="text-[9px] text-text-muted font-bold tracking-widest uppercase opacity-60">
                                    Grounding in {activeCase?.title || "Standalone Database"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-white/5">
                                <div className="size-1.5 rounded-full bg-primary" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">AI Core Link</span>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto overflow-x-hidden relative px-4 flex flex-col items-center justify-center min-h-0 no-scrollbar">
                        {/* Background Ambience */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />

                        <div className={cn(
                            "relative z-10 w-full max-w-4xl text-center py-12 transition-all duration-700 flex flex-col items-center",
                            result ? "mt-24 mb-12" : "my-auto"
                        )}>
                            {!result && (
                                <>
                                    <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                        <span className="material-symbols-outlined text-primary text-[18px]">library_books</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Institutional Research Engine</span>
                                    </div>

                                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 uppercase font-display">
                                        Search the <span className="text-primary italic">Law.</span>
                                    </h1>
                                    <p className="text-lg md:text-xl text-text-muted mb-12 max-w-2xl mx-auto font-bold italic animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                                        Access 4.5M case files, federal statutes, and court rulings with real-time AI cross-referencing.
                                    </p>
                                </>
                            )}

                            <div className="relative w-full max-w-3xl mx-auto group animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
                                <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-transparent rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col md:flex-row items-center gap-4 bg-surface border border-border p-3 rounded-2xl shadow-2xl focus-within:border-primary/50 transition-all">
                                    <div className="relative flex-1 w-full">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">search</span>
                                        <textarea
                                            ref={textareaRef}
                                            className="w-full bg-transparent border-0 text-white placeholder-gray-600 pl-12 pr-4 py-3 text-[16px] outline-none focus:ring-0 resize-none no-scrollbar overflow-y-auto min-h-[52px] max-h-[260px]"
                                            placeholder="Search precedents, cases, or statutes..."
                                            rows={1}
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSearch();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        disabled={isLoading}
                                        className="w-full md:w-auto bg-primary text-background font-black px-8 py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 shrink-0"
                                    >
                                        {isLoading ? (
                                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        ) : (
                                            <>
                                                <span>Search AI</span>
                                                <span className="material-symbols-outlined">auto_awesome</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {result && (
                                <div className="w-full mt-12 text-left animate-in slide-in-from-bottom-8 duration-500 mb-12">
                                    <div className="bg-surface border border-border rounded-3xl p-10 shadow-2xl overflow-y-auto max-h-[60vh] no-scrollbar">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="material-symbols-outlined text-primary">verified</span>
                                            <h3 className="text-white font-black uppercase tracking-widest text-xs">AI Legal Findings</h3>
                                        </div>

                                        {/* Render AI Opinion */}
                                        <div className="prose prose-invert max-w-none border-b border-white/5 pb-8 mb-8">
                                            <MarkdownRenderer content={result.content || result.answer} />
                                        </div>

                                        {/* Render Verified Citations */}
                                        {result.citations && result.citations.length > 0 && (
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-text-muted text-sm">gavel</span>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Verified Sources (Indian Kanoon)</h4>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {result.citations.map((cite: any, idx: number) => (
                                                        <div key={idx} className="flex flex-col p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <h5 className="text-white font-bold text-sm mb-1">{cite.title}</h5>
                                                                    <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-wider mb-2">
                                                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{cite.court || "Supreme Court"}</span>
                                                                        <span>•</span>
                                                                        <span>{cite.citation_ref || cite.date || "Certified Copy"}</span>
                                                                    </div>
                                                                    <p className="text-text-muted text-xs italic line-clamp-2 opacity-80">"{cite.snippet}"</p>
                                                                </div>
                                                                <a
                                                                    href={cite.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="shrink-0 p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                                                                    title="Verify in Source"
                                                                >
                                                                    <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block">Verify</span>
                                                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {error && <p className="mt-4 text-red-500 font-bold uppercase text-[10px]">{error}</p>}
                                    </div>
                                </div>
                            )}

                            {!result && (
                                <div className="flex flex-wrap justify-center gap-3 mt-24 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                                    {[
                                        { icon: "balance", label: "Federal Codes" },
                                        { icon: "menu_book", label: "Supreme Court" },
                                        { icon: "history", label: "Recent Rulings" },
                                        { icon: "trending_up", label: "Market Precedents" }
                                    ].map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setQuery(item.label)}
                                            className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-surface-darker/50 border border-border hover:border-primary/50 hover:bg-surface transition-all group shadow-xl active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[20px]">{item.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center animate-in fade-in duration-500">
                        <ThinkingLawyer message="Our AI Lawyer is searching federal precedents..." />
                    </div>
                )}
            </div>

            {/* Mobile View */}
            <div className="block md:hidden h-full -m-4 relative">
                <MobileResearch
                    query={query}
                    setQuery={setQuery}
                    onSearch={handleSearch}
                    isLoading={isLoading}
                    result={result}
                    researchHistory={activeCase?.researchHistory}
                    onSelectHistory={(q, r) => {
                        setQuery(q);
                        setResult(r);
                    }}
                    onNewResearch={handleNewResearch}
                    onDeleteHistory={(rid) => handleDeleteResearch({ stopPropagation: () => { } } as any, rid)}
                />

            </div>
        </>
    );
}
