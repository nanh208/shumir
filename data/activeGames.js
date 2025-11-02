// data/activeGames.js
const fs = require("fs");
const path = require("path");
const gamesPath = path.join(__dirname, "activeGames.json");

// Tải dữ liệu game cũ khi bot bật lại
let activeGames = {};
if (fs.existsSync(gamesPath)) {
  try {
    activeGames = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    console.log("✅ Đã khôi phục tiến độ trò chơi trước đó!");
  } catch (err) {
    console.error("⚠️ Không thể đọc file tiến độ game:", err);
  }
}

// Hàm lưu game
function saveGames() {
  fs.writeFileSync(gamesPath, JSON.stringify(activeGames, null, 2));
}

module.exports = { activeGames, saveGames };
