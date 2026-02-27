/**
 * @file MobileBrainMap.tsx
 * @description Professional animated neural matter view for PolyPact mobile. Fully centered and viewport-optimized.
 * @module frontend/components/mobile
 */

"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
    Menu,
    Eye,
    X,
    History,
    ArrowLeft
} from "lucide-react";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralBrainLoader } from "../shared/NeuralBrainLoader";
import { fetchBrainMap } from "@/lib/api";

const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then(mod => mod.default), {
    ssr: false,
    loading: () => <NeuralBrainLoader className="h-full w-full bg-[#08090a]" message="Loading Matter Map..." />
});

export function MobileBrainMap() {
    const { toggleMobileSidebar, activeCase } = useAppStore();
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [isGraphReady, setIsGraphReady] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [introCompleted, setIntroCompleted] = useState(false);
    const router = useRouter();
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure container size
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const loadGraph = async () => {
            if (!activeCase) return;

            // Reset state completely before loading
            setGraphData({ nodes: [], links: [] });
            setIsGraphReady(false);
            setSelectedNode(null);
            setIsLoadingData(true);
            setIntroCompleted(false);
            const timer = setTimeout(() => setIntroCompleted(true), 2500);

            try {
                const data = await fetchBrainMap(activeCase.id);
                if (data && data.nodes) {
                    setGraphData({
                        nodes: data.nodes || [],
                        links: data.edges || []
                    });
                }
            } catch (error) {
                console.error("Failed to load brain map", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadGraph();
    }, [activeCase]);


    // Force stabilization
    useEffect(() => {
        if (fgRef.current && dimensions.width > 0 && graphData.nodes.length > 0) {
            fgRef.current.d3Force('link').distance(100);
            fgRef.current.d3Force('charge').strength(-400);
            fgRef.current.d3Force('center').x(0).y(0);

            // Reheat
            if (typeof fgRef.current.d3Simulation === 'function') {
                fgRef.current.d3Simulation().alphaTarget(0.3).restart();
            }

            const timer = setTimeout(() => {
                if (typeof fgRef.current.d3Simulation === 'function') {
                    fgRef.current.d3Simulation().alphaTarget(0);
                }
                fgRef.current.zoomToFit(1000, 50);
            }, 800);

            return () => { clearTimeout(timer); };
        }
    }, [graphData, dimensions]);

    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
        const isSelected = selectedNode?.id === node.id;
        const size = node.val ? node.val / 2 : 5;

        // Draw Glow
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI, false);
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2.5);
            gradient.addColorStop(0, (node.color || '#fff') + '60');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle = isSelected ? '#fff' : (node.color || '#fff') + '90';
        ctx.lineWidth = 2 / globalScale;
        ctx.fill();
        ctx.stroke();

        // Icon
        // Override icon for document type if generic
        const icon = node.type === 'document' ? 'article' : (node.icon || 'circle');

        ctx.fillStyle = node.color || '#fff';
        ctx.font = `${size * 1.2}px "Material Symbols Outlined"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, node.x, node.y);

        // Label
        if (globalScale > 0.8 || isSelected || node.type === 'document' || node.type === 'case') {
            const fontSize = Math.max(8, 12 / globalScale);
            ctx.font = `700 ${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,1)';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            // Truncate long labels
            if (node.label && Number.isFinite(node.y + size + 6)) {
                const label = node.label.length > 20 ? node.label.substring(0, 18) + '..' : node.label;
                ctx.fillText(label, node.x, node.y + size + 6);
            }
            ctx.shadowBlur = 0;
        }
    }, [selectedNode]);

    return (
        <div className="flex flex-col h-[100dvh] bg-[#08090a] text-white font-sans relative overflow-hidden">
            {/* Header */}
            <header className="flex h-[calc(env(safe-area-inset-top)+4rem)] pt-[env(safe-area-inset-top)] items-center justify-between px-6 bg-background/60 backdrop-blur-2xl border-b border-white/5 z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={toggleMobileSidebar} className="size-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl active:bg-white/10">
                        <Menu className="w-5 h-5 text-white/60" />
                    </button>
                    <button onClick={() => router.back()} className="size-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl active:bg-white/10">
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-xs font-black text-white uppercase tracking-tighter">
                            {activeCase?.title || "Matter Map"}
                        </h1>
                        <span className="text-[10px] text-primary font-black tracking-widest uppercase opacity-60 italic">Document X-Ray</span>
                    </div>
                </div>
            </header>

            {/* Viewport Managed Graph Container */}
            <main ref={containerRef} className="flex-1 relative w-full overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: (isLoadingData || !introCompleted || !isGraphReady) ? 0 : 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 z-0"
                >
                    {dimensions.width > 0 && (
                        <ForceGraph2D
                            key={`${activeCase?.id || 'none'}_${graphData.nodes.length}`}
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphData}
                            nodeRelSize={8}
                            nodeId="id"
                            linkColor={() => 'rgba(255,255,255,0.08)'}
                            linkWidth={1}
                            nodeCanvasObject={paintNode}
                            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                                if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                                // Explicit pointer area for mobile tap detection
                                const size = 20; // FIXED HUGE hit targets for mobile
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                ctx.fill();
                            }}
                            linkPointerAreaPaint={() => { }} // Disable link hover
                            onNodeClick={(node: any) => {
                                console.log('[MobileBrainMap] Node tapped:', node.id, node.label);
                                setSelectedNode(node);
                            }}
                            backgroundColor="#08090a"
                            enableNodeDrag={true} // Re-enable drag
                            enablePanInteraction={true}
                            enableZoomInteraction={true}
                            minZoom={0.5}
                            maxZoom={5}
                            warmupTicks={0}
                            cooldownTicks={100}
                            onEngineStop={() => setIsGraphReady(true)}
                        />
                    )}
                </motion.div>

                <AnimatePresence>
                    {(isLoadingData || !introCompleted || (!isGraphReady && graphData.nodes.length === 0)) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-[#08090a] z-40 pointer-events-none"
                        >
                            <NeuralBrainLoader message={isLoadingData ? "Extracting Entities..." : "Stabilizing Cluster..."} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Insight Sheet */}
            <AnimatePresence>
                {selectedNode && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNode(null)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 400, damping: 40 }}
                            className="fixed bottom-0 inset-x-0 bg-[#0f0f0f]/95 backdrop-blur-3xl border-t-2 border-primary/30 rounded-t-[3.5rem] p-8 pb-32 z-[101] shadow-[0_-30px_100px_rgba(0,0,0,0.9)]"
                        >
                            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-2 rounded-full bg-primary animate-ping" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedNode.type} Entity</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic pr-10">{selectedNode.label}</h3>
                                    </div>
                                    <button onClick={() => setSelectedNode(null)} className="size-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
                                        <X className="w-6 h-6 text-white/40" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed italic opacity-80">
                                    Identified in case document analysis. Cross-reference this entity with statutory records?
                                </p>
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
                                    className="w-full h-14 bg-primary text-background font-black uppercase text-[12px] tracking-widest rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/20"
                                >
                                    <Eye className="w-5 h-5" /> Investigate Entity
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
