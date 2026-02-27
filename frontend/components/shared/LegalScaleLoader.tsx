/**
 * @file LegalScaleLoader.tsx
 * @description A premium, high-fidelity legal-themed loading animation featuring a pulsing scale of justice and data orbits.
 * @module frontend/components/shared
 */

"use client";

import { motion } from "framer-motion";

interface LegalScaleLoaderProps {
    message?: string;
    className?: string;
}

export function LegalScaleLoader({ message = "Weighting Evidence...", className = "" }: LegalScaleLoaderProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-10 ${className}`}>
            <div className="relative size-40 flex items-center justify-center">
                {/* Background Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.1, 0.25, 0.1],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
                />

                {/* Central Scale Icon */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 size-20 bg-surface border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl"
                >
                    <motion.span
                        animate={{
                            rotate: [-5, 5, -5],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="material-symbols-outlined text-4xl text-primary"
                    >
                        balance
                    </motion.span>
                </motion.div>

                {/* Orbiting Particles */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            rotate: 360,
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "linear",
                        }}
                        className="absolute inset-0"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.2, 0.8, 0.2],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.25,
                            }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 size-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(29,185,84,0.5)]"
                        />
                    </motion.div>
                ))}

                {/* Pulsing Rings */}
                {[1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1.5],
                            opacity: [0.3, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 1,
                            ease: "easeOut",
                        }}
                        className="absolute inset-0 border border-primary/20 rounded-full"
                    />
                ))}
            </div>

            <div className="text-center space-y-4">
                <motion.h3
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl font-black text-white tracking-[0.2em] uppercase italic font-display"
                >
                    {message}
                </motion.h3>
                <div className="flex items-center justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="size-1 bg-primary rounded-full"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
