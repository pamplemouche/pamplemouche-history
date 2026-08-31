
(function () {

    "use strict";

    const LOGIN_URL =
        "https://login.pamplemouche.com";

    const HISTORY_URL =
        "https://history.pamplemouche.com";

    const TOKEN_KEY =
        "pamp_token";


    /* =================================================
       TOKEN
    ================================================= */

    function getToken() {

        const hash =
            window.location.hash.substring(1);

        if (hash) {

            const params =
                new URLSearchParams(hash);

            const token =
                params.get("token");

            if (token) {

                localStorage.setItem(
                    TOKEN_KEY,
                    token
                );

                history.replaceState(
                    null,
                    document.title,
                    window.location.pathname +
                    window.location.search
                );

                return token;
            }
        }

        return localStorage.getItem(
            TOKEN_KEY
        );
    }


    /* =================================================
       CONNEXION
    ================================================= */

    function isLoggedIn() {

        return !!getToken();

    }


    function login() {

        const url =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                HISTORY_URL
            );

        window.location.href = url;

    }


    /* =================================================
       DÉCONNEXION
    ================================================= */

    function logout() {

        localStorage.removeItem(
            TOKEN_KEY
        );

        window.location.reload();

    }


    /* =================================================
       API AUTHENTIFIÉE
    ================================================= */

    async function authenticatedFetch(
        url,
        options = {}
    ) {

        const token =
            getToken();

        if (!token) {

            throw new Error(
                "Utilisateur non connecté"
            );

        }

        const headers =
            new Headers(
                options.headers || {}
            );

        headers.set(
            "Authorization",
            "Bearer " + token
        );

        return fetch(
            url,
            {
                ...options,
                headers
            }
        );

    }


    /* =================================================
       PROFIL
    ================================================= */

    async function fetchMe() {

        try {

            const response =
                await authenticatedFetch(
                    "/api/me"
                );

            if (!response.ok) {

                return null;

            }

            return await response.json();

        }

        catch (error) {

            console.error(
                "Erreur profil:",
                error
            );

            return null;

        }

    }


    /* =================================================
       COMPTE GAMES
    ================================================= */

    async function initializeGamesAccount() {

        const container =
            document.getElementById(
                "gamesAccount"
            );


        /*
         * Si on n'est pas sur games.html,
         * on ne fait absolument rien.
         */

        if (!container) {

            return;

        }


        /*
         * Pas connecté.
         */

        if (!isLoggedIn()) {

            container.innerHTML = `

                <button
                    id="gamesLoginButton"
                    class="accountButton">

                    Se connecter

                </button>

            `;


            document
                .getElementById(
                    "gamesLoginButton"
                )
                .addEventListener(
                    "click",
                    login
                );


            return;

        }


        /*
         * Affichage temporaire pendant
         * la récupération du compte.
         */

        container.innerHTML = `

            <div
                class="gamesAccountLoading">

                ...

            </div>

        `;


        const user =
            await fetchMe();


        /*
         * Token invalide.
         */

        if (!user) {

            container.innerHTML = `

                <button
                    class="accountButton"
                    id="gamesLoginButton">

                    Se connecter

                </button>

            `;


            document
                .getElementById(
                    "gamesLoginButton"
                )
                .addEventListener(
                    "click",
                    login
                );


            return;

        }


        /*
         * Nom utilisateur.
         */

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


        /*
         * Solde Pamp si l'API /me
         * le fournit déjà.
         */

        const pamp =
            user.pamp ??
            user.pamps ??
            user.balance ??
            null;


        container.innerHTML = `

            <div class="gamesProfile">

                ${
                    pamp !== null
                    ?
                    `
                    <div class="pampBalance">

                        <span>
                            🟡
                        </span>

                        <span>
                            ${Number(pamp).toLocaleString("fr-FR")}
                        </span>

                    </div>
                    `
                    :
                    ""
                }


                <button
                    id="profileButton"
                    class="profileButton">

                    ${escapeHtml(initial)}

                </button>


                <div
                    id="accountMenu"
                    class="accountMenu">

                    <div
                        class="accountName">

                        ${escapeHtml(username)}

                    </div>


                    ${
                        pamp !== null
                        ?
                        `
                        <div class="accountPamp">

                            🟡
                            ${Number(pamp).toLocaleString("fr-FR")}
                            PAMP

                        </div>
                        `
                        :
                        ""
                    }


                    <button
                        id="logoutButton"
                        class="accountLogout">

                        Se déconnecter

                    </button>

                </div>

            </div>

        `;


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
                logout
            );

    }


    /* =================================================
       UTILITAIRE
    ================================================= */

    function escapeHtml(text) {

        const div =
            document.createElement(
                "div"
            );

        div.textContent =
            text;

        return div.innerHTML;

    }


    /* =================================================
       INITIALISATION
    ================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            getToken();

            initializeGamesAccount();

        }
    );


    /* =================================================
       API PUBLIQUE
    ================================================= */

    window.PamplemoucheAuth = {

        getToken,
        isLoggedIn,
        login,
        logout,
        authenticatedFetch,
        fetchMe

    };

})();
