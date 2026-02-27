/**
 * @file SignatureModal.tsx
 * @description Modal for hand-drawn and uploaded signatures with Indian law self-attestation format.
 * @module frontend/components/shared
 */

"use client";

import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, Upload, Pencil, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureData: { image: string, type: 'drawn' | 'uploaded' }) => void;
    userName?: string;
}

export function SignatureModal({ isOpen, onClose, onSave, userName = "Authorized Signatory" }: SignatureModalProps) {
    const sigPad = useRef<SignatureCanvas>(null);
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [date] = useState(new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }));

    if (!isOpen) return null;

    const clear = () => sigPad.current?.clear();

    const handleSave = () => {
        if (mode === 'draw') {
            if (sigPad.current?.isEmpty()) {
                alert("Please provide a signature first.");
                return;
            }

            // Custom trimming logic to avoid willReadFrequently warning
            const canvas = sigPad.current?.getCanvas();
            if (canvas) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                if (tempCtx) {
                    tempCtx.drawImage(canvas, 0, 0);
                    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                    let found = false;

                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const alpha = data[(y * canvas.width + x) * 4 + 3];
                            if (alpha > 0) {
                                if (x < minX) minX = x;
                                if (y < minY) minY = y;
                                if (x > maxX) maxX = x;
                                if (y > maxY) maxY = y;
                                found = true;
                            }
                        }
                    }

                    let finalImage = "";
                    if (found) {
                        const trimmedWidth = maxX - minX + 1;
                        const trimmedHeight = maxY - minY + 1;
                        const trimmedCanvas = document.createElement('canvas');
                        trimmedCanvas.width = trimmedWidth;
                        trimmedCanvas.height = trimmedHeight;
                        const trimmedCtx = trimmedCanvas.getContext('2d');
                        if (trimmedCtx) {
                            trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
                            finalImage = trimmedCanvas.toDataURL('image/png');
                        }
                    } else {
                        finalImage = canvas.toDataURL('image/png');
                    }

                    onSave({
                        image: finalImage,
                        type: 'drawn'
                    });
                }
            }
        } else {
            if (!uploadedFile) {
                alert("Please upload a signature image.");
                return;
            }
            onSave({ image: uploadedFile, type: 'uploaded' });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedFile(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-surface">
                    <div className="flex flex-col">
                        <h2 className="text-white text-sm font-black uppercase tracking-widest">Self-Attestation</h2>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">Indian Legal Compliance Standard</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-black/20">
                    <button
                        onClick={() => setMode('draw')}
                        className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                            mode === 'draw' ? "text-primary bg-primary/5" : "text-white/40 hover:text-white"
                        )}
                    >
                        <Pencil className="w-4 h-4" />
                        Draw Signature
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                            mode === 'upload' ? "text-primary bg-primary/5" : "text-white/40 hover:text-white"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Upload Stamp/Sign
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {mode === 'draw' ? (
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl overflow-hidden cursor-crosshair relative group">
                                <SignatureCanvas
                                    ref={sigPad}
                                    penColor="black"
                                    canvasProps={{
                                        className: "w-full h-48",
                                    }}
                                />
                                <button
                                    onClick={clear}
                                    className="absolute bottom-2 right-2 p-2 bg-black/10 hover:bg-black/20 text-black/40 hover:text-red-500 rounded-lg transition-all"
                                    title="Clear"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-text-muted italic text-center">Use mouse or touch to draw your signature clearly.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!uploadedFile ? (
                                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer group">
                                    <Upload className="w-8 h-8 text-white/20 group-hover:text-primary mb-2 transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Drop signature image or click</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-white rounded-xl p-4 flex items-center justify-center h-48 relative group">
                                        <img src={uploadedFile} alt="Preview" className="max-h-full max-w-full object-contain" />
                                        <button
                                            onClick={() => setUploadedFile(null)}
                                            className="absolute top-2 right-2 p-2 bg-black/10 hover:bg-black/20 text-black/40 hover:text-red-500 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-text-muted italic text-center">Ensure the signature is clearly visible on a plain background.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Box (Indian Format) */}
                    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                        <h3 className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Compliance Preview (India)</h3>
                        <div className="flex flex-col gap-1 border-l-2 border-primary pl-4 py-2">
                            <span className="text-primary text-[11px] font-black uppercase tracking-widest">Self-Attested</span>
                            <div className="h-8 flex items-center text-white/20 italic text-[10px]">
                                [Signature Appears Here]
                            </div>
                            <span className="text-white text-xs font-bold">{userName}</span>
                            <span className="text-text-muted text-[10px] font-medium">Dated: {date}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 h-12 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Apply Attestation
                    </button>
                </div>
            </div>
        </div>
    );
}
