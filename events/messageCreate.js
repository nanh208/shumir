// events/messageCreate.js
const fs = require("fs");
const path = require("path");
const { Events } = require("discord.js");
const dictionary = require("../dictionary.js"); // Set chứa các từ hợp lệ
const { activeGames, saveGames } = require("../data/activeGames.js");

const prefix = "!";

// ======= File điểm =======
const scoresPath = path.resolve(__dirname, "../data/scores.json");
let scores = {};
if (fs.existsSync(scoresPath)) {
  try {
    scores = JSON.parse(fs.readFileSync(scoresPath, "utf8"));
  } catch {
    console.error("⚠️ Lỗi đọc scores.json — khởi tạo mới.");
    scores = {};
  }
}
function saveScores() {
  fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));
}

// ======= Bắt đầu module =======
module.exports = {
  name: Events.MessageCreate,
  async execute(message, gameStates) {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;

    // ========== Lệnh !play / !stop ==========
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const command = args.shift()?.toLowerCase();

      // ----- Bắt đầu -----
      if (command === "play") {
        if (gameStates.has(message.channel.id))
          return message.reply("⚠️ Game đang diễn ra rồi! Dùng `!stop` để dừng trước.");

        // Lấy ngẫu nhiên 1 từ trong dictionary
        const allWords = Array.from(dictionary);
        if (allWords.length === 0)
          return message.reply("⚠️ Không có từ nào trong từ điển để bắt đầu game.");

        const randomWord = allWords[Math.floor(Math.random() * allWords.length)];

        // Tạo game state
        gameStates.set(message.channel.id, {
          lastWord: randomWord,
          lastUser: message.client.user.id,
          usedWords: new Set([randomWord]),
        });

        activeGames[message.channel.id] = {
          lastWord: randomWord,
          lastPlayer: message.client.user.id,
          usedWords: [randomWord],
          started: true,
        };
        saveGames();

        return message.channel.send(
          `🎮 **Bắt đầu trò chơi Nối Từ!**\nTừ đầu: **${randomWord}**\n👉 Nối tiếp bằng từ bắt đầu với: **${randomWord.split(/\s+/).pop()}**`
        );
      }

      // ----- Dừng game -----
      if (command === "stop") {
        if (!gameStates.has(message.channel.id))
          return message.reply("❌ Không có game nào đang chạy để dừng.");

        gameStates.delete(message.channel.id);
        delete activeGames[message.channel.id];
        saveGames();

        return message.reply("🏁 **Game đã kết thúc!** Gõ `!play` để bắt đầu ván mới.");
      }

      return;
    }

    // ========== Xử lý khi có người chơi ==========
    const state = gameStates.get(message.channel.id);
    if (!state) return; // không có game đang chạy

    if (message.author.id === state.lastUser)
      return message.reply("⏳ Bạn vừa nối rồi, chờ người khác đi nào!");

    const newWord = message.content.trim().toLowerCase();
    if (!newWord) return;

    // Kiểm tra tồn tại trong từ điển
    if (!dictionary.has(newWord))
      return message.reply(`❌ Từ **${newWord}** không có trong từ điển!`);

    // Kiểm tra trùng
    if (state.usedWords.has(newWord))
      return message.reply(`❌ Từ **${newWord}** đã được dùng rồi!`);

    // ====== Kiểm tra logic nối từ ======
    const lastPart = state.lastWord.split(/\s+/).pop(); // từ cuối của cụm trước
    const firstPart = newWord.split(/\s+/)[0]; // từ đầu của cụm mới

    if (firstPart !== lastPart) {
      return message.reply(`❌ Sai rồi! Từ mới phải **bắt đầu bằng "${lastPart}"**.`);
    }

    // ====== Nếu hợp lệ ======
    state.lastWord = newWord;
    state.lastUser = message.author.id;
    state.usedWords.add(newWord);

    activeGames[message.channel.id] = {
      lastWord: newWord,
      lastPlayer: message.author.id,
      usedWords: Array.from(state.usedWords),
      started: true,
    };
    saveGames();

    // Kiểm tra xem còn từ nối được không
    let canContinue = false;
    for (const dictWord of dictionary) {
      if (!state.usedWords.has(dictWord)) {
        const nextFirst = dictWord.split(/\s+/)[0];
        if (nextFirst === newWord.split(/\s+/).pop()) {
          canContinue = true;
          break;
        }
      }
    }

  // ====== Nếu không còn từ nối được → người chơi thắng ======
if (!canContinue) {
  const guildIdStr = message.guild.id.toString();   // đảm bảo string
  const userIdStr = message.author.id.toString();

  // Khởi tạo object cho server nếu chưa có
  if (!scores[guildIdStr]) scores[guildIdStr] = {};

  // Cộng điểm
  scores[guildIdStr][userIdStr] = (scores[guildIdStr][userIdStr] || 0) + 1;

  // Lưu scores ra file
  try {
    fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));
  } catch (err) {
    console.error("⚠️ Lỗi lưu điểm:", err);
  }

  // Xoá game đang chạy
  gameStates.delete(message.channel.id);
  delete activeGames[message.channel.id];
  saveGames();

  return message.channel.send(
    `🏆 **${message.author.username}** thắng ván này với từ cuối: **${newWord}**!\n🎉 Nhận được **+1 điểm**!\n💬 Gõ \`!play\` để bắt đầu ván mới.`
  );
}


    // Còn nối được → tiếp tục
    const nextHint = newWord.split(/\s+/).pop();
    return message.channel.send(`✅ Hợp lệ! Tiếp tục nối bằng từ bắt đầu với: **${nextHint}**`);
  },
};
