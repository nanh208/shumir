// testGame.js — mô phỏng trò nối từ hoàn chỉnh
const fs = require("fs");

// Giả lập dictionary (bạn có thể import từ file thật)
const dictionary = new Set([
  "hoa đào",
  "đào tạo",
  "tạo hình",
  "hình tròn",
  "tròn trịa",
  "trịa vai",
  "vai chính",
  "chính quyền",
  "quyền lực",
  "lực học",
  "học sinh",
  "sinh viên",
  "viên thuốc",
  "thuốc bổ",
]);

// Lấy random 1 từ để bắt đầu
const randomWord = Array.from(dictionary)[Math.floor(Math.random() * dictionary.size)];

let state = {
  lastWord: randomWord,
  usedWords: new Set([randomWord]),
};

console.log("🎮 Bắt đầu trò nối từ!\nTừ đầu tiên:", randomWord);
console.log("-----------------------------------");

function playTurn(newWord) {
  newWord = newWord.trim().toLowerCase();

  // kiểm tra hợp lệ
  if (!dictionary.has(newWord)) return console.log("❌ Không có trong từ điển:", newWord);
  if (state.usedWords.has(newWord)) return console.log("⚠️ Từ đã được dùng:", newWord);

  const lastPart = state.lastWord.split(/\s+/).pop();
  const firstPart = newWord.split(/\s+/)[0];

  if (firstPart !== lastPart) {
    console.log(`❌ Sai! Từ mới phải bắt đầu bằng "${lastPart}"`);
    return;
  }

  // hợp lệ
  console.log(`✅ ${state.lastWord} ➜ ${newWord}`);
  state.lastWord = newWord;
  state.usedWords.add(newWord);

  // kiểm tra còn nối được không
  const next = Array.from(dictionary).filter(
    (w) =>
      !state.usedWords.has(w) &&
      w.split(/\s+/)[0] === state.lastWord.split(/\s+/).pop()
  );

  if (next.length === 0) {
    console.log(`🏆 Hết từ để nối! Người vừa chơi thắng! (từ cuối: ${newWord})`);
    return false;
  }

  console.log(`👉 Từ tiếp theo phải bắt đầu bằng: "${state.lastWord.split(/\s+/).pop()}"`);
  return true;
}

// ================== Test mô phỏng ==================
const turns = [
  "đào tạo",
  "tạo hình",
  "hình tròn",
  "tròn trịa",
  "trịa vai",
  "vai chính",
  "chính quyền",
  "quyền lực",
  "lực học",
  "học sinh",
  "sinh viên",
  "viên thuốc",
  "thuốc bổ",
];

for (const word of turns) {
  const cont = playTurn(word);
  if (!cont) break;
}

console.log("\n🎯 Kết thúc mô phỏng trò chơi!");
