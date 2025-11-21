// upgradeSystem.js
const { readJSON, writeJSON } = require("./utils/index.js");
const petsFile = "./data/pets.json";

function levelUpPet(userId, petIdRaw, statPoints) {
    const petId = Number(petIdRaw);
    const data = readJSON(petsFile);
    const pet = data.users[userId]?.pets.find(p => Number(p.id) === petId);
    if(!pet) return false;
    const maxLevel = 100;
    if(pet.level >= maxLevel) return false;
    pet.level += 1;
    // phân bổ statPoints: {hp:5, mana:2,...}
    for(const key in statPoints){
        if(pet.stats[key] !== undefined){
            pet.stats[key] += statPoints[key];
        }
    }
    writeJSON(petsFile, data);
    return true;
}

function applyGeneBuff(pet){
    const buff = pet.stats.gene / 1000; // gen 100% => 10%
    for(const key in pet.stats){
        if(key !== "gene") pet.stats[key] += Math.floor(pet.stats[key]*buff);
    }
    return pet;
}

module.exports = { levelUpPet, applyGeneBuff };
