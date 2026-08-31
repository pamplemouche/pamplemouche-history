
document.addEventListener("DOMContentLoaded", async function () {

    const account =
        document.getElementById("gamesAccount");

    if (!account) return;


    const token =
        PamplemoucheAuth.getToken();

    if (!token) {

        window.location.href = "/";

        return;

    }


    /*
     * Affichage immédiat
     */

    account.innerHTML = `

        <div class="gamesAccount">

            <div
                id="pampBalance"
                class="pampBalance">

                🟡 …

            </div>


            <button
                id="profileButton"
                class="profileButton">

                ?

            </button>


            <div
                id="accountMenu"
                class="accountMenu">

                <div
                    id="accountName"
                    class="accountName">

                    Chargement…

                </div>


                <div
                    id="menuPamp"
                    class="accountPamp">

                    🟡 …

                </div>


                <button
                    id="logoutButton"
                    class="accountLogout">

                    Se déconnecter

                </button>

            </div>

        </div>

    `;


    /*
     * Menu
     */

    const profileButton =
        document.getElementById(
            "profileButton"
        );

    const accountMenu =
        document.getElementById(
            "accountMenu"
        );


    profileButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            accountMenu.classList.toggle(
                "open"
            );

        }
    );


    document.addEventListener(
        "click",
        function () {

            accountMenu.classList.remove(
                "open"
            );

        }
    );


    document
        .getElementById(
            "logoutButton"
        )
        .addEventListener(
            "click",
            function () {

                PamplemoucheAuth.logout();

            }
        );


    /*
     * Récupération du compte directement
     * depuis Arc Pamplemouche
     */

    try {

        const response =
            await fetch(
                "https://arc.pamplemouche.com/api/me",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            "Bearer " +
                            token

                    }

                }
            );


        if (!response.ok) {

            throw new Error(
                "Arc API : HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        if (!data.ok) {

            throw new Error(
                "Session invalide"
            );

        }


        /*
         * ================================
         * PSEUDO
         * ================================
         */

        const username =
            data.username ||
            "Pamplemouche";


        const cleanUsername =
            username
                .replace(
                    /\s*\(ADM🛡️?\)\s*$/u,
                    ""
                )
                .trim();


        const initial =
            cleanUsername
                .charAt(0)
                .toUpperCase();


        document
            .getElementById(
                "profileButton"
            )
            .textContent =
                initial;


        document
            .getElementById(
                "accountName"
            )
            .textContent =
                cleanUsername;


        /*
         * ================================
         * PAMP
         * ================================
         */

        const pamp =
            Number(
                data.pamp ?? 0
            );


        const formattedPamp =
            pamp.toLocaleString(
                "fr-FR"
            );


        document
            .getElementById(
                "pampBalance"
            )
            .textContent =
                "🟡 " +
                formattedPamp;


        document
            .getElementById(
                "menuPamp"
            )
            .textContent =
                "🟡 " +
                formattedPamp +
                " PAMP";


    }

    catch (error) {

        console.error(
            "Impossible de récupérer le compte Arc :",
            error
        );


        document
            .getElementById(
                "pampBalance"
            )
            .textContent =
                "🟡 —";


        document
            .getElementById(
                "profileButton"
            )
            .textContent =
                "?";


        document
            .getElementById(
                "accountName"
            )
            .textContent =
                "Compte indisponible";

    }

});
