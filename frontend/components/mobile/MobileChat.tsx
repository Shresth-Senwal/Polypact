/**
 * @file MobileChat.tsx
 * @description Mobile-first chat interface for PolyPact.
 * @module frontend/components/mobile
 */

"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Menu,
    SlidersHorizontal,
    Bot,
    PlusCircle,
    Plus,
    ArrowUp,
    CheckCheck,
    History,
    X,
    ArrowRight,
    Trash2
} from "lucide-react";
import { Message, CaseContainer } from "../../../shared/types";
import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import { ThinkingLawyer } from "../shared/ThinkingLawyer";
import { motion, AnimatePresence } from "framer-motion";

interface MobileChatProps {
    messages: Message[];
    input: string;
    setInput: (val: string) => void;
    onSendMessage: (e?: React.FormEvent) => void;
    isLoading: boolean;
    isOCRLoading?: boolean;
    onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activeCase: CaseContainer | null;
    sessions?: any[];
    currentSessionId?: string | null;
    onSelectSession?: (id: string) => void;
    onAction?: (msgId: string, action: { label: string; value: string }, fileName?: string) => void;
    onNewChat?: () => void;
    onDeleteSession?: (sid: string) => void;
}

export function MobileChat({
    messages,
    input,
    setInput,
    onSendMessage,
    onAction,
    isLoading,
    isOCRLoading,
    onFileUpload,
    activeCase,
    sessions = [],
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession
}: MobileChatProps) {
    const { toggleMobileSidebar } = useAppStore();
    const [showHistory, setShowHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [input]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-white font-sans relative overflow-hidden">
            {/* App Header */}
            <header className="flex flex-col bg-background/95 backdrop-blur-md sticky top-0 z-20 border-b border-white/5 shrink-0 pt-[env(safe-area-inset-top)]">
                <div className="h-16 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleMobileSidebar}
                            className="size-10 flex items-center justify-center rounded-full active:bg-white/10 text-white/50 transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex flex-col items-center max-w-[60%]">
                        {!activeCase && (
                            <img src="/logo.svg" alt="PolyPact Logo" className="w-5 h-5 mb-1" />
                        )}
                        <h1 className="text-sm font-black tracking-tight text-white/50 truncate w-full text-center uppercase">
                            {activeCase ? activeCase.title : "PolyPact"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="size-10 flex items-center justify-center rounded-full active:bg-white/10 text-white/40 transition-colors"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onNewChat}
                            className="size-10 flex items-center justify-center bg-primary text-background rounded-full active:scale-90 transition-all shadow-lg shadow-primary/20 shrink-0"
                        >
                            <Plus className="w-5 h-5 font-black" />
                        </button>
                    </div>
                </div>

                {/* Sessions Slider (Hidden by default, used for quick access) */}
                {sessions.length > 0 && (
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                        {sessions.map((sess) => (
                            <button
                                key={sess.id}
                                onClick={() => onSelectSession?.(sess.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                    currentSessionId === sess.id
                                        ? "bg-primary text-background border-primary"
                                        : "bg-surface/50 text-white/40 border-white/5"
                                )}
                            >
                                {sess.title}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* History Overlay (Like Desktop) */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 bg-background z-[100] flex flex-col pt-[env(safe-area-inset-top)]"
                    >
                        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/95 backdrop-blur-md">
                            <div className="flex flex-col">
                                <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Session History</h2>
                                <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-0.5 opacity-60">Deep Case Logs</p>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="size-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"
                            >
                                <X className="w-5 h-5 text-white/40" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
                            {sessions.length === 0 && (
                                <div className="py-20 text-center opacity-10">
                                    <History className="size-12 mx-auto mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">No Previous Sessions</p>
                                </div>
                            )}
                            {sessions.map((sess) => (
                                <div
                                    key={sess.id}
                                    className={cn(
                                        "w-full rounded-2xl border transition-all flex items-center justify-between group overflow-hidden",
                                        currentSessionId === sess.id
                                            ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5"
                                            : "bg-surface/30 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    <button
                                        onClick={() => {
                                            onSelectSession?.(sess.id);
                                            setShowHistory(false);
                                        }}
                                        className="flex-1 p-4 text-left flex items-center justify-between min-w-0"
                                    >
                                        <div className="flex flex-col gap-0.5 pr-4 min-w-0">
                                            <span className="text-[13px] font-bold truncate tracking-tight">{sess.title}</span>
                                            <span className="text-[9px] font-black uppercase opacity-30 tracking-[0.2em]">{new Date(sess.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <ArrowRight className={cn("size-4 shrink-0 transition-colors", currentSessionId === sess.id ? "text-primary" : "text-white/10")} />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Delete this chat session?")) {
                                                onDeleteSession?.(sess.id);
                                            }
                                        }}
                                        className="p-4 text-white/20 hover:text-red-400 active:bg-red-500/10 transition-colors border-l border-white/5"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-black/40">
                            <button
                                onClick={() => {
                                    onNewChat?.();
                                    setShowHistory(false);
                                }}
                                className="w-full py-4 bg-primary text-background font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl flex items-center justify-center gap-2"
                            >
                                <PlusCircle className="size-4" />
                                Start New Analysis
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Stream */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scroll-smooth no-scrollbar relative"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-20 py-20">
                        <Bot className="w-12 h-12 mb-4" />
                        <p className="text-sm font-bold">Initialize legal intelligence session.</p>
                    </div>
                )}

                {messages.map((msg) => {
                    if (msg.role === 'system') {
                        return (
                            <div key={msg.id} className="flex flex-col items-center gap-3 py-2 animate-in fade-in duration-500">
                                <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[12px] text-primary">analytics</span>
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{msg.content}</span>
                                </div>
                                {msg.actions && (
                                    <div className="flex flex-wrap justify-center gap-2 px-4">
                                        {msg.actions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onAction?.(msg.id, action, msg.metadata?.fileName)}
                                                className="px-4 py-2 bg-surface border border-white/5 rounded-full text-[10px] font-black uppercase text-white/40 active:text-primary active:border-primary/40 transition-all"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex items-end gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <div className={cn(
                                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-lg",
                                msg.role === 'user' ? "bg-surface border border-white/5" : "bg-gradient-to-tr from-primary to-green-300"
                            )}>
                                {msg.role === 'user' ? (
                                    <span className="text-[9px] font-black text-white/40 uppercase">Me</span>
                                ) : (
                                    <Bot className="w-4 h-4 text-background" />
                                )}
                            </div>
                            <div className={cn(
                                "flex flex-col gap-1 max-w-[85%]",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "rounded-2xl shadow-2xl",
                                    msg.role === 'user'
                                        ? "bg-primary text-background p-3 md:p-4 rounded-tr-none font-bold text-[14px] md:text-[15px]"
                                        : "bg-surface/40 backdrop-blur-xl border border-white/5 p-4 md:p-6 rounded-tl-none w-full text-[14px] md:text-[15px]"
                                )}>
                                    {msg.role === 'assistant' ? (
                                        <>
                                            <MarkdownRenderer
                                                content={msg.content}
                                                className="text-[14px] md:text-[15px] leading-relaxed"
                                            />
                                            {msg.citations && msg.citations.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Plus className="w-2.5 h-2.5 text-primary animate-pulse" />
                                                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Verified Sources</span>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {msg.citations.slice(0, 3).map((cit, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={cit.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-0.5 active:bg-primary/5 transition-colors"
                                                            >
                                                                <span className="text-[10px] font-bold text-white/70 line-clamp-1">{cit.title}</span>
                                                                {cit.court && <span className="text-[7px] font-black text-white/20 uppercase tracking-widest leading-none">{cit.court}</span>}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/10 mt-1 flex items-center gap-1 uppercase tracking-widest">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.role === 'user' && <CheckCheck className="w-2 h-2 text-primary" />}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-500">
                        <ThinkingLawyer
                            message="PolyPact is thinking..."
                            className="!p-0 scale-75"
                        />
                    </div>
                )}

                {/* Spacer for input overlap */}
                <div className="h-48 shrink-0" />
            </main>

            {/* Input Footer */}
            <footer className="fixed bottom-[64px] inset-x-0 bg-background/95 backdrop-blur-xl border-t border-white/5 pt-1 pb-1 px-3 z-40">
                <form
                    onSubmit={onSendMessage}
                    className="max-w-[800px] mx-auto flex flex-col gap-3"
                >
                    <div className="bg-surface border border-white/5 rounded-3xl p-3 flex shadow-2xl focus-within:border-white/20 transition-all relative overflow-hidden">
                        {isOCRLoading && (
                            <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">
                                    Analyzing Document...
                                </span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isOCRLoading}
                            className={cn(
                                "w-12 h-12 flex items-center justify-center transition-colors",
                                isOCRLoading ? "text-primary animate-pulse" : "text-white/30 hover:text-primary"
                            )}
                        >
                            <PlusCircle className="w-6 h-6" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv"
                            onChange={onFileUpload}
                        />
                        <textarea
                            ref={textareaRef}
                            className="flex-1 bg-transparent border-none focus:ring-0 outline-none focus:outline-none text-[14px] text-white placeholder-white/20 resize-none min-h-[32px] max-h-[100px] py-1.5 px-1 no-scrollbar overflow-y-auto leading-tight"
                            placeholder="Type a legal query..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSendMessage();
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-90",
                                input.trim() && !isLoading ? "bg-primary text-background" : "bg-white/5 text-white/10"
                            )}
                        >
                            <ArrowUp className="w-4 h-4 font-black" />
                        </button>
                    </div>
                    <p className="text-center text-[6px] font-black text-white/10 uppercase tracking-[0.4em] mt-1">
                        POLYPACT CAN MAKE MISTAKES
                    </p>
                </form>
            </footer>
        </div>
    );
}
