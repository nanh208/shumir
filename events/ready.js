const { activeGames } = require("../data/activeGames.js");
const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits } = require("discord.js");

const configPath = path.resolve(__dirname, "../data/game-config.json");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Bot đã sẵn sàng: ${client.user.tag}`);

    // Đặt presence giống như trước (hợp nhất vào đây để tránh duplicate)
    try {
      client.user.setPresence({
        activities: [{ name: "🎉 Ma Sói & Nối Từ!", type: 0 }],
        status: "online",
      });
    } catch (e) {
      console.warn('Không thể set presence:', e?.message || e);
    }

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

      // 🧩 Gỡ hạn chế gửi tin nhắn cho mọi người (nếu trước đó bị tắt)
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: true,
      });
      console.log(`🔓 Đã mở lại quyền gửi tin nhắn trong kênh #${channel.name}`);

      // Gửi thông báo khôi phục game
      await channel.send({
        content:
          `🌀 **Bot đã khởi động lại và tiếp tục trò chơi Nối Từ!**\n` +
          `Từ cuối cùng là: **${savedGame.lastWord}**\n` +
          `👉 Nối tiếp bằng từ bắt đầu với: **${savedGame.lastWord.split(" ").pop()}**`,
      });

      // Đồng bộ lại với `client.gameStates` trong RAM (để tiếp tục nối)
      const gameStates = client.gameStates || new Map();
      gameStates.set(channelId, {
        lastWord: savedGame.lastWord,
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
