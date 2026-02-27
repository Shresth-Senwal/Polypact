"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { analyzeDocumentText, fetchCases } from "@/lib/api";
import { MobileStrategy } from "@/components/mobile/MobileStrategy";
import { ThinkingLawyer } from "@/components/shared/ThinkingLawyer";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Copy, FileText, RefreshCcw, Sparkles, Download, Stamp, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import { SignatureModal } from "@/components/shared/SignatureModal";
import { motion } from "framer-motion";

export default function StrategyPage() {
    const { role, cases, activeCase: globalActiveCase, setActiveCase } = useAppStore();
    const searchParams = useSearchParams();
    const urlCaseId = searchParams.get("caseId");

    const [isGenerating, setIsGenerating] = useState(false);
    const [strategy, setStrategy] = useState<any>(null);
    const [input, setInput] = useState("");
    const [activeCase, setLocalActiveCase] = useState<any>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [attestation, setAttestation] = useState<{ image: string, date: string, userName: string, x?: number, y?: number } | null>(null);
    const docAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const caseId = urlCaseId || globalActiveCase?.id;
        if (caseId && role === "LAWYER") {
            const current = cases.find(c => c.id === caseId);
            if (current) {
                setLocalActiveCase(current);
                // If the URL has it but store doesn't, sync it
                if (urlCaseId && (!globalActiveCase || globalActiveCase.id !== urlCaseId)) {
                    setActiveCase(current);
                }
            }
        }
    }, [urlCaseId, globalActiveCase, cases, role, setActiveCase]);

    const handleGenerateStrategy = async () => {
        setIsGenerating(true);
        try {
            const basePrompt = input.trim() || `Analyze the current matter and generate a high-fidelity legal draft or strategic brief. 
            Include a full document body in the 'draft' field that I can use in court or for client briefing.`;

            // Passing strategy?.draft as the current draft to allow the AI to edit it
            const result: any = await analyzeDocumentText(
                basePrompt,
                activeCase?.legalSide || 'PROSECUTION',
                activeCase?.id,
                'draft',
                strategy?.draft
            );
            setStrategy(result);
            setAttestation(null); // Reset attestation for new draft
            setInput(""); // Clear input after successful generation
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyDraft = () => {
        if (strategy?.draft) {
            navigator.clipboard.writeText(strategy.draft);
            alert("Draft copied to clipboard!");
        }
    };

    const handleDownloadPDF = () => {
        if (!strategy?.draft) return;

        try {
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            const contentWidth = 170;

            doc.setFont("times", "normal");
            doc.setFontSize(11);

            // Remove markdown syntax for a cleaner PDF
            const cleanText = strategy.draft.replace(/[#*`]/g, '');
            const lines = doc.splitTextToSize(cleanText, contentWidth);

            let cursorY = 30;

            // Header
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text(activeCase?.title?.toUpperCase() || "LEGAL STRATEGY DRAFT", 105, 20, { align: "center" });

            doc.setFont("times", "normal");
            doc.setFontSize(11);

            lines.forEach((line: string) => {
                if (cursorY > pageHeight - margin) {
                    doc.addPage();
                    cursorY = margin;
                }
                doc.text(line, 20, cursorY);
                cursorY += 7;
            });

            // Footer
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`PolyPact Intelligent Draft — Page ${i} of ${pageCount}`, 105, pageHeight - 10, { align: "center" });
            }

            // Attestation on Last Page
            if (attestation) {
                doc.setPage(pageCount);
                // Standard tail positioning for PDF export
                let x = 145;
                let y = cursorY + 15;

                // If not enough space, add new page
                if (y > pageHeight - 40) {
                    doc.addPage();
                    y = 30;
                }

                try {
                    doc.addImage(attestation.image, 'PNG', x, y, 40, 20);
                } catch (e) {
                    console.error("Signature image add failed:", e);
                }
            }

            doc.save(`${activeCase?.title || 'Legal_Draft'}_PolyPact.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const handleSaveAttestation = (data: { image: string, type: string }) => {
        setAttestation({
            image: data.image,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            userName: "Authorized Counsel"
        });
        setIsSignatureModalOpen(false);
    };

    if (role === 'COMMUNITY') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center p-8">
                <div className="size-20 rounded-3xl bg-surface border border-border flex items-center justify-center mb-6 shadow-2xl">
                    <span className="material-symbols-outlined text-primary text-4xl">shield</span>
                </div>
                <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Access Restricted</h1>
                <p className="text-text-muted max-w-md mx-auto mb-8 font-medium italic">
                    The Strategy Console is a Professional tool.
                    Please upgrade to <span className="text-primary font-bold">Lawyer Mode</span> to access hierarchical legal reasoning.
                </p>
                <Link href="/" className="px-8 py-3 bg-primary text-background font-black uppercase tracking-widest text-xs rounded hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="hidden md:flex flex-col h-full bg-background md:-m-8 md:-mb-14 relative overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 z-30 shrink-0">
                    <div className="flex items-center gap-4 text-white">
                        <div className="size-9 flex items-center justify-center bg-surface border border-border text-primary shadow-inner">
                            <span className="material-symbols-outlined">gavel</span>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-white text-sm font-black leading-tight tracking-widest uppercase">
                                MATTER: {activeCase?.id?.slice(-8).toUpperCase() || "SELECT CASE"}
                            </h2>
                            <span className="text-text-muted text-[10px] uppercase font-bold tracking-tighter">
                                {activeCase?.title || "Drafting Console"} • {activeCase?.client || "PolyPact"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {strategy?.draft && (
                            <div className="flex items-center gap-2 mr-2 border-r border-border pr-3">
                                <button
                                    onClick={handleCopyDraft}
                                    title="Copy Text"
                                    className="h-9 px-4 bg-surface hover:bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                                <button
                                    onClick={() => setIsSignatureModalOpen(true)}
                                    title="Self-Attest (India)"
                                    className={cn(
                                        "h-9 px-4 border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95",
                                        attestation ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface hover:bg-white/5 border-white/10 text-white"
                                    )}
                                >
                                    <Stamp className="w-3.5 h-3.5" /> {attestation ? "Re-Attest" : "Attest"}
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    title="Export to PDF"
                                    className="h-9 px-4 bg-primary text-background text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/10"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export PDF
                                </button>
                                <button
                                    onClick={() => { setStrategy(null); setAttestation(null); }}
                                    title="Reset Console"
                                    className="h-9 px-3 bg-surface hover:bg-white/10 border border-white/10 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={handleGenerateStrategy}
                            disabled={isGenerating}
                            className="flex items-center justify-center h-10 px-6 bg-primary hover:bg-primary-hover transition-all text-background text-[11px] font-black uppercase tracking-[0.2em] gap-2 shadow-lg shadow-primary/10 active:scale-95 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">{isGenerating ? "progress_activity" : "auto_awesome"}</span>
                            <span>{isGenerating ? "Reasoning..." : "Generate Strategy"}</span>
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Document View */}
                    <section className="flex-1 flex flex-col min-w-[400px] border-r border-border bg-surface-darker overflow-hidden">
                        <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">
                                    {strategy?.draft ? "Live Legal Draft" : "Brief_v3.pdf"}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] font-black bg-primary text-background rounded-sm uppercase">
                                    {strategy?.draft ? "Editable" : "Locked"}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex flex-col items-center bg-[#121212] scroll-smooth no-scrollbar relative">

                            <div
                                ref={docAreaRef}
                                className={cn(
                                    "w-full max-w-[750px] bg-[#1a1a1a] p-8 md:p-16 min-h-[1050px] text-white/90 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative font-legal selection:bg-primary/30 transition-all duration-700 ease-in-out shrink-0 border border-white/5 rounded-sm",
                                    strategy?.draft ? "animate-in zoom-in-95 fade-in duration-500" : ""
                                )}>
                                {strategy?.draft ? (
                                    <div className="relative">
                                        <div className="text-center font-bold mb-10 text-xl uppercase tracking-widest border-b border-white/5 pb-6 italic text-white/80">
                                            {activeCase?.title || "Legal Strategy Draft"}
                                            <div className="text-[10px] mt-2 font-black tracking-[0.3em] opacity-40 italic">PolyPact Intelligent Counsel Output</div>
                                        </div>
                                        <div className="prose prose-sm prose-invert max-w-none">
                                            <MarkdownRenderer
                                                content={strategy.draft}
                                                className="!text-white/80 !font-legal !text-[15px] !leading-relaxed space-y-4"
                                            />
                                        </div>

                                        {/* Attestation Block View (Draggable Sign) */}
                                        {attestation && (
                                            <motion.div
                                                drag
                                                dragConstraints={docAreaRef}
                                                dragElastic={0}
                                                dragMomentum={false}
                                                onDragEnd={(_, info) => {
                                                    setAttestation(prev => prev ? { ...prev, x: info.point.x, y: info.point.y } : null);
                                                }}
                                                className="absolute bottom-10 right-10 cursor-move z-40 p-2 group"
                                            >
                                                <div className="relative">
                                                    <div className="h-20 w-40">
                                                        <img src={attestation.image} alt="Signature" className="h-full w-full object-contain filter invert brightness-200" />
                                                    </div>
                                                    <div className="absolute -top-4 -left-4 size-6 bg-primary text-black flex items-center justify-center rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg">
                                                        <span className="material-symbols-outlined text-[14px]">open_with</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="opacity-80 text-white">
                                        <div className="text-center font-bold mb-12 text-xl uppercase tracking-widest border-b border-white/5 pb-6">
                                            Superior Court of King County
                                            <div className="text-base mt-2 opacity-60">State of Washington</div>
                                        </div>

                                        <section className="mb-10">
                                            <h4 className="font-black text-sm uppercase border-b border-white/5 mb-6 pb-2 tracking-widest text-primary">I. Introduction & Matter Overview</h4>
                                            <p className="mb-6 text-[15px] leading-8 text-justify font-medium opacity-70">
                                                The Defendant, John Doe, respectfully moves this Court to suppress all evidence obtained from the warrantless search of his residence conducted on January 15, 2024. This motion is brought pursuant to the Fourth Amendment of the United States Constitution and Article I, Section 7 of the Washington State Constitution.
                                            </p>
                                        </section>

                                        <div className="h-px bg-white/10 w-full my-8" />

                                        <section>
                                            <h4 className="font-black text-sm uppercase border-b border-white/5 mb-6 pb-2 tracking-widest text-primary">II. Statement of Facts</h4>
                                            <p className="mb-6 text-[15px] leading-8 text-justify font-medium opacity-40 italic">
                                                [Analyzing Case Discovery - Procedural Lock Active]
                                            </p>
                                        </section>
                                    </div>
                                )}

                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[80%] border-t border-white/5 pt-4 text-center">
                                    <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">
                                        {strategy?.draft ? "AUTHENTICATED AI DRAFT — POLYPACT — NON-PRIVILEGED SUMMARY" : "INTERNAL CASE BRIEF — CONFIDENTIAL — PAGE 1"}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom Padding for Better Scroll Feel */}
                            <div className="h-24 shrink-0" />
                        </div>
                    </section>

                    {/* AI Sidebar */}
                    <section className="w-[420px] flex flex-col bg-background shrink-0 z-20 overflow-hidden">
                        <div className="border-b border-border px-6 shrink-0 bg-surface/20">
                            <div className="flex gap-1">
                                <button className="px-6 py-4 text-white text-[10px] font-black uppercase tracking-widest border-b-4 border-primary bg-surface/40">
                                    Strategic Analysis
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 hide-scrollbar">
                            <div>
                                <div className="flex justify-between items-end border-b border-border pb-4 mb-6">
                                    <div>
                                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Live Intelligence</p>
                                        <h2 className="text-white tracking-tight text-3xl font-black uppercase font-display">Advisor</h2>
                                    </div>
                                    <button
                                        onClick={handleGenerateStrategy}
                                        className="bg-surface border border-border text-primary size-9 flex items-center justify-center rounded hover:bg-border transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                                    </button>
                                </div>

                                {strategy ? (
                                    <div className="space-y-6">
                                        <div className="bg-surface border border-border p-6 rounded-xl shadow-2xl animate-in slide-in-from-right-4 duration-500">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="material-symbols-outlined text-primary">verified</span>
                                                <h3 className="text-white font-black text-[11px] uppercase tracking-wider">Tactical Overview</h3>
                                            </div>
                                            <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                                                {strategy.summary || strategy.content}
                                            </p>
                                        </div>

                                        {strategy.risks && strategy.risks.map((risk: any, i: number) => (
                                            <div key={i} className="bg-surface border border-border p-5 rounded-xl border-l-4 border-primary shadow-xl">
                                                <h4 className="text-xs font-black text-white uppercase mb-1">{risk.title}</h4>
                                                <p className="text-xs text-text-muted leading-relaxed italic">{risk.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                        <span className="material-symbols-outlined text-6xl mb-4">insights</span>
                                        <p className="text-xs font-black uppercase tracking-[0.2em]">No Strategy Generated</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-background shrink-0">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleGenerateStrategy(); }}
                                className="relative group"
                            >
                                <input
                                    className="w-full bg-surface border border-border rounded px-4 py-3 pr-10 text-xs text-white placeholder-gray-600 focus:border-primary outline-none transition-all shadow-inner"
                                    placeholder="Adjust strategy focus..."
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </div>

            <div className="block md:hidden h-[100dvh] -m-4 relative overflow-hidden">
                <MobileStrategy
                    strategy={strategy}
                    onGenerate={handleGenerateStrategy}
                    isGenerating={isGenerating}
                    activeCase={activeCase}
                    input={input}
                    setInput={setInput}
                    onDownload={handleDownloadPDF}
                    attestation={attestation}
                    onAttest={() => setIsSignatureModalOpen(true)}
                    onUpdateAttestation={setAttestation}
                />
            </div>

            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={handleSaveAttestation}
                userName="Authorized Counsel"
            />
        </>
    );
}
