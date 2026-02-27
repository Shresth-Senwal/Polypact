"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Scale, Users } from "lucide-react";

export function ModeToggle() {
    const { role, toggleRole } = useAppStore();

    return (
        <div className="px-6 py-2">
            <button
                onClick={toggleRole}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 border border-transparent",
                    role === "LAWYER"
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                )}
            >
                {role === "LAWYER" ? (
                    <Scale className="w-4 h-4" />
                ) : (
                    <Users className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                    {role === "LAWYER" ? "Lawyer Mode" : "Community Mode"}
                </span>
            </button>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
                {role === "LAWYER"
                    ? "Full access to all legal tools and case management."
                    : "Restricted access to public legal resources."}
            </p>
        </div>
    );
}
