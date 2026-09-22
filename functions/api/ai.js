/* =========================================================
   FUNCTIONS/API/AI.JS - GESTION 503 & FALLBACK MODÈLE
========================================================= */

export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json"
    };

    if (context.request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (context.request.method !== "POST") {
        return createDiscussionErrorResponse(
            "⚠️ Erreur : Méthode non autorisée. Soumets une requête POST.",
            corsHeaders
        );
    }

    try {
        const body = await context.request.json();
        const apiKey = context.env.AI_API_KEY;

        if (!apiKey) {
            return createDiscussionErrorResponse(
                "⚠️ [CLOUDFLARE] La variable AI_API_KEY n'est pas configurée.",
                corsHeaders
            );
        }

        const { prompt, systemInstruction, responseSchema } = buildGeminiConfig(body);

        const requestBody = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        };

        // Modèle principal et modèle de secours
        const primaryModel = "gemini-3.6-flash";
        const fallbackModel = "gemini-2.5-flash";

        let response = await callGemini(primaryModel, apiKey, requestBody);

        // Si le modèle principal est surchargé (503) ou indisponible (404), tente le modèle de secours
        if (response.status === 503 || response.status === 404) {
            console.warn(`[Gemini API] Modèle ${primaryModel} en erreur ${response.status}. Bascule sur ${fallbackModel}...`);
            response = await callGemini(fallbackModel, apiKey, requestBody);
        }

        const rawResponseBody = await response.text();
        let data;
        try {
            data = JSON.parse(rawResponseBody);
        } catch {
            data = { rawText: rawResponseBody };
        }

        // Gestion propre des erreurs HTTP
        if (!response.ok) {
            if (response.status === 503) {
                return createDiscussionErrorResponse(
                    "⚡ **Les serveurs de Google sont temporairement surchargés (Erreur 503).**\n\nAttends quelques secondes puis réessaie.",
                    corsHeaders
                );
            }

            if (response.status === 429) {
                return createDiscussionErrorResponse(
                    "⏳ **Limite de requêtes atteinte.** Attends environ 30 secondes avant de réessayer.",
                    corsHeaders
                );
            }

            const formattedError = [
                `⚠️ [ERREUR API GEMINI ${response.status}]`,
                `Détails :`,
                "```json",
                JSON.stringify(data, null, 2),
                "```"
            ].join("\n\n");

            return createDiscussionErrorResponse(formattedError, corsHeaders);
        }

        const rawText = extractGeminiText(data);

        let result;
        try {
            result = JSON.parse(cleanJson(rawText));
        } catch {
            return createDiscussionErrorResponse(
                "⚠️ Gemini n'a pas renvoyé un format JSON valide.",
                corsHeaders
            );
        }

        if (body.type === "discussion") {
            return Response.json({
                message: result.message || "Aucune réponse générée.",
                events: Array.isArray(result.events) ? result.events : []
            }, { headers: corsHeaders });
        }

        if (body.type === "simulation") {
            return Response.json({
                message: result.message || "La simulation s'est terminée normalement.",
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
        return createDiscussionErrorResponse(
            `⚠️ Erreur interne : ${error.message || String(error)}`,
            corsHeaders
        );
    }
}

/* =========================================================
   APPEL A L'API
========================================================= */

async function callGemini(modelName, apiKey, requestBody) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

    return await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    }, 2);
}

function createDiscussionErrorResponse(errorMessage, headers) {
    return Response.json({
        message: errorMessage,
        events: ["⚠️ Notification système"],
        changes: {}
    }, { status: 200, headers });
}

/* =========================================================
   PROMPTS & SCHÉMAS CONFIG
========================================================= */

function buildGeminiConfig(body) {
    if (body.type === "discussion") {
        return {
            systemInstruction: `Tu es l'assistant IA du jeu Pamplemouche History.
Tu aides le joueur à comprendre la situation globale du monde sans modifier son état.
Réponds obligatoirement avec un objet JSON valide respectant le schéma fourni.`,
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
                    events: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["message", "events"]
            }
        };
    }

    if (body.type === "simulation") {
        return {
            systemInstruction: `Tu es le moteur de simulation de Pamplemouche History.
Tu simules l'évolution globale du monde entre deux dates données.
Les actions du joueur ne sont pas instantanées. Tu dois également simuler l'évolution autonome des autres nations.

MODIFICATIONS DE TERRITOIRES :
Dans "changes", renvoie exclusivement les territoires ayant subi un changement.
Exemple : "changes": { "Belgium": { "owner": "France" } }

Format JSON strict obligatoire.`,
            prompt: `
TEMPS :
- Début : ${body.dateStart}
- Fin : ${body.dateEnd}
- Durée : ${body.duration?.amount || 0} ${body.duration?.unit || ""}

PAYS DU JOUEUR : ${body.selectedCountry || "aucun"}

ACTIONS :
${JSON.stringify(body.actions || [], null, 2)}

ÉTAT INITIAL DU MONDE :
${JSON.stringify(body.worldState || {}, null, 2)}
`,
            responseSchema: {
                type: "OBJECT",
                properties: {
                    message: { type: "STRING" },
                    events: { type: "ARRAY", items: { type: "STRING" } },
                    changes: { type: "OBJECT", description: "Dictionnaire des territoires modifiés" }
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
   EXTRACTEUR ET NETTOYEUR
========================================================= */

function extractGeminiText(data) {
    if (!data?.candidates?.[0]?.content?.parts) return "";
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

/* =========================================================
   GESTIONNAIRE DE RÉESSAI (RETRY)
========================================================= */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 2) {
    let attempt = 0;
    const baseDelay = 1500;

    while (attempt <= maxRetries) {
        const response = await fetch(url, options);

        if (response.ok || ![429, 500, 502, 503, 504].includes(response.status)) {
            return response;
        }

        attempt++;
        if (attempt > maxRetries) return response;

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
    }
}
