const { Events, ActivityType } = require('discord.js');
const fs = require("fs");
const path = require("path");

// Logic Nối Từ cũ (Giữ lại nếu bạn vẫn dùng)
// Đảm bảo đường dẫn ../data/activeGames.js là chính xác
let activeGames = {};
try {
    const gameData = require("../data/activeGames.js");
    activeGames = gameData.activeGames || gameData;
} catch (e) {
    console.warn("⚠️ Không tìm thấy data/activeGames.js, bỏ qua khôi phục Nối Từ.");
}

const configPath = path.resolve(__dirname, "../data/game-config.json");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Bot đã sẵn sàng! Đăng nhập dưới tên: ${client.user.tag}`);

        // 1. Đặt trạng thái Bot
        try {
            client.user.setPresence({
                activities: [{ name: "🎉 Ma Sói, Nối Từ & Pet!", type: ActivityType.Playing }],
                status: "online",
            });
        } catch (e) {
            console.warn('Không thể set presence:', e?.message || e);
        }

        // 2. Logic Khôi phục Game Nối Từ (Giữ nguyên từ code cũ của bạn)
        if (fs.existsSync(configPath)) {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
                const channelId = configData.wordGameChannelId;

                if (channelId) {
                    const savedGame = activeGames ? activeGames[channelId] : null;
                    
                    // Chỉ khôi phục nếu có dữ liệu game đang chạy
                    if (savedGame && savedGame.started) {
                        const channel = await client.channels.fetch(channelId).catch(() => null);
                        if (channel) {
                            // Mở lại quyền chat nếu cần (tùy chọn)
                            /*
                            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                                SendMessages: true,
                            }).catch(() => {});
                            */

                            // Gửi thông báo khôi phục
                            await channel.send({
                                content: `🌀 **Bot đã khởi động lại!** Tiếp tục Nối Từ.\nTừ cuối: **${savedGame.lastWord}**`,
                            }).catch(() => {});

                            // Đồng bộ lại state vào RAM
                            if (!client.gameStates) client.gameStates = new Map();
                            client.gameStates.set(channelId, {
                                lastWord: savedGame.lastWord,
                                lastUser: savedGame.lastPlayer,
                                usedWords: new Set(savedGame.usedWords || []),
                            });
                            
                            console.log(`🔁 Đã khôi phục Nối Từ tại kênh #${channel.name}`);
                        }
                    }
                }
            } catch (err) {
                console.error("❌ Lỗi khi khôi phục Nối Từ:", err);
            }
        }

        // --- LƯU Ý QUAN TRỌNG ---
        // Logic Spawn Pet đã được chuyển sang 'SpawnSystem.mjs' và được gọi trong 'index.js'.
        // Không cần (và không được) gọi lại ở đây để tránh lỗi và trùng lặp.
        console.log("🚀 Hệ thống Pet Game (SpawnSystem) đang được quản lý bởi index.js");
    },
};