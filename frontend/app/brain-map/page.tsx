"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Network,
    Share2,
    Filter,
    X,
    History as HistoryIcon,
    Search,
    User,
    FileText,
    Gavel,
    AlertCircle,
    Sparkles,
    ArrowLeft,
    ChevronRight,
    Eye,
    Briefcase,
    LayoutDashboard,
    SearchCode,
    MessageSquare,
    DraftingCompass,
    Plus,
    Box
} from "lucide-react";

import { fetchBrainMap } from "@/lib/api";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import { MobileBrainMap } from "@/components/mobile/MobileBrainMap";
import { NeuralBrainLoader } from "@/components/shared/NeuralBrainLoader";
import { AnimatePresence, motion } from "framer-motion";

// Dynamic import for ForceGraph to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then(mod => mod.default), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 bg-[#08090a] flex items-center justify-center z-50">
            <NeuralBrainLoader message="Synthesizing Knowledge Graph..." className="scale-125" />
        </div>
    )
});

export default function BrainMapPage() {
    const { role, activeCase, setActiveCase, cases, isMainSidebarCollapsed } = useAppStore();
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlCaseId = searchParams.get("caseId");

    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [hoverNode, setHoverNode] = useState<any | null>(null);
    const [isGraphReady, setIsGraphReady] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [introCompleted, setIntroCompleted] = useState(false);

    // Robust resize observer with debounce to prevent simulation thrashing
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                console.log(`[BrainMap] Resize: ${width}x${height} | Top: ${entry.target.getBoundingClientRect().top}`);
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Sync active case from URL or store
    useEffect(() => {
        if (urlCaseId && cases.length > 0) {
            const found = cases.find(c => c.id === urlCaseId);
            if (found && activeCase?.id !== found.id) {
                setActiveCase(found);
            }
        }
    }, [urlCaseId, cases, activeCase, setActiveCase]);

    useEffect(() => {
        const loadGraph = async () => {
            if (!activeCase) return;

            // Reset state completely before loading to prevent stale references
            setIsLoadingData(true);
            setGraphData({ nodes: [], links: [] });
            setIsGraphReady(false);
            try {
                console.log(`[BrainMap] Loading data for case: ${activeCase.id}`);

                // Ensure intro plays fully (2.5s for the path animations to complete)
                setIntroCompleted(false);
                const timerToken = setTimeout(() => setIntroCompleted(true), 2500);

                const data = await fetchBrainMap(activeCase.id);

                // Defensive check for valid data
                if (data && data.nodes) {
                    console.log(`[BrainMap] Setting graph with ${data.nodes.length} nodes`);
                    setGraphData({
                        nodes: data.nodes || [],
                        links: data.edges || []
                    });
                } else {
                    console.error("[BrainMap] Invalid data structure received", data);
                }
            } catch (error) {
                console.error("Failed to load brain map", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadGraph();
    }, [activeCase]);

    // Force Directed Simulation Tuning
    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            // Physics Refined for Separation and Clarity
            const chargeStrength = -1500; // Stronger repulsion to separate nodes
            const linkDistance = 70;      // More breathing room between layers

            fgRef.current.d3Force('charge').strength(chargeStrength).distanceMax(2000);
            fgRef.current.d3Force('link').distance(linkDistance);

            // Softer centering to let the graph breathe
            fgRef.current.d3Force('center').strength(0.3);

            // Re-heat simulation
            if (typeof fgRef.current.d3Simulation === 'function') {
                fgRef.current.d3Simulation()
                    .alphaTarget(0.1)
                    .velocityDecay(0.3)
                    .restart();
            }

            // Final slow fit
            const timer = setTimeout(() => {
                if (!fgRef.current) return;
                // Safe check before calling d3Simulation
                if (typeof fgRef.current.d3Simulation === 'function') {
                    fgRef.current.d3Simulation().alphaTarget(0);
                }
                fgRef.current.zoomToFit(1000, 75);
            }, 1000);

            return () => { clearTimeout(timer); };
        }
    }, [graphData, dimensions]);

    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        // Critical Safety: If simulation hasn't placed node, skip draw to prevent canvas crash
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

        // ISOLATE CONTEXT to prevent pollution between nodes (Critical for Prod)
        ctx.save();

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoverNode?.id === node.id;

        // Size Logic: Smaller nodes for cleaner look
        let size = node.val ? Math.min(node.val, 20) / 2 : 3;
        if (node.type === 'hub') size = 2;

        // Helper to safely append alpha to hex
        const addAlpha = (hex: string, alpha: string) => {
            if (!hex.startsWith('#')) return hex;
            if (hex.length === 4) {
                const r = hex[1], g = hex[2], b = hex[3];
                return `#${r}${r}${g}${g}${b}${b}${alpha}`;
            }
            return hex + alpha;
        };

        // Draw Glow
        if ((isSelected || isHovered)) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 3, 0, 2 * Math.PI, false);
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 3);
            gradient.addColorStop(0, addAlpha(node.color || '#ffffff', '40'));
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Draw Outer Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
        ctx.strokeStyle = isSelected ? '#fff' : addAlpha(node.color || '#ffffff', '80');
        ctx.lineWidth = 1.5 / globalScale;
        if (node.type === 'hub') ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();

        // Draw Node Background
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.type === 'hub' ? '#222' : '#050505';
        ctx.fill();

        // Draw Icon (Skip for Hubs)
        if (node.type !== 'hub') {
            const icon = node.type === 'document' ? 'article' : (node.icon || 'circle');
            ctx.fillStyle = node.color || '#fff';
            const iconSize = size * 1.2;
            ctx.font = `${iconSize}px "Material Symbols Outlined"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, node.x, node.y);
        }

        // Draw Labels
        const showLabel =
            (node.type === 'document' || node.type === 'case') ||
            (node.type === 'hub' && (isHovered || isSelected)) ||
            (globalScale > 0.8 || isHovered || isSelected);

        if (showLabel && node.label) {
            const label = node.label;
            const fontSize = (node.type === 'hub' ? 8 : 10) / globalScale;
            ctx.font = `600 ${fontSize}px Inter, system-ui`;
            ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)';
            if (node.type === 'hub') ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            if (Number.isFinite(node.y + size + 4)) {
                ctx.fillText(label, node.x, node.y + size + 4);
            }
        }

        ctx.restore(); // RESET CONTEXT
    }, [selectedNode, hoverNode]);


    if (role === 'COMMUNITY') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                    <Network className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Neural Graph Restricted</h1>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    The evidentiary mapping tool is a High-Density visualization for Professional Matters.
                    Use this to logically connect disparate data points in complex litigation.
                </p>
                <Link href="/" className="px-8 py-3 bg-primary text-black font-bold rounded-full hover:scale-105 transition-all">
                    Unlock Features
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Desktop View */}
            <div className={cn(
                "hidden md:block fixed top-[64px] right-0 bottom-0 z-0 overflow-hidden bg-background", // Removed transition-all to prevent canvas desync
                isMainSidebarCollapsed ? "left-20" : "left-72"
            )}>
                {/* Graph Canvas */}
                <div ref={containerRef} className="absolute inset-0 z-0 bg-[#08090a]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: (isLoadingData || !introCompleted || !isGraphReady) ? 0 : 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0 z-0"
                    >
                        <ForceGraph2D
                            key={`${activeCase?.id || 'none'}_${graphData.nodes.length}`}
                            ref={fgRef}
                            graphData={graphData}
                            nodeRelSize={6}
                            nodeId="id"
                            width={dimensions.width}
                            height={dimensions.height}
                            linkColor={() => 'rgba(255,255,255,0.15)'}
                            linkWidth={1.5}
                            d3AlphaDecay={0.002}
                            d3VelocityDecay={0.3}
                            warmupTicks={0} // Run simulation live to ensure hit-test quadtree is synced
                            cooldownTicks={100}
                            nodeCanvasObject={paintNode}
                            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                                if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                                const size = 15; // Fixed generous hit target
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                ctx.fill();
                            }}
                            linkPointerAreaPaint={(link: any, color: string, ctx: CanvasRenderingContext2D) => {
                                // Minimal link area to avoid stealing clicks from nodes
                                ctx.beginPath();
                                ctx.moveTo(link.source.x, link.source.y);
                                ctx.lineTo(link.target.x, link.target.y);
                                ctx.lineWidth = 2;
                                ctx.strokeStyle = color;
                                ctx.stroke();
                            }}
                            onNodeClick={(node: any) => {
                                console.log('[BrainMap] Node clicked:', node.id, node.label);
                                setSelectedNode(node);
                            }}
                            onNodeHover={setHoverNode}
                            backgroundColor="#08090a"
                            onEngineStop={() => setIsGraphReady(true)}
                            enableNodeDrag={true}
                            enablePanInteraction={true}
                            enableZoomInteraction={true}
                            minZoom={0.2}
                            maxZoom={5}
                        />
                    </motion.div>
                    <AnimatePresence>
                        {(isLoadingData || !introCompleted || (!isGraphReady && graphData.nodes.length === 0)) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-[#08090a] z-50 pointer-events-none"
                            >
                                <NeuralBrainLoader message={isLoadingData ? "Extracting Entities..." : "Mapping Matter Connections..."} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Floating Controls Overlay */}
                <div className="absolute top-8 left-8 z-30 pointer-events-none flex flex-col gap-6">
                    <div className="pointer-events-auto">
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2 mb-4 group text-muted-foreground">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
                        </Link>
                        <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">Document X-Ray</h1>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                                <Briefcase className="w-3 h-3 text-primary" />
                                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{activeCase?.title || 'Case Overview'}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                <FileText className="w-3 h-3 text-white/40" />
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{activeCase?.documents?.length || 0} Artifacts Linked</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Precision Detail Panel */}
                {selectedNode && (
                    <div className="absolute left-8 bottom-10 w-[28rem] bg-surface/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-left-12 fade-in duration-500 z-40 overflow-hidden">
                        <div className="p-8 border-b border-white/5 relative">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm">{selectedNode.icon}</span>
                                        <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{selectedNode.type} Entity</span>
                                    </div>
                                    <h3 className="text-white font-black text-3xl tracking-tighter lead-none">{selectedNode.label}</h3>
                                </div>
                                <button
                                    className="p-2.5 text-white/20 hover:text-white transition-colors bg-white/5 rounded-2xl border border-white/10"
                                    onClick={() => setSelectedNode(null)}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[14px] text-gray-400 leading-relaxed font-medium">
                                    This <strong>{selectedNode.type}</strong> entity was extracted from case documents.
                                    {selectedNode.type === 'document'
                                        ? " It is a primary source of evidence."
                                        : " It appears in cross-referenced testimony/evidence."}
                                    <br /><br />
                                    Use the tools below to investigate further.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        if (selectedNode.type === 'statute') {
                                            router.push(`/research?q=${encodeURIComponent(selectedNode.label)}&caseId=${activeCase?.id}`);
                                        } else {
                                            // Find connected doc
                                            let targetDoc = selectedNode.docs && selectedNode.docs.length > 0 ? selectedNode.docs[0] : null;
                                            if (selectedNode.type === 'document' || selectedNode.type === 'case') targetDoc = selectedNode.label;

                                            const highlight = encodeURIComponent(selectedNode.label);
                                            const caseParam = `caseId=${activeCase?.id}`;

                                            if (targetDoc) {
                                                const docParam = `docName=${encodeURIComponent(targetDoc)}`;
                                                // Don't highlight if it is the document itself
                                                const hlParam = selectedNode.type === 'document' ? '' : `&highlight=${highlight}`;
                                                router.push(`/contracts?${docParam}${hlParam}&${caseParam}`);
                                            } else {
                                                router.push(`/contracts?highlight=${highlight}&${caseParam}`);
                                            }
                                        }
                                    }}
                                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-[13px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                >
                                    Investigate Entity
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile View */}
            <div className="block md:hidden fixed inset-0 z-40 bg-background">
                <MobileBrainMap />
            </div>
        </>
    );
}
