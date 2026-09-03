/* =========================================================
   FUNCTIONS/API/AI.JS - COMPATIBLE GEMINI 3.8 FLASH
========================================================= */

export async function onRequest(context) {
    // Configuration universelle des en-têtes CORS
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json"
    };

    // 1. Prise en charge des requêtes Preflight (OPTIONS) envoyées par les navigateurs
    if (context.request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // 2. Vérification que la méthode utilisée est bien POST
    if (context.request.method !== "POST") {
        return new Response(
            JSON.stringify({ 
                error: `Méthode ${context.request.method} non autorisée. Veuillez soumettre une requête POST.` 
            }),
            { status: 405, headers: corsHeaders }
        );
    }

    // 3. Traitement de la requête
    try {
        const body = await context.request.json();
        const apiKey = context.env.AI_API_KEY;

        if (!apiKey) {
            return Response.json(
                { error: "La variable d'environnement AI_API_KEY n'est pas configurée sur Cloudflare." },
                { status: 500, headers: corsHeaders }
            );
        }

        /*
         * =====================================================
         * APPEL API GEMINI 3.8 FLASH
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
            console.error("Détails Erreur API Gemini:", JSON.stringify(data, null, 2));
            return Response.json(
                { error: "L'API Gemini a renvoyé une erreur.", details: data },
                { status: response.status, headers: corsHeaders }
            );
        }

        const rawText = extractGeminiText(data);

        let result;
        try {
            result = JSON.parse(cleanJson(rawText));
        } catch (error) {
            console.error("Erreur d'analyse du JSON Gemini:", rawText);
            return Response.json(
                { error: "Gemini a fourni une réponse au format JSON invalide.", raw: rawText },
                { status: 500, headers: corsHeaders }
            );
        }

        /*
         * =====================================================
         * RETOUR AU CLIENT FRONTEND
         * =====================================================
         */
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
        console.error("Exception dans la Cloudflare Function:", error);
        return Response.json(
            { error: "Erreur interne lors du traitement de la requête IA." },
            { status: 500, headers: corsHeaders }
        );
    }
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
                    events: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    },
                    changes: {
                        type: "OBJECT",
                        description: "Dictionnaire des territoires modifiés"
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
