// pax_ai.js - Core Shared Engine for Pax Historia AI

const DEFAULT_GEMINI_KEY = "AQ.Ab8RN6KGsHdLcvZTsVhDZfWG1iSGBQFjwGvz_gwgVN2hYfZpWw";
const DEFAULT_MODEL = "gemini-flash-latest";

function getApiKey() {
    return localStorage.getItem("pax_gemini_api_key") || DEFAULT_GEMINI_KEY;
}

function setApiKey(key) {
    if (key && key.trim()) {
        localStorage.setItem("pax_gemini_api_key", key.trim());
    } else {
        localStorage.removeItem("pax_gemini_api_key");
    }
}

function getSelectedModel() {
    return localStorage.getItem("pax_gemini_model") || DEFAULT_MODEL;
}

function setSelectedModel(model) {
    localStorage.setItem("pax_gemini_model", model);
}

// Audio Engine for atmospheric feedback
class PaxAudio {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem("pax_muted") === "true";
    }

    init() {
        if (!this.ctx && typeof AudioContext !== "undefined") {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem("pax_muted", this.muted);
        return this.muted;
    }

    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    playEvent() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(450, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(now + 0.4);
        } catch (e) {}
    }

    playWar() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(now + 0.5);
        } catch (e) {}
    }
}

const soundFx = new PaxAudio();

// Gemini API Call
async function callGemini(prompt, systemInstruction = "") {
    const key = getApiKey();
    const model = getSelectedModel();

    if (!key) {
        throw new Error("Aucune clé API Gemini n'a été configurée.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ]
    };

    if (systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `Erreur API (${response.status})`;
        throw new Error(errMsg);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Réponse vide reçue de l'IA.");
    }
    return text;
}

// Test Gemini Key
async function testGeminiApiKey(keyToTest, modelToTest = "gemini-flash-latest") {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${keyToTest}`;
        const payload = { contents: [{ parts: [{ text: "Reponds 'OK' si la clé fonctionne." }] }] };
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            return { success: true, message: "✓ Clé valide et opérationnelle !" };
        } else {
            const err = await res.json().catch(() => ({}));
            return { success: false, message: err.error?.message || `Erreur HTTP ${res.status}` };
        }
    } catch (e) {
        return { success: false, message: e.message || "Erreur de connexion réseau." };
    }
}

// Scenarios database for Pax Historia
const PAX_SCENARIOS = {
    'rome': {
        id: 'rome',
        title: 'Antiquité Tardive',
        year: 476,
        era: 'Chute de Rome',
        description: 'L Empire Romain d Occident s effondre. Les peuples barbares envahissent l Europe tandis que Byzance préserve l héritage de César.',
        center: [41.9, 12.5],
        zoom: 4,
        countries: [
            { name: 'Empire Romain d Occident', capital: 'Rome', leader: 'Romulus Augustule', flag: '🏛️', color: '#8b0000', gold: 300, military: 12000, stability: 30, prestige: 85 },
            { name: 'Empire Byzantin', capital: 'Constantinople', leader: 'Zénon', flag: '👑', color: '#800080', gold: 1200, military: 35000, stability: 75, prestige: 90 },
            { name: 'Royaume Ostrogoth', capital: 'Ravenne', leader: 'Odoacre', flag: '⚔️', color: '#4b5320', gold: 500, military: 25000, stability: 60, prestige: 50 },
            { name: 'Royaume Franc', capital: 'Tournai', leader: 'Childéric Ier', flag: '⚜️', color: '#1e3d59', gold: 400, military: 18000, stability: 65, prestige: 55 },
            { name: 'Empire Perse Sassanide', capital: 'Ctésiphon', leader: 'Péroz Ier', flag: '🦁', color: '#008080', gold: 1000, military: 40000, stability: 80, prestige: 88 }
        ]
    },
    'medieval': {
        id: 'medieval',
        title: 'L Ère des Feudataires',
        year: 1066,
        era: 'Moyen-Âge',
        description: 'Guillaume le Conquérant débarque en Angleterre. L Europe se déchire entre rois, ducs et papes.',
        center: [48.8, 2.3],
        zoom: 4,
        countries: [
            { name: 'Royaume de France', capital: 'Paris', leader: 'Philippe Ier', flag: '⚜️', color: '#002395', gold: 600, military: 20000, stability: 65, prestige: 80 },
            { name: 'Royaume d Angleterre', capital: 'Londres', leader: 'Guillaume Ier', flag: '🦁', color: '#b22234', gold: 750, military: 22000, stability: 70, prestige: 78 },
            { name: 'Saint-Empire Romain', capital: 'Aix-la-Chapelle', leader: 'Henri IV', flag: '🦅', color: '#d4af37', gold: 900, military: 30000, stability: 55, prestige: 85 },
            { name: 'Califat de Cordoue', capital: 'Cordoue', leader: 'Hicham III', flag: '🌙', color: '#006847', gold: 1100, military: 28000, stability: 60, prestige: 82 },
            { name: 'Empire Byzantin', capital: 'Constantinople', leader: 'Romain IV', flag: '☦️', color: '#800080', gold: 850, military: 25000, stability: 50, prestige: 75 }
        ]
    },
    'renaissance': {
        id: 'renaissance',
        title: 'La Renaissance',
        year: 1453,
        era: 'Renaissance',
        description: 'Constantinople tombe aux mains des Ottomans. La poudre, l imprimerie et les Grandes Découvertes bouleversent le monde.',
        center: [43.7, 11.2],
        zoom: 5,
        countries: [
            { name: 'Empire Ottoman', capital: 'Constantinople', leader: 'Mehmed II', flag: '☪️', color: '#006847', gold: 1500, military: 60000, stability: 85, prestige: 92 },
            { name: 'Royaume de France', capital: 'Paris', leader: 'Charles VII', flag: '⚜️', color: '#002395', gold: 1000, military: 35000, stability: 75, prestige: 85 },
            { name: 'Empire Espagnol', capital: 'Tolède', leader: 'Isabelle & Ferdinand', flag: '🏰', color: '#aa151b', gold: 1200, military: 40000, stability: 80, prestige: 88 },
            { name: 'Empire Ming', capital: 'Pékin', leader: 'Zhengtong', flag: '🐉', color: '#de2910', gold: 3000, military: 100000, stability: 90, prestige: 95 },
            { name: 'République de Venise', capital: 'Venise', leader: 'Francesco Foscari', flag: '🦁', color: '#c09304', gold: 1800, military: 20000, stability: 85, prestige: 80 }
        ]
    },
    'revolution': {
        id: 'revolution',
        title: 'Vent de Révolution',
        year: 1789,
        era: 'Époque Moderne',
        description: 'La Bastille est prise à Paris. La monarchie vacille, l idéalisme révolutionnaire incendie l Europe.',
        center: [48.8, 2.3],
        zoom: 5,
        countries: [
            { name: 'France Révolutionnaire', capital: 'Paris', leader: 'Assemblée Nationale', flag: '🇫🇷', color: '#002395', gold: 800, military: 50000, stability: 45, prestige: 90 },
            { name: 'Royaume-Uni', capital: 'Londres', leader: 'George III', flag: '🇬🇧', color: '#012169', gold: 2500, military: 45000, stability: 85, prestige: 92 },
            { name: 'Royaume de Prusse', capital: 'Berlin', leader: 'Guillaume II', flag: '🦅', color: '#222222', gold: 1100, military: 55000, stability: 80, prestige: 84 },
            { name: 'Empire Russe', capital: 'Saint-Pétersbourg', leader: 'Catherine II', flag: '🇷🇺', color: '#0039a6', gold: 1400, military: 70000, stability: 75, prestige: 88 },
            { name: 'États-Unis', capital: 'Philadelphie', leader: 'George Washington', flag: '🇺🇸', color: '#b22234', gold: 600, military: 15000, stability: 80, prestige: 75 }
        ]
    },
    'ww1': {
        id: 'ww1',
        title: 'La Grande Guerre',
        year: 1914,
        era: 'XXe Siècle',
        description: 'L attentat de Sarajevo déclenche l engrenage des alliances. Les empires industriels s affrontent dans les tranchées.',
        center: [50.0, 10.0],
        zoom: 4,
        countries: [
            { name: 'France', capital: 'Paris', leader: 'Raymond Poincaré', flag: '🇫🇷', color: '#002395', gold: 2000, military: 1200000, stability: 80, prestige: 90 },
            { name: 'Empire Allemand', capital: 'Berlin', leader: 'Guillaume II', flag: '🇩🇪', color: '#111111', gold: 2800, military: 1500000, stability: 85, prestige: 92 },
            { name: 'Empire Britannique', capital: 'Londres', leader: 'George V', flag: '🇬🇧', color: '#012169', gold: 3500, military: 800000, stability: 88, prestige: 95 },
            { name: 'Empire Russe', capital: 'Saint-Pétersbourg', leader: 'Nicolas II', flag: '🇷🇺', color: '#0039a6', gold: 1500, military: 1800000, stability: 50, prestige: 82 },
            { name: 'Empire Autriche-Hongrie', capital: 'Vienne', leader: 'François-Joseph Ier', flag: '🇦🇹', color: '#c09304', gold: 1400, military: 900000, stability: 55, prestige: 80 }
        ]
    },
    'ww2': {
        id: 'ww2',
        title: 'Seconde Guerre Mondiale',
        year: 1939,
        era: 'XXe Siècle',
        description: 'Le monde bascule dans la guerre totale. Les forces de l Axe font face aux Alliés dans un conflit titanesque.',
        center: [52.5, 13.4],
        zoom: 4,
        countries: [
            { name: 'France', capital: 'Paris', leader: 'Édouard Daladier', flag: '🇫🇷', color: '#002395', gold: 1800, military: 900000, stability: 70, prestige: 88 },
            { name: 'Reich Allemand', capital: 'Berlin', leader: 'Gouvernement Reich', flag: '🇩🇪', color: '#2b2b2b', gold: 3000, military: 2000000, stability: 85, prestige: 85 },
            { name: 'Royaume-Uni', capital: 'Londres', leader: 'Neville Chamberlain', flag: '🇬🇧', color: '#012169', gold: 3200, military: 750000, stability: 85, prestige: 92 },
            { name: 'URSS', capital: 'Moscou', leader: 'Joseph Staline', flag: '🛠️', color: '#cc0000', gold: 2200, military: 2500000, stability: 80, prestige: 86 },
            { name: 'Empire du Japon', capital: 'Tokyo', leader: 'Hirohito', flag: '🇯🇵', color: '#bc002d', gold: 1900, military: 1100000, stability: 90, prestige: 84 },
            { name: 'États-Unis', capital: 'Washington D.C.', leader: 'Franklin D. Roosevelt', flag: '🇺🇸', color: '#b22234', gold: 6000, military: 600000, stability: 92, prestige: 95 }
        ]
    },
    'coldwar': {
        id: 'coldwar',
        title: 'La Guerre Froide',
        year: 1945,
        era: 'Ère Nucléaire',
        description: 'Le Rideau de Fer sépare le monde. Washington et Moscou s affrontent par idéologies et crises interposées.',
        center: [52.5, 13.4],
        zoom: 3,
        countries: [
            { name: 'États-Unis', capital: 'Washington D.C.', leader: 'Harry S. Truman', flag: '🇺🇸', color: '#b22234', gold: 10000, military: 1500000, stability: 90, prestige: 98 },
            { name: 'URSS', capital: 'Moscou', leader: 'Joseph Staline', flag: '🛠️', color: '#cc0000', gold: 5000, military: 2800000, stability: 85, prestige: 95 },
            { name: 'Chine', capital: 'Pékin', leader: 'Mao Zedong', flag: '🇨🇳', color: '#de2910', gold: 1200, military: 1800000, stability: 70, prestige: 75 },
            { name: 'France', capital: 'Paris', leader: 'Charles de Gaulle', flag: '🇫🇷', color: '#002395', gold: 2500, military: 500000, stability: 75, prestige: 88 },
            { name: 'Royaume-Uni', capital: 'Londres', leader: 'Winston Churchill', flag: '🇬🇧', color: '#012169', gold: 3000, military: 600000, stability: 82, prestige: 90 }
        ]
    }
};
