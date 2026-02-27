/**
 * @file api.ts
 * @description Frontend API client for Poly-Core.
 * @module frontend/lib
 */

import { auth } from "./firebase";
import { CaseContainer, LegalSide } from "../../shared/types";

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// DEBUG: Log the resolved API URL to help troubleshoot deployment issues
if (typeof window !== 'undefined') {
    console.log(`[DEBUG] Initial API_BASE_URL: ${API_BASE_URL}`);
}


// Fail-safe: Ensure protocol is present for production URLs
if (API_BASE_URL && !API_BASE_URL.startsWith('http') && !API_BASE_URL.includes('localhost')) {
    API_BASE_URL = `https://${API_BASE_URL}`;
}

// Strip trailing slash if present
API_BASE_URL = API_BASE_URL.replace(/\/$/, "");

async function getAuthHeaders() {
    const token = await auth.currentUser?.getIdToken();
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

export interface AnalysisResponse {
    status: string;
    data: any;
}

/**
 * Sends extracted text to the backend for AI legal analysis.
 */
export async function analyzeDocumentText(text: string, legalSide?: LegalSide, caseId?: string, mode?: 'draft', currentDraft?: string, docId?: string): Promise<AnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ text, legalSide, caseId, mode, currentDraft, docId }),
    });

    if (!response.ok) {
        throw new Error("Failed to analyze document");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Triggers grounded legal research via the backend.
 */
export async function searchLegalPrecedents(query: string, caseId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/research`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ query, caseId }),
    });

    if (!response.ok) {
        throw new Error("Failed to search precedents");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Deletes a specific research history item from a case.
 */
export async function deleteResearchItem(caseId: string, researchId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/research/${researchId}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to delete research item");
    }
}

/**
 * Fetches all cases for the current user.
 */
export async function fetchCases(): Promise<CaseContainer[]> {
    const url = `${API_BASE_URL}/api/v1/cases`;
    console.log(`[API] Fetching cases from: ${url}`);
    const response = await fetch(url, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        let errorMsg = "Failed to fetch cases";
        try {
            const errorData = await response.json();
            errorMsg = `${errorMsg}: ${errorData.message || response.statusText}`;
        } catch (e) {
            errorMsg = `${errorMsg} (${response.status})`;
        }

        // Mobile connectivity tip
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_BASE_URL.includes('localhost')) {
            console.warn("[API] WARNING: You are accessing from a mobile device but your API_URL is set to localhost. Use your PC's IP address instead.");
        }

        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    const result = await response.json();
    return result.data;
}

/**
 * Fetches a single case by its ID with full data.
 */
export async function fetchCaseById(caseId: string): Promise<CaseContainer> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}`, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to fetch case details");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Creates a new case container.
 */
export async function createCase(caseData: Partial<CaseContainer>): Promise<CaseContainer> {
    // If it's a temporary case request, handle it client-side without backend interaction
    if (caseData.isTemporary) {
        return {
            id: `temp_${crypto.randomUUID()}`,
            title: caseData.title || "Temporary Case",
            client: caseData.client || "Guest",
            status: 'DISCOVERY',
            legalSide: caseData.legalSide || 'PROSECUTION',
            creatorUid: 'guest',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isTemporary: true,
            ...caseData
        } as CaseContainer;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/cases`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(caseData),
    });

    if (!response.ok) {
        throw new Error("Failed to create case");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Deletes a case from the backend.
 */
export async function deleteCase(caseId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to delete case");
    }
}

/**
 * Sends a chat message with case context if provided.
 */
export async function sendChatMessage(message: string, caseId?: string, history: any[] = [], legalSide?: LegalSide, sessionId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ message, caseId, history, legalSide, sessionId }),
    });

    if (!response.ok) {
        throw new Error("Failed to send chat message");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Fetches all chat sessions for a case.
 */
export async function fetchChatSessions(caseId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/chat-sessions`, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Failed to fetch chat sessions: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch chat sessions: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
}

/**
 * Creates a new chat session for a case.
 */
export async function createChatSession(caseId: string, title: string = "New Chat"): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/chat-sessions`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        throw new Error("Failed to create chat session");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Fetches a specific chat session with messages.
 */
export async function fetchChatSession(caseId: string, sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat-sessions/${sessionId}?caseId=${caseId}`, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Failed to fetch chat session: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch chat session: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
}

/**
 * Permanently deletes a chat session and all its messages.
 */
export async function deleteChatSession(caseId: string, sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/chat-sessions/${sessionId}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to delete chat session");
    }
}

/**
 * Fetches Brain Map graph for a specific case.
 */
export async function fetchBrainMap(caseId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/brain-map`, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to fetch brain map data");
    }

    const result = await response.json();
    const data = result.data;

    // SAFEGUARD: Ensure node IDs are absolutely unique on the client side
    // This prevents click detection issues in react-force-graph-2d
    if (data && data.nodes && Array.isArray(data.nodes)) {
        const seenIds = new Set<string>();
        data.nodes = data.nodes.map((node: any, idx: number) => {
            let uniqueId = node.id;
            // If we've seen this ID before, make it unique
            if (seenIds.has(uniqueId)) {
                uniqueId = `${node.id}_dup_${idx}`;
                console.warn(`[BrainMap] Duplicate node ID detected: ${node.id}, renaming to ${uniqueId}`);
            }
            seenIds.add(uniqueId);
            return { ...node, id: uniqueId };
        });

        // Also update edge references if we renamed nodes
        // (This is a simplified fix - full fix would require updating edge sources/targets)
        console.log(`[BrainMap] Loaded ${data.nodes.length} nodes, ${data.edges?.length || 0} edges`);
    }

    return data;
}

/**
 * Redrafts a document text based on instructions and legal side.
 */
export async function redraftDocument(text: string, instructions: string, legalSide: LegalSide): Promise<{ redraft: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/redraft`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ text, instructions, legalSide }),
    });

    if (!response.ok) {
        throw new Error("Failed to redraft document");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Compares two or more document texts.
 */
export async function compareDocuments(texts: string[], legalSide: LegalSide): Promise<{ comparison: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/compare`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ texts, legalSide }),
    });

    if (!response.ok) {
        throw new Error("Failed to compare documents");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Uploads a file to a specific case.
 */
export async function uploadCaseFile(caseId: string, file: File, extractedText?: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (extractedText) formData.append("extractedText", extractedText);

    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/documents`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload file");
    }

    const result = await response.json();
    return result.data;
}

/**
 * Fetches the raw content of a vaulted document through the backend proxy.
 * This is used for text/md files to avoid CORS issues.
 */
export async function fetchVaultDocumentContent(caseId: string, docId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/documents/${docId}/content`, {
        method: "GET",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to fetch document content");
    }

    return await response.text();
}

/**
 * Permanently deletes a document from a case.
 */
export async function deleteCaseDocument(caseId: string, docId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/documents/${docId}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to delete document");
    }
}
