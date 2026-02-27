/**
 * @file page.tsx
 * @description Main Chat interface (ChatGPT styled) with multiple sessions per case.
 * @module frontend/app
 */

"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MobileChat } from "@/components/mobile/MobileChat";
import { extractTextFromFile } from "@/lib/documentProcessor";
import { sendChatMessage, fetchCases, fetchCaseById, uploadCaseFile, fetchChatSessions, createChatSession, fetchChatSession, deleteChatSession } from "@/lib/api";
import { Message, CaseContainer } from "../../shared/types";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ThinkingLawyer } from "@/components/shared/ThinkingLawyer";
import { Plus, MessageSquare, History, FileText, ChevronRight, LayoutDashboard, Search, Settings, PanelLeft, Trash2, Sparkles, ArrowRightIcon } from "lucide-react";

const SUGGESTIONS = [
  { label: "Check Precedents", icon: "gavel" },
  { label: "Draft NDA", icon: "edit_document" },
  { label: "Analyze Jurisdiction", icon: "public" },
  { label: "Identify Risks", icon: "warning" }
];

export default function ChatPage() {
  const { role, activeCase: globalActiveCase, setActiveCase: setGlobalActiveCase, isChatHistoryCollapsed, setChatHistoryCollapsed, toggleChatHistory } = useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlCaseId = searchParams.get("caseId");
  const urlSessionId = searchParams.get("sessionId");

  const caseId = urlCaseId || globalActiveCase?.id;
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCase, setActiveCase] = useState<CaseContainer | null>(
    (globalActiveCase?.id === urlCaseId) ? globalActiveCase : null
  );
  const [sessions, setSessions] = useState<any[]>([]);
  const { setChatSessions, setActiveSessionId } = useAppStore();

  // Sync with global store for mobile sidebar access
  useEffect(() => {
    setChatSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOCRLoading, setIsOCRLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingMessageRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Sync session ID with URL
  useEffect(() => {
    if (urlSessionId !== sessionId) {
      setSessionId(urlSessionId);
    }
  }, [urlSessionId]);

  // Sync case ID and load data
  useEffect(() => {
    if (urlCaseId && (!activeCase || activeCase.id !== urlCaseId)) {
      // If we have a urlCaseId, we should ensure local activeCase matches or is loading
      if (globalActiveCase?.id === urlCaseId) {
        setActiveCase(globalActiveCase);
      }
    }
  }, [urlCaseId, globalActiveCase]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
    }
  }, [input]);

  // -- RESET ON CASE SWITCH --
  useEffect(() => {
    // Reset session and messages if the case actually switched
    if (caseId && (!globalActiveCase || globalActiveCase.id !== caseId)) {
      setSessionId(null);
      setMessages([]);
      setSessions([]);
    }
  }, [caseId]);

  // Load Case and Sessions
  useEffect(() => {
    if (caseId && role === "LAWYER") {
      const loadCaseData = async () => {
        try {
          // Load Case with full data (including docs and context)
          const current = await fetchCaseById(caseId);
          if (current) {
            setActiveCase(current);
            setGlobalActiveCase(current);

            // Load Sessions
            if (!caseId.startsWith("temp_")) {
              setIsSessionsLoading(true);
              const chatSessions = await fetchChatSessions(caseId);
              setSessions(chatSessions);
              setIsSessionsLoading(false);

              // Auto-select latest session if none specified
              if (!urlSessionId && chatSessions.length > 0) {
                const latestSess = chatSessions[0]; // Assuming API returns sorted by date
                setSessionId(latestSess.id);
                // Optionally update URL without full push
                window.history.replaceState(null, '', `/?caseId=${caseId}&sessionId=${latestSess.id}`);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load case data:", err);
        }
      };
      loadCaseData();
    }
  }, [caseId, role]);

  // Load Specific Session Messages
  useEffect(() => {
    if (caseId && sessionId && !caseId.startsWith("temp_")) {
      const loadSession = async () => {
        try {
          setIsLoading(true);
          // Safety: Don't fetch if sessionId is "null" string or empty
          if (sessionId === "null" || sessionId === "undefined" || !sessionId) {
            setMessages([]);
            setIsLoading(false);
            return;
          }
          // Verify that this session belongs to the current case if sessions are loaded
          if (sessions.length > 0 && !sessions.some(s => s.id === sessionId)) {
            console.warn(`[Chat] Session ${sessionId} does not belong to case ${caseId}. Ignoring stale request.`);
            setIsLoading(false);
            return;
          }
          const data = await fetchChatSession(caseId, sessionId);
          if (sendingMessageRef.current) {
            // If we are currently sending a message (e.g. newly created session), we should not destroy optimistic messages.
            setMessages(prev => {
              const combined = [...(data.messages || [])];
              prev.forEach(p => {
                if (!combined.some(c => c.id === p.id)) {
                  combined.push(p);
                }
              });
              return combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });
          } else {
            setMessages(data.messages || []);
          }
        } catch (err) {
          console.error("Failed to load session messages:", err);
          if (!sendingMessageRef.current) setMessages([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadSession();
    } else if (!sessionId) {
      setMessages([]);
    }
  }, [caseId, sessionId]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // Only scroll to bottom if there are messages (prevents initial layout logic from triggering scrolls)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]); // Track length change specifically

  const handleNewChat = async () => {
    if (!caseId || caseId.startsWith("temp_")) {
      setMessages([]);
      setSessionId(null);
      return;
    }

    try {
      const newSession = await createChatSession(caseId, "New Analysis");
      setSessions(prev => [newSession, ...prev]);
      setSessionId(newSession.id);
      setMessages([]);
      // Update URL
      router.push(`/?caseId=${caseId}&sessionId=${newSession.id}`);
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  };

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    router.push(`/?caseId=${caseId}&sessionId=${id}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!caseId || !confirm("Are you sure you want to permanently delete this chat?")) return;

    try {
      await deleteChatSession(caseId, sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (sessionId === sid) {
        setSessionId(null);
        setMessages([]);
        router.push(`/?caseId=${caseId}`);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Failed to delete chat session.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOCRLoading(true);
    try {
      // 1. Initial Local Extraction (Fast)
      const localResult = await extractTextFromFile(file);
      let finalExtractedText = localResult.text;

      // 2. Server-side Upload & Deep OCR (Vision AI)
      if (caseId && !caseId.startsWith("temp_")) {
        const serverDoc = await uploadCaseFile(caseId, file, localResult.text);
        if (serverDoc.extractedText && serverDoc.extractedText.length > finalExtractedText.length) {
          finalExtractedText = serverDoc.extractedText;
          console.log("[FileUpload] Upgraded to high-fidelity server-side OCR text.");
        }
      }

      // 3. Update UI
      if (localResult.isUncertain && !finalExtractedText) {
        const uncertaintyMsg: Message = {
          id: `uncertain-${Date.now()}`,
          role: 'system',
          content: `Document "${file.name}" requires visual analysis. Processing through Vision AI...`,
          timestamp: new Date().toISOString(),
          metadata: {
            extractionStatus: 'uncertain',
            reason: localResult.reason,
            fileName: file.name
          }
        };
        setMessages(prev => [...prev, uncertaintyMsg]);
      } else {
        setInput(prev => {
          const prefix = prev ? prev + "\n\n" : "";
          return `${prefix}[EXTRACTED DOCUMENT TEXT - ${file.name}]:\n${finalExtractedText}`;
        });

        const systemMsg: Message = {
          id: `file-${Date.now()}`,
          role: 'system',
          content: `Document "${file.name}" processed via Vision AI successfully.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMsg]);
      }
    } catch (err) {
      console.error("Extraction Error:", err);
      alert("Failed to process document.");
    } finally {
      setIsOCRLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAction = (msgId: string, action: { label: string; value: string }, fileName?: string) => {
    const userMsg: Message = {
      id: `action-${Date.now()}`,
      role: 'user',
      content: `Regarding ${fileName || 'the file'}: This is a ${action.label}.`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => {
      // Remove actions from the triggering system message
      const updated = prev.map(m => m.id === msgId ? { ...m, actions: undefined } : m);
      return [...updated, userMsg];
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    // If no session but in a case, create one automatically
    let currentSessionId = sessionId;
    if (!currentSessionId && caseId && !caseId.startsWith("temp_")) {
      try {
        const newSess = await createChatSession(caseId, input.substring(0, 30) + "...");
        setSessions(prev => [newSess, ...prev]);
        setSessionId(newSess.id);
        currentSessionId = newSess.id;
        router.push(`/?caseId=${caseId}&sessionId=${newSess.id}`);
      } catch (err) {
        console.error("Auto session creation failed:", err);
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    sendingMessageRef.current = true;

    try {
      const aiData = await sendChatMessage(
        input,
        caseId || undefined,
        messages,
        activeCase?.legalSide,
        currentSessionId || undefined
      );
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiData.content,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
      sendingMessageRef.current = false;
    }
  };

  return (
    <div className="flex h-full bg-background md:-m-8 md:-mb-14 overflow-hidden relative">
      {/* ChatGPT Style History Sidebar (Desktop Only) */}
      <div className={cn(
        "hidden md:flex flex-col border-r border-white/5 bg-[#0d0d0d] overflow-x-hidden transition-all duration-500 ease-in-out relative",
        isChatHistoryCollapsed ? "w-0 border-none" : "w-[280px]"
      )}>
        {/* Collapse button for History */}
        <div className="p-4 flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex-1 h-11 flex items-center gap-3 px-4 bg-surface hover:bg-white/5 border border-white/10 rounded-xl transition-all group"
          >
            <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white/80">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1 custom-scrollbar">
          <div className="px-4 py-3">
            <h3 className="text-[10px] font-black text-text-muted/40 uppercase tracking-[0.3em]">Session History</h3>
          </div>

          {isSessionsLoading ? (
            <div className="px-4 py-10 flex items-center justify-center">
              <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => handleSelectSession(sess.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden text-left cursor-pointer",
                  sessionId === sess.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-muted hover:bg-white/[0.03] hover:text-white"
                )}
              >
                <MessageSquare className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", sessionId === sess.id ? "text-primary" : "text-white/20")} />
                <span className="text-[13px] font-bold truncate tracking-tight flex-1">{sess.title}</span>

                <button
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {sessionId === sess.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full" />}
              </div>
            ))
          ) : (
            <div className="px-6 py-10 text-center opacity-20">
              <History className="w-8 h-8 mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No Previous Sessions</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3 py-2 text-primary">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">Active: {activeCase?.title || "Standalone"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
        {/* Header (Desktop) */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-border bg-background/50 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleChatHistory}
              title={isChatHistoryCollapsed ? "Show History" : "Hide History"}
              className={cn(
                "p-2 rounded-lg transition-all active:scale-95",
                isChatHistoryCollapsed ? "text-primary bg-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            {!activeCase && (
              <img src="/logo.svg" alt="PolyPact Logo" className="w-8 h-8 opacity-50" />
            )}
            <div className="flex flex-col">
              <h2 className="text-white text-[11px] font-black tracking-[0.2em] uppercase">
                {activeCase ? activeCase.title : "PolyPact"}
              </h2>
              <p className="text-[9px] text-text-muted font-bold tracking-widest uppercase opacity-60">
                {activeCase ? `${activeCase.client} // ${activeCase.status}` : "Standalone Reasoning Session"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeCase?.globalContextSummary && (
              <button
                onClick={() => setIsLedgerOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all group"
              >
                <FileText className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest text-nowrap mt-[1px]">Case Ledger</span>
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/50 border border-white/5 h-full">
              <div className="size-1.5 rounded-full bg-primary" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Inference Active</span>
            </div>
          </div>
        </header>

        {/* Chat Stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8 scroll-smooth no-scrollbar relative desktop-chat-area"
        >
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full text-center py-20">
              <div className="size-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-primary/20 p-5 shadow-[0_0_50px_rgba(29,185,84,0.2)]">
                <img src="/logo.svg" alt="PolyPact Logo" className="w-full h-full" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-4 italic">How can PolyPact assist your counsel?</h2>
              <p className="text-text-muted text-lg font-medium opacity-60 max-w-lg mb-12">Select an action or begin a query for deep legal reasoning and procedural analysis.</p>

              <div className="grid grid-cols-2 gap-4 w-full px-4">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s.label)}
                    className="p-6 bg-surface/50 border border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/[0.02] transition-all text-left flex flex-col gap-3 group"
                  >
                    <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="text-sm font-bold text-white/90">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-10">
            {messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex flex-col items-center w-full animate-in fade-in duration-500 gap-4">
                    <div className="bg-primary/5 border border-primary/10 px-4 py-2 rounded-full flex items-center gap-3">
                      <span className="material-symbols-outlined text-[10px] text-primary">analytics</span>
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest opacity-80">{msg.content}</span>
                    </div>
                    {msg.actions && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {msg.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAction(msg.id, action, msg.metadata?.fileName)}
                            className="px-4 py-1.5 bg-surface border border-white/5 rounded-full text-[9px] font-black uppercase text-white/40 hover:text-primary hover:border-primary/40 transition-all active:scale-95"
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
                    "flex gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-400 group",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "size-10 rounded-2xl shrink-0 flex items-center justify-center shadow-2xl relative overflow-hidden",
                    msg.role === 'user' ? "bg-surface border border-white/10" : "bg-gradient-to-tr from-primary to-green-300"
                  )}>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {msg.role === 'user' ? (
                      <span className="text-[10px] font-black text-white/40 uppercase relative z-10">You</span>
                    ) : (
                      <span className="material-symbols-outlined text-background text-[22px] font-black relative z-10">auto_awesome</span>
                    )}
                  </div>
                  <div className={cn(
                    "flex flex-col gap-3 w-full max-w-[85%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-8 py-6 rounded-[2.5rem] text-[15px] leading-relaxed relative",
                      msg.role === 'user'
                        ? "bg-primary text-background rounded-tr-none font-bold shadow-2xl shadow-primary/10"
                        : "bg-[#1a1b1e]/60 border border-white/5 text-gray-100 rounded-tl-none backdrop-blur-3xl shadow-2xl"
                    )}>
                      {msg.role === 'assistant' ? (
                        <>
                          <MarkdownRenderer content={msg.content} className="text-white/90" />
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Verified Precedents & Sources</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {msg.citations.map((cit, idx) => (
                                  <a
                                    key={idx}
                                    href={cit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/cit p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex flex-col gap-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-white/80 group-hover/cit:text-primary transition-colors line-clamp-1">{cit.title}</span>
                                      <ArrowRightIcon className="w-3 h-3 text-white/20 group-hover/cit:text-primary transition-all group-hover/cit:translate-x-0.5" />
                                    </div>
                                    {cit.court && <span className="text-[9px] font-medium text-white/20 uppercase tracking-widest">{cit.court} // {cit.citation_ref}</span>}
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
                    <div className="flex items-center gap-3 px-2">
                      <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-white/20 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          </button>
                          <button className="text-white/20 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[14px]">share</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-500 w-full">
                <ThinkingLawyer
                  message="PolyPact is thinking..."
                  className="scale-90"
                />
              </div>
            )}
            <div className="h-48 shrink-0" />
          </div>
        </div>

        {/* Desktop Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="absolute bottom-0 inset-x-0 w-full px-4 md:px-10 pb-4 pt-10 bg-gradient-to-t from-background via-background/95 to-transparent z-30"
        >
          <div className="max-w-[800px] mx-auto flex flex-col gap-3">
            <div className="relative group">
              <div className="bg-[#121212]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
                <div className="flex items-center px-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isOCRLoading}
                    className={cn(
                      "p-3 rounded-2xl hover:bg-white/5 transition-all shrink-0",
                      isOCRLoading ? "text-primary animate-pulse" : "text-white/20 hover:text-primary"
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isOCRLoading ? "sync" : "add_circle"}
                    </span>
                  </button>

                  <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent text-white placeholder-white/20 px-4 py-3 min-h-[52px] max-h-[260px] resize-none text-[15px] leading-relaxed outline-none border-0 focus:ring-0 no-scrollbar overflow-y-auto"
                    placeholder="Send a legal prompt..."
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "flex items-center justify-center size-9 rounded-xl transition-all shadow-2xl active:scale-95 shrink-0",
                      input.trim() && !isLoading ? "bg-primary text-background shadow-[0_0_15px_rgba(29,185,84,0.3)]" : "bg-white/5 text-white/10 cursor-not-allowed"
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px] font-black">north</span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <p className="text-center text-[9px] font-black text-white/5 uppercase tracking-[0.4em] pt-2">
              Legal Intelligence System V2.5 // Strictly Professional
            </p>
          </div>
        </form>
      </div>

      {/* Case Ledger Modal */}
      {isLedgerOpen && activeCase && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  Strategic Case Ledger
                </h3>
              </div>
              <button
                onClick={() => setIsLedgerOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <Trash2 className="w-4 h-4 opacity-0 hidden" /> {/* spacer */}
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-white/80 text-[13px] leading-relaxed">
              {activeCase.globalContextSummary ? (
                <MarkdownRenderer content={activeCase.globalContextSummary} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                  <History className="w-8 h-8" />
                  <p className="uppercase tracking-widest font-black text-[11px]">No Summary Generated Yet</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/10 bg-black/40 text-center">
              <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">
                Auto-Updated Context Engine V2.5
              </p>
            </div>
          </div>
        </div>
      )
      }

      {/* Mobile View Container */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-background z-[100]">
        <MobileChat
          messages={messages}
          input={input}
          setInput={setInput}
          onSendMessage={handleSendMessage}
          onAction={handleAction}
          isLoading={isLoading}
          isOCRLoading={isOCRLoading}
          onFileUpload={handleFileUpload}
          activeCase={activeCase}
          sessions={sessions}
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={(sid) => handleDeleteSession({ stopPropagation: () => { } } as any, sid)}
        />
      </div>

      <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(29, 185, 84, 0.1);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(29, 185, 84, 0.3);
                }
                .desktop-chat-area {
                    mask-image: linear-gradient(to bottom, transparent, black 4%, black 90%, transparent);
                }
            `}</style>
    </div >
  );
}
