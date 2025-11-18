// utils/activeWerewolfGames.js

// Đối tượng lưu trữ các game Ma Sói đang hoạt động
// Key: channelId
// Value: { status, players, roles, gameMaster, ... }
const activeWerewolfGames = new Map();

module.exports = {
    activeWerewolfGames,
};