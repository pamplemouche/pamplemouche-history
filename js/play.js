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

        updateDateDisplay();

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

                const center =
                    path.centroid(
                        d.geometry
                    );

                return center[0];

            }
        )

        .attr(
            "y",
            d => {

                const center =
                    path.centroid(
                        d.geometry
                    );

                return center[1];

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


    d3.select(
        element
    )
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
     * ACTION :
     *
     * Aucun appel IA.
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
     * DISCUSSION :
     *
     * Appel IA immédiat.
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

async function askAI(
    payload
) {

    addAiMessage(
        "..."
    );


    const messages =
        document.getElementById(
            "messages"
        );


    const loading =
        messages.lastElementChild;


    try {

        const token =
            window.PamplemoucheAuth &&
            PamplemoucheAuth.getToken
                ? PamplemoucheAuth.getToken()
                : null;


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
                        JSON.stringify(
                            payload
                        )

                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Erreur IA"
            );

        }


        loading.textContent =
            data.message ||
            "Aucune réponse.";


    }

    catch (error) {

        loading.textContent =
            "Impossible de contacter l'IA pour le moment.";

        console.error(
            error
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

    /*
     * Empêche plusieurs simulations
     * simultanées.
     */

    if (
        window.historySimulationRunning
    ) {

        return;

    }


    window.historySimulationRunning =
        true;


    const timeMenu =
        document.getElementById(
            "timeMenu"
        );


    timeMenu.classList.remove(
        "open"
    );


    const oldDate =
        new Date(
            currentDate
        );


    const actions =
        [...pendingActions];


    /*
     * Avance immédiatement la date.
     */

    applyTimeToDate(
        currentDate,
        amount,
        unit
    );


    updateDateDisplay();


    /*
     * Même sans action, le monde doit
     * pouvoir continuer à évoluer.
     *
     * On fait donc TOUJOURS une simulation.
     */

    const token =
        window.PamplemoucheAuth &&
        PamplemoucheAuth.getToken
            ? PamplemoucheAuth.getToken()
            : null;


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
     * Petit indicateur dans le bouton Temps.
     */

    const timeButton =
        document.getElementById(
            "timeButton"
        );


    const originalText =
        timeButton.textContent;


    timeButton.textContent =
        "⏳ Simulation...";


    timeButton.disabled =
        true;


    try {

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


        const result =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                result.error ||
                "Erreur de simulation"
            );

        }


        /*
         * =================================================
         * CHANGEMENTS DU MONDE
         * =================================================
         */

        if (
            result.changes &&
            typeof result.changes === "object"
        ) {

            applyWorldChanges(
                result.changes
            );

        }


        /*
         * =================================================
         * COMPTE-RENDU
         * =================================================
         */

        if (
            result.message
        ) {

            addSimulationMessage(
                result.message
            );

        }


        /*
         * =================================================
         * ÉVÉNEMENTS
         * =================================================
         */

        if (
            Array.isArray(
                result.events
            )
        ) {

            result.events.forEach(
                event => {

                    if (
                        event
                    ) {

                        addSimulationMessage(
                            event
                        );

                    }

                }
            );

        }

    }

    catch (error) {

        console.error(
            "Erreur simulation:",
            error
        );


        /*
         * Si l'IA échoue, on garde quand même
         * la nouvelle date.
         */

        addSimulationMessage(
            "La période a été avancée, mais la simulation IA n'a pas pu être effectuée."
        );

    }

    finally {

        /*
         * Les actions ont été consommées
         * après l'avance du temps.
         */

        pendingActions = [];


        renderActions();


        timeButton.textContent =
            originalText;


        timeButton.disabled =
            false;


        window.historySimulationRunning =
            false;

    }

}


/* =====================================================
   APPLY WORLD CHANGES
===================================================== */

function applyWorldChanges(
    changes
) {

    if (
        !changes ||
        typeof changes !== "object"
    ) {

        return;

    }


    Object.entries(
        changes
    ).forEach(
        ([territoryName, change]) => {

            if (
                !change ||
                typeof change !== "object"
            ) {

                return;

            }


            const territory =
                territories.find(
                    territory =>
                        territory.name ===
                        territoryName
                );


            if (!territory) {

                console.warn(
                    "Territoire inconnu retourné par l'IA:",
                    territoryName
                );

                return;

            }


            /*
             * Nouveau propriétaire
             */

            if (
                typeof change.owner ===
                "string" &&
                change.owner.trim()
            ) {

                territory.owner =
                    change.owner.trim();

            }


            /*
             * Mise à jour de worldState
             */

            if (
                !worldState[
                    territoryName
                ]
            ) {

                worldState[
                    territoryName
                ] = {

                    id:
                        territory.id,

                    name:
                        territory.name,

                    owner:
                        territory.owner

                };

            }

            else {

                worldState[
                    territoryName
                ].owner =
                    territory.owner;

            }

        }
    );


    /*
     * =================================================
     * COULEURS
     * =================================================
     */

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


    /*
     * =================================================
     * INFOS DU PAYS SÉLECTIONNÉ
     * =================================================
     */

    if (
        selectedCountry
    ) {

        const territory =
            territories.find(
                territory =>
                    territory.name ===
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
   SIMULATION MESSAGE
===================================================== */

function addSimulationMessage(
    text
) {

    const messages =
        document.getElementById(
            "messages"
        );


    /*
     * Ouvre automatiquement le panneau
     * Discussion pour afficher le résultat.
     */

    const panel =
        document.getElementById(
            "aiPanel"
        );


    panel.classList.add(
        "open"
    );


    panelMode =
        "discussion";


    document
        .getElementById(
            "aiTitle"
        )
        .textContent =
            "Simulation";


    messages.style.display =
        "block";


    document
        .getElementById(
            "actionsList"
        )
        .style.display =
            "none";


    addAiMessage(
        text
    );

}


/* =====================================================
   WORLD STATE
===================================================== */

function applyWorldState(
    newState
) {

    if (
        !newState ||
        typeof newState !== "object"
    ) {

        return;

    }


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


/* =====================================================
   ESCAPE
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
