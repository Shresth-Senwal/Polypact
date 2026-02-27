/**
 * @file LayoutWrapper.tsx
 * @description Client-side wrapper for the main layout to handle dynamic styling.
 * @module frontend/components/shared
 */

"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "@/components/mobile/MobileSidebar";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { PageTransition } from "./PageTransition";

interface LayoutWrapperProps {
    children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isCasesPage = pathname === "/cases";

    return (
        <>
            <Sidebar />
            <MobileSidebar />
            <MobileBottomNav />

            <main className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden relative pb-20 md:pb-0 w-full max-w-full",
                isCasesPage && "no-scrollbar"
            )}>
                <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-background pointer-events-none h-64 opacity-50 w-full" />
                <div className="relative z-10 p-4 md:p-8 w-full max-w-full h-full">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </div>
            </main>
        </>
    );
}
