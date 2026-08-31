(function () {

    "use strict";

    const LOGIN_URL =
        "https://login.pamplemouche.com";

    const HISTORY_URL =
        "https://history.pamplemouche.com";

    const TOKEN_KEY =
        "pamp_token";


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


    function login() {

        window.location.href =
            LOGIN_URL +
            "?redirect=" +
            encodeURIComponent(
                HISTORY_URL
            );

    }


    function logout() {

        localStorage.removeItem(
            TOKEN_KEY
        );

        window.location.reload();

    }


    async function fetchMe() {

        const token =
            getToken();

        if (!token) return null;

        try {

            const response =
                await fetch(
                    "/api/me",
                    {
                        headers: {
                            Authorization:
                                "Bearer " + token
                        }
                    }
                );

            if (!response.ok) {

                return null;

            }

            return await response.json();

        } catch {

            return null;

        }

    }


    async function initializeGamesAccount() {

        const container =
            document.getElementById(
                "gamesAccount"
            );

        if (!container) return;


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
                .onclick = login;

            return;
        }


        const user =
            await fetchMe();


        /*
         * Même si /api/me ne fonctionne pas,
         * on affiche quand même le rond.
         */

        const username =
            user?.username ||
            user?.pseudo ||
            user?.name ||
            "P";


        const initial =
            username
                .trim()
                .charAt(0)
                .toUpperCase();


        const pamp =
            user?.pamp ??
            user?.pamps ??
            user?.balance;


        container.innerHTML = `

            <div class="gamesProfile">

                ${
                    pamp !== undefined &&
                    pamp !== null
                    ?
                    `
                    <div class="pampBalance">

                        🟡
                        ${Number(pamp).toLocaleString("fr-FR")}
                        PAMP

                    </div>
                    `
                    :
                    ""
                }

                <button
                    id="profileButton"
                    class="profileButton">

                    ${initial}

                </button>

                <div
                    id="accountMenu"
                    class="accountMenu">

                    <strong>
                        ${escapeHtml(username)}
                    </strong>

                    ${
                        pamp !== undefined &&
                        pamp !== null
                        ?
                        `
                        <div>
                            🟡
                            ${Number(pamp).toLocaleString("fr-FR")}
                            PAMP
                        </div>
                        `
                        :
                        ""
                    }

                    <button
                        id="logoutButton">

                        Déconnexion

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


        profileButton.onclick =
            function (event) {

                event.stopPropagation();

                accountMenu.classList.toggle(
                    "open"
                );

            };


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
            .onclick =
                logout;

    }


    function escapeHtml(text) {

        const div =
            document.createElement("div");

        div.textContent = text;

        return div.innerHTML;

    }


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            getToken();

            initializeGamesAccount();

        }
    );


    window.PamplemoucheAuth = {

        getToken,
        isLoggedIn,
        login,
        logout,
        fetchMe

    };

})();
