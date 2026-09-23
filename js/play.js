let currentDate = new Date(1936, 0, 1);

let isGameStarted = false;
let playerCountry = null;
let selectedCountry = null;
let selectedCountryElement = null;
let panelMode = "discussion";
let pendingActions = [];
let territories = [];
let worldState = {};
let countryColors = {};
let mapGroup;

let isRequestPending = false;

/* =====================================================
   TRADUCTION DES CODES ISO NUMÉRIQUES EN NOMS FR
===================================================== */

const countryNamesFR = {
    "004": "Afghanistan", "008": "Albanie", "012": "Algérie", "024": "Angola", "032": "Argentine",
    "036": "Australie", "040": "Autriche", "050": "Bangladesh", "056": "Belgique", "068": "Bolivie",
    "076": "Brésil", "100": "Bulgarie", "124": "Canada", "152": "Chili", "156": "Chine",
    "170": "Colombie", "180": "Rép. Dém. du Congo", "178": "Congo", "188": "Costa Rica", "191": "Croatie",
    "192": "Cuba", "208": "Danemark", "218": "Équateur", "818": "Égypte", "231": "Éthiopie",
    "246": "Finlande", "250": "France", "268": "Géorgie", "276": "Allemagne", "288": "Ghana",
    "300": "Grèce", "320": "Guatemala", "332": "Haïti", "340": "Honduras", "348": "Hongrie",
    "356": "Inde", "360": "Indonésie", "364": "Iran", "368": "Irak", "372": "Irlande",
    "376": "Israël", "380": "Italie", "388": "Jamaïque", "392": "Japon", "400": "Jordanie",
    "404": "Kenya", "410": "Corée du Sud", "408": "Corée du Nord", "414": "Koweït", "418": "Laos",
    "422": "Liban", "434": "Libye", "484": "Mexique", "504": "Maroc", "508": "Mozambique",
    "104": "Birmanie", "524": "Népal", "528": "Pays-Bas", "554": "Nouvelle-Zélande", "558": "Nicaragua",
    "566": "Nigeria", "578": "Norvège", "586": "Pakistan", "591": "Panama", "600": "Paraguay",
    "604": "Pérou", "608": "Philippines", "616": "Pologne", "620": "Portugal", "630": "Porto Rico",
    "634": "Qatar", "642": "Roumanie", "643": "Russie", "682": "Arabie Saoudite", "686": "Sénégal",
    "688": "Serbie", "702": "Singapour", "703": "Slovaquie", "705": "Slovénie", "710": "Afrique du Sud",
    "724": "Espagne", "144": "Sri Lanka", "752": "Suède", "756": "Suisse", "760": "Syrie",
    "158": "Taïwan", "764": "Thaïlande", "788": "Tunisie", "792": "Turquie", "800": "Ouganda",
    "804": "Ukraine", "784": "Émirats Arabes Unis", "826": "Royaume-Uni", "840": "États-Unis",
    "858": "Uruguay", "862": "Venezuela", "704": "Viêt Nam", "887": "Yémen", "894": "Zambie", "716": "Zimbabwe"
};

function getCountryName(feature) {
    if (feature.properties && feature.properties.name) {
        return feature.properties.name;
    }
    const idStr = String(feature.id).padStart(3, "0");
    return countryNamesFR[idStr] || "Pays " + feature.id;
}

/* =====================================================
   PALETTE DE COULEURS
===================================================== */

const palette = [
    "#c94c4c", "#4c82c9", "#55a86b", "#c98a45", "#8957b5",
    "#45a6a0", "#b85d8d", "#7b9a45", "#c26c35", "#596fc1",
    "#a65a5a", "#5b9b83", "#9b7a45", "#725ca8", "#4c8eaa",
    "#ad5971", "#6f9652", "#b36c4a", "#637db0", "#96704d"
];

let colorIndex = 0;

function getCountryColor(owner) {
    if (countryColors[owner]) {
        return countryColors[owner];
    }

    countryColors[owner] = palette[colorIndex % palette.length];
    colorIndex++;
    return countryColors[owner];
}

/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeMap();
    initializeControls();
    checkExistingSave();
});

/* =====================================================
   MAP
===================================================== */

function initializeMap() {
    const svg = d3.select("#worldMap");
    const width = window.innerWidth || document.documentElement.clientWidth || 360;
    const height = window.innerHeight || document.documentElement.clientHeight || 640;

    svg.attr("width", "100%")
       .attr("height", "100%")
       .attr("viewBox", `0 0 ${width} ${height}`);

    const projection = d3.geoNaturalEarth1()
        .scale(width / 5.8)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    mapGroup = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .on("zoom", event => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then(world => {
            const features = topojson.feature(world, world.objects.countries).features;

            territories = features.map(feature => {
                const name = getCountryName(feature);

                worldState[name] = {
                    id: feature.id,
                    name: name,
                    owner: name
                };

                return {
                    id: feature.id,
                    name: name,
                    owner: name,
                    geometry: feature
                };
            });

            drawMap(path);
        })
        .catch(error => {
            console.error("Impossible de charger la carte:", error);
        });
}

/* =====================================================
   DRAW
===================================================== */

function drawMap(path) {
    mapGroup.selectAll(".country")
        .data(territories)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", d => path(d.geometry))
        .attr("fill", d => getCountryColor(d.owner))
        .on("click", function(event, d) {
            selectCountry(this, d);
        });

    mapGroup.selectAll(".country-label")
        .data(territories)
        .enter()
        .append("text")
        .attr("class", "country-label")
        .style("pointer-events", "none")
        .attr("x", d => path.centroid(d.geometry)[0])
        .attr("y", d => path.centroid(d.geometry)[1])
        .text(d => d.name);
}

/* =====================================================
   SÉLECTION D'UN PAYS
===================================================== */

function selectCountry(element, territory) {
    if (!territory || !isGameStarted) return;

    if (selectedCountryElement) {
        d3.select(selectedCountryElement).classed("selected", false);
    }

    selectedCountryElement = element;
    d3.select(element).classed("selected", true);
    selectedCountry = territory.name;

    const nameEl = document.getElementById("countryName");
    const infoEl = document.getElementById("countryInfo");
    const panelEl = document.getElementById("countryPanel");

    if (nameEl) nameEl.textContent = territory.name;
    if (infoEl) infoEl.textContent = "Contrôlé par " + territory.owner + ".";
    if (panelEl) panelEl.classList.add("visible");
}

/* =====================================================
   CONTROLS & LISTENERS
===================================================== */

function initializeControls() {
    const loadBtn = document.getElementById("loadGameBtn");
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            loadGameSave();
            document.getElementById("selectionScreen").classList.add("hidden");
            document.getElementById("game").classList.remove("hidden");
        });
    }

    document.getElementById("actionButton").addEventListener("click", () => openAiPanel("actions"));
    document.getElementById("discussionButton").addEventListener("click", () => openAiPanel("discussion"));
    document.getElementById("closeAi").addEventListener("click", closeAiPanel);
    document.getElementById("sendButton").addEventListener("click", sendMessage);

    document.getElementById("messageInput").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    document.getElementById("timeButton").addEventListener("click", () => {
        if (isRequestPending || !isGameStarted) return;
        document.getElementById("timeMenu").classList.toggle("open");
    });

    document.querySelectorAll(".timeOption[data-amount]").forEach(button => {
        button.addEventListener("click", () => {
            advanceTime(Number(button.dataset.amount), button.dataset.unit);
        });
    });

    document.getElementById("customTimeButton").addEventListener("click", openCustomTime);
    document.getElementById("cancelCustom").addEventListener("click", closeCustomTime);
    document.getElementById("confirmCustom").addEventListener("click", confirmCustomTime);
}

/* =====================================================
   LANCEMENT ET SAUVEGARDE
===================================================== */

function confirmStartGame() {
    if (!playerCountry) return;

    isGameStarted = true;
    addAiMessage(`Bienvenue Chef d'État. Vous avez pris le contrôle de : **${playerCountry}**.`);
    saveGame();
}

function getSavePayload() {
    return {
        currentDate: currentDate.toISOString(),
        playerCountry: playerCountry,
        worldState: worldState,
        pendingActions: pendingActions
    };
}

async function saveGame() {
    if (!isGameStarted) return;

    const payload = getSavePayload();
    localStorage.setItem("pamplemouche_history_save", JSON.stringify(payload));

    let token = null;
    if (window.PamplemoucheAuth && typeof PamplemoucheAuth.getToken === "function") {
        token = PamplemoucheAuth.getToken();
    }

    if (token) {
        try {
            await fetch("/api/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.warn("Sauvegarde cloud non disponible, sauvegardé localement.");
        }
    }
}

async function checkExistingSave() {
    let hasSave = false;

    if (localStorage.getItem("pamplemouche_history_save")) {
        hasSave = true;
    }

    let token = null;
    if (window.PamplemoucheAuth && typeof PamplemoucheAuth.getToken === "function") {
        token = PamplemoucheAuth.getToken();
    }

    if (token) {
        try {
            const res = await fetch("/api/save", {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) hasSave = true;
        } catch (e) {
            // Ignorer si pas d'endpoint save
        }
    }

    if (hasSave) {
        const loadBtn = document.getElementById("loadGameBtn");
        if (loadBtn) loadBtn.style.display = "block";
    }
}

async function loadGameSave() {
    let saveData = null;
    let token = null;

    if (window.PamplemoucheAuth && typeof PamplemoucheAuth.getToken === "function") {
        token = PamplemoucheAuth.getToken();
    }

    if (token) {
        try {
            const res = await fetch("/api/save", {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) {
                saveData = await res.json();
            }
        } catch (e) {
            console.warn("Erreur chargement cloud, bascule en local.");
        }
    }

    if (!saveData) {
        const local = localStorage.getItem("pamplemouche_history_save");
        if (local) {
            try { saveData = JSON.parse(local); } catch {}
        }
    }

    if (saveData) {
        currentDate = new Date(saveData.currentDate);
        playerCountry = saveData.playerCountry;
        selectedCountry = saveData.playerCountry;
        pendingActions = saveData.pendingActions || [];

        if (saveData.worldState) {
            applyWorldState(saveData.worldState);
        }

        updateDateDisplay();
        renderActions();

        isGameStarted = true;
        addAiMessage(`Partie chargée. Vous dirigez toujours **${playerCountry}**.`);
    }
}

/* =====================================================
   VERROUILLAGE UI
===================================================== */

function setUIBusy(busy) {
    isRequestPending = busy;

    const sendBtn = document.getElementById("sendButton");
    const messageInput = document.getElementById("messageInput");
    const timeBtn = document.getElementById("timeButton");

    if (sendBtn) sendBtn.disabled = busy;
    if (messageInput) messageInput.disabled = busy;
    if (timeBtn) timeBtn.disabled = busy;

    document.body.classList.toggle("is-loading", busy);
}

/* =====================================================
   AI PANEL
===================================================== */

function openAiPanel(mode) {
    if (!isGameStarted) return;

    panelMode = mode;

    const panel = document.getElementById("aiPanel");
    const title = document.getElementById("aiTitle");
    const messages = document.getElementById("messages");
    const actions = document.getElementById("actionsList");

    panel.classList.add("open");

    if (mode === "discussion") {
        title.textContent = "Discussion";
        messages.style.display = "block";
        actions.style.display = "none";
        document.getElementById("messageInput").placeholder = "Posez une question...";

        if (messages.children.length === 0) {
            addAiMessage(`Je suis prêt. Vous pouvez me poser une question sur le monde ou sur l'état de **${playerCountry}**.`);
        }
    } else {
        title.textContent = "Actions";
        messages.style.display = "none";
        actions.style.display = "block";
        document.getElementById("messageInput").placeholder = "Décrivez une action...";

        renderActions();
    }

    if (!isRequestPending) {
        document.getElementById("messageInput").focus();
    }
}

function closeAiPanel() {
    document.getElementById("aiPanel").classList.remove("open");
}

/* =====================================================
   MESSAGE
===================================================== */

function sendMessage() {
    if (isRequestPending || !isGameStarted) return;

    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    input.value = "";

    if (panelMode === "actions") {
        pendingActions.push(text);
        renderActions();
        saveGame();
        return;
    }

    addUserMessage(text);

    askAI({
        type: "discussion",
        message: text,
        date: currentDate.toISOString(),
        playerCountry: playerCountry,
        selectedCountry: selectedCountry,
        worldState: worldState
    });
}

/* =====================================================
   AI
===================================================== */

async function askAI(payload) {
    setUIBusy(true);
    addAiMessage("⏳ Connexion à l'IA...");

    const messages = document.getElementById("messages");
    const loading = messages.lastElementChild;

    try {
        let token = null;
        if (window.PamplemoucheAuth && typeof PamplemoucheAuth.getToken === "function") {
            token = PamplemoucheAuth.getToken();
        }

        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers.Authorization = "Bearer " + token;
        }

        const response = await fetch("/api/ai", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const raw = await response.text();
        let data = null;

        try {
            data = JSON.parse(raw);
        } catch {
            if (!response.ok) {
                throw new Error("HTTP " + response.status + " : " + (raw || "Réponse invalide du serveur."));
            }
            throw new Error("La réponse de l'API est invalide.");
        }

        if (!response.ok) {
            throw new Error("HTTP " + response.status + " : " + (data.error || "Erreur du serveur."));
        }

        loading.textContent = data.message || "Aucune réponse de l'IA.";

    } catch (error) {
        console.error("Erreur IA :", error);
        loading.textContent = "❌ " + (error.message || "Impossible de contacter l'IA.");
    } finally {
        setUIBusy(false);
        scrollMessages();
    }
}

/* =====================================================
   MESSAGES
===================================================== */

function addUserMessage(text) {
    addMessage(text, "user");
}

function addAiMessage(text) {
    addMessage(text, "ai");
}

function addMessage(text, type) {
    const message = document.createElement("div");
    message.className = "message " + type;
    message.textContent = text;

    document.getElementById("messages").appendChild(message);
    scrollMessages();
}

function scrollMessages() {
    const messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
}

/* =====================================================
   ACTIONS
===================================================== */

function renderActions() {
    const container = document.getElementById("actionsList");
    container.innerHTML = "";

    if (pendingActions.length === 0) {
        container.innerHTML = `
            <div class="emptyActions">
                Aucune action en attente.
                <br><br>
                Écrivez une action ci-dessous.
                Elle sera simulée lorsque vous avancerez le temps.
            </div>
        `;
        return;
    }

    pendingActions.forEach((action, index) => {
        const element = document.createElement("div");
        element.className = "actionItem";
        element.innerHTML = `
            <strong>${index + 1}.</strong>
            ${escapeHtml(action)}
            <span class="actionPending">⏳ En attente</span>
        `;
        container.appendChild(element);
    });
}

/* =====================================================
   TIME
===================================================== */

async function advanceTime(amount, unit) {
    if (isRequestPending || !isGameStarted) return;

    document.getElementById("timeMenu").classList.remove("open");

    const oldDate = new Date(currentDate);
    const actions = [...pendingActions];

    applyTimeToDate(currentDate, amount, unit);
    updateDateDisplay();

    if (actions.length > 0) {
        setUIBusy(true);
        addAiMessage("⏳ Simulation en cours...");

        try {
            let token = null;
            if (window.PamplemoucheAuth && typeof PamplemoucheAuth.getToken === "function") {
                token = PamplemoucheAuth.getToken();
            }

            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers.Authorization = "Bearer " + token;
            }

            const response = await fetch("/api/ai", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    type: "simulation",
                    dateStart: oldDate.toISOString(),
                    dateEnd: currentDate.toISOString(),
                    duration: { amount: amount, unit: unit },
                    actions: actions,
                    playerCountry: playerCountry,
                    selectedCountry: selectedCountry,
                    worldState: worldState
                })
            });

            const raw = await response.text();
            let result = null;

            try {
                result = JSON.parse(raw);
            } catch {
                throw new Error("HTTP " + response.status + " : " + (raw || "Réponse invalide."));
            }

            if (!response.ok) {
                throw new Error("HTTP " + response.status + " : " + (result.error || "Erreur de simulation."));
            }

            if (result.changes && typeof result.changes === "object") {
                for (const [territoryName, change] of Object.entries(result.changes)) {
                    if (change && change.owner) {
                        annexTerritory(territoryName, change.owner);
                    }
                }
            }

            if (result.worldState) {
                applyWorldState(result.worldState);
            }

            const messages = document.getElementById("messages");
            const loading = messages.lastElementChild;
            if (loading && loading.textContent.includes("Simulation en cours")) {
                loading.textContent = result.message || "Simulation terminée.";
            } else {
                addAiMessage(result.message || "Simulation terminée.");
            }

        } catch (error) {
            console.error("Erreur simulation :", error);
            addAiMessage("❌ Erreur de simulation : " + (error.message || "Impossible de contacter l'IA."));
        } finally {
            setUIBusy(false);
        }
    }

    pendingActions = [];
    renderActions();
    saveGame();
}

/* =====================================================
   WORLD STATE
===================================================== */

function applyWorldState(newState) {
    worldState = newState;

    territories.forEach(territory => {
        if (worldState[territory.name]) {
            territory.owner = worldState[territory.name].owner || territory.owner;
        }
    });

    if (mapGroup) {
        mapGroup.selectAll(".country")
            .attr("fill", d => getCountryColor(d.owner));
    }

    if (selectedCountry) {
        const territory = territories.find(t => t.name === selectedCountry);
        if (territory) {
            document.getElementById("countryInfo").textContent = "Contrôlé par " + territory.owner + ".";
        }
    }
}

/* =====================================================
   DATE
===================================================== */

function applyTimeToDate(date, amount, unit) {
    if (unit === "days") {
        date.setDate(date.getDate() + amount);
    } else if (unit === "weeks") {
        date.setDate(date.getDate() + amount * 7);
    } else if (unit === "months") {
        date.setMonth(date.getMonth() + amount);
    } else if (unit === "years") {
        date.setFullYear(date.getFullYear() + amount);
    }
}

function updateDateDisplay() {
    document.getElementById("dateDisplay").textContent = currentDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

/* =====================================================
   CUSTOM TIME
===================================================== */

function openCustomTime() {
    if (isRequestPending || !isGameStarted) return;

    document.getElementById("timeMenu").classList.remove("open");
    document.getElementById("customOverlay").classList.add("open");
}

function closeCustomTime() {
    document.getElementById("customOverlay").classList.remove("open");
}

function confirmCustomTime() {
    if (isRequestPending || !isGameStarted) return;

    const amount = Number(document.getElementById("customAmount").value);
    const unit = document.getElementById("customUnit").value;

    if (!amount || amount < 1) return;

    closeCustomTime();
    advanceTime(amount, unit);
}

/* =====================================================
   ANNEXATION
===================================================== */

function annexTerritory(territoryName, newOwner) {
    const territory = territories.find(t => t.name === territoryName);

    if (!territory) {
        console.warn("Territoire introuvable:", territoryName);
        return;
    }

    territory.owner = newOwner;

    if (!worldState[territoryName]) {
        worldState[territoryName] = {};
    }

    worldState[territoryName].owner = newOwner;

    if (mapGroup) {
        mapGroup.selectAll(".country")
            .filter(d => d.name === territoryName)
            .attr("fill", d => getCountryColor(d.owner));
    }
}

/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
