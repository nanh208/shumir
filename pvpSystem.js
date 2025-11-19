// pvpSystem.js
const { readJSON, writeJSON } = require("./utils");
const petsFile = "./data/pets.json";

function duel(user1, user2) {
    const data = readJSON(petsFile);
    const pet1 = data.users[user1].pets[0];
    const pet2 = data.users[user2].pets[0];
    const sum1 = Object.values(pet1.stats).reduce((a,b)=>a+b,0);
    const sum2 = Object.values(pet2.stats).reduce((a,b)=>a+b,0);
    return sum1 >= sum2 ? user1 : user2;
}

module.exports = { duel };
