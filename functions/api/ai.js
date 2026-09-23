/* =========================================================
   FUNCTIONS/API/AI.JS - SIMULATION RÉALISTE & ÉVÉNEMENTS MONDIAUX
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

        const primaryModel = "gemini-3.8-flash";
        const fallbackModel = "gemini-3.5-flash-lite";

        let response = await callGemini(primaryModel, apiKey, requestBody);

        if (!response.ok && [503, 404, 429].includes(response.status)) {
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

        if (!response.ok) {
            if (response.status === 503) {
                return createDiscussionErrorResponse(
                    "⚡ **Les serveurs Google sont temporairement surchargés (503).** Réessaie dans un instant.",
                    corsHeaders
                );
            }

            if (response.status === 429) {
                return createDiscussionErrorResponse(
                    "⏳ **Limite de quota atteinte (429).** Attends environ 30 secondes avant de réessayer.",
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
   APPEL API
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
    const playerCountry = body.playerCountry || "aucun";
    const selectedCountry = body.selectedCountry || "aucun";

    if (body.type === "discussion") {
        return {
            systemInstruction: `Tu es le conseiller géopolitique et historique de Pamplemouche History.
Tu aides le dirigeant de : ${playerCountry}.
Tu analyses la situation mondiale de manière réaliste sans modifier l'état de la carte.
Format de réponse : JSON strict respectant le schéma fourni.`,
            prompt: `
DATE ACTUELLE : ${body.date || "inconnue"}
PAYS DIRIGÉ PAR LE JOUEUR : ${playerCountry}
PAYS INSPECTÉ : ${selectedCountry}

ÉTAT DU MONDE :
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
            systemInstruction: `Tu es le moteur de simulation géopolitique et militaire de Pamplemouche History.
Le joueur dirige la nation : ${playerCountry}.

RÈGLES STRICTES DE SIMULATION :

1. RÉALISME MILITAIRE ET DÉFENSE :
   - Une tentative d'annexion ou d'attaque N'EST PAS automatiquement réussie.
   - Le pays ciblé se défendra avec ses forces et ses alliances.
   - Prends en compte la durée simulée (${body.duration?.amount || 0} ${body.duration?.unit || ""}) : une annexion complète prend du temps et peut échouer, bloquer en guerre d'usure, ou déboucher sur un traité.

2. CHANGEMENTS TERRITORIAUX ("changes") :
   - Ne mets un territoire dans "changes" QUE si son contrôle effectif a changé durant cette période.
   - Si le joueur (${playerCountry}) parvient à annexer un pays (ex: Belgique), indique : "changes": { "Belgique": { "owner": "${playerCountry}" } }.
   - Si le pays ciblé repousse l'attaque ou que la guerre est toujours en cours sans prise de territoire, ne modifie pas le propriétaire dans "changes".

3. ÉVÉNEMENTS AUTONOMES MONDIAUX :
   - Tu DOIS également simuler des événements indépendants du joueur dans le reste du monde (tensions entre puissances, guerres secondaires, pactes, révolutions).
   - Décris ces événements mondiaux dans le champ "message" et reflète d'éventuels annexions/conquêtes entre d'autres PNJ dans "changes".

Format JSON strict obligatoire.`,
            prompt: `
DURÉE DE SIMULATION :
- Début : ${body.dateStart}
- Fin : ${body.dateEnd}
- Durée : ${body.duration?.amount || 0} ${body.duration?.unit || ""}

NATION DU JOUEUR : ${playerCountry}

ACTIONS SOUROUMISES PAR LE JOUEUR :
${JSON.stringify(body.actions || [], null, 2)}

ÉTAT DU MONDE AVANT LA SIMULATION :
${JSON.stringify(body.worldState || {}, null, 2)}
`,
            responseSchema: {
                type: "OBJECT",
                properties: {
                    message: { 
                        type: "STRING", 
                        description: "Compte-rendu détaillé décrivant la défense du pays attaqué, le résultat des actions du joueur et les événements majeurs survenus dans le reste du monde." 
                    },
                    events: { 
                        type: "ARRAY", 
                        items: { type: "STRING" },
                        description: "Liste des faits marquants (ex: 'La Belgique résiste à l'assaut', 'Pacte signé entre l'Allemagne et la Pologne')"
                    },
                    changes: { 
                        type: "OBJECT", 
                        description: "Dictionnaire des territoires dont le contrôleur a changé (ex: { 'Belgique': { 'owner': '${playerCountry}' } })" 
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
   GESTIONNAIRE DE RÉESSAI
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
