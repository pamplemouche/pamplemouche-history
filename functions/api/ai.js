export async function onRequestPost(context) {

    try {

        const body =
            await context.request.json();


        const apiKey =
            context.env.AI_API_KEY;


        if (!apiKey) {

            return Response.json(
                {
                    error:
                        "AI_API_KEY n'est pas configurée sur Cloudflare."
                },
                {
                    status: 500
                }
            );

        }


        /*
         * =====================================================
         * GEMINI
         * =====================================================
         */

        const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";


        const prompt =
            buildPrompt(body);


        const response =
            await fetch(
                endpoint +
                "?key=" +
                encodeURIComponent(apiKey),
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            contents: [

                                {

                                    role: "user",

                                    parts: [

                                        {
                                            text: prompt
                                        }

                                    ]

                                }

                            ],

                            generationConfig: {

                                temperature: 0.7,

                                maxOutputTokens: 4096

                            }

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Gemini error:",
                data
            );


            return Response.json(
                {
                    error:
                        "Gemini a renvoyé une erreur.",
                    details:
                        data
                },
                {
                    status:
                        response.status
                }
            );

        }


        const message =
            extractGeminiText(data);


        return Response.json({

            message:
                message

        });

    }

    catch (error) {

        console.error(
            "AI Function error:",
            error
        );


        return Response.json(
            {
                error:
                    "Erreur lors de la communication avec Gemini."
            },
            {
                status: 500
            }
        );

    }

}


/* =========================================================
   PROMPT
========================================================= */

function buildPrompt(body) {

    if (
        body.type ===
        "discussion"
    ) {

        return `

Tu es l'assistant IA de Pamplemouche History.

Tu aides le joueur à comprendre le monde
dans lequel il joue.

DATE ACTUELLE :
${body.date || "inconnue"}

PAYS SÉLECTIONNÉ :
${body.selectedCountry || "aucun"}

ÉTAT ACTUEL DU MONDE :
${JSON.stringify(
    body.worldState || {},
    null,
    2
)}

QUESTION DU JOUEUR :
${body.message || ""}

Réponds naturellement en français.

Tu peux expliquer :

- la situation d'un pays ;
- son économie ;
- son armée ;
- sa diplomatie ;
- ses relations avec les autres pays ;
- les événements actuels ;
- les conséquences possibles d'une décision.

IMPORTANT :

Cette requête est uniquement une discussion.

NE MODIFIE PAS l'état du monde.

`;

    }


    if (
        body.type ===
        "simulation"
    ) {

        return `

Tu es le moteur de simulation
de Pamplemouche History.

Tu dois simuler l'évolution du monde
entre deux dates.

DATE DE DÉPART :
${body.dateStart}

DATE D'ARRIVÉE :
${body.dateEnd}

DURÉE :
${body.duration?.amount || 0}
${body.duration?.unit || ""}

PAYS DU JOUEUR :
${body.selectedCountry || "aucun"}

ACTIONS DU JOUEUR :
${JSON.stringify(
    body.actions || [],
    null,
    2
)}

ÉTAT INITIAL DU MONDE :
${JSON.stringify(
    body.worldState || {},
    null,
    2
)}


=====================================================
RÈGLES DE SIMULATION
=====================================================

Simule toute la période.

Les actions du joueur doivent avoir
des conséquences réalistes.

Mais tu dois également simuler
ce qui se passe indépendamment du joueur.

Le monde ne doit PAS rester immobile.

Les autres pays doivent pouvoir :

- déclarer des guerres ;
- signer des traités ;
- améliorer ou détériorer leurs relations ;
- construire des infrastructures ;
- développer leur économie ;
- produire des équipements ;
- mobiliser leurs armées ;
- changer de gouvernement ;
- prendre des décisions diplomatiques ;
- subir des événements ;
- réagir aux actions du joueur.

Les conséquences doivent être cohérentes
avec la durée de la simulation.

Une action prenant plusieurs mois
ne doit pas être instantanée.

Les changements territoriaux doivent être
réalistes et cohérents avec les événements.


=====================================================
RÉSULTAT
=====================================================

Pour l'instant, retourne principalement
un compte-rendu clair de ce qui s'est passé
pendant la période.

Explique notamment :

- les principales actions du joueur ;
- les réactions des autres pays ;
- les guerres ;
- la diplomatie ;
- l'économie ;
- les changements territoriaux ;
- les événements importants.

Ne prétends pas qu'un événement a eu lieu
s'il n'est pas cohérent avec l'état initial
du monde.

`;

    }


    return `

Requête inconnue.

Type reçu :
${body.type || "aucun"}

`;

}


/* =========================================================
   EXTRACTION GEMINI
========================================================= */

function extractGeminiText(data) {

    if (
        !data ||
        !data.candidates ||
        !data.candidates.length
    ) {

        return "Gemini n'a fourni aucune réponse.";

    }


    const candidate =
        data.candidates[0];


    if (
        !candidate.content ||
        !candidate.content.parts
    ) {

        return "Gemini n'a fourni aucun texte.";

    }


    return candidate.content.parts
        .filter(
            part =>
                typeof part.text ===
                "string"
        )
        .map(
            part =>
                part.text
        )
        .join("\n")
        .trim();

}
