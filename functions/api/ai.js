export async function onRequestPost(context) {

    try {

        const body =
            await context.request.json();


        /*
            Ici on récupère la clé
            depuis les secrets Cloudflare.

            NE JAMAIS mettre cette clé
            dans play.js.
        */

        const apiKey =
            context.env.AI_API_KEY;


        if (!apiKey) {

            return Response.json(
                {
                    error:
                        "AI_API_KEY n'est pas configurée."
                },
                {
                    status: 500
                }
            );

        }


        /*
            =================================================
            IMPORTANT
            =================================================

            Remplace cette URL par l'API IA
            que tu utiliseras réellement.

            Le reste du système n'aura pas besoin
            d'être changé.
        */


        const response =
            await fetch(
                "https://api.openai.com/v1/responses",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            apiKey

                    },

                    body:
                        JSON.stringify({

                            model:
                                "gpt-5",

                            input:
                                buildPrompt(
                                    body
                                )

                        })

                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            return Response.json(
                {
                    error:
                        "Erreur du fournisseur IA.",
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
            extractText(
                data
            );


        return Response.json({

            message:
                message,

            /*
                Pour une future simulation structurée,
                l'IA pourra également renvoyer :

                    worldState

                ici.
            */

        });

    }

    catch (error) {

        console.error(
            error
        );


        return Response.json(
            {
                error:
                    "Erreur serveur IA."
            },
            {
                status: 500
            }
        );

    }

}


/* =====================================================
   PROMPT
===================================================== */

function buildPrompt(
    body
) {

    if (
        body.type ===
        "discussion"
    ) {

        return `

Tu es l'assistant de Pamplemouche History.

Date actuelle :
${body.date}

Pays sélectionné :
${body.selectedCountry || "aucun"}

État actuel du monde :
${JSON.stringify(body.worldState)}

Question du joueur :
${body.message}

Réponds de manière concise et utile.
Tu ne dois pas modifier le monde.

`;

    }


    if (
        body.type ===
        "simulation"
    ) {

        return `

Tu es le moteur de simulation
de Pamplemouche History.

Date de départ :
${body.dateStart}

Date de fin :
${body.dateEnd}

Durée :
${body.duration.amount} ${body.duration.unit}

Pays du joueur :
${body.selectedCountry || "aucun"}

Actions du joueur :
${JSON.stringify(body.actions)}

État initial du monde :
${JSON.stringify(body.worldState)}

SIMULE toute la période.

Tu dois simuler :

- les conséquences des actions du joueur ;
- les actions des autres pays ;
- diplomatie ;
- guerres ;
- économie ;
- politique ;
- événements normaux ;
- changements territoriaux ;
- conséquences indirectes.

Ne fais PAS seulement les actions du joueur :
le monde doit continuer à évoluer normalement
pendant toute la période.

Pour l'instant retourne une description textuelle
de la simulation.

`;

    }


    return "Requête inconnue.";

}


/* =====================================================
   EXTRACTION
===================================================== */

function extractText(
    data
) {

    if (
        data.output_text
    ) {

        return data.output_text;

    }


    if (
        data.output &&
        Array.isArray(
            data.output
        )
    ) {

        return data.output
            .flatMap(
                item =>
                    item.content || []
            )
            .filter(
                item =>
                    item.type ===
                    "output_text"
            )
            .map(
                item =>
                    item.text
            )
            .join("\n");

    }


    return "Aucune réponse de l'IA.";

}
