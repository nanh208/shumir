const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'activeGames.json');

// Đọc dữ liệu từ file khi bot khởi động
let activeGames = {};
if (fs.existsSync(filePath)) {
  try {
    activeGames = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error("Lỗi đọc file activeGames.json:", err);
    activeGames = {};
  }
}

// Hàm lưu dữ liệu ra file
function saveActiveGames() {
  fs.writeFileSync(filePath, JSON.stringify(activeGames, null, 2));
}

module.exports = { activeGames, saveActiveGames };
