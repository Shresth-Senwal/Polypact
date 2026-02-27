/**
 * @file MarkdownRenderer.tsx
 * @description Renders a string containing Markdown-like syntax into a styled premium UI.
 * @module frontend/components/shared
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // Basic logic to parse headers and lists since we don't have a library
    if (!content) return null;
    const lines = content.split('\n');


    return (
        <div className={cn("space-y-6 text-white/90 font-sans", className)}>
            {lines.map((line, idx) => {
                const trimmed = line.trim();

                // Numbered legal headers (1. TITLE)
                const numberedHeaderRegex = /^(\d+\.\s+)(.*)/;
                const match = trimmed.match(numberedHeaderRegex);
                if (match) {
                    return (
                        <div key={idx} className="pt-8 mb-6 border-b-2 border-primary/20 pb-4">
                            <h1 className="text-xl font-black text-white tracking-tighter flex items-baseline gap-2">
                                <span className="text-primary text-2xl">{match[1]}</span>
                                {match[2]}
                            </h1>
                        </div>
                    );
                }

                // Headers
                if (trimmed.startsWith('# ')) {
                    return (
                        <h1 key={idx} className="text-2xl font-black text-white tracking-tighter pt-8 border-b-4 border-primary/40 pb-4 mb-8">
                            {trimmed.slice(2)}
                        </h1>
                    );
                }
                if (trimmed.startsWith('## ')) {
                    return (
                        <h2 key={idx} className="text-lg font-bold text-primary tracking-widest pt-6 mb-4 flex items-center gap-3 border-l-2 border-primary/20 pl-4">
                            <span className="size-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                            {trimmed.slice(3)}
                        </h2>
                    );
                }
                if (trimmed.startsWith('### ')) {
                    return (
                        <h3 key={idx} className="text-base font-black text-white/80 tracking-tight pt-4 mb-2">
                            {trimmed.slice(4)}
                        </h3>
                    );
                }

                // Bold text (simple replacement)
                const boldRegex = /\*\*(.*?)\*\*/g;
                const parts = line.split(boldRegex);
                const renderedLine = parts.map((part, i) =>
                    i % 2 === 1 ? <strong key={i} className="text-primary font-black">{part}</strong> : part
                );

                // Lists
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                        <div key={idx} className="flex gap-4 pl-4 group">
                            <div className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                            <p className="text-sm leading-relaxed">{renderedLine}</p>
                        </div>
                    );
                }

                // Empty line
                if (trimmed === '') return <div key={idx} className="h-2" />;

                // Regular paragraph
                return (
                    <p key={idx} className="text-sm leading-8 font-medium pl-2 border-l border-white/5 hover:border-primary/20 transition-colors">
                        {renderedLine}
                    </p>
                );
            })}
        </div>
    );
}
