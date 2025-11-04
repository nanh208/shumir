const fs = require("fs");
const path = require("path");

const scoresPath = path.resolve(__dirname, "scores.json");

let scores = {};

// Load scores từ file khi khởi động
function loadScores() {
  if (fs.existsSync(scoresPath)) {
    try {
      scores = JSON.parse(fs.readFileSync(scoresPath, "utf8"));
    } catch (err) {
      console.error("⚠️ Lỗi đọc scores.json, khởi tạo mới.", err);
      scores = {};
    }
  }
}

// Lưu scores ra file
function saveScores() {
  try {
    fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));
  } catch (err) {
    console.error("⚠️ Lỗi ghi scores.json:", err);
  }
}

// Thêm điểm cho người chơi
function addPoint(guildId, userId, points = 1) {
  guildId = guildId.toString();
  userId = userId.toString();

  if (!scores[guildId]) scores[guildId] = {};
  scores[guildId][userId] = (scores[guildId][userId] || 0) + points;

  saveScores();
}

// Lấy BXH của server (mặc định top 10)
function getGuildScores(guildId, top = 10) {
  guildId = guildId.toString();
  const guildScores = scores[guildId] || {};
  const sorted = Object.entries(guildScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);
  return sorted; // mảng [[userId, score], ...]
}

// Lấy toàn bộ scores (cho debug hoặc thống kê)
function getAllScores() {
  return scores;
}

loadScores();

module.exports = {
  addPoint,
  getGuildScores,
  getAllScores,
};
