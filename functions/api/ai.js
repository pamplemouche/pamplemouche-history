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
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent";


        const prompt =
            buildPrompt(body);


        const response =
            await fetch(
                endpoint +
                "?key=" +
                encodeURIComponent(apiKey),
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            contents: [

                                {

                                    role:
                                        "user",

                                    parts: [

                                        {
                                            text:
                                                prompt
                                        }

                                    ]

                                }

                            ],

                            generationConfig: {

                                temperature:
                                    0.7,

                                maxOutputTokens:
                                    4096,

                                responseMimeType:
                                    "application/json"

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


        const rawText =
            extractGeminiText(data);


        /*
         * Gemini doit maintenant répondre
         * en JSON.
         */

        let result;


        try {

            result =
                JSON.parse(
                    cleanJson(rawText)
                );

        }

        catch (error) {

            console.error(
                "Réponse Gemini invalide:",
                rawText
            );


            return Response.json(
                {
                    error:
                        "Gemini a fourni une réponse invalide."
                },
                {
                    status: 500
                }
            );

        }


        /*
         * =====================================================
         * DISCUSSION
         * =====================================================
         */

        if (
            body.type ===
            "discussion"
        ) {

            return Response.json({

                message:
                    result.message ||
                    "Aucune réponse.",

                events:
                    result.events ||
                    []

            });

        }


        /*
         * =====================================================
         * SIMULATION
         * =====================================================
         */

        if (
            body.type ===
            "simulation"
        ) {

            return Response.json({

                message:
                    result.message ||
                    "La simulation est terminée.",

                events:
                    Array.isArray(
                        result.events
                    )
                        ? result.events
                        : [],

                changes:
                    result.changes &&
                    typeof result.changes === "object"
                        ? result.changes
                        : {}

            });

        }


        return Response.json({

            message:
                result.message ||
                "Requête traitée."

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
   PROMPTS
========================================================= */

function buildPrompt(body) {


    /*
     * =====================================================
     * DISCUSSION
     * =====================================================
     */

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


=====================================================
RÈGLES
=====================================================

Réponds naturellement en français.

Tu peux expliquer :

- la situation d'un pays ;
- son économie ;
- son armée ;
- sa diplomatie ;
- ses relations ;
- les événements ;
- les conséquences possibles d'une décision.

IMPORTANT :

Cette requête est uniquement une discussion.

NE MODIFIE PAS l'état du monde.


=====================================================
FORMAT OBLIGATOIRE
=====================================================

Réponds UNIQUEMENT avec un objet JSON valide :

{
    "message": "ta réponse en français",
    "events": []
}

Ne mets aucun texte avant ou après le JSON.

`;

    }


    /*
     * =====================================================
     * SIMULATION
     * =====================================================
     */

    if (
        body.type ===
        "simulation"
    ) {

        return `

Tu es le moteur de simulation
de Pamplemouche History.

Tu dois simuler l'évolution du monde
entre deux dates.


=====================================================
TEMPS
=====================================================

DATE DE DÉPART :
${body.dateStart}

DATE D'ARRIVÉE :
${body.dateEnd}

DURÉE :
${body.duration?.amount || 0}
${body.duration?.unit || ""}


=====================================================
JOUEUR
=====================================================

PAYS DU JOUEUR :
${body.selectedCountry || "aucun"}


=====================================================
ACTIONS
=====================================================

Les actions suivantes ont été préparées
par le joueur :

${JSON.stringify(
    body.actions || [],
    null,
    2
)}


=====================================================
ÉTAT INITIAL DU MONDE
=====================================================

${JSON.stringify(
    body.worldState || {},
    null,
    2
)}


=====================================================
RÈGLES DE SIMULATION
=====================================================

Simule toute la période.

IMPORTANT :

Les actions du joueur ne sont PAS instantanées.

Tiens compte de la durée disponible.

Une action complexe peut prendre plusieurs
jours, semaines ou mois.

Simule également l'évolution normale du monde
indépendamment des actions du joueur.

Le monde doit continuer à évoluer.

Les autres pays peuvent notamment :

- améliorer ou détériorer leurs relations ;
- signer des accords ;
- déclarer des guerres ;
- conclure des paix ;
- mobiliser leurs forces ;
- développer leur économie ;
- construire des infrastructures ;
- produire du matériel ;
- changer leur politique ;
- réagir aux actions du joueur ;
- subir des événements cohérents.


=====================================================
TERRITOIRES
=====================================================

L'état du monde utilise des territoires.

Chaque territoire possède notamment :

{
    "owner": "Nom du pays"
}

Pour une annexion, NE SUPPRIME PAS le territoire.

Modifie simplement son propriétaire.

Exemple :

Belgium :

{
    "owner": "France"
}

Cela signifie que la Belgique est désormais
contrôlée par la France.

Le territoire doit conserver son existence
géographique afin que la carte puisse le colorer
avec le propriétaire actuel.


=====================================================
IMPORTANT : CHANGEMENTS UNIQUEMENT
=====================================================

Tu NE DOIS PAS renvoyer tout le worldState.

Renvoie uniquement les territoires dont
le propriétaire ou un autre élément pertinent
a changé pendant la simulation.

Exemple :

"changes": {
    "Belgium": {
        "owner": "France"
    }
}

Si aucun territoire n'a changé :

"changes": {}


=====================================================
COHÉRENCE
=====================================================

Ne crée pas de pays inexistants.

Ne modifie pas arbitrairement des territoires.

Ne prétends pas qu'une guerre ou une annexion
est terminée si la durée simulée ne le permet
pas raisonnablement.

Les événements doivent être cohérents avec
l'état initial du monde.

Le temps doit également continuer à s'écouler
normalement en dehors des actions du joueur.


=====================================================
RÉSULTAT
=====================================================

Retourne un résumé clair en français.

Le résumé doit expliquer :

- ce que les actions du joueur ont provoqué ;
- les réactions des autres pays ;
- les événements importants ;
- les changements diplomatiques ;
- les changements territoriaux ;
- les conséquences importantes.


=====================================================
FORMAT OBLIGATOIRE
=====================================================

Réponds UNIQUEMENT avec un JSON valide :

{
    "message": "résumé de la simulation",
    "events": [
        "événement 1",
        "événement 2"
    ],
    "changes": {
        "Nom du territoire": {
            "owner": "Nouveau propriétaire"
        }
    }
}

Ne mets aucun texte avant ou après le JSON.

`;

    }


    return `

Requête inconnue.

Type :
${body.type || "aucun"}

Réponds avec :

{
    "message": "Type de requête inconnu.",
    "events": [],
    "changes": {}
}

`;

}


/* =========================================================
   GEMINI TEXT
========================================================= */

function extractGeminiText(data) {

    if (
        !data ||
        !data.candidates ||
        !data.candidates.length
    ) {

        return "";

    }


    const candidate =
        data.candidates[0];


    if (
        !candidate.content ||
        !candidate.content.parts
    ) {

        return "";

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


/* =========================================================
   NETTOYAGE JSON
========================================================= */

function cleanJson(text) {

    let result =
        String(text || "")
            .trim();


    /*
     * Au cas où Gemini entoure malgré tout
     * le JSON avec ```json ... ```
     */

    if (
        result.startsWith("```")
    ) {

        result =
            result
                .replace(
                    /^```(?:json)?\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/,
                    ""
                )
                .trim();

    }


    return result;

}
