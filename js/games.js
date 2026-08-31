document.addEventListener("DOMContentLoaded", function () {

    const account =
        document.getElementById("gamesAccount");

    if (!account) return;


    /*
     * L'utilisateur est censé être connecté.
     */

    const token =
        PamplemoucheAuth.getToken();

    if (!token) {

        /*
         * Sécurité : si quelqu'un arrive
         * directement sur games.html.
         */

        window.location.href = "/";

        return;

    }


    /*
     * HTML du compte
     */

    account.innerHTML = `

        <div class="gamesAccount">

            <div class="pampBalance">

                🟡
                <span id="pampAmount">
                    …
                </span>

            </div>


            <button
                id="profileButton"
                class="profileButton">

                P

            </button>


            <div
                id="accountMenu"
                class="accountMenu">

                <div
                    id="accountName"
                    class="accountName">

                    Compte

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
     * Menu du compte
     */

    const profile =
        document.getElementById(
            "profileButton"
        );

    const menu =
        document.getElementById(
            "accountMenu"
        );


    profile.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            menu.classList.toggle("open");

        }
    );


    document.addEventListener(
        "click",
        function () {

            menu.classList.remove("open");

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
     * Récupération du compte
     */

    loadAccount();

});


async function loadAccount() {

    try {

        const user =
            await PamplemoucheAuth.fetchMe();

        if (!user) return;


        const username =
            user.username ||
            user.pseudo ||
            user.name ||
            "Pamplemouche";


        const initial =
            username
                .trim()
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
                username;


        /*
         * Si le solde est fourni par l'API,
         * on l'affiche.
         */

        const pamp =
            user.pamp ??
            user.pamps ??
            user.balance;


        if (
            pamp !== undefined &&
            pamp !== null
        ) {

            const value =
                Number(pamp)
                    .toLocaleString("fr-FR");


            document
                .getElementById(
                    "pampAmount"
                )
                .textContent =
                    value;


            document
                .getElementById(
                    "menuPamp"
                )
                .textContent =
                    "🟡 " +
                    value +
                    " PAMP";

        }

    }

    catch (error) {

        console.error(
            "Impossible de charger le compte:",
            error
        );

    }

}
