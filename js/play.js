let currentDate =
    new Date(1936, 0, 1);


let selectedCountry = null;

let selectedCountryElement = null;

let panelMode = "discussion";

let pendingActions = [];

let territories = [];

let worldState = {};

let countryColors = {};

let mapGroup;


/* =====================================================
   PALETTE
===================================================== */

const palette = [

    "#c94c4c",
    "#4c82c9",
    "#55a86b",
    "#c98a45",
    "#8957b5",
    "#45a6a0",
    "#b85d8d",
    "#7b9a45",
    "#c26c35",
    "#596fc1",
    "#a65a5a",
    "#5b9b83",
    "#9b7a45",
    "#725ca8",
    "#4c8eaa",
    "#ad5971",
    "#6f9652",
    "#b36c4a",
    "#637db0",
    "#96704d"

];


let colorIndex = 0;


function getCountryColor(owner) {

    if (
        countryColors[owner]
    ) {

        return countryColors[owner];

    }


    countryColors[owner] =
        palette[
            colorIndex %
            palette.length
        ];


    colorIndex++;

    return countryColors[owner];

}


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeMap();

        initializeControls();

    }
);


/* =====================================================
   MAP
===================================================== */

function initializeMap() {

    const svg =
        d3.select(
            "#worldMap"
        );


    const width =
        window.innerWidth;


    const height =
        window.innerHeight;


    const projection =
        d3.geoNaturalEarth1()
          .scale(
              width / 5.8
          )
          .translate([
              width / 2,
              height / 2
          ]);


    const path =
        d3.geoPath()
          .projection(
              projection
          );


    mapGroup =
        svg.append(
            "g"
        );


    const zoom =
        d3.zoom()
          .scaleExtent([
              1,
              10
          ])
          .on(
              "zoom",
              event => {

                  mapGroup.attr(
                      "transform",
                      event.transform
                  );

              }
          );


    svg.call(
        zoom
    );


    d3.json(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    )
    .then(
        world => {

            const features =
                topojson.feature(
                    world,
                    world.objects.countries
                ).features;


            territories =
                features.map(
                    feature => {

                        const name =
                            feature.properties.name ||
                            "Territoire " +
                            feature.id;


                        worldState[name] = {

                            id:
                                feature.id,

                            name:
                                name,

                            owner:
                                name

                        };


                        return {

                            id:
                                feature.id,

                            name:
                                name,

                            owner:
                                name,

                            geometry:
                                feature

                        };

                    }
                );


            drawMap(
                path
            );

        }
    )
    .catch(
        error => {

            console.error(
                "Impossible de charger la carte:",
                error
            );

        }
    );

}


/* =====================================================
   DRAW
===================================================== */

function drawMap(path) {

    mapGroup
        .selectAll(
            ".country"
        )
        .data(
            territories
        )
        .enter()
        .append(
            "path"
        )
        .attr(
            "class",
            "country"
        )
        .attr(
            "d",
            d =>
                path(
                    d.geometry
                )
        )
        .attr(
            "fill",
            d =>
                getCountryColor(
                    d.owner
                )
        )
        .on(
            "click",
            function(event, d) {

                selectCountry(
                    this,
                    d
                );

            }
        );


    mapGroup
        .selectAll(
            ".country-label"
        )
        .data(
            territories
        )
        .enter()
        .append(
            "text"
        )
        .attr(
            "class",
            "country-label"
        )
        .attr(
            "x",
            d => {

                const centroid =
                    path.centroid(
                        d.geometry
                    );

                return centroid[0];

            }
        )
        .attr(
            "y",
            d => {

                const centroid =
                    path.centroid(
                        d.geometry
                    );

                return centroid[1];

            }
        )
        .text(
            d =>
                d.name
        );

}


/* =====================================================
   COUNTRY
===================================================== */

function selectCountry(
    element,
    territory
) {

    if (
        selectedCountryElement
    ) {

        d3.select(
            selectedCountryElement
        )
        .classed(
            "selected",
            false
        );

    }


    selectedCountryElement =
        element;


    d3.select(element)
        .classed(
            "selected",
            true
        );


    selectedCountry =
        territory.name;


    document
        .getElementById(
            "countryName"
        )
        .textContent =
            territory.name;


    document
        .getElementById(
            "countryInfo"
        )
        .textContent =
            "Contrôlé par " +
            territory.owner +
            ".";


    document
        .getElementById(
            "countryPanel"
        )
        .classList.add(
            "visible"
        );

}


/* =====================================================
   CONTROLS
===================================================== */

function initializeControls() {

    document
        .getElementById(
            "actionButton"
        )
        .addEventListener(
            "click",
            () =>
                openAiPanel(
                    "actions"
                )
        );


    document
        .getElementById(
            "discussionButton"
        )
        .addEventListener(
            "click",
            () =>
                openAiPanel(
                    "discussion"
                )
        );


    document
        .getElementById(
            "closeAi"
        )
        .addEventListener(
            "click",
            closeAiPanel
        );


    document
        .getElementById(
            "sendButton"
        )
        .addEventListener(
            "click",
            sendMessage
        );


    document
        .getElementById(
            "messageInput"
        )
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    sendMessage();

                }

            }
        );


    document
        .getElementById(
            "timeButton"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "timeMenu"
                    )
                    .classList.toggle(
                        "open"
                    );

            }
        );


    document
        .querySelectorAll(
            ".timeOption[data-amount]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        advanceTime(
                            Number(
                                button.dataset.amount
                            ),
                            button.dataset.unit
                        );

                    }
                );

            }
        );


    document
        .getElementById(
            "customTimeButton"
        )
        .addEventListener(
            "click",
            openCustomTime
        );


    document
        .getElementById(
            "cancelCustom"
        )
        .addEventListener(
            "click",
            closeCustomTime
        );


    document
        .getElementById(
            "confirmCustom"
        )
        .addEventListener(
            "click",
            confirmCustomTime
        );

}


/* =====================================================
   AI PANEL
===================================================== */

function openAiPanel(
    mode
) {

    panelMode =
        mode;


    const panel =
        document.getElementById(
            "aiPanel"
        );


    const title =
        document.getElementById(
            "aiTitle"
        );


    const messages =
        document.getElementById(
            "messages"
        );


    const actions =
        document.getElementById(
            "actionsList"
        );


    panel.classList.add(
        "open"
    );


    if (
        mode === "discussion"
    ) {

        title.textContent =
            "Discussion";


        messages.style.display =
            "block";


        actions.style.display =
            "none";


        document
            .getElementById(
                "messageInput"
            )
            .placeholder =
                "Posez une question...";


        if (
            messages.children.length === 0
        ) {

            addAiMessage(
                "Je suis prêt. Vous pouvez me poser une question sur le monde ou sur un pays."
            );

        }

    }

    else {

        title.textContent =
            "Actions";


        messages.style.display =
            "none";


        actions.style.display =
            "block";


        document
            .getElementById(
                "messageInput"
            )
            .placeholder =
                "Décrivez une action...";


        renderActions();

    }


    document
        .getElementById(
            "messageInput"
        )
        .focus();

}


function closeAiPanel() {

    document
        .getElementById(
            "aiPanel"
        )
        .classList.remove(
            "open"
        );

}


/* =====================================================
   MESSAGE
===================================================== */

function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );


    const text =
        input.value.trim();


    if (!text) return;


    input.value = "";


    /*
        ACTION :

        aucune requête IA ici.
    */

    if (
        panelMode === "actions"
    ) {

        pendingActions.push(
            text
        );


        renderActions();

        return;

    }


    /*
        DISCUSSION :

        une requête IA.
    */

    addUserMessage(
        text
    );


    askAI({

        type:
            "discussion",

        message:
            text,

        date:
            currentDate.toISOString(),

        selectedCountry:
            selectedCountry,

        worldState:
            worldState

    });

}


/* =====================================================
   AI
===================================================== */

async function askAI(payload) {

    addAiMessage(
        "⏳ Connexion à l'IA..."
    );


    const messages =
        document.getElementById(
            "messages"
        );


    const loading =
        messages.lastElementChild;


    try {

        /*
         * Récupération du token Pamplemouche.
         */

        let token = null;

        if (
            window.PamplemoucheAuth &&
            typeof PamplemoucheAuth.getToken ===
                "function"
        ) {

            token =
                PamplemoucheAuth.getToken();

        }


        const headers = {

            "Content-Type":
                "application/json"

        };


        if (token) {

            headers.Authorization =
                "Bearer " +
                token;

        }


        /*
         * Appel de la Cloudflare Function.
         */

        const response =
            await fetch(
                "./api/ai.js",
                {

                    method:
                        "POST",

                    headers:
                        headers,

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        /*
         * On récupère le texte brut.
         * Cela permet d'afficher une erreur même
         * si Cloudflare renvoie autre chose que du JSON.
         */

        const raw =
            await response.text();


        let data = null;


        try {

            data =
                JSON.parse(
                    raw
                );

        }

        catch {

            /*
             * La réponse n'est pas du JSON.
             */

            if (
                !response.ok
            ) {

                throw new Error(
                    "HTTP " +
                    response.status +
                    " : " +
                    (
                        raw ||
                        "Réponse invalide du serveur."
                    )
                );

            }


            throw new Error(
                "La réponse de l'API est invalide."
            );

        }


        /*
         * Erreur HTTP.
         */

        if (
            !response.ok
        ) {

            throw new Error(
                "HTTP " +
                response.status +
                " : " +
                (
                    data.error ||
                    "Erreur du serveur."
                )
            );

        }


        /*
         * Réponse correcte.
         */

        loading.textContent =
            data.message ||
            "Aucune réponse de l'IA.";


    }

    catch (error) {

        console.error(
            "Erreur IA :",
            error
        );


        /*
         * IMPORTANT :
         * On affiche maintenant l'erreur directement
         * dans le panneau IA.
         */

        loading.textContent =
            "❌ " +
            (
                error.message ||
                "Impossible de contacter l'IA."
            );

    }


    scrollMessages();

}


/* =====================================================
   MESSAGES
===================================================== */

function addUserMessage(
    text
) {

    addMessage(
        text,
        "user"
    );

}


function addAiMessage(
    text
) {

    addMessage(
        text,
        "ai"
    );

}


function addMessage(
    text,
    type
) {

    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message " +
        type;


    message.textContent =
        text;


    document
        .getElementById(
            "messages"
        )
        .appendChild(
            message
        );


    scrollMessages();

}


function scrollMessages() {

    const messages =
        document.getElementById(
            "messages"
        );


    messages.scrollTop =
        messages.scrollHeight;

}


/* =====================================================
   ACTIONS
===================================================== */

function renderActions() {

    const container =
        document.getElementById(
            "actionsList"
        );


    container.innerHTML = "";


    if (
        pendingActions.length === 0
    ) {

        container.innerHTML = `

            <div class="emptyActions">

                Aucune action en attente.

                <br><br>

                Écrivez une action ci-dessous.
                Elle sera simulée lorsque
                vous avancerez le temps.

            </div>

        `;


        return;

    }


    pendingActions.forEach(
        (action, index) => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "actionItem";


            element.innerHTML = `

                <strong>
                    ${index + 1}.
                </strong>

                ${escapeHtml(action)}

                <span class="actionPending">
                    ⏳ En attente
                </span>

            `;


            container.appendChild(
                element
            );

        }
    );

}


/* =====================================================
   TIME
===================================================== */

async function advanceTime(
    amount,
    unit
) {

    document
        .getElementById(
            "timeMenu"
        )
        .classList.remove(
            "open"
        );


    const oldDate =
        new Date(
            currentDate
        );


    const actions =
        [...pendingActions];


    /*
        Avance immédiatement la date.
    */

    applyTimeToDate(
        currentDate,
        amount,
        unit
    );


    updateDateDisplay();


    /*
        UNE SEULE requête IA par avance de temps,
        même s'il y a plusieurs actions.
    */

    if (
        actions.length > 0
    ) {

        try {

            let token = null;

            if (
                window.PamplemoucheAuth &&
                typeof PamplemoucheAuth.getToken ===
                    "function"
            ) {

                token =
                    PamplemoucheAuth.getToken();

            }


            const headers = {

                "Content-Type":
                    "application/json"

            };


            if (token) {

                headers.Authorization =
                    "Bearer " +
                    token;

            }


            const response =
                await fetch(
                    "/api/ai",
                    {

                        method:
                            "POST",

                        headers:
                            headers,

                        body:
                            JSON.stringify({

                                type:
                                    "simulation",

                                dateStart:
                                    oldDate.toISOString(),

                                dateEnd:
                                    currentDate.toISOString(),

                                duration: {

                                    amount:
                                        amount,

                                    unit:
                                        unit

                                },

                                actions:
                                    actions,

                                selectedCountry:
                                    selectedCountry,

                                worldState:
                                    worldState

                            })

                    }
                );


            const raw =
                await response.text();


            let result = null;


            try {

                result =
                    JSON.parse(
                        raw
                    );

            }

            catch {

                throw new Error(
                    "HTTP " +
                    response.status +
                    " : " +
                    (
                        raw ||
                        "Réponse invalide."
                    )
                );

            }


            if (
                !response.ok
            ) {

                throw new Error(
                    "HTTP " +
                    response.status +
                    " : " +
                    (
                        result.error ||
                        "Erreur de simulation."
                    )
                );

            }


            /*
             * Si l'IA renvoie un nouvel état du monde,
             * on l'applique.
             */

            if (
                result.worldState
            ) {

                applyWorldState(
                    result.worldState
                );

            }


            /*
             * Le compte-rendu de simulation est affiché
             * dans la discussion.
             */

            if (
                result.message
            ) {

                addAiMessage(
                    result.message
                );

            }

        }

        catch (error) {

            console.error(
                "Erreur simulation :",
                error
            );


            /*
             * On affiche aussi l'erreur dans le jeu,
             * pratique sur iPhone sans console.
             */

            addAiMessage(
                "❌ Erreur de simulation : " +
                (
                    error.message ||
                    "Impossible de contacter l'IA."
                )
            );

        }

    }


    /*
     * Les actions sont consommées après l'avance.
     */

    pendingActions = [];


    renderActions();

}


/* =====================================================
   WORLD STATE
===================================================== */

function applyWorldState(
    newState
) {

    worldState =
        newState;


    territories.forEach(
        territory => {

            if (
                worldState[
                    territory.name
                ]
            ) {

                territory.owner =
                    worldState[
                        territory.name
                    ].owner ||
                    territory.owner;

            }

        }
    );


    /*
        Met à jour les couleurs.
    */

    if (
        mapGroup
    ) {

        mapGroup
            .selectAll(
                ".country"
            )
            .attr(
                "fill",
                d =>
                    getCountryColor(
                        d.owner
                    )
            );

    }


    /*
     * Met également à jour le panneau
     * si un pays est actuellement sélectionné.
     */

    if (
        selectedCountry
    ) {

        const territory =
            territories.find(
                t =>
                    t.name ===
                    selectedCountry
            );


        if (territory) {

            document
                .getElementById(
                    "countryInfo"
                )
                .textContent =
                    "Contrôlé par " +
                    territory.owner +
                    ".";

        }

    }

}


/* =====================================================
   DATE
===================================================== */

function applyTimeToDate(
    date,
    amount,
    unit
) {

    if (
        unit === "days"
    ) {

        date.setDate(
            date.getDate() +
            amount
        );

    }


    else if (
        unit === "weeks"
    ) {

        date.setDate(
            date.getDate() +
            amount * 7
        );

    }


    else if (
        unit === "months"
    ) {

        date.setMonth(
            date.getMonth() +
            amount
        );

    }


    else if (
        unit === "years"
    ) {

        date.setFullYear(
            date.getFullYear() +
            amount
        );

    }

}


function updateDateDisplay() {

    document
        .getElementById(
            "dateDisplay"
        )
        .textContent =
            currentDate.toLocaleDateString(
                "fr-FR",
                {

                    day:
                        "numeric",

                    month:
                        "long",

                    year:
                        "numeric"

                }
            );

}


/* =====================================================
   CUSTOM TIME
===================================================== */

function openCustomTime() {

    document
        .getElementById(
            "timeMenu"
        )
        .classList.remove(
            "open"
        );


    document
        .getElementById(
            "customOverlay"
        )
        .classList.add(
            "open"
        );

}


function closeCustomTime() {

    document
        .getElementById(
            "customOverlay"
        )
        .classList.remove(
            "open"
        );

}


function confirmCustomTime() {

    const amount =
        Number(
            document
                .getElementById(
                    "customAmount"
                )
                .value
        );


    const unit =
        document
            .getElementById(
                "customUnit"
            )
            .value;


    if (
        !amount ||
        amount < 1
    ) {

        return;

    }


    closeCustomTime();


    advanceTime(
        amount,
        unit
    );

}


/* =====================================================
   ANNEXATION
===================================================== */

function annexTerritory(
    territoryName,
    newOwner
) {

    const territory =
        territories.find(
            territory =>
                territory.name ===
                territoryName
        );


    if (!territory) {

        console.warn(
            "Territoire introuvable:",
            territoryName
        );

        return;

    }


    territory.owner =
        newOwner;


    if (
        !worldState[
            territoryName
        ]
    ) {

        worldState[
            territoryName
        ] = {};

    }


    worldState[
        territoryName
    ].owner =
        newOwner;


    if (
        mapGroup
    ) {

        mapGroup
            .selectAll(
                ".country"
            )
            .filter(
                d =>
                    d.name ===
                    territoryName
            )
            .attr(
                "fill",
                d =>
                    getCountryColor(
                        d.owner
                    )
            );

    }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}
