// petSystem.js
const { readJSON, writeJSON, randomInt, choose } = require("./utils");
const { dataDir, petIcons, elements, tribes, spawnIntervals } = require("./config");

const petsFile = `${dataDir}/pets.json`;

function generatePet(level=1, quality="Common") {
    const pet = {
        id: Date.now(),
        icon: choose(petIcons),
        name: `Pet${Date.now()}`,
        level,
        quality,
        element: choose(elements),
        tribe: choose(tribes),
        stats: {
            hp: randomInt(100, 1000),
            mana: randomInt(50, 300),
            magic: randomInt(50, 200),
            speed: randomInt(10, 100),
            attack: randomInt(10, 100),
            armor: randomInt(5, 50),
            gene: randomInt(1, 100)
        },
        skills: []
    };
    return pet;
}

function addPetToUser(userId, pet) {
    const data = readJSON(petsFile);
    if (!data.users[userId]) data.users[userId] = { pets: [], inventory: [], xp: 0, coins: 0 };
    data.users[userId].pets.push(pet);
    writeJSON(petsFile, data);
}

function spawnWildPet() {
    const data = readJSON(petsFile);
    const pet = generatePet(randomInt(1,50), "Common");
    data.wildPets.push(pet);
    writeJSON(petsFile, data);
    return pet;
}

module.exports = { generatePet, addPetToUser, spawnWildPet };
