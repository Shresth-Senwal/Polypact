/**
 * @file NeuralPulseLoader.tsx
 * @description A high-end, abstract neural-network pulse animation for premium loading states.
 * @module frontend/components/shared
 */

"use client";

import { motion } from "framer-motion";

interface NeuralPulseLoaderProps {
    message?: string;
    className?: string;
}

export function NeuralPulseLoader({ message = "Connecting Neural Nodes...", className = "" }: NeuralPulseLoaderProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-12 ${className}`}>
            <div className="relative size-48 flex items-center justify-center">
                {/* Core Pulse */}
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute size-32 bg-primary/20 blur-[60px] rounded-full"
                />

                {/* Rotating Rings */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            rotate: i % 2 === 0 ? 360 : -360,
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            rotate: {
                                duration: 10 + i * 5,
                                repeat: Infinity,
                                ease: "linear",
                            },
                            scale: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }
                        }}
                        className="absolute inset-0 border border-primary/10 rounded-full"
                        style={{
                            margin: `${i * 20}px`,
                            borderStyle: i === 1 ? 'dashed' : 'solid',
                        }}
                    />
                ))}

                {/* Central Data Matrix Dots */}
                <div className="relative size-12 grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                opacity: [0.1, 1, 0.1],
                                scale: [1, 1.2, 1],
                                backgroundColor: i === 4 ? "#1DB954" : "rgba(255,255,255,0.1)"
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut"
                            }}
                            className="size-2 rounded-full border border-white/5"
                        />
                    ))}
                </div>

                {/* Floating "Node" Elements */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            x: [
                                Math.cos(i * 60 * Math.PI / 180) * 80,
                                Math.cos((i * 60 + 10) * Math.PI / 180) * 85,
                                Math.cos(i * 60 * Math.PI / 180) * 80
                            ],
                            y: [
                                Math.sin(i * 60 * Math.PI / 180) * 80,
                                Math.sin((i * 60 + 10) * Math.PI / 180) * 85,
                                Math.sin(i * 60 * Math.PI / 180) * 80
                            ],
                            opacity: [0.1, 0.4, 0.1]
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            delay: i * 0.3,
                        }}
                        className="absolute size-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(29,185,84,0.8)]"
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em] animate-pulse">
                        Neural Synapse Active
                    </span>
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                </div>
                <h3 className="text-3xl font-black text-white tracking-widest uppercase italic font-display">
                    {message}
                </h3>
            </motion.div>
        </div>
    );
}
