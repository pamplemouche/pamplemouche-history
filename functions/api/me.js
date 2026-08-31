export async function onRequestGet(context) {

    const request =
        context.request;


    const authorization =
        request.headers.get(
            "Authorization"
        );


    if (!authorization) {

        return Response.json(
            {
                error:
                    "Non authentifié"
            },
            {
                status: 401
            }
        );

    }


    try {

        const response =
            await fetch(
                "https://arc.pamplemouche.com/api/me",
                {

                    headers: {

                        Authorization:
                            authorization

                    }

                }
            );


        const text =
            await response.text();


        return new Response(
            text,
            {

                status:
                    response.status,

                headers: {

                    "Content-Type":
                        "application/json"

                }

            }
        );

    }

    catch (error) {

        return Response.json(
            {
                error:
                    "Impossible de contacter ARC"
            },
            {
                status: 502
            }
        );

    }

}
