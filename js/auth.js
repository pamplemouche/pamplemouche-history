
/* =====================================================
   PAMPLEMOUCHE AUTH
   Écosystème Pamplemouche
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
       ÉTAT DE CONNEXION
    ================================================= */

    function isLoggedIn() {

        return !!getToken();

    }


    /* =================================================
       CONNEXION
    ================================================= */

    function login() {

        const url =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                HISTORY_URL
            );

        window.location.assign(
            url
        );

    }


    /* =================================================
       DÉCONNEXION
    ================================================= */

    function logout() {

        localStorage.removeItem(
            TOKEN_KEY
        );

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
       REQUÊTE AUTHENTIFIÉE
    ================================================= */

    async function authenticatedFetch(
        url,
        options = {}
    ) {

        const token =
            getToken();

        if (!token) {

            throw new Error(
                "Utilisateur non connecté."
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

        headers.set(
            "Content-Type",
            "application/json"
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
                "Erreur récupération profil:",
                error
            );

            return null;

        }

    }


    /* =================================================
       BOUTONS DE CONNEXION
    ================================================= */

    function initializeLoginButtons() {

        document
            .querySelectorAll(
                "#loginButton, [data-pamp-login]"
            )
            .forEach(
                button => {

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
                        event => {

                            event.preventDefault();

                            login();

                        }
                    );

                }
            );

    }


    /* =================================================
       INITIALISATION
    ================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            /*
             * Récupère un éventuel token renvoyé
             * par login.pamplemouche.com.
             */

            getToken();

            initializeLoginButtons();

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

        fetchMe,

        authenticatedFetch

    };

})();

