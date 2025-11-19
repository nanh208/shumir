// dungeonSystem.js
const { readJSON, writeJSON, randomInt } = require("./utils");
const { candyTypes, chestRarity } = require("./config");
const { addPetToUser } = require("./petSystem");
const petsFile = "./data/pets.json";

function generateBoss(level, difficulty="Easy") {
    const factor = { Easy:1, Hard:2, Nightmare:3, Hell:4 }[difficulty];
    return {
        name: `Boss_${Date.now()}`,
        stats: {
            hp: 500*factor,
            mana: 200*factor,
            magic: 150*factor,
            speed: 50*factor,
            attack: 100*factor,
            armor: 25*factor
        }
    };
}

function calculateVictory(userPet, boss) {
    if (!userPet || !userPet.stats) {
        // no pet provided -> low chance
        return Math.random() > 0.85;
    }
    const petTotal = Object.values(userPet.stats).reduce((a,b)=>a+b,0);
    const bossTotal = Object.values(boss.stats).reduce((a,b)=>a+b,0);
    if (bossTotal > petTotal * 1.5) return false;
    // scale chance by relative power
    const ratio = petTotal / bossTotal;
    const base = Math.min(0.9, Math.max(0.1, 0.5 * ratio));
    return Math.random() < base;
}

function rewardPlayer(userId, difficulty="Easy") {
    const data = readJSON(petsFile);
    const xp = { Easy: 100, Hard: 300, Nightmare: 600, Hell: 1000 }[difficulty];
    const candy = { normal: 1, premium: 0, ultra: 0 }; // ví dụ
    // update xp
    if (!data.users[userId]) data.users[userId] = { pets: [], inventory: [], xp: 0, coins: 0 };
    data.users[userId].xp += xp;
    writeJSON(petsFile, data);
}

module.exports = { generateBoss, calculateVictory, rewardPlayer };
