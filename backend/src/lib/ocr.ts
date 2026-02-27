/**
 * @file ocr.ts
 * @description Gemini-powered high-fidelity OCR and document analysis.
 * @module backend/src/lib
 */

import OpenAI from "openai";
const pdfParse = require("pdf-parse");

// Reuse the established Gemini model for OCR and Deep Analysis
const LLM_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

export interface EnrichedOCRResult {
    text: string;
    handwriting: string[];
    entities: { name: string; type: string }[];
    anomalies: string[];
    summary: string;
    language: string;
}

/**
 * Perform high-fidelity OCR and Deep Analysis on a document buffer using Gemini 2.5.
 * @param buffer The file buffer (image or PDF)
 * @param mimeType The file mime type
 * @returns Enriched OCR Result with text and deep metadata
 */
export async function performGeminiDeepAnalysis(buffer: Buffer, mimeType: string): Promise<EnrichedOCRResult> {
    try {
        console.log(`[OCR] Starting Gemini Deep Analysis (${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

        const base64Content = buffer.toString("base64");

        const response = await openai.chat.completions.create({
            model: LLM_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are a Senior Forensic Document Analyst. Your task is to extract all information from the provided document with extreme precision.
                    
                    OUTPUT FORMAT (JSON ONLY):
                    {
                      "text": "Full verbatim text extraction, including marginalia.",
                      "handwriting": ["List of all handwritten notes/signatures/dates found"],
                      "entities": [{"name": "Name of entity", "type": "Person/Org/Date/Value"}],
                      "anomalies": ["List any suspicious elements like conflicting dates, differing handwriting styles, or potential tampering"],
                      "summary": "1-2 sentence executive summary of the document's purpose",
                      "language": "Primary language of the document"
                    }`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this document deeply. Extract every piece of information, especially handwritten notes and legal entities."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Content}`
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const rawJson = response.choices[0]?.message?.content || "{}";
        const result = JSON.parse(rawJson) as EnrichedOCRResult;

        console.log(`[OCR] Gemini Deep Analysis complete. Extracted ${result.text?.length || 0} characters.`);
        return result;
    } catch (error: any) {
        console.error("[OCR ERROR] Gemini Deep Analysis failed:", error.message);
        return {
            text: "",
            handwriting: [],
            entities: [],
            anomalies: [],
            summary: "Error during analysis",
            language: "unknown"
        };
    }
}

/**
 * Compatibility wrapper for Image-based OCR.
 */
export async function performOCR(buffer: Buffer): Promise<any> {
    return await performGeminiDeepAnalysis(buffer, "image/jpeg");
}

/**
 * Compatibility wrapper for PDF-based OCR.
 * Includes a robust fallback to pdf-parse if Gemini/API fails.
 */
export async function performPDFOCR(buffer: Buffer): Promise<any> {
    const aiResult = await performGeminiDeepAnalysis(buffer, "application/pdf");

    // If AI returns valid text, return it
    if (aiResult.text && aiResult.text.length > 50) {
        return aiResult;
    }

    // FALLBACK: pdf-parse
    console.warn("[OCR WARN] High-fidelity extraction returned empty/low text. Falling back to native parsing.");
    try {
        const pdfData = await pdfParse(buffer);
        console.log(`[OCR FALLBACK] Native parsing extracted ${pdfData.text.length} chars.`);
        return {
            ...aiResult,
            text: pdfData.text || "",
            summary: "Native extraction fallback (AI summary unavailable)",
            anomalies: ["AI Extraction Failed - Reverted to Native Text"]
        };
    } catch (err: any) {
        console.error("[OCR ERROR] Both AI and Native fallback failed:", err.message);
        return aiResult;
    }
}
