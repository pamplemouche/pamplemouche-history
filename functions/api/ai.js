/* =========================================================
   HANDLER UNIQUE (INTERCEPTE TOUTES LES REQUÊTES)
========================================================= */

export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // 1. Gestion du Preflight CORS (browser OPTIONS)
    if (context.request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // 2. Refus clair si ce n'est pas un POST (si le front fait un GET par erreur)
    if (context.request.method !== "POST") {
        return new Response(
            JSON.stringify({ error: `Méthode ${context.request.method} non autorisée. Utilisez POST.` }),
            { status: 405, headers: corsHeaders }
        );
    }

    // 3. Traitement de la requête POST
    try {
        const body = await context.request.json();
        const apiKey = context.env.AI_API_KEY;

        if (!apiKey) {
            return Response.json(
                { error: "AI_API_KEY n'est pas configurée sur Cloudflare." },
                { status: 500, headers: corsHeaders }
            );
        }

        /*
         * =====================================================
         * ENDPOINT GEMINI 3.8 FLASH
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
                temperature: 0.7,
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
            console.error("Gemini API Error Detail:", JSON.stringify(data, null, 2));
            return Response.json(
                { error: "Gemini a renvoyé une erreur.", details: data },
                { status: response.status, headers: corsHeaders }
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
                { status: 500, headers: corsHeaders }
            );
        }

        /*
         * =====================================================
         * RETOURS CLIENT
         * =====================================================
         */
        if (body.type === "discussion") {
            return Response.json({
                message: result.message || "Aucune réponse.",
                events: Array.isArray(result.events) ? result.events : []
            }, { headers: corsHeaders });
        }

        if (body.type === "simulation") {
            return Response.json({
                message: result.message || "La simulation est terminée.",
                events: Array.isArray(result.events) ? result.events : [],
                changes: result.changes && typeof result.changes === "object" ? result.changes : {}
            }, { headers: corsHeaders });
        }

        return Response.json({
            message: result.message || "Requête traitée.",
            events: [],
            changes: {}
        }, { headers: corsHeaders });

    } catch (error) {
        console.error("AI Function Exception:", error);
        return Response.json(
            { error: "Erreur lors de la communication avec le serveur AI." },
            { status: 500, headers: corsHeaders }
        );
    }
}

/* =========================================================
   PROMPTS ET SCHÉMAS
========================================================= */

function buildGeminiConfig(body) {
    if (body.type === "discussion") {
        return {
            systemInstruction: `Tu es l'assistant IA du jeu Pamplemouche History.
Tu aides le joueur à comprendre le monde sans en modifier l'état.
Réponds obligatoirement avec un JSON valide respectant le schéma demandé.`,
            prompt: `
DATE ACTUELLE : ${body.date || "inconnue"}
PAYS SÉLECTIONNÉ : ${body.selectedCountry || "aucun"}
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
Tu simules l'évolution du monde entre deux dates.
Les actions ne sont pas instantanées. Simule aussi les autres pays.

ANNEXIONS ET TERRITOIRES :
Dans "changes", renvoie uniquement un objet dictionnaire des territoires modifiés.
Exemple : "changes": { "Belgium": { "owner": "France" } }

Format JSON strict obligatoire.`,
            prompt: `
TEMPS :
- Début : ${body.dateStart}
- Fin : ${body.dateEnd}
- Durée : ${body.duration?.amount || 0} ${body.duration?.unit || ""}

JOUEUR : ${body.selectedCountry || "aucun"}

ACTIONS :
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
                        description: "Dictionnaire des changements par territoire"
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
                events: { type: "ARRAY", items: { type: "STRING" } },
                changes: { type: "OBJECT" }
            },
            required: ["message", "events", "changes"]
        }
    };
}

/* =========================================================
   HELPERS
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
