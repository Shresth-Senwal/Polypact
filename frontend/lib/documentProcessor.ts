/**
 * @file documentProcessor.ts
 * @description Utility for local processing and text extraction from various file formats.
 * @module frontend/utils
 */

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ExtractionResult {
    text: string;
    isUncertain: boolean;
    reason?: 'low_confidence' | 'image_detected' | 'complex_layout';
}

/**
 * Extracts text from a provided File object based on its type.
 */
export async function extractTextFromFile(
    file: File,
    onProgress?: (progress: number) => void
): Promise<ExtractionResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    console.log(`[Processor] Handling file: ${file.name} (${mimeType})`);

    // 1. Plain Text / Markdown / CSV
    if (extension === 'txt' || extension === 'md' || extension === 'csv' || mimeType === 'text/plain' || mimeType === 'text/csv') {
        return { text: await readAsText(file), isUncertain: false };
    }

    // 2. Word Documents (.docx)
    if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { text: result.value, isUncertain: false };
    }

    // 3. Excel Spreadsheets (.xlsx, .xls)
    if (extension === 'xlsx' || extension === 'xls' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            text += XLSX.utils.sheet_to_txt(sheet) + '\n';
        });
        return { text, isUncertain: false };
    }

    // 4. PDF (Using pdfjs-dist for native text extraction)
    if (extension === 'pdf' || mimeType === 'application/pdf') {
        try {
            const pdfjs = await import('pdfjs-dist');
            // Use unpkg as a more reliable CDN for version 5+ which often requires .mjs
            pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            let hasImagePages = false;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');

                if (pageText.trim().length === 0) {
                    hasImagePages = true;
                }

                fullText += pageText + '\n';

                if (onProgress) {
                    onProgress(Math.round((i / pdf.numPages) * 100));
                }
            }

            const isUncertain = fullText.trim().length < 20 || hasImagePages;

            return {
                text: fullText,
                isUncertain,
                reason: hasImagePages ? 'image_detected' : (fullText.trim().length < 20 ? 'low_confidence' : undefined)
            };
        } catch (err) {
            console.error("PDF Processing Error:", err);
            // DO NOT fall back to readAsText for PDFs as it outputs binary gibberish
            return {
                text: "",
                isUncertain: true,
                reason: 'complex_layout'
            };
        }
    }

    // 5. Images (Backend will handle Vision AI OCR)
    if (mimeType.startsWith('image/')) {
        return {
            text: "",
            isUncertain: true,
            reason: 'image_detected'
        };
    }

    // Default Fallback: Try reading as text
    try {
        return { text: await readAsText(file), isUncertain: true, reason: 'complex_layout' };
    } catch (err) {
        throw new Error(`Unsupported file type: ${extension}. Please upload a text, PDF, Word, or Image file.`);
    }
}

/**
 * Helper to read a file as plain text.
 */
function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file as text"));
        reader.readAsText(file);
    });
}
