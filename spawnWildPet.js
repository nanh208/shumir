// spawnWildPet.js — spawn manager and helpers
const { readJSON, writeJSON, randomInt, choose } = require("./utils");
const { petIcons } = require("./config");
const petsFile = "./data/pets.json";
const { generatePet } = require("./petSystem");

// Quality distribution
const qualityRate = [
    { quality: "Common", rate: 60 },
    { quality: "Uncommon", rate: 25 },
    { quality: "Rare", rate: 10 },
    { quality: "Epic", rate: 4 },
    { quality: "Legendary", rate: 1 },
    { quality: "Mythic", rate: 0.5 }
];

const qualityColor = {
    Common: "#95a5a6",
    Uncommon: "#2ecc71",
    Rare: "#3498db",
    Epic: "#9b59b6",
    Legendary: "#f1c40f",
    Mythic: "#e67e22"
};

function rollQuality() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const q of qualityRate) {
        cumulative += q.rate;
        if (roll <= cumulative) return q.quality;
    }
    return "Common";
}

// Internal: ensure pets file shape
function ensurePetsFile() {
    const data = readJSON(petsFile);
    if (!data || typeof data !== 'object') return { users: {}, wildPets: [], spawnChannels: {} };
    if (!data.users) data.users = {};
    if (!Array.isArray(data.wildPets)) data.wildPets = [];
    if (!data.spawnChannels) data.spawnChannels = {};
    return data;
}

// Spawn up to `count` wild pets into data.wildPets and post a message to channel if client+channelId provided
async function spawnWildPets(client, channelId, count = 10) {
    const data = ensurePetsFile();
    const toSpawn = Math.max(1, Math.min(10, count));
    const spawned = [];

    for (let i = 0; i < toSpawn; i++) {
        const quality = rollQuality();
        const pet = generatePet(randomInt(1, 50), quality);
        // add meta fields
        pet.spawnedAt = Date.now();
        pet.lockedBy = null; // userId currently attacking
        pet.color = qualityColor[quality] || "#95a5a6";
        data.wildPets.push(pet);
        spawned.push(pet);
    }

    writeJSON(petsFile, data);

    // If client + channelId provided, send an embed message listing spawned pets
    if (client && channelId) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) {
                const lines = spawned.map(p => `• **${p.icon || '🐾'} ${p.name}** — ID: \`${p.id}\` — Lv ${p.level} — **${p.quality}**`);
                await channel.send({ content: `🐾 **Xuất hiện ${spawned.length} pet hoang dã!**\n${lines.join("\n")}` });
            }
        } catch (e) {
            console.error('Lỗi khi gửi thông báo spawn:', e);
        }
    }

    return spawned;
}

// Attempt to lock a pet for attacking; returns true if locked successfully
function lockPet(petId, userId) {
    const data = ensurePetsFile();
    const idx = data.wildPets.findIndex(p => p.id === petId);
    if (idx === -1) return { ok: false, reason: 'not_found' };
    const pet = data.wildPets[idx];
    if (pet.lockedBy && pet.lockedBy !== userId) return { ok: false, reason: 'locked' };
    pet.lockedBy = userId;
    writeJSON(petsFile, data);
    return { ok: true, pet };
}

function unlockPet(petId) {
    const data = ensurePetsFile();
    const idx = data.wildPets.findIndex(p => p.id === petId);
    if (idx === -1) return false;
    data.wildPets[idx].lockedBy = null;
    writeJSON(petsFile, data);
    return true;
}

// Remove a wild pet (on capture or kill) and return it
function removeWildPet(petId) {
    const data = ensurePetsFile();
    const idx = data.wildPets.findIndex(p => p.id === petId);
    if (idx === -1) return null;
    const [pet] = data.wildPets.splice(idx, 1);
    writeJSON(petsFile, data);
    return pet;
}

module.exports = { spawnWildPets, rollQuality, qualityColor, lockPet, unlockPet, removeWildPet };
