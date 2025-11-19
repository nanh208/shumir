const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Giả lập danh sách MODE GAME (Cần đảm bảo dữ liệu này khớp với file game chính)
const GAME_MODES = [
    { name: "classic", description: "Cân bằng cổ điển (khuyến nghị)" },
    { name: "quick", description: "Game nhanh, thời gian rút ngắn" },
    { name: "turbo", description: "Siêu nhanh cho người vội" },
    { name: "chaos", description: "Nhiều sự kiện & vai trò solo" },
    { name: "custom", description: "Tự chọn vai trò theo ý muốn" }
];

module.exports = {
    // Định nghĩa Slash Command
    data: new SlashCommandBuilder()
        .setName("masoihelp") // <--- Lệnh slash mới: /masoihelp
        .setDescription("Hiện hướng dẫn chi tiết, luật chơi và cú pháp của game Ma Sói V2."),

    // Logic xử lý lệnh Slash Command
    async execute(interaction) {
        // Defer trước để tránh timeout. Đổi ephemeral thành true nếu muốn chỉ người dùng thấy
        await interaction.deferReply({ ephemeral: false });

        // Tạo chuỗi hiển thị các chế độ game
        const gameModesText = GAME_MODES.map(m => `[★] **${m.name}** → ${m.description}`).join('\n');
            
        // Khởi tạo và thiết lập Embed
        const embed = new EmbedBuilder()
            .setTitle('⋆｡‧˚ʚ♡ɞ˚‧｡⋆ Ma Sói V2 - Hướng dẫn chi tiết ⋆｡‧˚ʚ♡ɞ˚‧｡⋆')
            .setColor('#FF69B4') // Màu hồng
            .setDescription(
                `◇─◇──◇─────◇──◇─◇\n` +
                `│   ✧･ﾟ: *✧･ﾟ:* **Ma Sói V2** *:･ﾟ✧*:･ﾟ✧   │\n` +
                `◇─◇──◇─────◇──◇─◇\n\n` +
                `˗ˏˋ ★ ˎˊ˗ **Phiên bản nâng cao với hơn 50 vai trò, hệ thống sự kiện ngẫu nhiên và thread system để theo dõi game tốt hơn!** ˗ˏˋ ★ ˎˊ˗`
            )
            .addFields(
                { 
                    name: '◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆ Cú pháp cơ bản ◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆', 
                    // Cập nhật cú pháp để phù hợp với lệnh `/masoi` chính
                    value: '`∘₊✧──────✧₊∘∘₊✧──────✧₊∘\n   /masoi [subcommand] [options]\n∘₊✧──────✧₊∘∘₊✧──────✧₊∘`',
                    inline: false
                },
                {
                    name: '⋆｡‧˚ʚ♡ɞ˚‧｡⋆ Lưu ý quan trọng ⋆｡‧˚ʚ♡ɞ˚‧｡⋆',
                    value: '✧･ﾟ: ✧･ﾟ: **Bot cần quyền tạo thread để game hoạt động tốt nhất** :･ﾟ✧:･ﾟ✧',
                    inline: false
                },
                {
                    name: '⋅•⋅⊰∙∘☽༓☾∘∙⊱⋅•⋅ Các lệnh con ⋅•⋅⊰∙∘☽༓☾∘∙⊱⋅•⋅',
                    value: 
                        `\`╭─────────────────────────────────────╮
│        ★ ☆ ★ LỆNH CON ★ ☆ ★        │
╰─────────────────────────────────────╯\`\n` +
                        `+ **create** [mode] [players] ∘ Tạo game mới\n` +
                        `+ **info** ∘ Xem thông tin game\n` +
                        `+ **roles** [category]        ∘ Xem vai trò\n` +
                        `+ **stop** ∘ Dừng game (host/admin)\n` +
                        `+ **check** ∘ Kiểm tra game active trong server\n` +
                        `+ **help** ∘ Hiện hướng dẫn này (hoặc dùng \`/masoihelp\`)`, // Chỉnh sửa gợi ý
                    inline: false
                },
                {
                    name: '✧･ﾟ: ✧･ﾟ: ♡ ︎Chế độ game ♡ :･ﾟ✧:･ﾟ✧',
                    value: 
                        `┌─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┐
│                MODE GAME               │
└─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┘\n` +
                        gameModesText,
                    inline: false
                },
                {
                    name: '˚₊·͟͟͟͟͟➳❥ Ví dụ sử dụng ˚₊·͟͟͟͟͟➳❥',
                    value: 
                        `╔═══════════════════════════════════╗
║           💫 VÍ DỤ 💫            ║
╚═══════════════════════════════════╝\n` +
                        `# ✨ Tạo game classic cho 12 người\n` +
                        '`/masoi create classic 12`\n' +
                        `# 🎭 Tạo game chaos cho 20 người\n` +
                        '`/masoi create chaos 20`\n' +
                        `# 👥 Xem vai trò dân làng\n` +
                        '`/masoi roles Villager`\n' +
                        `# 📊 Xem tất cả game trong server\n` +
                        '`/masoi check`',
                    inline: false
                },
                {
                    name: '✧｡٩(ˊᗜˋ)و✧｡ Mẹo hay & Tricks ✧｡٩(ˊᗜˋ)و✧｡',
                    value: 
                        `∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘\n` +
                        `         🌟 TIPS & TRICKS 🌟\n` +
                        `∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘\n` +
                        `🧵 Game tự động tạo thread riêng cho thông báo\n` +
                        `📬 Check **DM** khi game bắt đầu để biết vai trò\n` +
                        `📊 Dùng \`/masoi check\` để quản lý nhiều game\n` +
                        `⚙️ Host có thể dùng \`settings\` để tùy chỉnh (Dự kiến)\n` +
                        `🔧 Admin có thể force stop game qua \`/masoi stop\`\n` +
                        `🎯 Sử dụng button thay vì gõ lệnh trong game`,
                    inline: false
                },
                {
                    name: '⋆౨ৎ˚⟡˖ ࣪ Guidelines & Rules ⋆౨ৎ˚⟡˖ ࣪',
                    value: 
                        `╭──── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ────╮
│     🌸 GUIDELINES 🌸      │
╰──── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ────╯\n` +
                        `+ 🌟 Tuân thủ luật server và Discord TOS\n` +
                        `+ 💕 Không spam, harassment hay NSFW\n` +
                        `+ 🎮 Chơi fair, không cheat hay meta-gaming\n` +
                        `+ 🤝 Tôn trọng người chơi khác\n` +
                        `+ 📝 Đọc kỹ vai trò trước khi chơi\n` +
                        `+ 🔇 Không ghost/quit giữa chừng\n\n` +
                        `         ♡ ENJOY THE GAME ♡\n` +
                        `✧･ﾟ: *✧･ﾟ:* Cần hỗ trợ? Liên hệ admin server! *:･ﾟ✧*:･ﾟ✧•`,
                    inline: false
                }
            );

        return interaction.editReply({ embeds: [embed] });
    }
};