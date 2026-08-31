```javascript
/* =====================================================
   PAMPLEMOUCHE AUTH
   Compatible avec login.pamplemouche.com
===================================================== */

(function () {

    "use strict";


    const LOGIN_URL =
        "https://login.pamplemouche.com";


    const TOKEN_KEY =
        "pamp_token";


    /* =================================================
       TOKEN
    ================================================= */

    function getToken() {

        /*
         * 1. Vérifie si login.pamplemouche.com
         *    vient de nous renvoyer avec #token=...
         */

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
                 * Nettoie le token de l'URL.
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


        /*
         * 2. Token déjà enregistré.
         */

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

        const currentUrl =
            window.location.href.split("#")[0];


        const url =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                currentUrl
            );


        window.location.href =
            url;

    }


    /* =================================================
       DÉCONNEXION
    ================================================= */

    function logout() {

        localStorage.removeItem(
            TOKEN_KEY
        );

        /*
         * Les autres sites de l'écosystème
         * peuvent également utiliser ces copies.
         */

        localStorage.removeItem(
            "arc_token"
        );

        localStorage.removeItem(
            "oasis_token"
        );

        localStorage.removeItem(
            "market_token"
        );

        window.location.reload();

    }


    /* =================================================
       API
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
       INITIALISATION DU COMPTE
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


            document
                .getElementById(
                    "loginButton"
                )
                .addEventListener(
                    "click",
                    login
                );


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
            async () => {

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
        () => {

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
```
