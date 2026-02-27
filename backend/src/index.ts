/**
 * @file index.ts
 * @description Main entry point for the Poly-Core Bun backend.
 * @module backend/src
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as dotenv from "dotenv";
import crypto from "crypto";
import { generateLegalReasoning, performLegalResearch, generateDraftingReasoning } from "./lib/ai";
import { getCaseContext } from "./lib/context";
import { performDeepLegalResearch } from "./lib/agents/legal_researcher";
import { checkLegalSufficiency } from "./lib/agents/reflexive_context";
import { performOCR, performPDFOCR } from "./lib/ocr";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "crypto";

dotenv.config();

// Initialize Firebase Admin with REST support for Bun stability
const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log("\n[FIREBASE CONFIG CHECK]");
console.log("Project ID:", firebaseConfig.projectId ? "✅ Loaded" : "❌ Missing");
console.log("Client Email:", firebaseConfig.clientEmail ? "✅ Loaded" : "❌ Missing");
console.log("Private Key:", firebaseConfig.privateKey ? "✅ Loaded" : "❌ Missing");
console.log("-------------------------\n");

if (!getApps().length) {
    initializeApp({
        credential: cert(firebaseConfig),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
    });
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();
// Enable REST for Bun compatibility as per engineering specs
db.settings({ preferRest: true });

type Variables = {
    user: any;
};

const app = new Hono<{ Variables: Variables }>();

// Auth Middleware
const authMiddleware = async (c: any, next: any) => {
    console.log(`[AUTH] Incoming request: ${c.req.method} ${c.req.url}`);
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn(`[AUTH] Missing or malformed token for ${c.req.url}`);
        return c.json({ error: "unauthorized", message: "Missing or malformed token" }, 401);
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        c.set("user", decodedToken);
        await next();
    } catch (error: any) {
        console.error(`[AUTH] Token verification failed: ${error.message}`);
        return c.json({ error: "unauthorized", message: "Invalid token" }, 401);
    }
};

// Middlewares
app.use("*", logger());

console.log(`[CORS] Configuring with SITE_URL: ${process.env.SITE_URL || "Not Set"}`);

app.use("*", cors({
    origin: [
        "http://localhost:3000",
        process.env.SITE_URL,
    ].filter(Boolean) as string[],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
}));

// Route for Cases (Protected)
app.get("/api/v1/cases", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const casesSnapshot = await db.collection("cases")
            .where("creatorUid", "==", user.uid)
            .get();

        const cases = await Promise.all(casesSnapshot.docs
            .map(async doc => {
                const data = doc.data();
                // Prune heavy fields for the listing view
                return {
                    id: doc.id,
                    title: data.title,
                    client: data.client,
                    status: data.status,
                    updatedAt: data.updatedAt || data.createdAt,
                    createdAt: data.createdAt,
                    description: data.description,
                    legalSide: data.legalSide,
                    // Send only metadata for documents
                    documents: await Promise.all((data.documents || []).map(async (d: any) => {
                        // Generate fresh signed URL if storagePath exists
                        let freshUrl = d.url;
                        if (d.storagePath) {
                            try {
                                const [signedUrl] = await bucket.file(d.storagePath).getSignedUrl({
                                    action: 'read',
                                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                                });
                                freshUrl = signedUrl;
                            } catch (e) { console.error(`Failed to refresh URL for ${d.storagePath}`); }
                        }

                        return {
                            id: d.id,
                            name: d.name,
                            type: d.type,
                            uploadedAt: d.uploadedAt,
                            size: d.size,
                            url: freshUrl
                        };
                    })),
                    // Send only shallow history for the audit trail
                    researchHistory: (data.researchHistory || []).map((h: any) => ({
                        id: h.id,
                        query: h.query,
                        timestamp: h.timestamp || h.createdAt
                    })),
                };
            }));

        cases.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        return c.json({ status: "success", data: cases });
    } catch (error: any) {
        console.error("GET Cases Error:", error);
        return c.json({ error: "fetch_cases_failed", message: error.message }, 500);
    }
});

app.get("/api/v1/cases/:id", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const id = c.req.param("id");

        const caseDoc = await db.collection("cases").doc(id).get();

        if (!caseDoc.exists) {
            return c.json({ error: "not_found", message: "Case not found" }, 404);
        }

        const data = caseDoc.data();
        if (data?.creatorUid !== user.uid) {
            return c.json({ error: "unauthorized", message: "Forbidden" }, 403);
        }

        // Generate fresh signed URLs for documents
        const processedDocs = await Promise.all((data?.documents || []).map(async (d: any) => {
            let freshUrl = d.url;
            if (d.storagePath) {
                try {
                    const [signedUrl] = await bucket.file(d.storagePath).getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    });
                    freshUrl = signedUrl;
                } catch (e) { console.error(`Failed to refresh URL for ${d.storagePath}`); }
            }
            return { ...d, url: freshUrl };
        }));

        return c.json({ status: "success", data: { id: caseDoc.id, ...data, documents: processedDocs } });
    } catch (error: any) {
        console.error("GET Case Error:", error);
        return c.json({ error: "fetch_case_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/cases", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const body = await c.req.json();

        const newCase = {
            ...body,
            creatorUid: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: body.status || "DISCOVERY",
            legalSide: body.legalSide || "PROSECUTION" // Default to PROSECUTION if missing
        };

        const docRef = await db.collection("cases").add(newCase);
        return c.json({ status: "success", data: { id: docRef.id, ...newCase } });
    } catch (error: any) {
        console.error("POST Case Error:", error);
        return c.json({ error: "create_case_failed", message: error.message }, 500);
    }
});

app.delete("/api/v1/cases/:id", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const id = c.req.param("id");

        const caseRef = db.collection("cases").doc(id);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists) {
            return c.json({ error: "not_found", message: "Case not found" }, 404);
        }

        const data = caseDoc.data();
        if (data?.creatorUid !== user.uid) {
            return c.json({ error: "unauthorized", message: "You do not have permission to delete this case" }, 403);
        }

        // 1. Delete associated files from Firebase Storage
        const documents = data?.documents || [];
        if (documents.length > 0) {
            console.log(`[STORAGE] Cleaning up ${documents.length} files for case ${id}`);
            for (const doc of documents) {
                if (doc.storagePath) {
                    try {
                        await bucket.file(doc.storagePath).delete();
                        console.log(`[STORAGE] Deleted: ${doc.storagePath}`);
                    } catch (storageErr: any) {
                        // Ignore if file already gone
                        if (storageErr.code !== 404) {
                            console.warn(`[STORAGE] Failed to delete ${doc.storagePath}:`, storageErr.message);
                        }
                    }
                }
            }
        }

        // 2. Recursive Delete (Deletes document + all subcollections)
        console.log(`[FIREBASE] Starting recursive delete for case: ${id}`);
        await db.recursiveDelete(caseRef);
        console.log(`[FIREBASE] Complete purge of case ${id} and subcollections successful.`);

        return c.json({ status: "success", message: "Case and all associated data deleted successfully" });
    } catch (error: any) {
        console.error("DELETE Case Error:", error);
        return c.json({ error: "delete_case_failed", message: error.message }, 500);
    }
});

// Basic Rate Limiting Middleware (Custom Implementation for Bun)
const rateLimit = new Map<string, { count: number, resetAt: number }>();

app.use("*", async (c, next) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const now = Date.now();
    const limit = 500; // Increased to 500 for development/agent stability
    const windowMs = 15 * 60 * 1000;

    const current = rateLimit.get(ip);
    if (current && current.resetAt > now) {
        if (current.count >= limit) {
            return c.json({ error: "too_many_requests", message: "Rate limit exceeded" }, 429);
        }
        current.count++;
    } else {
        rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    }
    await next();
});

// Health Check
app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));
app.get("/", (c) => c.json({ message: "Poly-Core API is live", docs: "/api/v1/cases" }));

// AI Routes

// Chat Session Routes
app.get("/api/v1/cases/:id/chat-sessions", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const caseId = c.req.param("id");

        // Verify case ownership
        const caseDoc = await db.collection("cases").doc(caseId).get();
        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access to case" }, 403);
        }

        const sessionsSnapshot = await db.collection("cases").doc(caseId).collection("chatSessions").get();

        const sessions = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a: any, b: any) => {
            const dateA = new Date(a.updatedAt || 0).getTime();
            const dateB = new Date(b.updatedAt || 0).getTime();
            return dateB - dateA;
        });

        return c.json({ status: "success", data: sessions });
    } catch (error: any) {
        console.error("GET Chat Sessions Error:", error);
        return c.json({ error: "fetch_sessions_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/cases/:id/chat-sessions", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const caseId = c.req.param("id");
        const body = await c.req.json();

        // Verify case ownership
        const caseDoc = await db.collection("cases").doc(caseId).get();
        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access to case" }, 403);
        }

        const newSession = {
            title: body.title || "New Chat",
            caseId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const sessionRef = await db.collection("cases").doc(caseId).collection("chatSessions").add(newSession);

        await db.collection("cases").doc(caseId).update({
            updatedAt: new Date().toISOString()
        });

        return c.json({ status: "success", data: { id: sessionRef.id, ...newSession } });
    } catch (error: any) {
        console.error("POST Chat Session Error:", error);
        return c.json({ error: "create_session_failed", message: error.message }, 500);
    }
});

app.get("/api/v1/chat-sessions/:sessionId", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const sessionId = c.req.param("sessionId");
        const caseId = c.req.query("caseId");

        if (!caseId) {
            console.warn("[API] Missing caseId for session fetch:", sessionId);
            return c.json({ error: "missing_case_id", message: "Case ID required" }, 400);
        }

        // Verify case ownership
        const caseDoc = await db.collection("cases").doc(caseId).get();
        if (!caseDoc.exists) {
            console.warn("[API] Case not found during session fetch:", caseId);
            return c.json({ error: "case_not_found", message: "Case not found" }, 404);
        }

        if (caseDoc.data()?.creatorUid !== user.uid) {
            console.warn("[API] Unauthorized session fetch attempt:", { user: user.uid, case: caseId });
            return c.json({ error: "forbidden", message: "Unauthorized access to case" }, 403);
        }

        const sessionDoc = await db.collection("cases").doc(caseId).collection("chatSessions").doc(sessionId).get();
        if (!sessionDoc.exists) {
            console.warn("[API] Session not found:", { caseId, sessionId });
            return c.json({ error: "not_found", message: "Session not found" }, 404);
        }

        return c.json({ status: "success", data: { id: sessionDoc.id, ...sessionDoc.data() } });
    } catch (error: any) {
        console.error("GET Session Error:", error);
        return c.json({ error: "fetch_session_failed", message: error.message }, 500);
    }
});

app.delete("/api/v1/cases/:id/chat-sessions/:sessionId", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const caseId = c.req.param("id");
        const sessionId = c.req.param("sessionId");

        // Verify case ownership
        const caseDoc = await db.collection("cases").doc(caseId).get();
        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access to case" }, 403);
        }

        const sessionRef = db.collection("cases").doc(caseId).collection("chatSessions").doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return c.json({ error: "not_found", message: "Session not found" }, 404);
        }

        await sessionRef.delete();

        await db.collection("cases").doc(caseId).update({
            updatedAt: new Date().toISOString()
        });

        return c.json({ status: "success", message: "Chat session deleted permanently" });
    } catch (error: any) {
        console.error("DELETE Chat Session Error:", error);
        return c.json({ error: "delete_session_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/chat", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const { message, caseId, sessionId, history = [], legalSide } = await c.req.json();

        let context = "";
        let side: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL" = legalSide || "PROSECUTION";
        let citations: any[] = [];
        let groundingContext = "";

        if (caseId) {
            if (!caseId.startsWith("temp_")) {
                try {
                    context = await getCaseContext(caseId, user.uid);
                } catch (e) {
                    console.error("Context fetch failed:", e);
                    context = "Context unavailable due to load error.";
                }
            } else {
                context = "This is a Temporary Guest Session. No persistent data available.";
            }
        }

        // Determine if we need real-time legal research
        const groundingKeywords = ["punishment", "case law", "precedent", "judgment", "rule", "section", "article", "law", "supreme court", "high court", "ipc", "crpc", "bns", "bnss", "bsa"];
        const lowerMsg = message.toLowerCase();
        const shouldGround = groundingKeywords.some(k => lowerMsg.includes(k)) && message.length > 10;

        let caseData: any;
        if (caseId && !caseId.startsWith("temp_")) {
            try {
                const doc = await db.collection("cases").doc(caseId).get();
                caseData = doc.data();
            } catch (e) { console.error("Failed to load case for reflexive check", e); }
        }

        if (shouldGround) {
            try {
                console.log(`[CHAT Grounding] Legal query detected, fetching real-time data from Indian Kanoon...`);
                const research: any = await performDeepLegalResearch(message, caseData?.jurisdiction);
                if (research && research.citations && research.citations.length > 0) {
                    citations = research.citations;
                    groundingContext = `\n\n[OFFICIAL LEGAL GROUNDING (Double-Checked)]: \n${research.answer}`;
                }
            } catch (kErr) {
                console.warn("[CHAT Grounding] Research failed, falling back to general knowledge", kErr);
            }
        }

        let aiResponse;

        if (caseId && !caseId.startsWith("temp_")) {
            try {
                const caseDoc = await db.collection("cases").doc(caseId).get();
                const caseData = caseDoc.data();

                if (message.trim().length > 4) {
                    const sufficiency = await checkLegalSufficiency(message, context, caseData?.jurisdiction);
                    if (sufficiency.status === "NEEDS_INFO") {
                        aiResponse = {
                            content: sufficiency.clarification_prompt || "I need more information to assist with this.",
                            role: "assistant",
                            metadata: {
                                status: "NEEDS_INFO",
                                missing_fields: sufficiency.missing_fields
                            }
                        };
                    }
                }
            } catch (reflexErr) {
                console.warn("[Chat] Reflexive check failed, proceeding to answer:", reflexErr);
            }
        }

        if (!aiResponse) {
            try {
                aiResponse = await generateLegalReasoning(message, context + groundingContext, side, history);
            } catch (genError: any) {
                console.error("[Chat] Reasoning Generation Failed:", genError);
                aiResponse = {
                    content: "I encountered a temporary error while generating the legal analysis. Please try again or rephrase your query.\n\n" + (genError.message || ""),
                    role: "assistant"
                };
            }
        }

        if (caseId && !caseId.startsWith("temp_")) {
            const messageData = {
                id: crypto.randomUUID(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            };
            const assistantData: any = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: aiResponse?.content || "System Error",
                timestamp: new Date().toISOString()
            };
            if (citations.length > 0) {
                assistantData.citations = citations;
            }
            if ((aiResponse as any)?.metadata) {
                assistantData.metadata = (aiResponse as any).metadata;
            }

            const caseRef = db.collection("cases").doc(caseId);

            if (sessionId) {
                const sessionRef = caseRef.collection("chatSessions").doc(sessionId);
                await db.runTransaction(async (transaction) => {
                    const sessionDoc = await transaction.get(sessionRef);
                    if (!sessionDoc.exists) throw "Session does not exist!";
                    const existingMessages = sessionDoc.data()?.messages || [];
                    transaction.update(sessionRef, {
                        messages: [...existingMessages, messageData, assistantData],
                        updatedAt: new Date().toISOString()
                    });
                });
            } else {
                await db.runTransaction(async (transaction) => {
                    const caseDoc = await transaction.get(caseRef);
                    if (!caseDoc.exists) throw "Case does not exist!";
                    const existingMessages = caseDoc.data()?.messages || [];
                    transaction.update(caseRef, {
                        messages: [...existingMessages, messageData, assistantData],
                        updatedAt: new Date().toISOString()
                    });
                });
            }
        }

        return c.json({ status: "success", data: { ...aiResponse, citations } });
    } catch (error: any) {
        console.error("Chat Endpoint Error:", error);
        return c.json({ error: "chat_failed", message: error.message }, 500);
    }
});

// Route for Brain Map Data
app.get("/api/v1/cases/:id/brain-map", authMiddleware, async (c) => {
    try {
        const id = c.req.param("id");
        const user = c.get("user");

        // 1. Fetch Case Documents
        const caseDocRef = db.collection("cases").doc(id);
        const caseDoc = await caseDocRef.get();
        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "not_found", message: "Case not found" }, 404);
        }

        const caseData = caseDoc.data();
        const documents = caseData?.documents || [];

        // 1. All documents should be in the graph
        const allDocs = documents.map((d: any, idx: number) => ({
            id: `doc_${d.id || idx}_${idx}`, // Guaranteed unique
            name: d.name || `Document ${idx + 1}`,
            text: d.extractedText || ""
        }));

        // 2. Only docs with content are processed by AI
        const processableDocs = allDocs.filter((d: any) => d.text.length > 50);

        if (allDocs.length === 0) {
            return c.json({
                status: "success",
                data: {
                    nodes: [{ id: 'core', label: 'Upload Documents to Generate Graph', type: 'instruction', val: 20 }],
                    edges: []
                }
            });
        }

        // 2. Caching Check: Has data changed?
        // Simple hash: join all doc IDs + lengths
        const currentDocHash = processableDocs.map((d: any) => `${d.id}:${d.text.length}`).sort().join('|');
        const storedBrainMap = caseData?.brainMap;

        let aiData: any = { entities: [] };

        if (storedBrainMap && storedBrainMap.versionHash === currentDocHash && storedBrainMap.entities) {
            console.log(`[BrainMap] Returning cached graph for case ${id}`);
            aiData = { entities: storedBrainMap.entities };
        } else {
            console.log(`[BrainMap] Generating NEW graph for case ${id}`);
            // 3. Generate Graph Data via AI
            const { generateKnowledgeGraph } = await import("./lib/ai");
            const aiResponse = await generateKnowledgeGraph(processableDocs);

            try {
                const jsonMatch = aiResponse.content?.match(/\{[\s\S]*\}/);
                aiData = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

                // Save to Firestore
                if (aiData.entities) {
                    await caseDocRef.update({
                        brainMap: {
                            versionHash: currentDocHash,
                            entities: aiData.entities,
                            updatedAt: new Date().toISOString()
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse AI Graph JSON", e);
            }
        }

        // 4. Transform to Visualization Format
        // NEW TOPOLOGY: Hierarchical Tree (Document -> Category Node -> Entity Node)
        // This naturally spreads the graph out.

        const nodes: any[] = [];
        const edges: any[] = [];
        const nodeMap = new Set();
        const categoryHubMap = new Set(); // Track which doc has which category hub

        // A. Document Core Nodes (All uploaded documents)
        // Add a central anchor for the case
        nodes.push({
            id: 'case_root',
            label: caseData?.title || "Matter Root",
            type: 'case',
            val: 50, // Largest anchor
            color: '#1DB954', // Brand Green
            icon: 'account_balance'
        });

        allDocs.forEach((doc: any) => {
            nodes.push({
                id: doc.id,
                label: doc.name,
                type: 'document',
                val: 35,
                color: '#ffffff',
                icon: 'description'
            });
            nodeMap.add(doc.id);

            // Connect document to the case root
            edges.push({
                source: 'case_root',
                target: doc.id,
                label: 'belongs to'
            });
        });

        // B. Process Entities and build Hierarchy
        if (aiData.entities && Array.isArray(aiData.entities)) {
            aiData.entities.forEach((entity: any) => {
                const entityId = `${entity.type}:${entity.name}`;
                const entityType = entity.type.toLowerCase();

                // 1. Create the Actual Entity Node (Leaf)
                if (!nodeMap.has(entityId)) {
                    let color = '#888';
                    let icon = 'circle';

                    // Distinct Colors for Visual Separation
                    switch (entityType) {
                        case 'person': color = '#10b981'; icon = 'person'; break; // Emerald Green
                        case 'organization': color = '#3b82f6'; icon = 'domain'; break; // Blue
                        case 'date': color = '#f59e0b'; icon = 'event'; break; // Amber
                        case 'location': color = '#ef4444'; icon = 'location_on'; break; // Red
                        case 'medicine': color = '#a855f7'; icon = 'vaccines'; break; // Purple
                        case 'evidence': color = '#db2777'; icon = 'fingerprint'; break; // Pink
                        case 'statute': color = '#6366f1'; icon = 'gavel'; break; // Indigo
                        default: color = '#9ca3af';
                    }

                    nodes.push({
                        id: entityId,
                        label: entity.name,
                        type: entityType,
                        val: 10, // Small leaf
                        color,
                        icon,
                        docs: entity.docs // Pass connected documents
                    });
                    nodeMap.add(entityId);
                }

                // 2. Link to Documents via Category Hubs
                if (entity.docs && Array.isArray(entity.docs)) {
                    entity.docs.forEach((docName: string) => {
                        const doc = allDocs.find((d: any) => d.name === docName);
                        if (doc && nodeMap.has(doc.id)) {
                            // Define Category Hub ID for this specific document
                            const hubId = `${doc.id}:${entityType}_hub`;

                            // Create Hub Node if missing
                            if (!categoryHubMap.has(hubId)) {
                                let hubLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1) + 's';
                                if (entityType === 'person') hubLabel = 'People';
                                if (entityType === 'datum') hubLabel = 'Timeline';

                                nodes.push({
                                    id: hubId,
                                    label: hubLabel,
                                    type: 'hub',
                                    val: 5,
                                    color: '#333333',
                                    icon: 'hub'
                                });
                                categoryHubMap.add(hubId);
                                nodeMap.add(hubId);

                                edges.push({
                                    source: doc.id,
                                    target: hubId,
                                    color: 'rgba(255,255,255,0.05)',
                                    distance: 80
                                });
                            }

                            edges.push({
                                source: hubId,
                                target: entityId,
                                color: 'rgba(255,255,255,0.2)',
                            });
                        }
                    });
                }
            });
        }

        return c.json({ status: "success", data: { nodes, edges } });
    } catch (error: any) {
        console.error("GET Brain Map Error:", error);
        return c.json({ error: "brain_map_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/analyze", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const { text, caseId, legalSide = "PROSECUTION", mode, currentDraft, docId } = await c.req.json();
        const caseContext = caseId ? await getCaseContext(caseId, user.uid) : "";

        // OCR Enriched Metadata Injection
        let aiMetadataContext = "";
        if (caseId && docId && !caseId.startsWith("temp_")) {
            const caseRef = db.collection("cases").doc(caseId);
            const freshDoc = await caseRef.get();
            const documents = freshDoc.data()?.documents || [];
            const doc = documents.find((d: any) => d.id === docId);
            if (doc?.aiMetadata) {
                aiMetadataContext = `
--- ENRICHED FORENSIC INSIGHTS (PRE-ANALYSIS) ---
Gemini has pre-identified the following elements in this document:
SUMMARY: ${doc.aiMetadata.summary}
HANDWRITING: ${JSON.stringify(doc.aiMetadata.handwriting)}
ENTITIES: ${JSON.stringify(doc.aiMetadata.entities)}
ANOMALIES/SUSPICIOUS ELEMENTS: ${JSON.stringify(doc.aiMetadata.anomalies)}
`;
            }
        }

        let analysis;
        if (mode === 'draft' || currentDraft) {
            // ... (rest of drafting logic)
            // Document Drafting Mode (Gemini 2.5 Flash Lite)
            const draftResponse = await generateDraftingReasoning(
                text, // Use 'text' as the instruction for the update
                currentDraft || "",
                caseContext,
                legalSide
            );
            analysis = draftResponse;
        } else {
            // Strategic Tactical Audit (Cydonia 24B)
            const prompt = `Perform a ruthless tactical audit of the following Indian legal text. 
            Identify key risks, duration anomalies, strategic issues, and opportunities for extra-legal leverage (financial or political) that Counsel can exploit.
            
            CRITICAL CONTEXTUAL HANDLING:
            - Analyze both machine print and HANDWRITTEN elements (marginal notes, signatures, dates).
            - Look for "Handwritten vs Print" inconsistencies which often indicate late-stage document tampering in Indian legal procedures.
            - Synthesize all text to make a holistic "Sense" of the legal strategy, identifying hidden leverage points.
            - ACCOUNT FOR PRE-IDENTIFIED FORENSIC INSIGHTS PROVIDED BELOW.
            
            CRITICAL REQUIREMENT for "highlight" consistency:
            For each risk, you must provide THREE verbatim fields to ensure perfect matching:
            1. "highlight": The exact core text representing the risk (5-10 words).
            2. "preAnchor": The 3-5 words immediately PRECEDING the highlight in the text.
            3. "postAnchor": The 3-5 words immediately FOLLOWING the highlight in the text.
            
            All three MUST be verbatim and case-sensitive. Do not paraphrase.

            Return the response in a VALID JSON format with the following keys:
            - "risks": An array of objects each containing:
                - "id": unique string
                - "risk": "Critical", "Moderate", or "Low"
                - "title": short title
                - "desc": detailed observation
                - "highlight": verbatim snippet
                - "preAnchor": preceding verbatim text
                - "postAnchor": following verbatim text
            - "safetyIndex": A letter grade (A-F).
            - "score": Numeric 0-100.
            - "summary": Strategic overview.
            - "draft": A complete, professionally formatted legal document or strategy text derived from the analysis (Markdown supported).
            
            --- GLOBAL CASE CONTEXT ---
            ${caseContext}

            ${aiMetadataContext}

            --- TEXT TO ANALYZE ---
            ${text}`;

            analysis = await generateLegalReasoning(
                prompt,
                "Strategic objective: Perform a tactical audit for high-risk Indian legal instruments. Identify every point of leverage for Counsel.",
                legalSide
            );
        }

        let structuredData: any;
        try {
            // Find JSON block if LLM adds markdown
            const jsonMatch = analysis.content?.match(/\{[\s\S]*\}/);
            structuredData = JSON.parse(jsonMatch ? jsonMatch[0] : analysis.content || "{}");

            // 3. PERSISTENCE: Save analysis back to the document if docId provided
            if (caseId && docId && !caseId.startsWith("temp_")) {
                console.log(`[ANALYZE] Persisting results for case ${caseId}, doc ${docId}`);
                const caseRef = db.collection("cases").doc(caseId);
                await db.runTransaction(async (transaction) => {
                    const freshDoc = await transaction.get(caseRef);
                    if (!freshDoc.exists) return;

                    const documents = freshDoc.data()?.documents || [];
                    const updatedDocs = documents.map((d: any) => {
                        if (d.id === docId) {
                            return { ...d, analysis: { ...structuredData, rawText: text } };
                        }
                        return d;
                    });

                    transaction.update(caseRef, {
                        documents: updatedDocs,
                        updatedAt: new Date().toISOString()
                    });
                });
            }
        } catch (e) {
            console.error("Failed to parse LLM analysis as JSON or persist results:", e);
            structuredData = { error: "Analysis failed to produce structured data", raw: analysis.content };
        }

        return c.json({ status: "success", data: structuredData });
    } catch (error: any) {
        console.error("Analysis Endpoint Error:", error);
        return c.json({ error: "analysis_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/redraft", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const { text, instructions, caseId, legalSide = "PROSECUTION" } = await c.req.json();
        const caseContext = caseId ? await getCaseContext(caseId, user.uid) : "";

        // 1. Reflexive Check
        let caseData;
        if (caseId && !caseId.startsWith("temp_")) {
            const doc = await db.collection("cases").doc(caseId).get();
            caseData = doc.data();
        }

        const sufficiency = await checkLegalSufficiency(instructions || "Redraft this", caseContext, caseData?.jurisdiction);

        if (sufficiency.status === "NEEDS_INFO") {
            const msg = `[SYSTEM: INSUFFICIENT CONTEXT]\n${sufficiency.clarification_prompt}\n\nMissing Fields: ${sufficiency.missing_fields?.join(", ")}`;
            return c.json({
                status: "success",
                data: {
                    redraft: msg,
                    status: "NEEDS_INFO",
                    message: sufficiency.clarification_prompt,
                    missing_fields: sufficiency.missing_fields
                }
            });
        }

        const prompt = `Redraft the following contract clause/document to favor the ${legalSide}.
        
        Instructions:
        ${instructions || "Mitigate risks and strengthen our position."}

        Original Text:
        ${text}

        --- GLOBAL CASE CONTEXT ---
        ${caseContext}

        Return ONLY the FULL redrafted text. Do NOT truncate. Do NOT return a diff.
        Ensure the output is the complete, high-fidelity contract/document ready for export.`;

        const redraft = await generateLegalReasoning(prompt, "Strategic objective: Redraft documentation to serve Counsel's specific tactical goals and ensure absolute legal dominance in Indian jurisdiction.", legalSide);

        return c.json({ status: "success", data: { redraft: redraft.content } });
    } catch (error: any) {
        console.error("Redraft Endpoint Error:", error);
        return c.json({ error: "redraft_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/compare", authMiddleware, async (c) => {
    try {
        const { texts, legalSide = "PROSECUTION" } = await c.req.json();

        if (!Array.isArray(texts) || texts.length < 2) {
            return c.json({ error: "bad_request", message: "Provide at least two documents for comparison." }, 400);
        }

        const prompt = `Perform a ruthless multi-document tactical comparison. 
        Identify key differences, conflicting clauses, strategic variations, and windows for financial or political pressure across these ${texts.length} versions.
        Favor the perspective of the ${legalSide}.
        
        ${texts.map((t: string, i: number) => `Document ${i + 1}:\n${t.substring(0, 3000)}`).join('\n\n')}

        Provide a structured analysis of how the tactical legal position shifts between these documents for Counsel's benefit.`;

        const comparison = await generateLegalReasoning(prompt, "Strategic objective: Perform a multi-version tactical audit. Identify points of contradiction to exploit for Counsel's victory.", legalSide);

        return c.json({ status: "success", data: { comparison: comparison.content } });
    } catch (error: any) {
        console.error("Comparison Endpoint Error:", error);
        return c.json({ error: "compare_failed", message: error.message }, 500);
    }
});

app.post("/api/v1/research", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const { query, caseId, jurisdiction } = await c.req.json();
        const caseContext = caseId ? await getCaseContext(caseId, user.uid) : "";

        // Resolve Jurisdiction
        let derivedJurisdiction = jurisdiction;
        if (!derivedJurisdiction && caseId && !caseId.startsWith("temp_")) {
            const doc = await db.collection("cases").doc(caseId).get();
            derivedJurisdiction = doc.data()?.jurisdiction;
        }

        const research = await performDeepLegalResearch(query, derivedJurisdiction);

        if (caseId && !caseId.startsWith("temp_")) {
            try {
                const caseRef = db.collection("cases").doc(caseId);

                const researchItem = {
                    id: randomUUID(),
                    query,
                    result: research,
                    timestamp: new Date().toISOString()
                };

                await db.runTransaction(async (transaction) => {
                    const caseDoc = await transaction.get(caseRef);
                    if (caseDoc.exists && caseDoc.data()?.creatorUid === user.uid) {
                        const existingResearch = caseDoc.data()?.researchHistory || [];
                        transaction.update(caseRef, {
                            researchHistory: [...existingResearch, researchItem],
                            updatedAt: new Date().toISOString()
                        });
                    }
                });
            } catch (dbError) {
                console.error("[RESEARCH] Failed to save history:", dbError);
                // Non-blocking error, return result anyway
            }
        }

        return c.json({ status: "success", data: research });
    } catch (error: any) {
        console.error("Research Endpoint Error:", error);
        return c.json({ error: "research_failed", message: error.message }, 500);
    }
});

/**
 * DELETE research history item
 */
app.delete("/api/v1/cases/:id/research/:researchId", authMiddleware, async (c) => {
    try {
        const user = c.get("user");
        const caseId = c.req.param("id");
        const researchId = c.req.param("researchId");

        // Verify case ownership
        const caseRef = db.collection("cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access to case" }, 403);
        }

        const data = caseDoc.data();
        const researchHistory = data?.researchHistory || [];
        const updatedHistory = researchHistory.filter((item: any) => item.id !== researchId);

        await caseRef.update({
            researchHistory: updatedHistory,
            updatedAt: new Date().toISOString()
        });

        return c.json({ status: "success", message: "Research history item deleted" });
    } catch (error: any) {
        console.error("DELETE Research Error:", error);
        return c.json({ error: "delete_research_failed", message: error.message }, 500);
    }
});

/**
 * @api POST /api/v1/cases/:id/documents
 * @description Uploads a file to a case and stores metadata in Firestore
 */
app.post("/api/v1/cases/:id/documents", authMiddleware, async (c) => {
    try {
        const caseId = c.req.param("id");
        const user = c.get("user");
        const body = await c.req.parseBody();
        const file = body['file'] as any; // Hono file object

        if (!file || !(file instanceof File)) {
            return c.json({ error: "no_file", message: "No file provided or invalid format" }, 400);
        }

        // 1. Verify Case Ownership
        const caseRef = db.collection("cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists) {
            return c.json({ error: "not_found", message: "Case not found" }, 404);
        }

        if (caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "You do not have permission to upload to this case" }, 403);
        }

        // 2. Upload to Firebase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const destination = `cases/${caseId}/documents/${fileName}`;
        const fileRef = bucket.file(destination);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // 3. Generate Signed URL (valid for 7 days for security/cache)
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        // 3. Perform OCR in the Backend (Gemini Deep Analysis)
        let extractedText = "";
        let aiMetadata: any = null;

        try {
            if (file.type.startsWith("image/")) {
                console.log(`[UPLOAD] Detected image, running Gemini Deep Analysis...`);
                const result = await performOCR(buffer);
                extractedText = result.text;
                aiMetadata = result;
            } else if (file.type === "application/pdf") {
                console.log(`[UPLOAD] Detected PDF, running Gemini Document Mode deep extraction...`);
                const result = await performPDFOCR(buffer);
                extractedText = result.text;
                aiMetadata = result;
            } else if (file.type === "text/plain" || file.type === "text/markdown") {
                extractedText = buffer.toString('utf-8');
            }
        } catch (ocrErr) {
            console.error("[UPLOAD] OCR/Extraction Failed:", ocrErr);
            extractedText = typeof body['extractedText'] === 'string' ? body['extractedText'] : "";
        }

        const docMetadata = {
            id: randomUUID(),
            name: file.name,
            type: file.type,
            url,
            uploadedAt: new Date().toISOString(),
            size: file.size,
            storagePath: destination,
            extractedText: extractedText || (typeof body['extractedText'] === 'string' ? body['extractedText'] : "") || "",
            aiMetadata: aiMetadata
        };

        // 4. Update Firestore with transaction to avoid race conditions
        await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(caseRef);
            const existingDocs = freshDoc.data()?.documents || [];
            transaction.update(caseRef, {
                documents: [...existingDocs, docMetadata],
                updatedAt: new Date().toISOString()
            });
        });

        return c.json({ status: "success", data: docMetadata });

    } catch (error: any) {
        console.error("[UPLOAD ERROR]", error);
        return c.json({ error: "upload_failed", message: error.message }, 500);
    }
});

app.delete("/api/v1/cases/:id/documents/:docId", authMiddleware, async (c) => {
    try {
        const caseId = c.req.param("id");
        const docId = c.req.param("docId");
        const user = c.get("user");

        // 1. Get Case and find Document
        const caseRef = db.collection("cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access" }, 403);
        }

        const documents = caseDoc.data()?.documents || [];
        const docToDelete = documents.find((d: any) => d.id === docId);

        if (!docToDelete) {
            return c.json({ error: "not_found", message: "Document not found" }, 404);
        }

        // 2. Delete from Firebase Storage if path exists
        if (docToDelete.storagePath) {
            try {
                await bucket.file(docToDelete.storagePath).delete();
                console.log(`[DELETE] Object deleted from storage: ${docToDelete.storagePath}`);
            } catch (err) {
                console.warn(`[DELETE] Storage object might already be gone: ${docToDelete.storagePath}`);
            }
        }

        // 3. Remove from Firestore array
        await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(caseRef);
            const existingDocs = freshDoc.data()?.documents || [];
            const remainingDocs = existingDocs.filter((d: any) => d.id !== docId);

            transaction.update(caseRef, {
                documents: remainingDocs,
                updatedAt: new Date().toISOString()
            });
        });

        return c.json({ status: "success", message: "Document deleted" });

    } catch (error: any) {
        console.error("[DELETE DOC ERROR]", error);
        return c.json({ error: "delete_failed", message: error.message }, 500);
    }
});


/**
 * Proxy to fetch vaulted document content (bypass CORS for browser fetch)
 */
app.get("/api/v1/cases/:id/documents/:docId/content", authMiddleware, async (c) => {
    try {
        const caseId = c.req.param("id");
        const docId = c.req.param("docId");
        const user = c.get("user");

        // Verify case ownership
        const caseRef = db.collection("cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists || caseDoc.data()?.creatorUid !== user.uid) {
            return c.json({ error: "forbidden", message: "Unauthorized access to case vault" }, 403);
        }

        const documents = caseDoc.data()?.documents || [];
        const document = documents.find((d: any) => d.id === docId);

        if (!document || !document.url) {
            return c.json({ error: "not_found", message: "Document not found in vault" }, 404);
        }

        // Return extracted text if available in Firestore metadata (avoids costly storage fetching and handles non-text files)
        if (document.extractedText) {
            return c.text(document.extractedText);
        }

        // Fallback for older documents: Fetch content from the signed URL
        const response = await fetch(document.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from storage: ${response.statusText}`);
        }

        const content = await response.text();
        return c.text(content);

    } catch (error: any) {
        console.error("[PROXY ERROR]", error);
        return c.json({ error: "proxy_failed", message: error.message }, 500);
    }
});

const port = parseInt(process.env.PORT || "4000");

console.log(`🚀 Poly-Core is running at http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
