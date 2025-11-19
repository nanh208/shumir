// catchSystem.js
const { readJSON, writeJSON } = require("./utils");
const petsFile = "./data/pets.json";

const ballRates = {
    Common: 0.5,
    Uncommon: 0.6,
    Rare: 0.65,
    Epic: 0.7,
    Legendary: 1
};

function catchPet(userId, petIdRaw, ballType="Common") {
    const petId = Number(petIdRaw);
    const data = readJSON(petsFile);
    const petIndex = (data.wildPets || []).findIndex(p => p.id === petId);
    if(petIndex === -1) return { ok: false, reason: 'not_found' };
    const pet = data.wildPets[petIndex];

    // If someone is currently locking/attacking the pet, disallow catch
    if (pet.lockedBy && pet.lockedBy !== userId) return { ok: false, reason: 'locked' };

    const successRate = ballRates[pet.quality] || 0.5;
    if(Math.random() <= successRate) {
        if(!data.users[userId]) data.users[userId] = { pets: [], inventory: [], xp: 0, coins: 0 };
        data.users[userId].pets.push(pet);
        data.wildPets.splice(petIndex, 1);
        writeJSON(petsFile, data);
        return { ok: true };
    }
    return { ok: false, reason: 'failed' };
}

module.exports = { catchPet };
