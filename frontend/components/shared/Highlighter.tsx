import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HighlighterProps {
    text: string;
    highlightSnippet?: string | null;
    preAnchor?: string | null;
    postAnchor?: string | null;
    className?: string;
    activeId?: string | null;
    variant?: 'primary' | 'destructive';
}

/**
 * Robust Highlighting Engine
 * Handles "Pattern too long" issues by avoiding Bitap/DMP for large snippets.
 * Uses a multi-pass approach: Anchored Exact -> Exact -> Case-Insensitive -> Whitespace-Agnostic.
 */
export function Highlighter({ text, highlightSnippet, preAnchor, postAnchor, className, variant = 'primary' }: HighlighterProps) {
    const result = useMemo(() => {
        if (!highlightSnippet || !text) {
            return { parts: [text], match: null };
        }

        const cleanSnippet = highlightSnippet.trim();
        if (!cleanSnippet) return { parts: [text], match: null };

        // 1. Anchored Exact Match (Highest Precision)
        // If we have anchors, try to find the full sequence
        let matchIndex = -1;
        let matchLength = cleanSnippet.length;

        if (preAnchor || postAnchor) {
            const fullPattern = `${preAnchor || ""}${cleanSnippet}${postAnchor || ""}`;
            const patternIdx = text.indexOf(fullPattern);
            if (patternIdx !== -1) {
                matchIndex = patternIdx + (preAnchor?.length || 0);
            }
        }

        // 2. Simple Exact Match
        if (matchIndex === -1) {
            matchIndex = text.indexOf(cleanSnippet);
            matchLength = cleanSnippet.length;
        }

        // 2. Case-Insensitive Match
        if (matchIndex === -1) {
            matchIndex = text.toLowerCase().indexOf(cleanSnippet.toLowerCase());
        }

        // 3. Whitespace-Agnostic Match
        // This handles cases where the LLM might have changed newline characters to spaces or vice versa
        if (matchIndex === -1) {
            const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
            const normalizedText = text.replace(/\s+/g, ' ');
            const normalizedSnippet = collapse(cleanSnippet);

            const normIndex = normalizedText.indexOf(normalizedSnippet);
            if (normIndex !== -1) {
                // Approximate back-mapping to original text
                // Since we only collapsed whitespace, we can try to find a sequence 
                // that matches the words.
                const words = normalizedSnippet.split(' ');
                if (words.length > 0) {
                    const firstWord = words[0];
                    const lastWord = words[words.length - 1];

                    // Simple heuristic: find first word start and last word end in original text
                    // roughly where the normalized index suggests
                    const searchStart = Math.max(0, normIndex - 50);
                    const startIdx = text.toLowerCase().indexOf(firstWord.toLowerCase(), searchStart);

                    if (startIdx !== -1) {
                        const endIdx = text.toLowerCase().indexOf(lastWord.toLowerCase(), startIdx + normalizedSnippet.length - 50);
                        if (endIdx !== -1) {
                            matchIndex = startIdx;
                            matchLength = (endIdx + lastWord.length) - startIdx;
                        }
                    }
                }
            }
        }

        if (matchIndex !== -1) {
            const foundText = text.substring(matchIndex, matchIndex + matchLength);

            return {
                parts: [
                    text.substring(0, matchIndex),
                    text.substring(matchIndex + matchLength)
                ],
                match: foundText
            };
        }

        return { parts: [text], match: null };
    }, [text, highlightSnippet, preAnchor, postAnchor]);

    if (!result.match) {
        return <div className={cn("whitespace-pre-wrap", className)}>{text}</div>;
    }

    const highlightClass = variant === 'destructive'
        ? "bg-red-500/40 text-white font-bold ring-1 ring-red-500/50 px-0.5 rounded animate-in fade-in zoom-in duration-500 scroll-mt-32 inline-block shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        : "bg-primary/40 text-white font-bold ring-1 ring-primary/50 px-0.5 rounded animate-in fade-in zoom-in duration-500 scroll-mt-32 inline-block shadow-[0_0_15px_rgba(var(--primary),0.3)]";

    return (
        <div className={cn("whitespace-pre-wrap", className)}>
            {result.parts[0]}
            <span
                id="active-highlight"
                className={highlightClass}
            >
                {result.match}
            </span>
            {result.parts[1]}
        </div>
    );
}
