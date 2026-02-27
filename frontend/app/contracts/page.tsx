"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MobileContracts } from "@/components/mobile/MobileContracts";
import { extractTextFromFile } from "@/lib/documentProcessor";
import { Highlighter } from "@/components/shared/Highlighter";
import { DiffText } from "@/components/shared/DiffText";
import { analyzeDocumentText, redraftDocument, compareDocuments, uploadCaseFile, fetchCases, fetchCaseById, fetchVaultDocumentContent, deleteCaseDocument } from "@/lib/api";
import { jsPDF } from "jspdf";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { SignatureModal } from "@/components/shared/SignatureModal";
import { Stamp, ShieldCheck, Download, Trash2 } from "lucide-react";
import { ThinkingLawyer } from "@/components/shared/ThinkingLawyer";

interface DocState {
    id: string;
    name: string;
    text: string;
    originalExt: string;
    analysis: any | null;
    redraft: string | null;
    isRedrafting: boolean;
    url?: string;
    attestation?: {
        image: string;
        date: string;
        userName: string;
        x?: number;
        y?: number;
    } | null;
}

export default function ContractsPage() {
    const { role, activeCase, setActiveCase: setGlobalActiveCase } = useAppStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const docAreaRef = useRef<HTMLDivElement>(null);

    // -- State --
    const [docs, setDocs] = useState<DocState[]>([]);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'single' | 'compare_redraft' | 'multi_compare'>('single');
    const [showOCR, setShowOCR] = useState(false);
    const [activeRedlineId, setActiveRedlineId] = useState<string | null>(null);
    const [isMultiComparing, setIsMultiComparing] = useState(false);
    const [auditProgress, setAuditProgress] = useState(0);
    const [showFullReport, setShowFullReport] = useState(false);

    // Process State
    const [isAuditing, setIsAuditing] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

    // UI State
    const [multiComparisonText, setMultiComparisonText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // -- EFFECT: Reset State on Case Switch --
    useEffect(() => {
        setDocs([]);
        setActiveDocId(null);
        setViewMode('single');
        setMultiComparisonText(null);
        setShowOCR(false);
    }, [activeCase?.id]);


    const handleEyeClick = (id: string) => {
        setActiveRedlineId(null);
        setTimeout(() => {
            setActiveRedlineId(id);
            if (viewMode === 'multi_compare') setViewMode('single');
        }, 10);
    };

    const activeDoc = docs.find(d => d.id === activeDocId);

    // -- Handlers --

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsProcessingOCR(true); // Start loading immediately
        setAuditProgress(5);
        const newDocs: DocState[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // 1. Initial Fast Extraction
                const localResult = await extractTextFromFile(file);
                let text = localResult.text;

                // 2. Server-side Persistence & Vision OCR
                if (activeCase?.id && !activeCase.isTemporary) {
                    const serverDoc = await uploadCaseFile(activeCase.id, file, text);

                    if (serverDoc.extractedText) {
                        text = serverDoc.extractedText;
                    }

                    newDocs.push({
                        id: serverDoc.id,
                        name: file.name,
                        text: text,
                        url: serverDoc.url,
                        originalExt: file.name.split('.').pop()?.toLowerCase() || 'pdf',
                        analysis: null,
                        redraft: null,
                        isRedrafting: false
                    });
                } else {
                    newDocs.push({
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        text: text,
                        url: URL.createObjectURL(file),
                        originalExt: file.name.split('.').pop()?.toLowerCase() || 'pdf',
                        analysis: null,
                        redraft: null,
                        isRedrafting: false
                    });
                }
            } catch (err) {
                console.error("Failed to read file", file.name, err);
            }
        }

        setIsProcessingOCR(false); // End loading
        setDocs(prev => [...prev, ...newDocs]);
        if (!activeDocId && newDocs.length > 0) {
            setActiveDocId(newDocs[0].id);
        }

        if (activeCase?.id && !activeCase.isTemporary) {
            // Trigger a refresh to sync documents in global store
            fetchCaseById(activeCase.id).then(current => {
                if (current) setGlobalActiveCase(current);
            });
        }

        setAuditProgress(0);
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!confirm("Are you sure you want to permanently delete this document from the case vault?")) return;

        try {
            if (activeCase?.id && docId) {
                await deleteCaseDocument(activeCase.id, docId);
            }
            setDocs(prev => prev.filter(d => d.id !== docId));
            if (activeDocId === docId) {
                setActiveDocId(null);
            }

            // Sync with global store
            if (activeCase?.id && !activeCase.isTemporary) {
                fetchCaseById(activeCase.id).then(current => {
                    if (current) setGlobalActiveCase(current);
                });
            }
        } catch (err) {
            console.error("Failed to delete document:", err);
            alert("Failed to delete document from vault.");
        }
    };

    const handleAuditSingle = async (docId: string) => {
        const doc = docs.find(d => d.id === docId);
        if (!doc || doc.analysis) return;

        setIsAuditing(true);
        setAuditProgress(20);

        try {
            const result = await analyzeDocumentText(doc.text, activeCase?.legalSide, activeCase?.id, undefined, undefined, doc.id);
            const analysisData = (result as any).data || result;
            setDocs(prev => prev.map(d => d.id === docId ? { ...d, analysis: { ...analysisData, rawText: doc.text } } : d));
        } catch (e) {
            console.error("Audit failed for", doc.name, e);
            alert(`Failed to audit ${doc.name}`);
        } finally {
            setIsAuditing(false);
            setAuditProgress(0);
        }
    };

    const handleAuditAll = async () => {
        const pendingDocs = docs.filter(d => !d.analysis);
        if (pendingDocs.length === 0) return;

        setIsAuditing(true);
        setAuditProgress(10);

        let processed = 0;
        const updatedDocs = [...docs];

        for (const doc of pendingDocs) {
            const idx = updatedDocs.findIndex(d => d.id === doc.id);
            if (idx === -1) continue;

            // Protection: Ensure there is at least some text to analyze
            if (!doc.text || doc.text.trim().length === 0) {
                console.warn(`[AUDIT] Skipping empty document: ${doc.name}`);
                processed++;
                continue;
            }

            try {
                const result = await analyzeDocumentText(doc.text, activeCase?.legalSide, activeCase?.id, undefined, undefined, doc.id);
                const analysisData = (result as any).data || result;
                updatedDocs[idx] = { ...updatedDocs[idx], analysis: { ...analysisData, rawText: doc.text } };
            } catch (e) {
                console.error("Audit failed for", doc.name, e);
            }

            processed++;
            setAuditProgress(10 + (processed / pendingDocs.length) * 90);
            setDocs([...updatedDocs]);
        }

        setIsAuditing(false);
        setAuditProgress(0);
    };

    const handleRedraftActive = async () => {
        if (!activeDoc || !activeDoc.analysis) return;

        setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, isRedrafting: true } : d));

        try {
            const result = await redraftDocument(activeDoc.text, activeDoc.analysis, activeCase?.legalSide || "PROSECUTION");
            setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, redraft: result.redraft, isRedrafting: false } : d));
            setViewMode('compare_redraft');
        } catch (err) {
            console.error(err);
            setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, isRedrafting: false } : d));
        }
    };

    const handleMultiCompare = async () => {
        if (docs.length < 2) {
            setError("Upload at least 2 documents to compare.");
            return;
        }
        setIsMultiComparing(true);
        setViewMode('multi_compare');
        setMultiComparisonText(null);

        const texts = docs.map(d => d.text);

        try {
            const result = await compareDocuments(texts, activeCase?.legalSide || "PROSECUTION");
            setMultiComparisonText(result.comparison);
        } catch (err) {
            setError("Comparison failed.");
        } finally {
            setIsMultiComparing(false);
        }
    };

    const handleDownload = async (text: string, filename: string, ext: string, attestation?: DocState['attestation']) => {
        // Clean markdown artifacts for clean legal export
        const cleanText = text.replace(/[#*`]/g, '');

        if (ext === 'docx') {
            try {
                const { Document, Packer, Paragraph, TextRun, ImageRun } = await import("docx");

                const children: any[] = cleanText.split('\n').map(line => new Paragraph({
                    children: [new TextRun({ text: line, font: "Times New Roman", size: 24 })],
                    spacing: { after: 200 }
                }));

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children
                    }],
                });
                const blob = await Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${filename}.docx`;
                a.click();
            } catch (e) {
                console.error("Docx generation failed", e);
            }
        } else {
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            doc.setFont("times");
            doc.setFontSize(11);

            const splitContent = doc.splitTextToSize(cleanText, 180);
            let y = 20;

            splitContent.forEach((line: string) => {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(line, 15, y);
                y += 7;
            });

            doc.save(`${filename}.pdf`);
        }
    };

    // Scroll to Highlight
    useEffect(() => {
        if (activeRedlineId) {
            setTimeout(() => {
                const el = document.getElementById('active-highlight');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [activeRedlineId, viewMode]);

    // -- LOAD PERSISTED DOCS --
    useEffect(() => {
        if (activeCase?.documents) {
            const vaultDocs = activeCase.documents.map(fd => ({
                id: fd.id,
                name: fd.name,
                text: "Loading document text...",
                originalExt: (fd.name.split('.').pop() || fd.type.split('/').pop() || 'pdf').toLowerCase(),
                analysis: fd.analysis || null,
                redraft: fd.redraft || null,
                isRedrafting: false,
                url: fd.url,
                isVault: true
            }));

            // Replace current docs with vault docs (avoiding duplicates if multiple effects triggers)
            setDocs(vaultDocs as DocState[]);
        } else {
            setDocs([]);
        }
    }, [activeCase?.documents]);

    useEffect(() => {
        if (activeDoc && (activeDoc as any).isVault &&
            activeDoc.text === "Loading document text..." &&
            activeCase?.id) {

            fetchVaultDocumentContent(activeCase.id, activeDoc.id)
                .then(text => {
                    setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, text } : d));
                })
                .catch(err => {
                    console.error("Failed to fetch vault content:", err);
                    setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, text: "Error loading document content." } : d));
                });
        }
    }, [activeDocId, activeDoc?.text, activeCase?.id]);

    // -- Handle Deep Linking from Brain Map --
    useEffect(() => {
        const docNameParam = searchParams.get('docName');

        if (docNameParam && docs.length > 0) {
            // Try to find exact match
            const targetDoc = docs.find(d => d.name === docNameParam);
            if (targetDoc && activeDocId !== targetDoc.id) {
                setActiveDocId(targetDoc.id);
                setViewMode('single');
            }
        }
    }, [searchParams, docs]);



    return (
        <>

            {/* Desktop Layout */}
            <div className="hidden md:flex flex-col h-[calc(100vh-64px)] -m-8 relative overflow-hidden bg-background">
                {/* Header */}
                <header className="flex h-16 items-center justify-between px-6 bg-surface border-b border-border z-20 shrink-0 shadow-lg">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center justify-center size-8 rounded hover:bg-surface-lighter transition-colors">
                            <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-white text-sm font-black tracking-widest uppercase truncate max-w-[200px]">
                                {activeCase?.title || "Contract Audit Console"}
                            </h1>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-2">
                                {activeCase?.legalSide} INTELLIGENCE ACTIVE
                                {isAuditing && <span className="animate-pulse text-white">• Auditing {auditProgress.toFixed(0)}%</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded animate-in fade-in slide-in-from-top-1">
                                <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                <span className="text-[10px] font-black uppercase text-red-500">{error}</span>
                                <button onClick={() => setError(null)} className="ml-2 text-red-500/50 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <label className="bg-primary/10 border border-primary/20 rounded flex items-center p-1 h-9 shadow-lg cursor-pointer hover:bg-primary/20 transition-all group">
                                <input type="file" multiple className="hidden" onChange={handleUpload} accept=".pdf,.docx,.txt,.md" />
                                <span className="material-symbols-outlined px-2 text-primary text-sm group-hover:scale-110 transition-transform">cloud_upload</span>
                                <span className="pr-3 text-[10px] font-black uppercase text-primary">Upload Files</span>
                            </label>

                            <button
                                onClick={handleAuditAll}
                                disabled={isAuditing || docs.length === 0}
                                className="bg-surface border border-border rounded flex items-center p-1 h-9 shadow-lg hover:border-white/40 transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined px-2 text-white text-sm">fact_check</span>
                                <span className="pr-3 text-[10px] font-black uppercase text-white">Audit All</span>
                            </button>

                            <button
                                onClick={handleMultiCompare}
                                disabled={docs.length < 2 || isMultiComparing}
                                className="bg-surface border border-border rounded flex items-center p-1 h-9 shadow-lg hover:border-white/40 transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined px-2 text-white text-sm">compare_arrows</span>
                                <span className="pr-3 text-[10px] font-black uppercase text-white">Compare All</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Files & Risks */}
                    <aside className="w-80 bg-surface border-r border-border overflow-y-auto no-scrollbar flex flex-col z-10 shrink-0">
                        {/* File List */}
                        <div className="p-4 border-b border-border space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Uploaded Documents ({docs.length})</h3>
                            {docs.length === 0 ? (
                                <p className="text-[10px] italic text-text-muted opacity-50">No files uploaded.</p>
                            ) : (
                                <div className="space-y-1">
                                    {docs.map(d => (
                                        <div
                                            key={d.id}
                                            onClick={() => { setActiveDocId(d.id); setViewMode('single'); }}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded cursor-pointer transition-all border group",
                                                activeDocId === d.id ? "bg-primary/10 border-primary/30" : "bg-transparent border-transparent hover:bg-white/5",
                                                (d as any).isRedrafting ? "opacity-50 pointer-events-none" : ""
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-sm text-text-muted">
                                                {(d as any).url ? 'cloud_done' : 'description'}
                                            </span>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-white text-[10px] font-bold truncate">{d.name}</p>
                                                {(d as any).isVault && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[7px] font-black text-primary uppercase tracking-widest px-1 bg-primary/10 rounded">Vault</span>
                                                        <span className="text-[7px] text-text-muted/60 uppercase font-black">Persisted</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {!d.analysis && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAuditSingle(d.id); }}
                                                        className={cn(
                                                            "p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all",
                                                            activeDocId === d.id ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                                        )}
                                                        title="Selective Audit"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">fact_check</span>
                                                    </button>
                                                )}
                                                {d.analysis && (
                                                    <div className="p-1 px-2 flex items-center gap-1" title="Audited">
                                                        <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d.id); }}
                                                    className={cn(
                                                        "p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all",
                                                        activeDocId === d.id ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                                    )}
                                                    title="Delete Document"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Doc Analysis Results */}
                        <div className="p-4 flex-1">
                            {activeDoc?.analysis ? (
                                <>
                                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-surface py-2 z-10">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Detected Risks</h3>
                                        <button onClick={() => setShowFullReport(true)} className="text-[9px] text-primary uppercase font-bold hover:underline">Full Report</button>
                                    </div>
                                    <div className="space-y-3">
                                        {activeDoc.analysis.risks?.map((risk: any) => (
                                            <div
                                                key={risk.id}
                                                className={cn(
                                                    "p-4 bg-background border rounded hover:translate-x-1 transition-all group relative",
                                                    activeRedlineId === risk.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={cn("text-[8px] font-black uppercase border px-1.5 rounded", risk.risk === 'Critical' ? "border-red-500 text-red-500" : "border-primary text-primary")}>
                                                        {risk.risk}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEyeClick(risk.id);
                                                        }}
                                                        className="text-text-muted hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                    </button>
                                                </div>
                                                <p className="text-white text-xs font-bold leading-tight mb-1">{risk.title}</p>
                                                <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2 group-hover:line-clamp-none">{risk.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 opacity-30">
                                    <span className="material-symbols-outlined text-4xl mb-2">article</span>
                                    <p className="text-[10px] font-black uppercase">Select a file & Audit</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Actions */}
                        {activeDoc && activeDoc.analysis && (
                            <div className="p-4 bg-background border-t border-border space-y-2">
                                {activeDoc.redraft && (
                                    <>
                                        <button
                                            onClick={() => setViewMode(viewMode === 'compare_redraft' ? 'single' : 'compare_redraft')}
                                            className={cn(
                                                "w-full h-10 border font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 rounded transition-all",
                                                viewMode === 'compare_redraft' ? "bg-white text-black border-white" : "border-white/20 text-white hover:bg-white/10"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-sm">difference</span>
                                            <span>{viewMode === 'compare_redraft' ? "Hide Changes" : "See Differences"}</span>
                                        </button>

                                        <button
                                            onClick={() => handleDownload(activeDoc.redraft!, `${activeDoc.name}_Fixed`, activeDoc.originalExt)}
                                            className="w-full h-10 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 rounded hover:bg-white/10 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">download</span>
                                            <span className="truncate max-w-[150px]">Download {activeDoc.originalExt.toUpperCase()}</span>
                                        </button>
                                    </>
                                )}


                            </div>
                        )}
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 bg-surface-darker overflow-y-auto relative no-scrollbar p-8 lg:p-12 flex flex-col items-center">

                        {/* View: Multi Compare */}
                        {viewMode === 'multi_compare' && (
                            <div className="w-full max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-8 justify-center">
                                    <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-2xl">compare_arrows</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Multi-Document Strategic Audit</h2>
                                </div>

                                {isMultiComparing ? (
                                    <div className="text-center py-20">
                                        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-white text-xs font-black uppercase tracking-widest">Cross-Referencing {docs.length} Documents...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            {docs.map((doc, idx) => (
                                                <div key={idx} className="bg-surface border border-border p-4 rounded-xl max-h-[300px] overflow-hidden flex flex-col opacity-60 hover:opacity-100 transition-opacity">
                                                    <h4 className="text-[10px] font-black uppercase text-primary mb-2 truncate">{doc.name}</h4>
                                                    <div className="text-[10px] text-text-muted leading-relaxed whitespace-pre-wrap">{doc.text}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {multiComparisonText && (
                                            <div className="bg-surface border border-primary/30 p-12 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
                                                <MarkdownRenderer content={multiComparisonText} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* View: Single or Redraft Compare */}
                        {(viewMode === 'single' || viewMode === 'compare_redraft') && activeDoc && (
                            <div className={cn("w-full transition-all duration-500", viewMode === 'compare_redraft' ? "max-w-7xl grid grid-cols-2 gap-8" : "max-w-4xl")}>
                                {/* Col 1: Original */}
                                <div className="animate-in fade-in duration-500">
                                    {viewMode === 'compare_redraft' && <h3 className="text-white/50 text-xs font-black uppercase tracking-widest mb-4 text-center">Original Version</h3>}
                                    <div
                                        ref={docAreaRef}
                                        className="bg-surface/50 border border-transparent hover:border-border transition-colors p-8 rounded-xl min-h-[500px] relative"
                                    >
                                        {(!showOCR && (
                                            activeDoc.originalExt?.toLowerCase() === 'pdf' ||
                                            activeDoc.name.toLowerCase().endsWith('.pdf')
                                        ) && (activeDoc as any).url) ? (
                                            <div className="w-full h-[700px] border border-white/5 rounded-lg overflow-hidden bg-black/20">
                                                <iframe
                                                    src={(activeDoc as any).url}
                                                    className="w-full h-full border-0"
                                                    title={activeDoc.name}
                                                />
                                            </div>
                                        ) : activeDoc.text ? (
                                            (() => {
                                                const activeRisk = activeDoc.analysis?.risks?.find((r: any) => r.id === activeRedlineId);
                                                const highlightParam = searchParams.get('highlight');
                                                // Prioritize active risk selection, fallback to URL param
                                                const snippet = activeRisk?.highlight || highlightParam;
                                                const isUrlHighlight = !!highlightParam && !activeRisk;

                                                return (
                                                    <div className="animate-in fade-in duration-300 w-full">
                                                        {(!activeDoc.analysis && activeDoc.originalExt?.toLowerCase() === 'pdf' && (activeDoc as any).url) && (
                                                            <div className="mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
                                                                <button
                                                                    onClick={() => setShowOCR(!showOCR)}
                                                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">{showOCR ? 'picture_as_pdf' : 'text_snippet'}</span>
                                                                    {showOCR ? 'View Original PDF' : 'View Extracted Text'}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {showOCR && (
                                                            <div className="mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">High-Fidelity OCR Engine Active</span>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-[9px] text-white/30 italic">Handwriting & Print Detected</span>
                                                                    <span className="text-[9px] font-mono text-primary/50 border border-primary/20 px-1 rounded">
                                                                        {activeDoc.text.length} chars
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="min-h-[200px] pb-20">
                                                            <Highlighter
                                                                text={!activeDoc.text.includes('[') ? activeDoc.text : "Synchronizing document text..."}
                                                                className="text-sm text-white/90 leading-loose font-serif whitespace-pre-wrap"
                                                                highlightSnippet={snippet}
                                                                preAnchor={activeRisk?.preAnchor}
                                                                postAnchor={activeRisk?.postAnchor}
                                                                variant={isUrlHighlight ? 'destructive' : 'primary'}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-40 opacity-20">
                                                <span className="material-symbols-outlined text-6xl mb-4">analytics</span>
                                                <p className="text-sm font-black uppercase tracking-widest italic">Analyzing Content...</p>
                                            </div>
                                        )}


                                    </div>
                                </div>

                                {/* Col 2: Reddraft / Diff */}
                                {viewMode === 'compare_redraft' && (
                                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                                        <h3 className="text-primary/70 text-xs font-black uppercase tracking-widest mb-4 text-center">AI Improved Version</h3>
                                        <div className="bg-surface/50 border border-primary/20 p-8 rounded-xl min-h-[500px]">
                                            <div className="text-sm leading-relaxed font-serif">
                                                <DiffText original={activeDoc.text} revised={activeDoc.redraft || ""} />
                                            </div>


                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!activeDoc && viewMode !== 'multi_compare' && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <span className="material-symbols-outlined text-9xl text-white mb-6">description</span>
                                <h2 className="text-3xl font-black text-white uppercase tracking-widest">No Document Selected</h2>
                                <p className="text-white font-bold italic mt-2">Upload and select a document to begin.</p>
                            </div>
                        )}

                    </main>
                </div>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden h-full -m-4 relative">
                <MobileContracts
                    docs={docs}
                    activeDocId={activeDocId}
                    setActiveDocId={setActiveDocId}
                    onUpload={handleUpload}
                    onAudit={(id) => id && handleAuditSingle(id)}
                    // Doc specific props
                    analysisResult={activeDoc?.analysis}
                    redraftedText={activeDoc?.redraft || null}
                    activeRedline={activeRedlineId}
                    setActiveRedline={setActiveRedlineId}
                    isLoading={isAuditing || isProcessingOCR}
                    isRedrafting={activeDoc?.isRedrafting || false}
                    onRedraft={handleRedraftActive}
                    onShowReport={() => setShowFullReport(true)}
                    onDownload={handleDownload}
                    onDelete={handleDeleteDoc}
                />
                {/* Loading Overlays */}
                {(isAuditing || isMultiComparing || isProcessingOCR) && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center animate-in fade-in duration-500">
                        <ThinkingLawyer
                            message={
                                isProcessingOCR ? "Processing & Preparing Document for Analysis..." :
                                    isAuditing ? "Our AI Lawyer is auditing your contract..." :
                                        "Comparing legal documents..."
                            }
                        />
                    </div>
                )}
            </div>

            {showFullReport && activeDoc && (
                <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-full">
                        <div className="p-8 border-b border-border flex justify-between items-center bg-background/50">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase font-display">Full Risk Audit Report</h2>
                                <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mt-1">{activeDoc.name}</p>
                            </div>
                            <button onClick={() => setShowFullReport(false)} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Reusing existing report structure but mapping to activeDoc.analysis */}
                            <div className="grid grid-cols-3 gap-8">
                                <div className="p-6 bg-background rounded-2xl border border-border">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Safety Score</p>
                                    <p className="text-4xl font-black text-primary">{activeDoc.analysis?.score || "0/100"}</p>
                                </div>
                                {/* ... similar mapping for risks count ... */}
                            </div>
                            {/* ... list risks ... */}
                            <div className="space-y-6">
                                <h3 className="text-white text-sm font-black uppercase tracking-widest border-l-4 border-red-500 pl-4">Identified Liabilities</h3>
                                <div className="grid gap-4">
                                    {activeDoc.analysis?.risks?.map((risk: any, i: number) => (
                                        <div key={i} className="p-6 bg-background rounded-2xl border border-border flex items-start gap-4">
                                            <div className="size-3 rounded-full mt-1.5 shrink-0 bg-red-500" />
                                            <div>
                                                <h4 className="text-white font-black uppercase text-base mb-1">{risk.title}</h4>
                                                <p className="text-text-muted text-sm">{risk.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
