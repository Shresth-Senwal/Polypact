"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Plus,
    ArrowRight,
    Briefcase,
    TrendingUp,
    Clock,
    Search,
    Bot,
    AlertCircle,
    FileText,
    UploadCloud,
    ArrowLeft,
    ArrowRightIcon,
    Filter,
    Sparkles,
    Gavel,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCases, createCase, deleteCase } from "@/lib/api";
import { CaseContainer } from "../../../shared/types";
import { MobileCases } from "@/components/mobile/MobileCases";
import { CaseCreationModal } from "@/components/shared/CaseCreationModal";
import { ThinkingLawyer } from "@/components/shared/ThinkingLawyer";

export default function CasesPage() {
    const { role, cases, setCases } = useAppStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const loadCases = async () => {
            try {
                const data = await fetchCases();
                setCases(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (role === 'LAWYER' && cases.length === 0) {
            loadCases();
        } else {
            setIsLoading(false);
        }
    }, [role, cases.length, setCases]);

    const handleCreateCase = async (data: { title: string; client: string; legalSide: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL"; isTemporary: boolean; jurisdiction?: { country: 'IN', state: string, city?: string } }) => {
        setIsCreating(true);
        try {
            if (data.isTemporary) {
                // GUEST MODE: Do not hit the backend. Handle in RAM only.
                const { startTemporaryCase } = useAppStore.getState();
                startTemporaryCase({
                    title: data.title,
                    client: data.client,
                    legalSide: data.legalSide,
                    jurisdiction: data.jurisdiction
                });
                setIsModalOpen(false);
                router.push("/");
                return;
            }

            // PERSISTENT MODE: Normal Firebase flow
            const newCase = await createCase({
                title: data.title,
                client: data.client,
                status: 'DISCOVERY',
                role: 'LAWYER',
                legalSide: data.legalSide,
                isTemporary: false,
                jurisdiction: data.jurisdiction
            });
            setCases([newCase, ...cases]);
            setIsModalOpen(false);
        } catch (err: any) {
            alert("Failed to create case: " + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm("Are you sure you want to delete this case? Every mention of this case will be permanently removed from Firebase.")) {
            return;
        }

        try {
            await deleteCase(caseId);
            setCases(cases.filter(c => c.id !== caseId));

            // If the deleted case was active in the store, clear it
            const { activeCase, setActiveCase } = useAppStore.getState();
            if (activeCase?.id === caseId) {
                setActiveCase(null);
            }
        } catch (err: any) {
            // If already deleted centrally, just update local state
            if (err.message.includes("404") || err.message.includes("not found")) {
                setCases(cases.filter(c => c.id !== caseId));
            } else {
                alert("Failed to delete case: " + err.message);
            }
        }
    };

    if (role === 'COMMUNITY') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center px-4">
                <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                    <Briefcase className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Professional Feature Locked</h1>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    The Cases Dashboard and "Spaces" system is available exclusively for Legal Professionals.
                    Manage complex dockets with dedicated context isolation.
                </p>
                <div className="flex gap-4">
                    <Link href="/" className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all">
                        Home
                    </Link>
                    <button className="px-8 py-3 bg-primary text-black font-bold rounded-full hover:scale-105 transition-all">
                        Upgrade to Lawyer Mode
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <CaseCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateCase}
                isLoading={isCreating}
            />

            <div className="hidden md:block pb-20 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--primary)]" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Operational Dashboard</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Case Spaces</h1>
                        <p className="text-muted-foreground mt-2 font-medium">Manage your isolated RAG containers and review real-time AI insights.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search spaces..."
                                className="bg-accent/40 border border-white/10 rounded-full py-2.5 pl-10 pr-6 text-sm text-white focus:border-primary/50 outline-none w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black font-extrabold text-sm rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
                        >
                            <Plus className="w-5 h-5" /> New Space
                        </button>
                    </div>
                </div>

                {/* Featured Spaces */}
                <section>
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Active Matters</h2>
                        {error && <span className="text-red-500 text-[10px] font-bold uppercase">{error}</span>}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-3xl border border-white/5 animate-in fade-in duration-700">
                            <ThinkingLawyer message="Our AI Lawyer is organizing your case files..." />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {cases.length === 0 && (
                                <div className="col-span-full border-2 border-dashed border-white/5 rounded-3xl py-20 text-center">
                                    <p className="text-muted-foreground font-bold">No spaces found. Click "New Space" to begin.</p>
                                </div>
                            )}
                            {cases.map((c) => (
                                <div key={c.id} className="group relative bg-[#181818] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 hover:border-primary/50 hover:bg-[#222222] transition-all duration-500 overflow-hidden cursor-pointer shadow-2xl">
                                    {/* Background Glow */}
                                    <div className="absolute -top-24 -right-24 size-48 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br from-primary/20 to-transparent" />

                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex gap-5">
                                            <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent p-[2px] shadow-lg">
                                                <div className="size-full bg-black rounded-[14px] flex items-center justify-center">
                                                    <Briefcase className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white leading-tight group-hover:text-primary transition-colors">{c.title}</h3>
                                                <p className="text-muted-foreground text-xs font-bold mt-1.5 flex items-center gap-2">
                                                    <span>MATTER: {c.id.slice(-6).toUpperCase()}</span>
                                                    <span className="size-1 rounded-full bg-white/20" />
                                                    <span>{c.client}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteCase(e, c.id)}
                                            className="p-3 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-90 relative z-20"
                                            title="Delete Space"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3 relative z-10 group-hover:border-primary/20 transition-all">
                                        <div className="flex items-center gap-2">
                                            <Bot className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Context Agent</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                            {c.description || "Preparing matter context for legal analysis..."}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-6 border-t border-white/5 relative z-10">
                                        <div className="flex justify-between items-end mb-3">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-black text-white uppercase">{c.status}</span>
                                                    {c.legalSide && (
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border border-white/10 bg-white/5 text-muted-foreground">
                                                            {c.legalSide}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                                {new Date(c.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <Link href={`/?caseId=${c.id}`} className="block w-full text-center py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-primary hover:text-black hover:border-transparent transition-all group/btn mt-4">
                                            <span className="flex items-center justify-center gap-2">
                                                Launch Environment
                                                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Activity Log / Table */}
                <section className="bg-accent/10 border border-white/5 rounded-[2rem] overflow-hidden p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-black text-white tracking-tight">Audit Trail & Updates</h2>
                        </div>
                        <button className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors">
                            <Filter className="w-4 h-4" /> Filter Activity
                        </button>
                    </div>
                    <div className="space-y-4">
                        {cases.every(c => !c.researchHistory || c.researchHistory.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center border border-dashed border-white/10 rounded-2xl">
                                <Clock className="w-8 h-8 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No recent audit activity found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cases.flatMap(c => (c.researchHistory || []).map((h: any) => ({ ...h, caseTitle: c.title, caseId: c.id })))
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .slice(0, 6)
                                    .map((history, idx) => (
                                        <div key={idx} className="bg-black/40 border border-white/5 p-5 rounded-2xl hover:border-primary/30 transition-all group">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">AI Research</span>
                                                </div>
                                                <span className="text-[8px] font-medium text-muted-foreground">{new Date(history.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="text-white text-xs font-bold line-clamp-1 mb-2">Query: {history.query}</h4>
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{history.caseTitle}</span>
                                                </div>
                                                <Link href={`/research?caseId=${history.caseId}`} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
                                                    Review
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="block md:hidden relative -mx-4 -mt-4">
                <MobileCases
                    cases={cases}
                    isLoading={isLoading}
                    error={error}
                    onCreateCase={() => setIsModalOpen(true)}
                    onDeleteCase={handleDeleteCase}
                />
            </div>
        </>
    );
}
