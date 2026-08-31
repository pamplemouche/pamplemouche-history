document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const user =
            await PamplemoucheAuth.me();


        renderGames(
            user
        );

    }
);


function renderGames(user) {

    const container =
        document.getElementById(
            "games"
        );


    /*
        Pour l'instant on utilise
        des parties locales.

        Le backend pourra ensuite
        remplacer cette fonction.
    */

    const games =
        JSON.parse(
            localStorage.getItem(
                "pamplemouche_games"
            ) ||
            "[]"
        );


    container.innerHTML = "";


    if (
        games.length === 0
    ) {

        container.innerHTML = `

            <div class="gameCard">

                <div class="gameCardTitle">

                    Aucune partie

                </div>


                <div class="gameCardMeta">

                    Commencez votre première histoire.

                </div>


                <a
                    href="/play.html"
                    class="button primary gameCardButton">

                    Commencer

                </a>

            </div>

        `;


        return;

    }


    games.forEach(
        game => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "gameCard";


            card.innerHTML = `

                <div class="gameCardTitle">

                    ${escapeHtml(
                        game.name ||
                        "Nouvelle partie"
                    )}

                </div>


                <div class="gameCardMeta">

                    ${escapeHtml(
                        game.date ||
                        "1 janvier 1936"
                    )}

                </div>


                <a
                    href="/play.html?id=${encodeURIComponent(game.id)}"
                    class="button primary gameCardButton">

                    Continuer

                </a>

            `;


            container.appendChild(
                card
            );

        }
    );

}


function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

}
