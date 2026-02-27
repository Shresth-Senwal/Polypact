"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    X,
    History,
    Settings,
    HelpCircle,
    LogOut,
    LayoutDashboard,
    Briefcase,
    FileText,
    Bot,
    Scale,
    ArrowRightIcon,
    Search
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModeToggle } from "../shared/ModeToggle";

import { useAuth } from "../shared/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export function MobileSidebar() {
    const {
        isMobileSidebarOpen,
        toggleMobileSidebar,
        role,
        activeCase,
        setActiveCase,
        cases,
        setCases,
        chatSessions,
        activeSessionId,
        setActiveSessionId
    } = useAppStore();
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCaseSelectorOpen, setIsCaseSelectorOpen] = useState(false);

    useEffect(() => {
        if (user && role === "LAWYER" && cases.length === 0) {
            const load = async () => {
                try {
                    const { fetchCases } = await import("@/lib/api");
                    const data = await fetchCases();
                    setCases(data);
                } catch (err) {
                    console.error("Mobile sidebar case fetch failed:", err);
                }
            };
            load();
        }
    }, [user, role, cases.length, setCases]);

    if (pathname === "/login") return null;

    const handleLogout = async () => {
        await signOut(auth);
        toggleMobileSidebar();
    };

    const menuItems = [
        { id: 'chat', label: 'AI Chat', icon: Bot, href: '/' },
        { id: 'cases', label: 'Cases', icon: Briefcase, href: '/cases' },
        { id: 'research', label: 'Research', icon: Search, href: '/research' },
        { id: 'contracts', label: 'Documents', icon: FileText, href: '/contracts' },
        { id: 'strategy', label: 'Drafting', icon: Scale, href: '/strategy' },
    ];

    const sidebarVariants: Variants = {
        closed: {
            x: "-100%",
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        open: {
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        }
    };

    const overlayVariants: Variants = {
        closed: { opacity: 0 },
        open: { opacity: 1 }
    };

    return (
        <AnimatePresence>
            {isMobileSidebarOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={overlayVariants}
                        onClick={toggleMobileSidebar}
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm md:hidden"
                    />

                    {/* Navigation Drawer */}
                    <motion.aside
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={sidebarVariants}
                        className="fixed top-0 left-0 z-[101] h-[100dvh] w-full max-w-[320px] bg-[#212121] shadow-2xl flex flex-col border-r border-white/5 md:hidden overflow-hidden"
                    >
                        {/* Drawer Header / Profile */}
                        <div className="relative px-6 pt-8 pb-6 flex flex-col gap-6 border-b border-white/10 bg-[#212121]">
                            <div className="flex items-center gap-3 mb-2">
                                <img src="/logo.svg" alt="PolyPact Logo" className="w-8 h-8" />
                                <h1 className="text-xl font-black text-white italic tracking-tighter font-display uppercase">PolyPact</h1>
                            </div>
                            {/* Close Button */}
                            <button
                                onClick={toggleMobileSidebar}
                                aria-label="Close menu"
                                className="absolute top-4 right-4 size-10 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Profile Info */}
                            <div className="flex items-center gap-4">
                                <div className="size-16 rounded-full bg-surface border border-border flex items-center justify-center text-xl font-black text-primary shadow-inner">
                                    {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h2 className="text-xl font-bold text-white leading-tight tracking-tight">{user?.displayName || "User"}</h2>
                                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 w-fit">
                                        <span className="text-[10px] font-black text-primary tracking-widest uppercase">
                                            {role === "LAWYER" ? "Lawyer" : "Community"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Case Selector */}
                            {role === "LAWYER" && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsCaseSelectorOpen(!isCaseSelectorOpen)}
                                        className="w-full min-h-[56px] flex items-center justify-between px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all shadow-xl"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden text-left">
                                            <Briefcase className="w-5 h-5 text-primary shrink-0" />
                                            <div className="truncate">
                                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Active Space</p>
                                                <p className="text-sm font-bold text-white truncate">{activeCase?.title || "Select Space..."}</p>
                                            </div>
                                        </div>
                                        <X className={cn("w-4 h-4 text-white/40 transition-transform", isCaseSelectorOpen ? "rotate-90" : "rotate-0")} style={{ transform: isCaseSelectorOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                    </button>

                                    {isCaseSelectorOpen && (
                                        <div className="mt-2 bg-black/40 border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {cases.length === 0 && (
                                                <div className="px-4 py-3 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">
                                                    No active spaces
                                                </div>
                                            )}
                                            <div className="max-h-[100px] overflow-y-auto custom-scrollbar">
                                                {cases.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            setActiveCase(c);
                                                            setIsCaseSelectorOpen(false);
                                                            toggleMobileSidebar();
                                                            // Sync URL
                                                            const params = new URLSearchParams(searchParams.toString());
                                                            params.set("caseId", c.id);
                                                            params.delete("sessionId");
                                                            router.push(`${pathname}?${params.toString()}`);
                                                        }}
                                                        className={cn(
                                                            "w-full px-4 py-2.5 flex flex-col gap-0.5 hover:bg-white/10 text-left transition-colors",
                                                            activeCase?.id === c.id ? "bg-primary/10 border-l-2 border-primary" : ""
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold text-white truncate">{c.title}</span>
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">{c.client}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <Link
                                                href="/cases"
                                                onClick={toggleMobileSidebar}
                                                className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-white/5 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-white/10"
                                            >
                                                Manage Spaces <ArrowRightIcon className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scrollable Navigation Area */}
                        <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
                            {/* Primary Feature: Brain Map Toggle */}
                            <Link
                                href={activeCase ? `/brain-map?caseId=${activeCase.id}` : "/brain-map"}
                                onClick={toggleMobileSidebar}
                                className={cn(
                                    "group flex w-full items-center gap-4 rounded-xl px-4 py-3 min-h-[52px] transition-all",
                                    pathname === '/brain-map'
                                        ? "bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(29,185,84,0.1)]"
                                        : "bg-white/5 border border-white/5 hover:bg-white/10"
                                )}
                            >
                                <span className={cn("material-symbols-outlined text-2xl transition-transform group-active:scale-95", pathname === '/brain-map' ? "text-primary" : "text-gray-400")}>
                                    neurology
                                </span>
                                <span className={cn("text-base font-bold tracking-tight", pathname === '/brain-map' ? "text-primary" : "text-white")}>Brain Map</span>
                                {pathname === '/brain-map' && <span className="ml-auto size-2 rounded-full bg-primary shadow-[0_0_8px_#1db954]"></span>}
                            </Link>

                            {/* Divider */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>

                            {/* Standard Nav Items */}
                            {menuItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={activeCase ? `${item.href}${item.href.includes('?') ? '&' : '?'}caseId=${activeCase.id}` : item.href}
                                    onClick={toggleMobileSidebar}
                                    className={cn(
                                        "group flex w-full items-center gap-4 rounded-lg px-4 py-2.5 min-h-[48px] transition-all",
                                        pathname === item.href
                                            ? "bg-white/10 text-white"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-base font-medium">{item.label}</span>
                                </Link>
                            ))}

                            <div className="h-px w-full bg-white/5 my-4"></div>
                        </nav>

                        {/* Footer / Logout */}
                        <div className="mt-auto px-6 py-5 border-t border-white/10 bg-[#212121]">
                            <div className="mb-4 -mx-6 scale-95 origin-left">
                                <ModeToggle />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="group flex w-full items-center justify-start gap-3 text-red-500 hover:text-red-400 transition-colors min-h-[44px]"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-base font-bold">Log Out</span>
                            </button>
                            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                <span>PolyPact v2.4.0</span>
                                <span>© 2024</span>
                            </div>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
