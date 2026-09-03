export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const apiKey = context.env.AI_API_KEY;

        if (!apiKey) {
            return Response.json(
                { error: "AI_API_KEY n'est pas configurée sur Cloudflare." },
                { status: 500 }
            );
        }

        /*
         * =====================================================
         * GEMINI 3.8 FLASH ENDPOINT
         * =====================================================
         */
        const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

        const { prompt, systemInstruction, responseSchema } = buildGeminiConfig(body);

        const requestBody = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        };

        const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            return Response.json(
                { error: "Gemini a renvoyé une erreur.", details: data },
                { status: response.status }
            );
        }

        const rawText = extractGeminiText(data);

        let result;
        try {
            result = JSON.parse(cleanJson(rawText));
        } catch (error) {
            console.error("Erreur de parsing JSON Gemini:", rawText);
            return Response.json(
                { error: "Gemini a fourni un format JSON invalide.", raw: rawText },
                { status: 500 }
            );
        }

        /*
         * =====================================================
         * RETOURS CLIENT (DISCUSSION OU SIMULATION)
         * =====================================================
         */
        if (body.type === "discussion") {
            return Response.json({
                message: result.message || "Aucune réponse.",
                events: Array.isArray(result.events) ? result.events : []
            });
        }

        if (body.type === "simulation") {
            return Response.json({
                message: result.message || "La simulation est terminée.",
                events: Array.isArray(result.events) ? result.events : [],
                changes: result.changes && typeof result.changes === "object" ? result.changes : {}
            });
        }

        return Response.json({
            message: result.message || "Requête traitée.",
            events: [],
            changes: {}
        });

    } catch (error) {
        console.error("AI Function Exception:", error);
        return Response.json(
            { error: "Erreur lors de la communication avec le serveur AI." },
            { status: 500 }
        );
    }
}

/* =========================================================
   CONFIGURATION PROMPTS ET SCHÉMAS DE RÉPONSE
========================================================= */

function buildGeminiConfig(body) {
    if (body.type === "discussion") {
        return {
            systemInstruction: `Tu es l'assistant IA du jeu Pamplemouche History.
Tu aides le joueur à comprendre le monde dans lequel il joue.
Tu peux expliquer la situation d'un pays, son économie, son armée, sa diplomatie, ses relations, les événements et les conséquences d'une décision.
Cette requête est uniquement une discussion : NE MODIFIE PAS l'état du monde.
Réponds obligatoirement au format JSON indiqué.`,
            prompt: `
DATE ACTUELLE :
${body.date || "inconnue"}

PAYS SÉLECTIONNÉ :
${body.selectedCountry || "aucun"}

ÉTAT ACTUEL DU MONDE :
${JSON.stringify(body.worldState || {}, null, 2)}

QUESTION DU JOUEUR :
${body.message || ""}
`,
            responseSchema: {
                type: "OBJECT",
                properties: {
                    message: { type: "STRING" },
                    events: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["message", "events"]
            }
        };
    }

    if (body.type === "simulation") {
        return {
            systemInstruction: `Tu es le moteur de simulation de Pamplemouche History.
Tu dois simuler l'évolution du monde entre deux dates.
Les actions du joueur ne sont PAS instantanées, tiens compte de la durée.
Simule également l'évolution normale des autres pays (relations, traités, mobilisations, économie).

TERRITOIRES & ANNEXIONS :
Pour une annexion, NE SUPPRIME PAS le territoire, modifie simplement la propriété "owner".
IMPORTANT : Tu NE DOIS PAS renvoyer tout le worldState. Renvoie dans "changes" uniquement les territoires dont le propriétaire ou un élément a changé.
Exemple : "changes": { "Belgium": { "owner": "France" } }

RÉSUMÉ :
Explicite ce que les actions ont provoqué, les réactions des pays, les événements et les changements diplomatiques ou territoriaux.`,
            prompt: `
TEMPS :
- DATE DE DÉPART : ${body.dateStart}
- DATE D'ARRIVÉE : ${body.dateEnd}
- DURÉE : ${body.duration?.amount || 0} ${body.duration?.unit || ""}

JOUEUR :
- PAYS : ${body.selectedCountry || "aucun"}

ACTIONS PRÉPARÉES :
${JSON.stringify(body.actions || [], null, 2)}

ÉTAT INITIAL DU MONDE :
${JSON.stringify(body.worldState || {}, null, 2)}
`,
            responseSchema: {
                type: "OBJECT",
                properties: {
                    message: { type: "STRING" },
                    events: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    },
                    changes: {
                        type: "OBJECT",
                        description: "Map des territoires modifiés uniquement",
                        additionalProperties: {
                            type: "OBJECT",
                            properties: {
                                owner: { type: "STRING" }
                            },
                            required: ["owner"]
                        }
                    }
                },
                required: ["message", "events", "changes"]
            }
        };
    }

    return {
        systemInstruction: "Tu es un assistant répondeur JSON.",
        prompt: `Type de requête inconnu : ${body.type || "aucun"}`,
        responseSchema: {
            type: "OBJECT",
            properties: {
                message: { type: "STRING" },
                events: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                },
                changes: {
                    type: "OBJECT"
                }
            },
            required: ["message", "events", "changes"]
        }
    };
}

/* =========================================================
   EXTRACTION & NETTOYAGE
========================================================= */

function extractGeminiText(data) {
    if (!data?.candidates?.[0]?.content?.parts) {
        return "";
    }

    return data.candidates[0].content.parts
        .filter(part => typeof part.text === "string")
        .map(part => part.text)
        .join("\n")
        .trim();
}

function cleanJson(text) {
    let result = String(text || "").trim();

    if (result.startsWith("```")) {
        result = result
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
    }

    return result;
}
