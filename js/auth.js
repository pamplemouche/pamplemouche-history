
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


    function isLoggedIn() {

        return !!getToken();

    }


    /* =================================================
       LOGIN
    ================================================= */

    function login() {

        const url =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                HISTORY_URL
            );

        window.location.href =
            url;

    }


    /* =================================================
       LOGOUT
    ================================================= */

    function logout() {

        localStorage.removeItem(
            TOKEN_KEY
        );

        window.location.reload();

    }


    /* =================================================
       GAMES ACCOUNT
    ================================================= */

    function initializeGamesAccount() {

        const container =
            document.getElementById(
                "gamesAccount"
            );


        /*
         * Cette partie ne s'exécute que sur
         * games.html.
         */

        if (!container) {

            return;

        }


        /*
         * Pas connecté
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
         * CONNECTÉ
         *
         * On affiche immédiatement
         * le compte.
         */

        container.innerHTML = `

            <div
                class="gamesProfile"
                style="
                    position:relative;
                    display:flex;
                    align-items:center;
                    gap:10px;
                ">

                <div
                    class="pampBalance"
                    id="pampBalance"
                    style="
                        font-weight:600;
                    ">

                    🟡 — PAMP

                </div>


                <button
                    id="profileButton"
                    class="profileButton"
                    style="
                        width:40px;
                        height:40px;
                        border-radius:50%;
                        border:none;
                        cursor:pointer;
                        font-weight:bold;
                        font-size:16px;
                    ">

                    P

                </button>


                <div
                    id="accountMenu"
                    class="accountMenu"
                    style="
                        display:none;
                        position:absolute;
                        top:50px;
                        right:0;
                        min-width:180px;
                        padding:15px;
                        background:#151515;
                        border:1px solid #333;
                        border-radius:12px;
                        z-index:9999;
                    ">

                    <div
                        id="accountName"
                        style="
                            margin-bottom:12px;
                            font-weight:bold;
                        ">

                        Compte

                    </div>


                    <div
                        id="menuPamp"
                        style="
                            margin-bottom:12px;
                        ">

                        🟡 — PAMP

                    </div>


                    <button
                        id="logoutButton">

                        Se déconnecter

                    </button>

                </div>

            </div>

        `;


        /*
         * Récupération du profil
         */

        fetchMe();


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

                accountMenu.style.display =
                    accountMenu.style.display ===
                    "none"
                    ?
                    "block"
                    :
                    "none";

            }
        );


        document.addEventListener(
            "click",
            function () {

                accountMenu.style.display =
                    "none";

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
       PROFIL
    ================================================= */

    async function fetchMe() {

        const token =
            getToken();

        if (!token) return;


        try {

            const response =
                await fetch(
                    "/api/me",
                    {

                        headers: {

                            "Authorization":
                                "Bearer " +
                                token

                        }

                    }
                );


            if (!response.ok) {

                console.warn(
                    "/api/me indisponible"
                );

                return;

            }


            const user =
                await response.json();


            const username =
                user.username ||
                user.pseudo ||
                user.name ||
                "P";


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
             * Si ton API renvoie déjà
             * le solde, on l'affiche.
             */

            const pamp =
                user.pamp ??
                user.pamps ??
                user.balance;


            if (
                pamp !== undefined &&
                pamp !== null
            ) {

                const formatted =
                    Number(pamp)
                        .toLocaleString(
                            "fr-FR"
                        );


                document
                    .getElementById(
                        "pampBalance"
                    )
                    .textContent =
                        "🟡 " +
                        formatted +
                        " PAMP";


                document
                    .getElementById(
                        "menuPamp"
                    )
                    .textContent =
                        "🟡 " +
                        formatted +
                        " PAMP";

            }

        }

        catch (error) {

            console.error(
                "Erreur récupération compte:",
                error
            );

        }

    }


    /* =================================================
       INIT
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
        fetchMe

    };

})();
