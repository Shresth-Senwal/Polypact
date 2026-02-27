"use client";

import { useState } from "react";
import { X, Briefcase, User, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CaseCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        client: string;
        legalSide: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL";
        isTemporary: boolean;
        jurisdiction?: { country: 'IN', state: string, city?: string }
    }) => void;
    isLoading: boolean;
}

export function CaseCreationModal({ isOpen, onClose, onSubmit, isLoading }: CaseCreationModalProps) {
    const [title, setTitle] = useState("");
    const [client, setClient] = useState("");
    const [legalSide, setLegalSide] = useState<"PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL">("PROSECUTION");
    const [isTemporary, setIsTemporary] = useState(false);
    const [jurisdictionState, setJurisdictionState] = useState("");
    const [jurisdictionCity, setJurisdictionCity] = useState("");
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && client && jurisdictionState) {
            onSubmit({
                title,
                client,
                legalSide,
                isTemporary,
                jurisdiction: {
                    country: 'IN',
                    state: jurisdictionState,
                    city: jurisdictionCity || undefined
                }
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto no-scrollbar">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Create New Space</h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium leading-relaxed">Initialize a new isolated environment for legal analysis.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 px-1">Matter Title</label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="e.g. Antitrust Litigation 2024"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-6 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 px-1">Client Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="e.g. Global Tech Solutions Inc."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-6 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium"
                                value={client}
                                onChange={(e) => setClient(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Jurisdiction Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 px-1">Jurisdiction (State/UT)</label>
                            <div
                                onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                                className={cn(
                                    "w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white outline-none transition-all font-medium cursor-pointer flex items-center justify-between hover:bg-white/10",
                                    isStateDropdownOpen && "border-primary/50 bg-white/10"
                                )}
                            >
                                <span className={cn(!jurisdictionState && "text-muted-foreground")}>
                                    {jurisdictionState || "Select State / UT"}
                                </span>
                                <div className={cn("transition-transform duration-200", isStateDropdownOpen ? "rotate-180" : "rotate-0")}>
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isStateDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsStateDropdownOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#1A1C1E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="max-h-[250px] overflow-y-auto no-scrollbar py-2">
                                                {[
                                                    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
                                                    "Delhi & NCR", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
                                                ].sort().map((state) => (
                                                    <div
                                                        key={state}
                                                        onClick={() => {
                                                            setJurisdictionState(state);
                                                            setIsStateDropdownOpen(false);
                                                        }}
                                                        className={cn(
                                                            "px-5 py-3 text-sm transition-colors cursor-pointer hover:bg-primary/10 hover:text-primary",
                                                            jurisdictionState === state ? "text-primary bg-primary/5 font-bold" : "text-white/70"
                                                        )}
                                                    >
                                                        {state}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 px-1">City (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Mumbai"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium"
                                value={jurisdictionCity}
                                onChange={(e) => setJurisdictionCity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 px-1">Case Type / Domain</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {(['PROSECUTION', 'DEFENSE', 'CORPORATE', 'FINANCIAL', 'CIVIL', 'GENERAL'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setLegalSide(type)}
                                    className={cn(
                                        "py-2.5 rounded-lg border font-bold text-[10px] uppercase tracking-widest transition-all",
                                        legalSide === type
                                            ? "bg-primary text-black border-primary"
                                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 
                    <div className="flex items-center gap-3 py-2">
                        <div
                            onClick={() => setIsTemporary(!isTemporary)}
                            className={cn(
                                "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors relative",
                                isTemporary ? "bg-primary" : "bg-white/10"
                            )}
                        >
                            <div className={cn(
                                "size-4 rounded-full bg-white shadow-sm transition-transform",
                                isTemporary ? "translate-x-4" : "translate-x-0"
                            )} />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer" onClick={() => setIsTemporary(!isTemporary)}>
                            Guest Mode (Temporary)
                        </span>
                    </div>
                */}

                    <div className="pt-2 pb-16">
                        <button
                            type="submit"
                            disabled={isLoading || !title || !client || !jurisdictionState}
                            className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isTemporary ? "Start Session" : "Initialize Space"}</span>
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
