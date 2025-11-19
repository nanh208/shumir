// inventorySystem.js
const { readJSON, writeJSON } = require("./utils");
const petsFile = "./data/pets.json";

function getUserInventory(userId) {
    const data = readJSON(petsFile);
    return data.users[userId]?.inventory || [];
}

function addItemToInventory(userId, item) {
    const data = readJSON(petsFile);
    if (!data.users[userId]) data.users[userId] = { pets: [], inventory: [], xp: 0, coins: 0 };
    data.users[userId].inventory.push(item);
    writeJSON(petsFile, data);
}

module.exports = { getUserInventory, addItemToInventory };
