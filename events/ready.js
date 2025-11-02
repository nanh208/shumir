const { activeGames } = require("../data/activeGames.js");
const fs = require("fs");
const path = require("path");
const configPath = path.resolve(__dirname, "../data/game-config.json");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Bot đã sẵn sàng: ${client.user.tag}`);

    // Đọc cấu hình để biết kênh chơi Nối Từ
    if (!fs.existsSync(configPath)) return;
    const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const channelId = configData.wordGameChannelId;
    if (!channelId) return;

    // Nếu có game đang lưu và kênh hợp lệ
    const savedGame = activeGames[channelId];
    if (!savedGame || !savedGame.started) return;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return console.warn("⚠️ Không tìm thấy kênh đã lưu trong config.");

      // Gửi thông báo khôi phục game
      await channel.send({
        content: `🌀 **Bot đã khởi động lại và tiếp tục trò chơi Nối Từ!**\n` +
                 `Từ cuối cùng là: **${savedGame.lastWord}**\n` +
                 `👉 Nối tiếp bằng từ bắt đầu với: **${savedGame.lastWord.split(" ").pop()}**`
      });

      // Đồng bộ lại với gameStates trong RAM (để tiếp tục nối)
      const gameStates = client.gameStates || new Map();
      gameStates.set(channelId, {
        lastSyllable: savedGame.lastWord.split(" ").pop(),
        lastUser: savedGame.lastPlayer,
        usedWords: new Set(savedGame.usedWords || []),
      });
      client.gameStates = gameStates;

      console.log(`🔁 Đã khôi phục game trong kênh #${channel.name}`);

    } catch (err) {
      console.error("❌ Lỗi khi khôi phục game:", err);
    }
  },
};
