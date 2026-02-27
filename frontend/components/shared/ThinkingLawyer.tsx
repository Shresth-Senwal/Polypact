/**
 * @file ThinkingLawyer.tsx
 * @description A custom loading animation featuring a video asset of a lawyer moving across the screen.
 * @module frontend/components/shared
 */

"use client";

import { motion } from "framer-motion";

interface ThinkingLawyerProps {
    message?: string;
    className?: string;
}

export function ThinkingLawyer({ message = "PolyPact is analyzing...", className = "" }: ThinkingLawyerProps) {
    return (
        <div className={`flex flex-col items-center justify-center w-full min-h-[300px] overflow-hidden ${className}`}>
            {/* Animation Container - Centered focus */}
            <div className="relative w-full h-80 flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{
                        scale: [1, 1.02, 1],
                        opacity: 1,
                    }}
                    transition={{
                        scale: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        },
                        opacity: {
                            duration: 0.5,
                        }
                    }}
                    className="relative z-10 w-80 h-80 flex items-center justify-center"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                    >
                        <source src="/assets/thinking-lawyer.webm" type="video/webm" />
                        <source src="/assets/thinking-lawyer.mp4" type="video/mp4" />
                    </video>
                </motion.div>

                {/* Ambient Neural Glow following the character slightly */}
                <div className="absolute inset-0 bg-radial-gradient from-primary/5 to-transparent blur-3xl rounded-full pointer-events-none" />
            </div>

            <motion.div
                animate={{
                    opacity: [0.4, 1, 0.4],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                }}
                className="text-center mt-8 z-20"
            >
                <p className="text-2xl font-black text-white tracking-tighter uppercase font-display italic">
                    {message}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="h-[1px] w-8 bg-primary/30" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] italic opacity-60">
                        AI Analysis Core
                    </p>
                    <span className="h-[1px] w-8 bg-primary/30" />
                </div>
            </motion.div>
        </div>
    );
}
