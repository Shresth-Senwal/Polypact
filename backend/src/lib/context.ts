/**
 * @file context.ts
 * @description Global context aggregator for PolyPact.
 * @module backend/src/lib
 */

import { getFirestore } from "firebase-admin/firestore";
import { generateContextSummary } from "./ai";

/**
 * Aggregates all context for a case: metadata, documents, research, and recent chat history.
 * Dynamically scales down raw data injection based on the presence of a global summary.
 */
export async function getCaseContext(caseId: string, userId: string): Promise<string> {
    const db = getFirestore();
    try {
        const caseRef = db.collection("cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== userId) {
            return "";
        }

        const data = caseDoc.data()!;
        let contextParts: string[] = [];
        const hasSummary = !!data.globalContextSummary;

        // 1. Basic Metadata
        contextParts.push(`--- CASE METADATA ---`);
        contextParts.push(`Title: ${data.title}`);
        contextParts.push(`Client: ${data.client}`);
        contextParts.push(`Status: ${data.status}`);
        contextParts.push(`Legal Side: ${data.legalSide || "PROSECUTION"}`);
        contextParts.push(`Description: ${data.description || "N/A"}`);

        // 2. Global Context Summary (if available, this is the priority)
        if (hasSummary) {
            contextParts.push(`\n--- STRATEGIC CASE LEDGER (AI SUMMARIZED) ---`);
            contextParts.push(data.globalContextSummary!);
        }

        // 3. Documents
        if (data.documents && data.documents.length > 0) {
            contextParts.push(`\n--- CASE DOCUMENTS ---`);
            data.documents.forEach((doc: any, index: number) => {
                contextParts.push(`Document ${index + 1}: ${doc.name} (${doc.type})`);
                if (doc.aiMetadata) {
                    contextParts.push(`[FORENSIC INSIGHTS]:`);
                    contextParts.push(`Summary: ${doc.aiMetadata.summary}`);
                }
                if (doc.extractedText) {
                    // Truncate massively if a summary exists to save tokens, else give generous context
                    const limit = hasSummary ? 500 : 2500;
                    contextParts.push(`Content snippet: ${doc.extractedText.substring(0, limit)}...`);
                }
            });
        }

        // 4. Research History
        if (data.researchHistory && data.researchHistory.length > 0) {
            contextParts.push(`\n--- RECENT RESEARCH ---`);
            const researchLimit = hasSummary ? 2 : 5;
            data.researchHistory.slice(-researchLimit).forEach((item: any) => {
                contextParts.push(`Query: ${item.query}`);
                contextParts.push(`Findings: ${item.result?.content?.substring(0, hasSummary ? 500 : 1500) || "N/A"}...`);
            });
        }

        // 5. Legacy/Recent Chat history
        if (data.messages && data.messages.length > 0) {
            contextParts.push(`\n--- RECENT CHAT MESSAGES ---`);
            const chatLimit = hasSummary ? 4 : 15;
            data.messages.slice(-chatLimit).forEach((msg: any) => {
                contextParts.push(`${msg.role.toUpperCase()}: ${msg.content.substring(0, 1000)}`);
            });
        }

        const finalContext = contextParts.join("\n");

        // Asynchronous fire-and-forget: If context grows too large (>40,000 chars roughly ~10k tokens), trigger summarization queue
        // We do this blindly here to ensure it catches organic growth without blocking the request
        if (finalContext.length > 40000) {
            // Wait 10 seconds before firing to let the current DB transactions or API calls finish
            setTimeout(() => {
                summarizeCaseContext(caseId, userId).catch(err => console.error("Async summarizer failed:", err));
            }, 10000);
        }

        return finalContext;
    } catch (error) {
        console.error("Error aggregating case context:", error);
        return "";
    }
}

/**
 * Background Engine: Reads entire case history, generates a dense summary, and persists it.
 */
export async function summarizeCaseContext(caseId: string, userId: string): Promise<void> {
    const db = getFirestore();
    try {
        console.log(`[CONTEXT ENGINE] Spinning up summarizer for case ${caseId}...`);
        const caseRef = db.collection("cases").doc(caseId);

        // Use a transaction to ensure we don't overwrite racing updates (though summarization is idempotent)
        await db.runTransaction(async (transaction) => {
            const caseDoc = await transaction.get(caseRef);
            if (!caseDoc.exists || caseDoc.data()?.creatorUid !== userId) return;

            const data = caseDoc.data()!;

            // Limit how often we summarize (e.g. no more than once per hour) to save costs
            if (data.lastSummarizedAt) {
                const lastRun = new Date(data.lastSummarizedAt).getTime();
                const now = Date.now();
                if (now - lastRun < 60 * 60 * 1000) {
                    console.log(`[CONTEXT ENGINE] Skiping summarization for ${caseId} (cooldown active).`);
                    return;
                }
            }

            let rawParts: string[] = [];
            rawParts.push(`Title: ${data.title}`);
            rawParts.push(`Client: ${data.client}`);
            rawParts.push(`Legal Side: ${data.legalSide}`);

            if (data.globalContextSummary) {
                rawParts.push(`\n--- PREVIOUS SUMMARY STRATEGY ---\n${data.globalContextSummary}`);
            }

            if (data.documents && data.documents.length > 0) {
                rawParts.push(`\n--- ALL DOCUMENTS ---`);
                data.documents.forEach((doc: any) => {
                    rawParts.push(`Doc: ${doc.name}`);
                    if (doc.extractedText) rawParts.push(`Content: ${doc.extractedText}`);
                });
            }

            if (data.researchHistory && data.researchHistory.length > 0) {
                rawParts.push(`\n--- ALL RESEARCH ---`);
                data.researchHistory.forEach((item: any) => {
                    rawParts.push(`Q: ${item.query}\nA: ${item.result?.content || ""}`);
                });
            }

            if (data.messages && data.messages.length > 0) {
                rawParts.push(`\n--- ALL CHATS ---`);
                data.messages.forEach((msg: any) => {
                    rawParts.push(`${msg.role}: ${msg.content}`);
                });
            }

            // In extreme cases, raw parts might be >200k tokens. We assume Gemini Flash Lite can handle up to 1M tokens, 
            // but we slice to 800,000 characters just to be safe with HTTP limits.
            const rawContent = rawParts.join("\n").substring(0, 800000);

            console.log(`[CONTEXT ENGINE] Compressing ${rawContent.length} characters of legal data for ${caseId}...`);
            const summary = await generateContextSummary(rawContent);

            if (summary && summary.length > 100) {
                transaction.update(caseRef, {
                    globalContextSummary: summary,
                    lastSummarizedAt: new Date().toISOString()
                });
                console.log(`[CONTEXT ENGINE] Successfully generated and persisted summary for ${caseId}.`);
            }
        });
    } catch (error) {
        console.error(`[CONTEXT ENGINE] Failed to summarize case ${caseId}:`, error);
    }
}
