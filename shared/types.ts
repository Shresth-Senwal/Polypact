/**
 * @file types.ts
 * @description Shared TypeScript interfaces for PolyPact
 * @module shared
 */

export type UserRole = 'LAWYER' | 'COMMUNITY';

export interface UserProfile {
    uid: string;           // Primary Key (Firebase Auth UID)
    email: string | null;
    displayName: string | null;
    role: UserRole;
    createdAt: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        extractionStatus?: 'success' | 'uncertain' | 'failed';
        reason?: string;
        fileName?: string;
    };
    actions?: {
        label: string;
        value: string;
    }[];
    citations?: any[]; // For grounded legal reasoning
}

export interface AuditRisk {
    id: string;
    severity: 'CRITICAL' | 'MODERATE' | 'LOW';
    title: string;
    description: string;
    clauseReference: string;
}

export interface AuditResult {
    caseId: string;
    risks: AuditRisk[];
    summary: string;
    createdAt: string;
}

export interface ResearchCitation {
    id: string;
    title: string;
    url: string;
    snippet: string;
}

export interface ResearchResult {
    id: string;
    query: string;
    answer: string;
    citations: ResearchCitation[];
    createdAt: string;
}

export interface CaseFile {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
    size?: number;
    extractedText?: string;
    analysis?: any;
    redraft?: string;
    aiMetadata?: any;
    storagePath?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    caseId: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}

export type LegalSide = 'PROSECUTION' | 'DEFENSE' | 'CORPORATE' | 'FINANCIAL' | 'CIVIL' | 'GENERAL';

export interface CaseContainer {
    id: string;            // Firestore Document ID
    creatorUid: string;    // Foreign Key to UserProfile.uid
    title: string;
    client: string;
    status: 'DISCOVERY' | 'TRIAL' | 'ARCHIVED';
    legalSide: LegalSide; // Role context for the case
    isTemporary?: boolean; // Client-side flag for temporary cases
    role?: UserRole;       // Deprecated or secondary context, keeping for compatibility if needed, but legalSide is primary for strategy
    createdAt: string;
    updatedAt: string;
    description?: string;
    auditResults?: string[]; // IDs of AuditResult
    messages?: Message[]; // Default session for backward compatibility
    chatSessions?: { id: string, title: string, createdAt: string }[];
    researchHistory?: any[]; // Array of ResearchResult (avoiding circular dependency for now or define stricter type)
    documents?: CaseFile[];
    jurisdiction?: {
        country: 'IN';
        state: string; // e.g. 'Maharashtra'
        city?: string;
    };
    globalContextSummary?: string;
    lastSummarizedAt?: string;
}
