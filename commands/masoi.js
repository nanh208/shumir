// masoi.js (Phần được chỉnh sửa)

// ... (các import và định nghĩa khác)

module.exports = {
    // ... (phần data: SlashCommandBuilder)

    // Logic xử lý lệnh Slash Command
    async execute(interaction, client, gameStates) {
        
        // 🚨 BẮT BUỘC: Defer Reply để bot có thể phản hồi sau 3 giây (để dùng editReply)
        // Dùng ephemeral: false nếu bạn muốn tất cả các lệnh đều hiển thị công khai.
        // Tôi giữ nguyên logic cũ: lệnh cơ bản public, chỉ deferReply.
        await interaction.deferReply({ ephemeral: false }); 
        
        const cfgChannelId = loadMasoiConfig(interaction.guildId);
        if (cfgChannelId && cfgChannelId !== interaction.channel.id) {
            // Dùng editReply sau khi đã defer
            return interaction.editReply({ content: `❌ Bot Ma Sói hiện chỉ hoạt động trên kênh <#${cfgChannelId}>. Dùng lệnh "/masoik" (quyền Manage Guild) để cập nhật kênh cho server này.` });
        }
        
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;
        let game = activeWerewolfGames.get(channelId);

        // --- Xử lý HELP/GUIDE (đã format lại) ---
        if (subcommand === "help") {
            const gameModesText = GAME_MODES.map(m => `**[★] ${m.name}** → ${m.description}`).join('\n');
            const rulesText = `
                + 🌟 Tuân thủ luật server và Discord TOS
                + 💕 Không spam, harassment hay NSFW
                + 🎮 Chơi fair, không cheat hay meta-gaming
                + 🤝 Tôn trọng người chơi khác
                + 📝 Đọc kỹ vai trò trước khi chơi
                + 🔇 Không ghost/quit giữa chừng
                + 🎯 Sử dụng **button** thay vì gõ lệnh trong game
            `;
            const tipsText = `
                🧵 Game tự động tạo thread riêng cho thông báo
                📬 Check DM khi game bắt đầu để biết vai trò
                📊 Dùng \`/masoi check\` để quản lý nhiều game
                ⚙️ Host có thể dùng \`settings\` để tùy chỉnh (lệnh chưa triển khai)
                🔧 Admin có thể force stop game qua \`check\` (lệnh chưa triển khai)
            `;

            const guideMessage = `
⋆｡‧˚ʚ♡ɞ˚‧｡⋆ **Ma Sói - Hướng dẫn chi tiết** ⋆｡‧˚ʚ♡ɞ˚‧｡⋆
◇─◇──◇─────◇──◇─◇
│   ✧･ﾟ: *✧･ﾟ:* **Ma Sói** *:･ﾟ✧*:･ﾟ✧    │
◇─◇──◇─────◇──◇─◇

˗ˏˋ ★ ˎˊ˗ Phiên bản nâng cao với hệ thống tương tác bằng nút bấm và thread system! ˗ˏˋ ★ ˎˊ˗
◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆ **Cú pháp cơ bản** ◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆
∘₊✧──────✧₊∘∘₊✧──────✧₊∘
    \`masoi [subcommand] [options]\`
∘₊✧──────✧₊∘∘₊✧──────✧₊∘

⋆｡‧˚ʚ♡ɞ˚‧｡⋆ **Lưu ý quan trọng** ⋆｡‧˚ʚ♡ɞ˚‧｡⋆
✧･ﾟ: ✧･ﾟ: **Bot cần quyền tạo thread để game hoạt động tốt nhất** :･ﾟ✧:･ﾟ✧
⋅•⋅⊰∙∘☽༓☾∘∙⊱⋅•⋅ **Các lệnh con** ⋅•⋅⊰∙∘☽༓☾∘∙⊱⋅•⋅
╭─────────────────────────────────────╮
│           ★ ☆ ★ **LỆNH CON** ★ ☆ ★         │
╰─────────────────────────────────────╯
\`+ create [mode] [players]\` ∘ Tạo game mới
\`+ info\`                    ∘ Xem thông tin game
\`+ roles [category]\`        ∘ Xem vai trò
\`+ help\`                    ∘ Hiện hướng dẫn này
\`+ check\`                   ∘ Kiểm tra game active

✧･ﾟ: ✧･ﾟ: ♡ **Chế độ game** ♡ :･ﾟ✧:･ﾟ✧
┌─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┐
│                    **MODE GAME** │
└─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┘
${gameModesText}

˚₊·͟͟͟͟͟➳❥ **Ví dụ sử dụng** ˚₊·͟͟͟͟͟➳❥
╔═══════════════════════════════════╗
║            💫 **VÍ DỤ** 💫             ║
╚═══════════════════════════════════╝
# ✨ Tạo game classic cho 12 người
\`masoi create classic 12\`
# 👥 Xem vai trò dân làng
\`masoi roles Villager\`
# 📊 Xem tất cả game trong server
\`masoi check\`

✧｡٩(ˊᗜˋ)و✧｡ **Mẹo hay & Tricks** ✧｡٩(ˊᗜˋ)و✧｡
∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘
          🌟 **TIPS & TRICKS** 🌟
∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘∘°∘♡∘°∘
${tipsText}

⋆౨ৎ˚⟡˖ ࣪ **Guidelines & Rules** ⋆౨ৎ˚⟡˖ ࣪
╭──── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ────╮
│     🌸 **GUIDELINES** 🌸        │
╰──── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ────╯
${rulesText}

          ♡ **ENJOY THE GAME** ♡
✧･ﾟ: *✧･ﾟ:* Cần hỗ trợ? Liên hệ admin server! *:･ﾟ✧*:･ﾟ✧•
          `;
            return interaction.editReply({ content: guideMessage }); 
        }

        // --- Xử lý ROLES ---
        if (subcommand === "roles") {
            const filter = interaction.options.getString("category") || 'All';
            const roleDescriptions = Object.entries(ROLES)
                .filter(([key, role]) => filter === 'All' || role.team === filter)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([key, role]) => 
                    `**[${role.name}]** (${role.team === 'Werewolf' ? 'Ma Sói 🐺' : 'Dân Làng 🧑'}): ${role.description}`
                ).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle(`🎭 Danh sách Vai trò (${filter === 'All' ? 'Tất cả' : filter})`)
                .setDescription(roleDescriptions || "Không tìm thấy vai trò nào trong danh mục này.")
                .setColor(filter === 'Werewolf' ? '#FF0000' : '#0099FF');

            return interaction.editReply({ embeds: [embed], content: ' ' }); // Thêm content: ' ' để đảm bảo editReply chạy
        }


        // --- Xử lý CREATE (trước đây là start) ---
        if (subcommand === "create") {
            if (game && game.status !== 'finished') {
                return interaction.editReply({ content: "❌ Một trò chơi Ma Sói đang diễn ra hoặc đang chờ trong kênh này!" });
            }

            const numPlayers = interaction.options.getInteger("players");
            const mode = interaction.options.getString("mode");

            // Khởi tạo trạng thái game
            game = {
                status: 'pending', 
                neededPlayers: numPlayers,
                mode: mode, // Lưu mode
                channelId: channelId,
                players: new Map([[interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true }]]), 
                roles: new Map(), 
                gameMaster: interaction.user.id,
                day: 0,
                nightActions: new Map(), 
                dayVotes: new Map(),
                dayVoteCounts: {}, 
                currentVoteMessageId: null,
                lastProtectedId: null,
                tieBreakerMessageId: null, 
            };
            activeWerewolfGames.set(channelId, game);

            // Build lobby embed + buttons
            const embed = new EmbedBuilder()
                .setTitle(`🔮 Phòng chờ Ma Sói [${mode.toUpperCase()}]`)
                .setDescription(`**Host:** <@${interaction.user.id}>\n**Chế độ:** ${GAME_MODES.find(m => m.name === mode)?.description || mode}\n**Số người cần:** **${game.players.size}/${numPlayers}**\n\n**Danh sách người chơi:**\n• <@${interaction.user.id}>`)
                .setColor('#5865F2');

            const row = new new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('masoi_join').setLabel('Tham gia').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('masoi_leave').setLabel('Rời game').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('masoi_start').setLabel('Bắt đầu').setStyle(ButtonStyle.Primary), 
                new ButtonBuilder().setCustomId('masoi_cancel').setLabel('Hủy game').setStyle(ButtonStyle.Secondary),
            );

            // Gửi tin nhắn Lobby KHÔNG ephemeral
            const lobbyMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
            game.lobbyMessageId = lobbyMsg.id;

            // Chỉnh sửa tin nhắn defer ban đầu (đã thành công)
            return interaction.editReply({ content: `📣 **Trò chơi Ma Sói đã mở đăng ký!** Lobby tạo tại ${lobbyMsg.url}`, embeds: [] });
            
        // --- Xử lý INFO ---
        } else if (subcommand === "info") {
            if (!game || game.status === 'finished') {
                return interaction.editReply({ content: "❌ Hiện không có game Ma Sói nào đang hoạt động trong kênh này." });
            }
            
            let playerList = Array.from(game.players.values())
                .map(p => `${p.isAlive ? '🟢' : '💀'} <@${p.id}>`)
                .join('\n');
                
            if (game.status === 'pending') {
                 playerList = Array.from(game.players.values()).map(p => `• <@${p.id}>`).join('\n');
            }

            const infoEmbed = new EmbedBuilder()
                .setTitle('✨ Trạng thái Game Ma Sói')
                .setColor('#2ECC71')
                .addFields(
                    { name: 'Kênh Game', value: `<#${game.channelId}>`, inline: true },
                    { name: 'Host', value: `<@${game.gameMaster}>`, inline: true },
                    { name: 'Chế độ', value: game.mode ? game.mode.toUpperCase() : 'N/A', inline: true },
                    { name: 'Vòng đấu', value: game.day === 0 ? 'Đang chờ' : (game.status === 'night' ? `Đêm thứ ${game.day}` : `Ngày thứ ${game.day}`), inline: true },
                    { name: 'Trạng thái', value: game.status.toUpperCase(), inline: true },
                    { name: 'Người chơi', value: game.status === 'pending' ? `${game.players.size}/${game.neededPlayers} người` : `Còn sống: ${Array.from(game.players.values()).filter(p => p.isAlive).length}/${game.players.size}`, inline: true },
                    { name: 'Danh sách', value: playerList, inline: false }
                );
            return interaction.editReply({ embeds: [infoEmbed], content: ' ' });

        // --- Xử lý CHECK (Đơn giản hóa) ---
        } else if (subcommand === "check") {
            const allGames = Array.from(activeWerewolfGames.entries());
            if (allGames.length === 0) {
                return interaction.editReply({ content: "✅ Hiện không có game Ma Sói nào đang hoạt động trong server này." });
            }

            const checkEmbed = new EmbedBuilder()
                .setTitle('📊 Trạng thái Game Ma Sói trong Server')
                .setColor('#3498DB');

            const gameList = allGames.map(([id, g]) => 
                `**<#${id}>** - Trạng thái: **${g.status.toUpperCase()}** (Host: <@${g.gameMaster}>). ${g.day > 0 ? `Vòng ${g.day}` : ''}`
            ).join('\n');
            
            checkEmbed.setDescription(gameList);
            return interaction.editReply({ embeds: [checkEmbed], content: ' ' });

        } else {
            // Lệnh con không hợp lệ
            return interaction.editReply({ content: "Lệnh con không hợp lệ. Dùng `/masoi help` để xem cú pháp." });
        }
    },

    // ... (phần component interaction handler)
};