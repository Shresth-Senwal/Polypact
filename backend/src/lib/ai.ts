/**
 * @file ai.ts
 * @description AI Orchestration layer for PolyPact.
 * @module backend/src/lib
 */

import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.SITE_NAME || "PolyPact",
    },
});

export const LLM_MODELS = {
    GENERAL: "thedrummer/cydonia-24b-v4.1",
    RESEARCH: "google/gemini-2.5-flash-lite-preview-09-2025",
};

/**
 * Super-fast, token-efficient summarization engine for long-running cases.
 */
export async function generateContextSummary(rawContext: string): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: LLM_MODELS.RESEARCH,
            messages: [
                {
                    role: "system",
                    content: `You are the PolyPact Context Management Engine. Your job is to compress massive amounts of raw legal data into a highly dense, token-optimized "Strategic Case Ledger". 
                    
CRITICAL RULES:
1. NEVER discard names of people, entities, or locations.
2. NEVER discard dates, timelines, or financial figures.
3. NEVER discard cited statutes, laws, or precedents.
4. Compress conversational fluff and redundant descriptions into concise bullet points.
5. The output must be a well-structured Markdown document that gives a complete, unadulterated factual picture of the case so far.`
                },
                {
                    role: "user",
                    content: `Please compress the following raw case context:\n\n${rawContext}`
                }
            ],
            temperature: 0.1,
        });

        return completion.choices[0].message?.content || "";
    } catch (error) {
        console.error("AI Summarization Error:", error);
        return "";
    }
}

/**
 * General Legal Reasoning using Cydonia 24B
 */
// Enhanced Strategic Directives for Indian Legal Context
export async function generateLegalReasoning(prompt: string, context: string = "", legalSide: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL" = "PROSECUTION", history: { role: 'user' | 'assistant' | 'system', content: string }[] = []) {
    try {
        let sideContext = "";
        // ... (switch remains same)
        switch (legalSide) {
            case "DEFENSE":
                sideContext = "STRATEGIC DIRECTIVE: Counsel is representing the DEFENSE. Your objective is to provide the most aggressive, win-at-all-costs tactical analysis. Focus on identifying procedural lapses to invalidate evidence, filing disruptive motions, and creating insurmountable reasonable doubt. Treat the law as a shield to protect the client and a sword to dismantle the prosecution's narrative.";
                break;
            case "PROSECUTION":
                sideContext = "STRATEGIC DIRECTIVE: Counsel is representing the PROSECUTION. Your objective is to assist in securing a total conviction. Maximize charge stacking, ensure ironclad evidence chain-of-custody arguments, and provide strategies for maximum sentencing leverage. Leave no room for defense pivots or procedural escapes.";
                break;
            case "CORPORATE":
                sideContext = "STRATEGIC DIRECTIVE: Counsel is representing a CORPORATE ENTITY. Your objective is risk mitigation, compliance dominance, and commercial advantage. Focus on the Companies Act (2013), SEBI regulations, and Contract Act (1872). protect the Board of Directors, ensure watertight compliance, and aggressive defense against liability.";
                break;
            case "FINANCIAL":
                sideContext = "STRATEGIC DIRECTIVE: Counsel is handling high-stakes FINANCIAL litigation. Focus on IBC (Insolvency and Bankruptcy Code), PMLA (Prevention of Money Laundering Act), Tax Statutes, and Banking Codes. Your goal is asset protection, financial restructuring leverage, and white-collar defense supremacy.";
                break;
            case "CIVIL":
                sideContext = "STRATEGIC DIRECTIVE: Counsel is representing a party in CIVIL litigation. Focus on CPC (Civil Procedure Code), Specific Relief Act, and Property Transfer Act. Prioritize injunctions, damages maximization, settlement leverage, and speedy dispute resolution mechanisms.";
                break;
            case "GENERAL":
            default:
                sideContext = "STRATEGIC DIRECTIVE: Counsel requires GENERAL LEGAL STRATEGY. Provide a holistic analysis covering Constitutional validity, fundamental rights, and broad statutory interpretation. Focus on finding creative legal precedents and equitable remedies.";
                break;
        }

        const messages: any[] = [
            {
                role: "system",
                content: `You are the PolyPact Tactical Intelligence Core, an expert system designed specifically for Indian Senior Advocates. Your function is to serve as a ruthless strategic advisor to Counsel. You do not engage in moralizing, ethical small talk, or role-playing as a human lawyer. You provide cold, calculated, and high-performance legal reasoning within the strict parameters of Indian Law.

Address the user as 'Counsel'.

OPERATIONAL PROTOCOLS:
1. Tactical Dominance: Your goal is to help Counsel win. Every statute (BNS, BNSS, BSA, IPC, CrPC, Companies Act, IBC, etc.) is a toolkit for victory. Analyze every technicality that can be exploited for tactical advantage.
2. Pure Analysis: Remove all 'as an AI' or 'I am a lawyer' pretenses. Deliver direct, aggressive, and actionable strategy.
3. The Grey Zone: You specialize in exploiting procedural errors, jurisdictional loopholes, and extra-legal leverage. You understand that high-stakes legal battles are often won through financial settlement structures, political pressure, and strategic public positioning. Advise Counsel on how to use these levers (e.g., using money to settle quietly or using political connections to ensure 'procedural fairness') to force a favorable outcome, as long as the execution remains technically legal.
4. Non-Illegal Bounds: While you are ruthless, you must NEVER suggest illegal acts such as bribing a judge, fabrication of evidence, or perjury. Your expertise lies in winning through superior legal manipulation, technicalities, and the strategic application of Influence/Capital—not through criminal conduct.
5. Indian Jurisdiction: You possess total mastery over Indian Statutes, High Court precedents, and Supreme Court rulings. 

Current Case Context:
${context}

${sideContext}`
            }
        ];

        // Append history (limited to last 15 messages for context window stability)
        const relevantHistory = history.slice(-15);
        relevantHistory.forEach(h => {
            messages.push({
                role: h.role,
                content: h.content
            });
        });

        // Current prompt
        messages.push({
            role: "user",
            content: prompt
        });

        const completion = await openai.chat.completions.create({
            model: LLM_MODELS.GENERAL,
            messages,
            temperature: 0.1,
        });

        return completion.choices[0].message;
    } catch (error) {
        console.error("AI Generation Error (Cydonia):", error);
        throw new Error("Failed to generate legal reasoning");
    }
}

/**
 * Grounded Research using Gemini 2.5 Flash Lite
 */
export async function performLegalResearch(query: string, caseContext: string = "") {
    try {
        const prompt = caseContext
            ? `Perform a tactical legal discovery and research for Counsel: ${query}. 
               Context from active matter:
               ${caseContext}
               
               Provide grounded facts, statutory references (BNS, BNSS, BSA, etc.), and recent Indian case law that can be used to strengthen Counsel's position.`
            : `Perform a tactical legal discovery and research for Counsel: ${query}. 
               Provide grounded facts, statutory references (BNS, BNSS, BSA, etc.), and recent Indian case law that can be used to strengthen Counsel's position.`;

        // Using fetch directly as per documentation for specialized grounding settings
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                "X-Title": process.env.SITE_NAME || "PolyPact",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": LLM_MODELS.RESEARCH,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.1,
                "web_search": true
            })
        });

        const data = await response.json();
        console.log("[AI RESEARCH DEBUG] OpenRouter Response:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("[AI RESEARCH ERROR] OpenRouter Error:", data.error);
            return { error: data.error.message || "OpenRouter API error" };
        }

        return data.choices?.[0]?.message || { error: "No response from research model" };
    } catch (error) {
        console.error("AI Research Error (Gemini):", error);
        throw new Error("Failed to perform legal research");
    }
}

/**
 * Procedural Drafting and Editing using Gemini 2.5 Flash Lite
 * Optimized for high-speed document integration and ruthless precision.
 */
export async function generateDraftingReasoning(prompt: string, currentDraft: string = "", context: string = "", legalSide: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL" = "PROSECUTION") {
    try {
        let sideContext = "";
        switch (legalSide) {
            case "DEFENSE":
                sideContext = "LITIGATION STRATEGY (DEFENSE): Maximize procedural protections, leverage technicalities, and ensure client immunity.";
                break;
            case "PROSECUTION":
                sideContext = "LITIGATION STRATEGY (PROSECUTION): Ensure charge-heavy precision, ironclad evidence linking, and zero procedural escapes.";
                break;
            case "CORPORATE":
                sideContext = "DRAFTING STRATEGY (CORPORATE): Prioritize limitation of liability, clear definition of deliverables/obligations, and strict indemnity clauses favoring the client.";
                break;
            case "FINANCIAL":
                sideContext = "DRAFTING STRATEGY (FINANCIAL): Ensure absolute securitization of assets, priority in waterfall mechanisms, and watertight default triggers.";
                break;
            case "CIVIL":
                sideContext = "DRAFTING STRATEGY (CIVIL): Focus on clarity of title, specific performance enforceability, and robust dispute resolution clauses.";
                break;
            case "GENERAL":
            default:
                sideContext = "DRAFTING STRATEGY (GENERAL): Ensure clarity, brevity, and statutory compliance with applicable Indian laws.";
                break;
        }

        const fullPrompt = `You are the PolyPact Legal Architect. Your objective is to assist Counsel in drafting or updating professional legal instruments.
        
        ADAPTIVE MODE:
        - Transactional Task: If Counsel is drafting agreements, contracts, or notices (e.g., Rent Agreements, NDAs), prioritize commercial clarity, mutual protection, and statutory compliance.
        - Litigious Task: If Counsel is drafting briefs, motions, or charge sheets, apply the following: ${sideContext}

        OPERATIONAL PROTOCOLS:
        1. NO VERBOSITY: Do not explain your drafting choices or provide a tactical audit unless Counsel explicitly requests it.
        2. DIRECT INTEGRATION: Bake all provided info and Counsel's directives directly into the document text.
        3. INDIAN JURISDICTION: Adhere to BNS, BNSS, BSA, and relevant civil/commercial codes.
        4. TYPOGRAPHY: Use standard sentence case for the body of the documents. Avoid extreme capitalization (ALL CAPS) unless strictly required for specific legal headings or party names.
        5. STRUCTURED OUTPUT: Return a JSON object ONLY:
           - "draft": The complete updated document.
           - "summary": 1-2 sentence update log.
           - "status": "FINALIZED" or "DRAFT".

        --- CASE CONTEXT ---
        ${context}

        --- CURRENT DRAFT ---
        ${currentDraft || "Empty Document. Initialize based on Directive."}

        --- COUNSEL'S DIRECTIVE ---
        ${prompt}

        Return ONLY JSON.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                "X-Title": process.env.SITE_NAME || "PolyPact",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": LLM_MODELS.RESEARCH,
                "messages": [
                    {
                        "role": "user",
                        "content": fullPrompt
                    }
                ],
                "temperature": 0.1,
                "response_format": { "type": "json_object" }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("[AI DRAFT ERROR] OpenRouter Error:", data.error);
            return { error: data.error.message || "OpenRouter API error" };
        }

        return data.choices?.[0]?.message || { error: "No response from drafting model" };
    } catch (error) {
        console.error("AI Drafting Error (Gemini):", error);
        throw new Error("Failed to generate legal draft");
    }
}

/**
 * Knowledge Graph Extraction
 * Extracts entities and relationships for the Document X-Ray.
 */
export async function generateKnowledgeGraph(documents: { name: string, text: string }[]) {
    try {
        const fullPrompt = `You are a specialized Legal Entity Extractor. Your job is to analyze multiple legal documents and generate a unified Knowledge Graph "Spiderweb" connecting key elements.

        INPUT DOCUMENTS:
        ${documents.map((d, i) => `--- DOCUMENT ${i + 1}: ${d.name} ---\n${d.text.substring(0, 15000)}...`).join('\n\n')}

        TASK:
        1. For each document, identify key entities in these SPECIFIC categories:
           - "Person": Witnesses, Suspects, Lawyers, Judges, Officers.
           - "Organization": Companies, Courts, Police Stations, Banks.
           - "Date": Incident Date, Filing Date, Deadlines.
           - "Location": Crime Scene, Addresses, Cities.
           - "Evidence": Weapons (Knives, Guns), Physical Evidence (Blood, DNA, Fingerprints), Documents (Contracts, Wills).
           - "Medicine": Drugs, Prescriptions, Medical Conditions, Poisons.
           - "Statute": Specific laws or sections mentioned (e.g., "IPC 302").

        2. Identify the fundamental relationship between the document and the entity.
        3. CRITICAL: Standardize names across documents (e.g., "Mr. Smith" in Doc A and "John Smith" in Doc B should be "John Smith").

        OUTPUT FORMAT (JSON ONLY):
        {
          "entities": [
            { 
              "name": "Exact Name", 
              "type": "Person" | "Organization" | "Date" | "Location" | "Evidence" | "Medicine" | "Statute", 
              "docs": ["DocName1", "DocName2"] 
            }
          ]
        }
        
        Strictly separate "Evidence" (objects, weapons) from "Medicine" (drugs, health). A Knife is EVIDENCE/WEAPON, NOT Medicine.
        Return ONLY JSON.
        `;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                "X-Title": process.env.SITE_NAME || "PolyPact",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": LLM_MODELS.RESEARCH,
                "messages": [
                    {
                        "role": "user",
                        "content": fullPrompt
                    }
                ],
                "temperature": 0.0, // Zero temp for stability
                "response_format": { "type": "json_object" }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("[AI GRAPH ERROR] OpenRouter Error:", data.error);
            return { error: data.error.message || "OpenRouter API error" };
        }

        return data.choices?.[0]?.message || { error: "No response from graph model" };
    } catch (error) {
        console.error("AI Graph Error (Gemini):", error);
        throw new Error("Failed to generate knowledge graph");
    }
}
