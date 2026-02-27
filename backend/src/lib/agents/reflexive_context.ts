/**
 * @file reflexive_context.ts
 * @description Agent responsible for ensuring legal sufficiency before drafting.
 * @module backend/src/lib/agents
 */

import OpenAI from "openai";
import { LLM_MODELS } from "../ai";

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.SITE_NAME || "PolyPact",
    },
});

interface ReflexiveCheckResult {
    status: "SUFFICIENT" | "NEEDS_INFO";
    missing_fields?: string[];
    clarification_prompt?: string;
    sufficiency_score: number;
}

export async function checkLegalSufficiency(
    prompt: string,
    context: string = "",
    jurisdiction?: { state: string, city?: string }
): Promise<ReflexiveCheckResult> {
    try {
        const systemPrompt = `You are the PolyPact Gatekeeper (Indian Legal Context).
        Your job is to pause the drafting process ONLY if CRITICAL legal details are missing that would make the document legally invalid.
        
        REQUIRED ENTITIES for High-Quality Drafting:
        1. JURISDICTION: State is important for specific Acts (e.g., Rent Control, Stamp Duty).
        2. PARTIES: Names/Roles.
        
        CURRENT CONTEXT:
        Jurisdiction Provided: ${jurisdiction ? JSON.stringify(jurisdiction) : "NONE - User has not specified yet"}
        Case Context: ${context.substring(0, 500)}...

        USER REQUEST: "${prompt}"

        TASK:
        Analyze if the User Request + Context is sufficient.

        CRITICAL RULES (DO NOT BREAK):
        1. "Draft", "Write", "Analyze" commands -> Require Jurisdiction & Parties. If missing, return "NEEDS_INFO".
        2. BE HYPER-INQUISITIVE: Do not assume ANY missing details.
           - If user says "Draft an NDA", ASK: "For which industry? Is it unilateral or mutual? governed by which State's jurisdiction?"
           - If user says "My client was cheated", ASK: "Is this a civil breach of contract or criminal cheating (Section 318 BNS)? What is the quantum of loss?"
           - If user says "File a divorce", ASK: "Under Hindu Marriage Act, Special Marriage Act, or Christian Marriage Act? Is it mutual consent?"
        3. NEVER Hallucinate a State. If the user didn't say "Uttar Pradesh" or "Maharashtra", do NOT ask "Any specific Uttar Pradesh laws?". Instead ask: "Which specific State jurisdiction applies?".
        4. If the user asks for a generic template (e.g. "Draft a generic NDA template"), MARK AS SUFFICIENT.
        5. If Jurisdiction is missing, your clarification prompt MUST be invalidation-neutral: "Please specify the State/Jurisdiction..." valid.

        OUTPUT JSON ONLY:
        {
            "status": "SUFFICIENT" | "NEEDS_INFO",
            "missing_fields": ["Jurisdiction", "Party Names", "Statute/Act Context", "Quantum/Value"],
            "clarification_prompt": "To draft this effectively, I need to know the State/Jurisdiction, the specific Act applicable, and the names of the parties...",
            "sufficiency_score": 0-100
        }
        `;

        const completion = await openai.chat.completions.create({
            model: LLM_MODELS.GENERAL, // Using Cydonia for reasoning
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Empty response from Reflexive Agent");

        return JSON.parse(content) as ReflexiveCheckResult;

    } catch (error) {
        console.error("Reflexive Check Error:", error);
        // Fail open -> assume sufficient if AI fails, to not block user
        return { status: "SUFFICIENT", sufficiency_score: 100 };
    }
}
