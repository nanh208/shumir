// data/activeWerewolfGames.js

// Đối tượng lưu trữ các game Ma Sói đang hoạt động
// Key: channelId
// Value: { status, players, rolesPool, gameMaster, ... }
const activeWerewolfGames = new Map();

// Hàm giả định để lưu/tải trạng thái game vào tệp (cần tự triển khai)
// function saveWerewolfGames() { ... }
// function loadWerewolfGames() { ... }

module.exports = {
    activeWerewolfGames,
    // saveWerewolfGames,
    // loadWerewolfGames
};