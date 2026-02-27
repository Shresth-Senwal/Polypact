/**
 * @file legal_researcher.ts
 * @description Agent responsible for deep legal research (Indian Kanoon, State Acts).
 * @module backend/src/lib/agents
 */

import { LLM_MODELS } from "../ai";
import { auditHeadnote } from "./verification_agent";

/**
 * Performs deep grounded research with jurisdiction awareness.
 * HYBRID AGENT: Uses Indian Kanoon API (if available) + Web Search (fallback).
 */
export async function performDeepLegalResearch(query: string, jurisdiction?: { state: string, city?: string }) {
    try {
        const kanoonKey = process.env.INDIAN_KANOON_API_KEY;
        let kanoonContext = "";
        let sources: any[] = [];

        // 1. Direct API Search (If Key Exists) - "Manupatra-Lite" Mode
        if (kanoonKey) {
            try {
                const searchQ = `${query} ${jurisdiction?.state || ""}`;
                console.log(`[LegalResearcher] Kanoon API Search: ${searchQ}`);

                const kParams = new URLSearchParams({
                    formInput: searchQ,
                    pagenum: "0"
                });

                const kRes = await fetch(`https://api.indiankanoon.org/search/?${kParams.toString()}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Token ${kanoonKey}` }
                });

                if (kRes.ok) {
                    const kData = await kRes.json();
                    if (kData.docs && kData.docs.length > 0) {
                        // Extract Top 5 Cases for Metadata
                        sources = kData.docs.slice(0, 5).map((d: any) => ({
                            title: d.title,
                            snippet: d.headline || d.snippet,
                            url: `https://indiankanoon.org/doc/${d.tid}/`,
                            court: d.docsource || "Indian Court",
                            citation_ref: `Indian Kanoon ID: ${d.tid}`,
                            tid: d.tid // Keep ID for potential fetch
                        }));

                        // FETCH FULL TEXT for the TOP 1 Result
                        // This transforms the agent from "Snippet-based" to "Full-Text Grounded"
                        const topDocId = sources[0].tid;
                        let fullTextContext = "";

                        try {
                            console.log(`[LegalResearcher] Fetching Full Text for Top Doc ID: ${topDocId}`);
                            const docRes = await fetch(`https://api.indiankanoon.org/doc/${topDocId}/`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Token ${kanoonKey}`,
                                    'Accept': 'application/json'
                                }
                            });

                            if (docRes.ok) {
                                const docData = await docRes.json();
                                if (docData && docData.doc) {
                                    // Strip HTML tags roughly for token efficiency if needed, or rely on LLM to handle
                                    // For legal accuracy, keeping structure is good, but let's limit length if it's massive.
                                    // Let's truncate to ~15k chars to fit context window safely with other prompts
                                    const rawText = docData.doc.replace(/<[^>]*>?/gm, ' '); // Simple HTML strip
                                    const truncatedText = rawText.substring(0, 15000);

                                    fullTextContext = `\n\n[FULL TEXT OF TOP AUTHORITY - ${sources[0].title}]:\n${truncatedText}...\n[END OF TEXT]\n`;
                                }
                            }
                        } catch (docErr) {
                            console.warn(`[LegalResearcher] Failed to fetch full text for doc ${topDocId}`, docErr);
                        }

                        kanoonContext = `\n\n[OFFICIAL INDIAN KANOON RESULTS]:\n${sources.map((s, i) =>
                            `${i + 1}. ${s.title} (${s.court}): "${s.snippet}"\nURL: ${s.url}`
                        ).join("\n")}`;

                        if (fullTextContext) {
                            kanoonContext += fullTextContext;
                        }

                    } else {
                        console.log("[LegalResearcher] Kanoon returned 0 results.");
                    }
                } else {
                    console.warn(`[LegalResearcher] Kanoon API Error: ${kRes.status} ${kRes.statusText}`);
                }
            } catch (kErr) {
                console.warn("Indian Kanoon API failed, falling back to Web Search", kErr);
            }
        } else {
            console.warn("[LegalResearcher] No INDIAN_KANOON_API_KEY found. Skipping live legal search.");
        }

        // 2. Construct LLM Prompt
        const jurisdictionContext = jurisdiction
            ? `FOCUS JURISDICTION: India, specifically ${jurisdiction.state}. Look for State Amendments to Central Acts (IPC/CrPC/BNS) applicable in ${jurisdiction.state}.`
            : `FOCUS JURISDICTION: India (Central Laws).`;

        const fullPrompt = `You are the PolyPact Senior Researcher.
        
        QUERY: "${query}"
        
        ${jurisdictionContext}

        ${kanoonContext ? `\nCRITICAL INSTRUCTION: Use the [OFFICIAL INDIAN KANOON RESULTS] provided below as your PRIMARY source of truth. Cite them explicitly.` : ""}
        ${kanoonContext}

        SEARCH STRATEGY & CITATION STANDARD:
        1. **Sources**: Use provided Kanoon results + General Legal Knowledge (AIR/SCC).
        2. **Hierarchy**:
           - First, identify the **Central Act** (e.g., IPC/BNS).
           - Second, CHECK FOR **State Amendments** in ${jurisdiction?.state || "India"}.
           - Third, cite the **Binding Precedents** provided in the results.
        
        3. **Citation Style**: Mimic professional standards (AIR/SCC).
           - Example: *State of Maharashtra v. Mayer Hans George, AIR 1965 SC 722*

        OUTPUT FORMAT (JSON):
        {
            "answer": "Comprehensive legal opinion formatted with the following Markdown headers:\n### Facts\n(Brief summary of facts)\n\n### Held\n(The court's decision)\n\n### Ratio Decidendi\n(The legal reasoning)\n\n### Judgment\n(Final conclusion). \n\nIf generating from general knowledge, ensure these sections are populated logically.",
            "citations": [
                { 
                    "title": "Case Name", 
                    "citation_ref": "AIR 202X SC XXX", 
                    "court": "Supreme Court", 
                    "url": "link...", 
                    "snippet": "Key holding..." 
                }
            ]
        }
        `;

        // 3. AI Reasoning Step
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
                "messages": [{ "role": "user", "content": fullPrompt }],
                "temperature": 0.1,
                "web_search": !kanoonContext, // Disable web search if we have direct API context to save latency/cost? No, let's keep it for hybrid power.
                "response_format": { "type": "json_object" }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("[DEEP RESEARCH ERROR]", data.error);
            return { error: data.error.message };
        }

        const content = data.choices?.[0]?.message?.content;
        let parsed = { answer: content, citations: sources };

        try {
            const jsonMatch = content?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiParsed = JSON.parse(jsonMatch[0]);
                parsed.answer = aiParsed.answer;
                // Merge AI citations
                if (aiParsed.citations && aiParsed.citations.length > 0) {
                    parsed.citations = [...sources, ...aiParsed.citations];
                    parsed.citations = parsed.citations.filter((v, i, a) => a.findIndex(t => (t.title === v.title)) === i);
                }

                // 4. AUDIT STEP (The Double Check)
                if (kanoonContext) {
                    console.log("[LegalResearcher] Auditing Response...");
                    const auditedRaw = await auditHeadnote(kanoonContext, parsed.answer);

                    // Format Audited JSON into Pretty Markdown
                    try {
                        const jsonMatch = auditedRaw.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) throw new Error("No JSON found");
                        const auditedJson = JSON.parse(jsonMatch[0]);

                        // Helper to safely format value (string, array, or object)
                        const fmt = (val: any): string => {
                            if (!val) return "";
                            if (typeof val === 'string') return val.trim();
                            if (Array.isArray(val)) {
                                const items = val.map(i => fmt(i)).filter(Boolean);
                                return items.join("\n\n");
                            }
                            if (typeof val === 'object') {
                                const entries = Object.entries(val)
                                    .map(([k, v]) => {
                                        const fv = fmt(v);
                                        return fv ? `**${k}**: ${fv}` : "";
                                    })
                                    .filter(Boolean);
                                return entries.join("\n\n");
                            }
                            return String(val).trim();
                        };

                        let prettyMd = "";

                        // Case-insensitive & dynamic key mapping
                        const getVal = (keys: string[]) => {
                            for (const k of Object.keys(auditedJson)) {
                                const lowerK = k.toLowerCase();
                                if (keys.includes(lowerK) || keys.some(target => lowerK.includes(target))) {
                                    return auditedJson[k];
                                }
                            }
                            return null;
                        };

                        const facts = getVal(["facts", "fact"]);
                        const held = getVal(["held", "holdings", "decision"]);
                        const ratio = getVal(["ratio", "rationale", "reasoning", "ratio decidendi"]);
                        const judgment = getVal(["judgment", "order", "conclusion"]);

                        const fFacts = fmt(facts) || "Finding details in official records...";
                        const fHeld = fmt(held) || "Pending judicial verification...";
                        const fRatio = fmt(ratio) || "Analyzing legal principle...";
                        const fJudgment = fmt(judgment) || "Conclusive finding pending...";

                        prettyMd += `### Facts\n${fFacts}\n\n`;
                        prettyMd += `### Held\n${fHeld}\n\n`;
                        prettyMd += `### Ratio Decidendi\n${fRatio}\n\n`;
                        prettyMd += `### Judgment\n${fJudgment}\n\n`;

                        // Fallback: If AI returned a JSON but it didn't have any identifiable legal sections
                        // or if they were all empty, use the raw audited text (or original answer)
                        const rawContent = auditedJson.answer || auditedJson.content || auditedRaw.replace(/\{[\s\S]*\}/, "").trim();
                        if (!fFacts && !fHeld && !fRatio && !fJudgment && rawContent) {
                            prettyMd += `### Summary\n${rawContent}\n\n`;
                        }

                        parsed.answer = prettyMd + "\n\n*(Verified against Official Records via PolyPact Auditor)*";
                    } catch (e) {
                        console.warn("[LegalResearcher] JSON Audit parsing failed, using raw text:", e);
                        parsed.answer = auditedRaw + "\n\n*(Verified against Official Records)*";
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to parse research JSON, returning raw text", e);
        }

        return parsed;

    } catch (error) {
        console.error("Deep Legal Research Error:", error);
        throw new Error("Failed to perform deep research");
    }
}
