"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
    label: string;
    icon: string;
    href: string;
    id: string;
    filled?: boolean;
}

const LAWYER_ITEMS: NavItem[] = [
    { label: "AI Chat", icon: "robot", href: "/", id: "chat" },
    { label: "Cases", icon: "work", href: "/cases", id: "cases", filled: true },
    { label: "Research", icon: "travel_explore", href: "/research", id: "research" },
    { label: "Documents", icon: "description", href: "/contracts", id: "contracts" },
    { label: "Drafting", icon: "analytics", href: "/strategy", id: "strategy" },
    { label: "Brain Map", icon: "neurology", href: "/brain-map", id: "brain-map" },
];

const COMMUNITY_ITEMS: NavItem[] = [
    { label: "AI Chat", icon: "robot", href: "/", id: "chat" },
    { label: "Contract Review", icon: "gavel", href: "/contracts", id: "contracts" },
];

import { useAuth } from "@/components/shared/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { fetchCases } from "@/lib/api";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlCaseId = searchParams.get("caseId");

    const { role, activeCase, setActiveCase, cases, setCases, isMainSidebarCollapsed, setMainSidebarCollapsed } = useAppStore();
    const { user } = useAuth();
    const [isCaseSelectorOpen, setIsCaseSelectorOpen] = useState(false);

    // Initial load of cases
    useEffect(() => {
        if (user && role === "LAWYER" && cases.length === 0) {
            const load = async () => {
                try {
                    const data = await fetchCases();
                    setCases(data);
                } catch (err) {
                    console.error("Sidebar case fetch failed:", err);
                }
            };
            load();
        }
    }, [user, role, cases.length, setCases]);

    // Sync activeCase with URL
    useEffect(() => {
        if (urlCaseId && role === "LAWYER") {
            if (!activeCase || activeCase.id !== urlCaseId) {
                // If cases are already loaded, find it
                if (cases.length > 0) {
                    const found = cases.find(c => c.id === urlCaseId);
                    if (found) {
                        setActiveCase(found);
                    }
                } else if (user) {
                    // Fallback: fetch cases if not yet loaded
                    const loadAndSync = async () => {
                        try {
                            const data = await fetchCases();
                            setCases(data);
                            const found = data.find(c => c.id === urlCaseId);
                            if (found) setActiveCase(found);
                        } catch (err) {
                            console.error("Fallback sync failed:", err);
                        }
                    };
                    loadAndSync();
                }
            }
        }
    }, [urlCaseId, cases, activeCase, role, user, setActiveCase, setCases]);

    if (pathname === "/login") return null;

    const handleLogout = async () => {
        await signOut(auth);
    };

    const items = role === "LAWYER" ? LAWYER_ITEMS : COMMUNITY_ITEMS;
    const initials = user?.displayName ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase() : "U";

    return (
        <aside
            onMouseEnter={() => setMainSidebarCollapsed(false)}
            onMouseLeave={() => setMainSidebarCollapsed(true)}
            className={cn(
                "hidden md:flex flex-shrink-0 flex-col border-r border-white/5 glass-dark z-50 transition-all duration-300 ease-in-out relative",
                isMainSidebarCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Header / Logo */}
            <div className={cn("p-6 pb-6", isMainSidebarCollapsed && "p-4 flex flex-col items-center")}>
                <div className={cn("flex flex-col gap-1 mb-8", isMainSidebarCollapsed && "items-center")}>
                    <div className={cn("flex items-center gap-3 mb-2", isMainSidebarCollapsed && "mb-0")}>
                        <img
                            src="/logo.svg"
                            alt="PolyPact Logo"
                            className={cn(
                                "transition-all duration-500",
                                isMainSidebarCollapsed ? "w-8 h-8" : "w-10 h-10"
                            )}
                        />
                        {!isMainSidebarCollapsed && (
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-white font-black tracking-tighter font-display italic text-3xl"
                            >
                                POLYPACT
                            </motion.h1>
                        )}
                    </div>
                    {isMainSidebarCollapsed && (
                        <h1 className="text-white font-black tracking-tighter font-display italic text-[10px] -rotate-0 mt-1">
                            POLY
                        </h1>
                    )}
                    {!isMainSidebarCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="h-0.5 w-4 bg-primary rounded-full" />
                            <p className="text-primary text-[9px] font-black uppercase tracking-[0.4em] italic opacity-80">
                                {role === "LAWYER" ? "Legal AI Professional" : "Legal AI Standard"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Case Selector */}
                {role === "LAWYER" && (
                    <div className="relative w-full">
                        <button
                            onClick={() => setIsCaseSelectorOpen(!isCaseSelectorOpen)}
                            className={cn(
                                "w-full flex items-center glass border border-white/10 rounded-2xl hover:border-primary/50 transition-all shadow-2xl group relative overflow-hidden",
                                isMainSidebarCollapsed ? "h-12 justify-center px-0" : "h-14 justify-between px-5"
                            )}
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className={cn("flex items-center gap-4 overflow-hidden relative z-10", isMainSidebarCollapsed ? "justify-center" : "")}>
                                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                                    {activeCase ? 'token' : 'view_in_ar'}
                                </span>
                                {!isMainSidebarCollapsed && (
                                    <div className="text-left truncate">
                                        <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">Active Matter</p>
                                        <p className="text-sm font-bold text-white truncate tracking-tight">{activeCase?.title || "Select Matter..."}</p>
                                    </div>
                                )}
                            </div>
                            {!isMainSidebarCollapsed && (
                                <span className={cn(
                                    "material-symbols-outlined text-text-muted text-[18px] transition-transform relative z-10",
                                    isCaseSelectorOpen ? "rotate-180" : ""
                                )}>expand_more</span>
                            )}
                        </button>

                        <AnimatePresence>
                            {isCaseSelectorOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={cn(
                                        "absolute top-full mt-3 bg-[#08090a] border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.95)] z-[100] py-3 max-h-72 overflow-y-auto hide-scrollbar",
                                        isMainSidebarCollapsed ? "left-0 w-64" : "left-0 w-full"
                                    )}
                                >
                                    {cases.length === 0 && (
                                        <div className="px-5 py-6 text-[9px] font-black text-text-muted uppercase tracking-widest text-center italic">
                                            Signal Lost: No Spaces
                                        </div>
                                    )}
                                    {cases.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setActiveCase(c);
                                                setIsCaseSelectorOpen(false);
                                                // Update URL to reflect selected case and CLEAR sessionId
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set("caseId", c.id);
                                                params.delete("sessionId");
                                                router.push(`${pathname}?${params.toString()}`);
                                            }}
                                            className={cn(
                                                "w-full px-5 py-4 flex flex-col gap-1 hover:bg-white/5 text-left transition-all group/opt",
                                                activeCase?.id === c.id ? "bg-primary/10 border-l-4 border-primary" : "border-l-4 border-transparent"
                                            )}
                                        >
                                            <span className="text-sm font-bold text-white truncate group-hover/opt:text-primary transition-colors">{c.title}</span>
                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none opacity-50">{c.client}</span>
                                        </button>
                                    ))}
                                    <div className="mt-3 border-t border-white/5 p-3">
                                        <Link
                                            href="/cases"
                                            onClick={() => setIsCaseSelectorOpen(false)}
                                            className="flex items-center justify-center gap-3 py-3 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/10 rounded-xl transition-all border border-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">settings_accessibility</span>
                                            Manage Matters
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto hide-scrollbar">
                {items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.id}
                            href={activeCase ? `${item.href}${item.href.includes('?') ? '&' : '?'}caseId=${activeCase.id}` : item.href}
                            className={cn(
                                "flex items-center gap-4 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                                isMainSidebarCollapsed ? "px-0 justify-center h-12" : "px-4 py-4 rounded-2xl",
                                isActive
                                    ? "glass text-white shadow-xl shadow-primary/5"
                                    : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-glow"
                                    className="absolute inset-0 bg-primary/5 z-0"
                                />
                            )}
                            <span
                                className={cn(
                                    "material-symbols-outlined transition-all duration-500 relative z-10",
                                    isActive ? "text-primary scale-110 drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]" : "group-hover:text-primary group-hover:scale-110"
                                )}
                                style={{
                                    fontVariationSettings: isActive || item.filled ? "'FILL' 1" : "'FILL' 0"
                                }}
                            >
                                {item.icon}
                            </span>
                            {!isMainSidebarCollapsed && (
                                <span className="text-sm font-bold tracking-tight relative z-10">{item.label}</span>
                            )}

                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute left-0 w-1.5 h-8 bg-primary rounded-full -translate-x-1 shadow-[0_0_15px_rgba(29,185,84,0.8)]"
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-6 border-t border-white/5 glass-dark bg-black/40">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center justify-center gap-3 text-white/40 hover:text-red-400 glass border border-white/5 hover:border-red-500/30 rounded-2xl transition-all group mb-3",
                        isMainSidebarCollapsed ? "h-12 px-0" : "px-4 py-4"
                    )}
                >
                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform text-[20px]">power_settings_new</span>
                    {!isMainSidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.3em]">Logout</span>}
                </button>

                <div className={cn(
                    "flex items-center glass border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden group/profile",
                    isMainSidebarCollapsed ? "h-12 justify-center px-0" : "gap-4 px-4 py-4"
                )}>
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                    <div className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-[10px] font-black text-primary shadow-inner relative z-10 group-hover/profile:border-primary/50 transition-colors shrink-0">
                        {initials}
                    </div>
                    {!isMainSidebarCollapsed && (
                        <div className="flex flex-col min-w-0 relative z-10">
                            <span className="text-sm font-black text-white truncate leading-none tracking-tight">{user?.displayName || "User"}</span>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="size-1 rounded-full bg-primary animate-pulse" />
                                <span className="text-[8px] text-text-muted uppercase tracking-[0.2em] font-black opacity-60">
                                    {role === "LAWYER" ? "Partner_v2.0" : "Comm_Node"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
