const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/players.json');

// Đảm bảo file tồn tại
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify({}));
}

function getAllPlayers() {
    const rawData = fs.readFileSync(dataPath);
    return JSON.parse(rawData);
}

function getPlayer(userId) {
    const players = getAllPlayers();
    return players[userId] || null;
}

function savePlayer(userId, data) {
    const players = getAllPlayers();
    players[userId] = data;
    fs.writeFileSync(dataPath, JSON.stringify(players, null, 2));
}

module.exports = { getAllPlayers, getPlayer, savePlayer };