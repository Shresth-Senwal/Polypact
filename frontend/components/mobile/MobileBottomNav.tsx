/**
 * @file MobileBottomNav.tsx
 * @description Professional animated navigation bar for PolyPact mobile.
 * @module frontend/components/mobile
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
    MessageSquare,
    ShieldAlert,
    Briefcase,
    FileText,
    Search
} from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";

export function MobileBottomNav() {
    const pathname = usePathname();
    const { activeCase } = useAppStore();

    if (pathname === "/login") return null;

    const items = [
        { label: "AI Chat", icon: MessageSquare, href: "/", id: "chat" },
        { label: "Drafting", icon: ShieldAlert, href: "/strategy", id: "strategy" },
        { label: "Cases", icon: Briefcase, href: "/cases", id: "cases" },
        { label: "Documents", icon: FileText, href: "/contracts", id: "contracts" },
        { label: "Research", icon: Search, href: "/research", id: "research" },
    ];

    return (
        <nav className="fixed bottom-0 left-0 w-full h-16 md:h-20 bg-[#121212]/90 border-t border-white/5 flex items-center justify-around px-4 z-50 backdrop-blur-2xl md:hidden overflow-hidden">
            <LayoutGroup>
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.id}
                            href={activeCase ? `${item.href}${item.href.includes('?') ? '&' : '?'}caseId=${activeCase.id}` : item.href}
                            className="relative h-full flex items-center justify-center flex-1"
                        >
                            <motion.div
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 group transition-all relative z-10 w-full",
                                    isActive ? "text-primary" : "text-white/30 hover:text-white/60"
                                )}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.8 }}
                                    className="relative p-2"
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-glow"
                                            className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon
                                        className={cn(
                                            "w-6 h-6 transition-all duration-500",
                                            isActive ? "text-primary drop-shadow-[0_0_12px_rgba(29,185,84,0.6)] scale-110" : ""
                                        )}
                                        fill={isActive ? "currentColor" : "none"}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />

                                    {isActive && (
                                        <motion.div
                                            layoutId="active-dot"
                                            className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-[#121212] z-20"
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        />
                                    )}
                                </motion.div>
                                <span className={cn(
                                    "text-[7.5px] font-black uppercase tracking-wider transition-all duration-300 text-center w-full px-1",
                                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                                )}>
                                    {item.label}
                                </span>
                            </motion.div>

                            {/* Magnetic Effect Mockup */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-x-2 inset-y-3 bg-white/[0.03] rounded-2xl border border-white/5 pointer-events-none"
                                    transition={{ type: "spring", stiffness: 300, damping: 35 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </LayoutGroup>

            {/* Ambient Base Light */}
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </nav>
    );
}
