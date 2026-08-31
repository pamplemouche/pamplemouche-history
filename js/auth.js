
/* =====================================================
   PAMPLEMOUCHE AUTH
   Compatible avec login.pamplemouche.com
===================================================== */

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

                /*
                 * Supprime #token=... de l'adresse.
                 */

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
       CONNECTÉ ?
    ================================================= */

    function isLoggedIn() {

        return !!getToken();

    }


    /* =================================================
       CONNEXION
    ================================================= */

    function login() {

        /*
         * On demande à Login de revenir
         * sur History après la connexion.
         */

        const redirect =
            HISTORY_URL;


        const loginUrl =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                redirect
            );


        console.log(
            "Redirection vers Login Pamplemouche:",
            loginUrl
        );


        window.location.assign(
            loginUrl
        );

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
       API /ME
    ================================================= */

    async function fetchMe() {

        const token =
            getToken();


        if (!token) {

            return null;

        }


        try {

            const response =
                await fetch(
                    "/api/me",
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

                return null;

            }


            return await response.json();

        }

        catch (error) {

            console.error(
                "Erreur /api/me:",
                error
            );

            return null;

        }

    }


    /* =================================================
       BRANCHER LES BOUTONS LOGIN
    ================================================= */

    function initializeLoginButtons() {

        const buttons =
            document.querySelectorAll(
                "#loginButton, [data-pamp-login]"
            );


        buttons.forEach(
            button => {

                /*
                 * Évite de brancher deux fois
                 * le même bouton.
                 */

                if (
                    button.dataset.pampAuthReady ===
                    "true"
                ) {

                    return;

                }


                button.dataset.pampAuthReady =
                    "true";


                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        login();

                    }
                );

            }
        );

    }


    /* =================================================
       COMPTE DANS HISTORY
    ================================================= */

    async function initializeAccount() {

        const account =
            document.getElementById(
                "gameAccount"
            );


        if (!account) {

            return;

        }


        const token =
            getToken();


        if (!token) {

            account.innerHTML = `

                <button
                    class="accountButton"
                    id="loginButton">

                    Se connecter

                </button>

            `;


            initializeLoginButtons();

            return;

        }


        account.innerHTML = `

            <button
                class="accountButton"
                id="accountButton">

                Compte

            </button>

        `;


        const accountButton =
            document.getElementById(
                "accountButton"
            );


        accountButton.addEventListener(
            "click",
            async function () {

                accountButton.textContent =
                    "Chargement...";


                const user =
                    await fetchMe();


                if (!user) {

                    accountButton.textContent =
                        "Session invalide";

                    localStorage.removeItem(
                        TOKEN_KEY
                    );

                    return;

                }


                const username =
                    user.username ||
                    user.pseudo ||
                    user.name ||
                    "Compte";


                accountButton.textContent =
                    username;

            }
        );

    }


    /* =================================================
       INITIALISATION
    ================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            /*
             * Récupère immédiatement un éventuel
             * token reçu depuis Login.
             */

            getToken();


            /*
             * Branche les boutons déjà présents.
             */

            initializeLoginButtons();


            /*
             * Initialise le compte de History.
             */

            initializeAccount();

        }
    );


    /* =================================================
       API PUBLIQUE
    ================================================= */

    window.PamplemoucheAuth = {

        getToken:
            getToken,

        isLoggedIn:
            isLoggedIn,

        login:
            login,

        logout:
            logout,

        fetchMe:
            fetchMe

    };

})();
