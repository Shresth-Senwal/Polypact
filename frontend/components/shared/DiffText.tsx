/**
 * @file DiffText.tsx
 * @description Component to display semantic diffs between two text versions.
 * @module frontend/components/shared
 */

import React from 'react';
import { computeDiff, DiffPart } from '@/lib/diff';
import { cn } from '@/lib/utils';

interface DiffTextProps {
    original: string;
    revised: string;
    className?: string;
}

export function DiffText({ original, revised, className }: DiffTextProps) {
    const diffs = computeDiff(original, revised);

    return (
        <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>
            {diffs.map((part, i) => (
                <span
                    key={i}
                    className={cn(
                        part.type === 'added' && "bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(29,185,84,0.1)]",
                        part.type === 'removed' && "bg-red-500/20 text-red-500 line-through decoration-red-500/50",
                        part.type === 'equal' && "opacity-80"
                    )}
                >
                    {part.value}
                </span>
            ))}
        </div>
    );
}
