const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require('fs');
const path = require('path');
// MASOI config file sits under the project's `data/` directory
const MASOI_CFG = path.resolve(__dirname, '../data/masoi-channel.json');

// Hàm đọc cấu hình kênh Ma Sói (per-guild)
function loadMasoiConfig(guildId) {
    try {
        if (!guildId) return null;
        if (fs.existsSync(MASOI_CFG)) {
            const all = JSON.parse(fs.readFileSync(MASOI_CFG, 'utf8')) || {};
            return all[guildId] || null;
        }
    } catch (e) {
        console.error('Error reading masoi config', e);
    }
    return null;
}

// Giả định các module này đã tồn tại và đúng
const { activeWerewolfGames } = require("../../utils/activeWerewolfGames.js"); 
// Import TẤT CẢ hàm cần thiết từ logic file
const { 
    assignRoles, 
    handleNightActions, // Không dùng trực tiếp, thay bằng processNightResults
    checkWinCondition, 
    ROLES,
    advanceToNight,
    processDayVote, 
    processMayorDecision,
    // GIẢ LẬP: Thêm hàm xử lý kết quả đêm (cần thiết cho Night Action hoàn tất)
    processNightResults // Đảm bảo hàm này được export từ werewolfLogic.js
} = require("../../utils/werewolfLogic.js"); 

// Giả lập danh sách MODE GAME (theo yêu cầu)
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
        .setName("masoi")
        .setDescription("Bắt đầu, tham gia và quản lý trò chơi Ma Sói.")
        // Note: options for creating a game live under the `create` subcommand.
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Tạo game Ma Sói mới với chế độ và số người chơi cụ thể.")
                .addStringOption(option =>
                    option.setName("mode")
                        .setDescription("Chế độ chơi (classic, quick, turbo, chaos, custom).")
                        .setRequired(true)
                        .addChoices(
                            { name: 'Classic (Cổ điển)', value: 'classic' },
                            { name: 'Quick (Nhanh)', value: 'quick' },
                            { name: 'Turbo (Siêu nhanh)', value: 'turbo' },
                            { name: 'Chaos (Hỗn loạn)', value: 'chaos' },
                            { name: 'Custom (Tùy chỉnh)', value: 'custom' },
                        )
                )
                .addIntegerOption(option =>
                    option.setName("players")
                        .setDescription("Tổng số người chơi (từ 8-16) để chia vai cơ bản.")
                        .setRequired(true)
                        .setMinValue(5)
                        .setMaxValue(16)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Dừng game hiện tại trong kênh (chỉ host hoặc admin).')
        )
        // Lệnh xem thông tin game đang chạy trong kênh
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Xem thông tin chi tiết về game đang hoạt động.")
        )
        // Lệnh xem vai trò
        .addSubcommand(subcommand =>
            subcommand
                .setName("roles")
                .setDescription("Xem danh sách và mô tả các vai trò.")
                .addStringOption(option =>
                    option.setName("category")
                        .setDescription("Lọc theo phe (villager/werewolf) hoặc xem tất cả.")
                        .setRequired(false)
                        .addChoices(
                            { name: 'Dân Làng (Villager)', value: 'Villager' },
                            { name: 'Ma Sói (Werewolf)', value: 'Werewolf' },
                            { name: 'Tất cả (All)', value: 'All' },
                        )
                )
        )
        // Lệnh xem hướng dẫn chung
        
        // Lệnh kiểm tra game active trong server
        .addSubcommand(subcommand =>
            subcommand
                .setName("check")
                .setDescription("Kiểm tra trạng thái game Ma Sói đang hoạt động trong server.")
        ),

    // Logic xử lý lệnh Slash Command
    async execute(interaction, client, gameStates) {
        
        // Defer trước để tránh timeout
        await interaction.deferReply({ ephemeral: false });

        const cfgChannelId = loadMasoiConfig(interaction.guildId);
        if (cfgChannelId && cfgChannelId !== interaction.channel.id) {
            return interaction.editReply({ content: `❌ Bot Ma Sói hiện chỉ hoạt động trên kênh <#${cfgChannelId}>. Dùng lệnh "/masoik" (quyền Manage Guild) để cập nhật kênh cho server này.` });
        }
        
        let subcommand = null;
        try {
            subcommand = interaction.options.getSubcommand();
        } catch (e) {
            subcommand = null; // no subcommand used
        }

        // Support root invocation: `/masoi <mode> <players>` as shorthand for create
        const rootMode = interaction.options.getString('mode');
        const rootPlayers = interaction.options.getInteger('players');
        if (!subcommand && rootMode) {
            subcommand = 'create';
            // emulate options inside create
            interaction.options._tempRootMode = rootMode;
            interaction.options._tempRootPlayers = rootPlayers;
        }
        const channelId = interaction.channel.id;
        let game = activeWerewolfGames.get(channelId);

        

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

            return interaction.editReply({ embeds: [embed] });
        }


        // --- Xử lý CREATE (trước đây là start) ---
        if (subcommand === "create") {
            if (game && game.status !== 'finished') {
                return interaction.editReply({ content: "❌ Một trò chơi Ma Sói đang diễn ra hoặc đang chờ trong kênh này!" });
            }

            const numPlayers = interaction.options._tempRootPlayers || interaction.options.getInteger("players");
            const mode = interaction.options._tempRootMode || interaction.options.getString("mode");

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
                dayVoteCounts: {}, // Thêm lại để đồng bộ
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('masoi_join').setLabel('Tham gia').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('masoi_leave').setLabel('Rời game').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('masoi_start').setLabel('Bắt đầu').setStyle(ButtonStyle.Primary).setDisabled(game.players.size < 5), // Disable nếu chưa đủ 5
                new ButtonBuilder().setCustomId('masoi_cancel').setLabel('Hủy game').setStyle(ButtonStyle.Secondary),
            );

            // Gửi tin nhắn Lobby không ephemeral
            const lobbyMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
            game.lobbyMessageId = lobbyMsg.id;

            // Chỉnh sửa tin nhắn defer ban đầu
            return interaction.editReply({ content: `📣 **Trò chơi Ma Sói đã mở đăng ký!** Lobby tạo tại <#${interaction.channel.id}>`, embeds: [] });
            
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
            return interaction.editReply({ embeds: [infoEmbed] });

        // --- Xử lý CHECK (Đơn giản hóa) ---
        } else if (subcommand === "check") {
            // Lọc chỉ những game đang hoạt động trong server hiện tại
            const allGames = Array.from(activeWerewolfGames.entries())
                .filter(([, g]) => interaction.guild.channels.cache.get(g.channelId)?.guildId === interaction.guildId); 

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
            return interaction.editReply({ embeds: [checkEmbed] });

        } else if (subcommand === 'stop') {
            // Stop/force end game in this channel
            if (!game) return interaction.editReply({ content: '❌ Không có game nào đang chạy trong kênh này.' });
            const isHost = game.gameMaster === interaction.user.id;
            // Kiểm tra quyền 'ManageGuild' (Admin/Moderator)
            const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild); 
            if (!isHost && !isAdmin) return interaction.editReply({ content: '❌ Chỉ host hoặc admin mới có thể dừng game.' });

            // Unlock channel and remove game
            try {
                const channel = await client.channels.fetch(game.channelId);
                // Giả định channel.guild.roles.everyone tồn tại
                if (channel && channel.guild && channel.guild.roles.everyone) { 
                    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: null }).catch(()=>{}); // Đặt lại về mặc định
                }
            } catch (e) { console.error('Lỗi khi mở khóa kênh khi dừng game:', e); }

            activeWerewolfGames.delete(game.channelId);
            return interaction.editReply({ content: '✅ Game Ma Sói đã bị dừng bởi host/admin.' });

        } else {
            // Lệnh con không hợp lệ
            return interaction.editReply({ content: "Lệnh con không hợp lệ. Dùng `/masoi roles` để xem danh sách vai trò." });
        }
    },

    // Component interaction handler for buttons/selects 
    async component(interaction, client, gameStates) {
        
        await interaction.deferUpdate().catch(() => {}); // Defer tất cả component interaction
        // Chỉ xử lý các tương tác đến từ game Ma Sói
        if (!interaction.customId?.startsWith('masoi_')) return;

        const customId = interaction.customId || '';
        const parts = customId.split('_');
        const action = parts[1]; // join, leave, start, cancel, day, action (night), mayor

        const channelId = interaction.channel ? interaction.channel.id : null;
        let game = activeWerewolfGames.get(channelId);

        // Trường hợp đặc biệt: Night action/Mayor decision được gửi qua DM hoặc có channelId trong customId
        if (!game && (action === 'action' || action === 'mayor')) {
             // Lấy channelId từ customId cho night action (parts[2]) hoặc mayor decision (parts[2])
             const targetChannelId = parts[2];
             game = activeWerewolfGames.get(targetChannelId);
        } else if (!game && action === 'day') {
             // Day vote luôn ở kênh game (nếu interaction.channel không phải DM)
             game = activeWerewolfGames.get(channelId);
        }

        if (!game && action !== 'cancel') {
            return interaction.followUp({ content: '❌ Game đã kết thúc hoặc không còn tồn tại.', ephemeral: true });
        }


        // Helper to rebuild a lobby embed
        function buildLobbyEmbed(game, originalEmbed) {
            const embed = new EmbedBuilder();
            // Cố gắng giữ lại title/color gốc
            if (originalEmbed) { 
                if (originalEmbed.title) embed.setTitle(originalEmbed.title);
                if (originalEmbed.color) embed.setColor(originalEmbed.color);
            } else {
                embed.setTitle(`🔮 Phòng chờ Ma Sói [${game.mode ? game.mode.toUpperCase() : 'N/A'}]`);
                embed.setColor('#5865F2');
            }
            const players = Array.from(game.players.values()).map(p => `• <@${p.id}>`).join('\n') || 'Chưa có người chơi.';
            embed.setDescription(`**Host:** <@${game.gameMaster}>\n**Chế độ:** ${GAME_MODES.find(m => m.name === game.mode)?.description || game.mode}\n**Số người cần:** **${game.players.size}/${game.neededPlayers}** người\n\n**Danh sách người chơi:**\n${players}`);
            return embed;
        }

        // --- HÀNH ĐỘNG PHÒNG CHỜ ---
        
        // JOIN
        if (action === 'join') {
            if (game.status !== 'pending') return interaction.reply({ content: '❌ Game đã bắt đầu, không thể tham gia.', ephemeral: true }).catch(()=>{});
            if (game.players.has(interaction.user.id)) return interaction.reply({ content: 'Bạn đã ở trong phòng này rồi.', ephemeral: true }).catch(()=>{});
            if (game.players.size >= game.neededPlayers) return interaction.reply({ content: '❌ Phòng đã đầy!', ephemeral: true }).catch(()=>{});

            // Acknowledge then update lobby message
            await interaction.deferUpdate().catch(()=>{});

            game.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true });
            
            const origEmbed = interaction.message.embeds[0];
            const newEmbed = buildLobbyEmbed(game, origEmbed);

            const components = interaction.message.components.map(row => {
                 const r = row.toJSON();
                 r.components = r.components.map(c => {
                     if (c.custom_id === 'masoi_start') {
                         return { ...c, disabled: game.players.size < 8 };
                     }
                     return c;
                 });
                 return r;
            });

            await interaction.message.edit({ embeds: [newEmbed], components: components }).catch(()=>{});
            
            // Gửi tin nhắn thông báo thay vì followUp ephemeral
            return interaction.channel.send(`**${interaction.user.username}** đã tham gia! Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`).catch(()=>{});
        }

        // LEAVE
        if (action === 'leave') {
            if (!game.players.has(interaction.user.id)) return interaction.reply({ content: 'Bạn không ở trong phòng này.', ephemeral: true }).catch(()=>{});
            await interaction.deferUpdate().catch(()=>{});
            const isHost = game.gameMaster === interaction.user.id;
            game.players.delete(interaction.user.id);

            if (game.players.size === 0) {
                 activeWerewolfGames.delete(game.channelId);
                 return interaction.message.edit({ content: '**Phòng chờ đã bị xóa vì không còn ai.**', embeds: [], components: [] }).catch(()=>{});
            }

            if (isHost) {
                const newHostId = Array.from(game.players.keys())[0];
                game.gameMaster = newHostId;
                interaction.channel.send(`👑 **${interaction.user.username}** đã rời. Host mới là <@${newHostId}>.`).catch(()=>{});
            }

            const origEmbed = interaction.message.embeds[0];
            const newEmbed = buildLobbyEmbed(game, origEmbed);
            
            const components = interaction.message.components.map(row => {
                 const r = row.toJSON();
                 r.components = r.components.map(c => {
                     const cid = c.custom_id || c.customId || c.custom_id;
                     if (cid === 'masoi_start') {
                         return { ...c, disabled: game.players.size < 8 };
                     }
                     return c;
                 });
                 return r;
            });

            await interaction.message.edit({ embeds: [newEmbed], components: components }).catch(()=>{});

            return interaction.channel.send(`**${interaction.user.username}** đã rời game. Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`).catch(()=>{});
        }

        // START (Chuyển từ lobby sang game)
        if (action === 'start') {
            if (game.gameMaster !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ host mới có thể bắt đầu game.', ephemeral: true }).catch(()=>{});
            if (game.players.size < 5) return interaction.reply({ content: `❌ Cần ít nhất 5 người để bắt đầu. Hiện tại: ${game.players.size} người.`, ephemeral: true }).catch(()=>{});

            // Acknowledge then send DMs
            await interaction.deferUpdate().catch(()=>{});

            // Sử dụng hàm assignRoles từ werewolfLogic để xử lý việc chia vai
            const rolesAssigned = assignRoles(game);
            
            game.status = 'night'; // Cập nhật status
            game.day = 1; // Bắt đầu từ đêm 1

            // Gửi DM vai trò
            for (const [userId, roleKey] of game.roles.entries()) {
                const role = ROLES[roleKey] || { name: 'Vai trò ẩn', description: '' };
                try {
                    const user = await client.users.fetch(userId);
                    await user.send(`🎭 **Vai trò của bạn là: ${role.name}**!\n- Mô tả: ${role.description}`);
                } catch (err) {
                    console.error('Không gửi được DM vai trò:', err);
                }
            }
            
            // Khóa/Cập nhật tin nhắn lobby
            const disabledComponents = interaction.message.components.map(row => {
                const r = row.toJSON();
                r.components = r.components.map(c => ({ ...c, disabled: true }));
                return r;
            });
            await interaction.message.edit({ 
                content: '✨ **ĐỦ NGƯỜI! Trò chơi bắt đầu!**', 
                embeds: [], 
                components: disabledComponents 
            }).catch(()=>{});

            // Gọi hàm chuyển đêm (đã bao gồm khóa kênh và gửi DM hành động)
            await advanceToNight(game, client); 
            return;
        }

        // CANCEL
        if (action === 'cancel') {
             if (!game) {
                 await interaction.deferUpdate().catch(()=>{});
                 return interaction.message.edit({ content: '**Tin nhắn này đã hết hạn.**', embeds: [], components: [] }).catch(()=>{});
             }
             if (game.gameMaster !== interaction.user.id) return interaction.reply({ content: 'Chỉ host có thể hủy game.', ephemeral: true }).catch(()=>{});
             
             activeWerewolfGames.delete(game.channelId);
             
             // Mở lại kênh nếu nó đang bị khóa
             if (game.status !== 'pending') {
                  try {
                      const channel = await client.channels.fetch(game.channelId);
                      // Đặt lại về mặc định
                      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: null }).catch(()=>{}); 
                  } catch (err) {
                       console.error('Lỗi khi mở khóa kênh:', err);
                  }
             }

             return interaction.message.edit({ content: '**Trò chơi đã bị hủy bởi host.**', embeds: [], components: [] }).catch(()=>{});
        }
        
        // --- HÀNH ĐỘNG ĐÊM (SELECT MENU) ---
        if (action === 'action') {
            // parts: [ 'masoi', 'action', '<channelId>', '<ROLE>' ]
            const targetChannelId = parts[2];
            const roleKey = parts[3];
              const selected = interaction.values && interaction.values[0]; 

              if (!targetChannelId || !roleKey || !selected) return interaction.reply({ content: '❌ Lựa chọn không hợp lệ.', ephemeral: true }).catch(()=>{});

              const targetGame = game; // Đã được gán ở trên (lấy từ targetChannelId)
              if (!targetGame || targetGame.status !== 'night') return interaction.reply({ content: '❌ Game không còn tồn tại hoặc đang không phải Đêm.', ephemeral: true }).catch(()=>{});

              if (targetGame.roles.get(interaction.user.id) !== roleKey) {
                  return interaction.reply({ content: '❌ Bạn không có vai trò này hoặc không được phép hành động lúc này.', ephemeral: true }).catch(()=>{});
              }
              if (!targetGame.players.get(interaction.user.id)?.isAlive) {
                  return interaction.reply({ content: '❌ Người chết không thể hành động!', ephemeral: true }).catch(()=>{});
              }

            // Xử lý cấm bảo vệ liên tiếp (Bodyguard)
            if (roleKey === 'BODYGUARD' && targetGame.lastProtectedId === selected) {
                return interaction.followUp({ content: '❌ Bạn không thể bảo vệ người này hai đêm liên tiếp!', ephemeral: true });
            }


            // store night action
            targetGame.nightActions.set(roleKey, { targetId: selected, performerId: interaction.user.id });
            await interaction.editReply({ content: `✅ Bạn đã chọn <@${selected}> cho vai **${ROLES[roleKey]?.name || roleKey}**. Hành động đêm của bạn đã được ghi nhận.`, components: [] });
            
            // Kích hoạt chuyển ngày (Nếu tất cả đã xong)
            const rolesThatAct = Array.from(targetGame.roles.entries())
                .filter(([, roleKey]) => ROLES[roleKey]?.nightAbility)
                .map(([userId,]) => userId)
                .filter(userId => targetGame.players.get(userId)?.isAlive);
                
            // Kiểm tra xem số hành động đã ghi nhận có bằng số vai trò còn sống cần hành động không
            if (targetGame.nightActions.size >= rolesThatAct.length) {
                const channel = await client.channels.fetch(targetGame.channelId);
                await channel.send("😴 **Tất cả vai trò đã hoàn thành hành động đêm!** Đang chuyển sang ngày...").catch(()=>{});
                 // Đợi một chút để người chơi nhận thông báo xác nhận
                 await new Promise(resolve => setTimeout(resolve, 3000)); 
                 // Chạy logic kết quả đêm và chuyển sang ngày mới
                 // ĐẢM BẢO `processNightResults` được export và hoạt động đúng
                 require("../../utils/werewolfLogic.js").processNightResults(targetGame, client);
            }
            return;
        }

        // --- HÀNH ĐỘNG NGÀY (DAY VOTE BUTTON) ---
        if (action === 'day') {
            // parts: [ 'masoi', 'day', 'vote', '<targetId>' ] 
            const voterId = interaction.user.id;
            // Two possible vote inputs:
            // 1) button per target: customId = masoi_day_vote_<targetId>
            // 2) select menu: customId = masoi_day_vote_select with interaction.values[0] = targetId
            let targetId = parts[3];

            // if select menu id
            if (customId === 'masoi_day_vote_select') {
                targetId = interaction.values && interaction.values[0];
            }

            if (!game || game.status !== 'day') return interaction.reply({ content: '❌ Hiện đang không phải thời gian bỏ phiếu.', ephemeral: true }).catch(()=>{});

            if (!targetId) return interaction.reply({ content: '❌ Bạn chưa chọn mục tiêu.', ephemeral: true }).catch(()=>{});

            // Delegate to processDayVote (it will reply ephemeral)
            await processDayVote(game, voterId, targetId, client, interaction);
            return;
        }
        
        // --- HÀNH ĐỘNG THỊ TRƯỞNG (MAYOR TIE BREAKER BUTTON) ---
        if (action === 'mayor') {
             // parts: [ 'masoi', 'mayor', '<channelId>', '<hangedId>' ]
             const targetChannelId = parts[2]; // Lấy channelId từ customId
             const hangedId = parts[3];        // Lấy người bị Thị Trưởng chọn treo cổ
             const mayorId = interaction.user.id;
             
             // Phải là Thị Trưởng và còn sống
             if (game.roles.get(mayorId) !== 'MAYOR' || !game.players.get(mayorId)?.isAlive) {
                 return interaction.followUp({ content: '❌ Bạn không phải là Thị Trưởng hoặc không có quyền quyết định lúc này.', ephemeral: true });
             }
             
             // Kiểm tra tính hợp lệ của message
             if (interaction.message.id !== game.tieBreakerMessageId) {
                 return interaction.followUp({ content: '❌ Tin nhắn quyết định này đã hết hạn hoặc không hợp lệ.', ephemeral: true });
             }
             
             // Xử lý quyết định của Thị Trưởng
             await processMayorDecision(game, hangedId, client, interaction);
             return;
        }


        // default: unknown action
        return interaction.followUp({ content: '❌ Tác vụ không được nhận diện.', ephemeral: true });
    }
};