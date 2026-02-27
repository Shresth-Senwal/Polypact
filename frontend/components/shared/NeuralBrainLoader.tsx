/**
 * @file NeuralBrainLoader.tsx
 * @description State-of-the-art cinematic neural animation. 
 * Features a generative particle-mesh brain, high-frequency "synaptic firing", 
 * and a deep-space parallax glow system.
 * @module frontend/components/shared
 */

"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";

interface NeuralBrainLoaderProps {
    message?: string;
    className?: string;
}

export function NeuralBrainLoader({ message = "Initializing Neural Core...", className = "" }: NeuralBrainLoaderProps) {
    const controls = useAnimationControls();

    useEffect(() => {
        controls.start({
            opacity: [0.3, 1, 0.3],
            scale: [0.98, 1.02, 0.98],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        });
    }, [controls]);

    // Synaptic fire dots
    const synapses = [...Array(12)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 1.5 + Math.random()
    }));

    return (
        <div className={`flex flex-col items-center justify-center gap-20 ${className}`}>
            <div className="relative size-80 flex items-center justify-center">
                {/* 1. Deep Parallax Aura */}
                <motion.div
                    animate={{
                        scale: [1, 1.4, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.05, 0.15, 0.05],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-[-30%] inset-y-[-30%] bg-primary blur-[120px] rounded-full"
                />

                {/* 2. Secondary Core Pulse */}
                <motion.div
                    animate={{
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute size-40 bg-primary/20 blur-[60px] rounded-full"
                />

                {/* 3. The Cinematic Brain Mesh */}
                <svg
                    viewBox="0 0 200 200"
                    className="size-64 relative z-10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Main Silo (Left) */}
                    <motion.path
                        d="M100,180 C50,180 20,140 20,100 C20,60 50,20 100,20"
                        stroke="url(#brainGradient)"
                        strokeWidth="0.75"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />

                    {/* Main Silo (Right) */}
                    <motion.path
                        d="M100,180 C150,180 180,140 180,100 C180,60 150,20 100,20"
                        stroke="url(#brainGradient)"
                        strokeWidth="0.75"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />

                    {/* Internal Neural Circuitry (Generative Paths) */}
                    {[...Array(8)].map((_, i) => (
                        <motion.path
                            key={i}
                            d={`M100,${40 + i * 15} Q${i % 2 === 0 ? 60 : 140},${100} 100,${160 - i * 15}`}
                            stroke="var(--primary)"
                            strokeWidth="0.5"
                            strokeOpacity="0.15"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: [0, 1, 0] }}
                            transition={{ duration: 4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                        />
                    ))}

                    {/* Active Synaptic Hits */}
                    {synapses.map((s) => (
                        <g key={s.id}>
                            <motion.circle
                                cx={s.x * 1.4 + 30}
                                cy={s.y * 1.4 + 30}
                                r="1.5"
                                fill="var(--primary)"
                                filter="url(#glow)"
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0.5, 1.5, 0.5],
                                }}
                                transition={{
                                    duration: s.duration,
                                    repeat: Infinity,
                                    delay: s.delay,
                                    ease: "circOut"
                                }}
                            />
                            {/* Trace lines to center */}
                            <motion.line
                                x1="100" y1="100"
                                x2={s.x * 1.4 + 30}
                                y2={s.y * 1.4 + 30}
                                stroke="var(--primary)"
                                strokeWidth="0.2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.1, 0] }}
                                transition={{ duration: s.duration, repeat: Infinity, delay: s.delay }}
                            />
                        </g>
                    ))}

                    {/* Central Thinking Hub */}
                    <motion.circle
                        cx="100" cy="100" r="4"
                        fill="var(--primary)"
                        filter="url(#glow)"
                        animate={{
                            scale: [1, 1.5, 1],
                            boxShadow: "0 0 20px var(--primary)"
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </svg>

                {/* 4. Outer HUD Indicators */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-[0.5px] border-primary/10 rounded-full"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-10%] border-[0.5px] border-dashed border-primary/5 rounded-full"
                />
            </div>

            {/* 5. Typography & Telemetry */}
            <div className="text-center space-y-6 relative z-20">
                <div className="flex flex-col items-center gap-2">
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-3 mb-2"
                    >
                        <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.8em]">SYSTEM-INTEGRATION</span>
                        <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-primary" />
                    </motion.div>

                    <h2 className="text-5xl font-black text-white tracking-[-0.05em] uppercase italic font-display drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        {message}
                    </h2>
                </div>

                <div className="flex items-center justify-center gap-12 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="size-1 bg-primary rounded-full shadow-[0_0_5px_var(--primary)]"
                        />
                        SYNCING_MODELS
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                            className="size-1 bg-primary rounded-full shadow-[0_0_5px_var(--primary)]"
                        />
                        RESOLVING_PRECEDENTS
                    </div>
                </div>
            </div>
        </div>
    );
}
