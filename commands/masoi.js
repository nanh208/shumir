const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const MASOI_CFG = path.resolve(__dirname, '../../data/masoi-channel.json');

// Hàm đọc cấu hình kênh Ma Sói
function loadMasoiConfig() {
    try {
        if (fs.existsSync(MASOI_CFG)) return JSON.parse(fs.readFileSync(MASOI_CFG, 'utf8'));
    } catch (e) { 
        console.error('Error reading masoi config', e); 
    }
    return { channelId: null };
}

// Giả định các module này đã tồn tại và đúng
const { activeWerewolfGames } = require("../utils/activeWerewolfGames.js"); 
const { 
    assignRoles, 
    handleNightActions, 
    checkWinCondition, 
    ROLES,
    advanceToNight 
} = require("../utils/werewolfLogic.js"); 

module.exports = {
    // Định nghĩa Slash Command
    data: new SlashCommandBuilder()
        .setName("masoi")
        .setDescription("Bắt đầu, tham gia và quản lý trò chơi Ma Sói.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Bắt đầu đăng ký người chơi cho Ma Sói.")
                .addIntegerOption(option =>
                    option.setName("so_luong")
                        .setDescription("Tổng số người chơi (từ 8-16) để chia vai cơ bản.")
                        .setRequired(true)
                        .setMinValue(8)
                        .setMaxValue(16)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("join")
                .setDescription("Tham gia trò chơi Ma Sói đang chờ.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("ready")
                .setDescription("Quản trò thông báo đủ người và bắt đầu chia vai (chỉ dành cho người bắt đầu game).")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("vote")
                .setDescription("Bỏ phiếu treo cổ một người chơi (chỉ trong Ngày).")
                .addUserOption(option =>
                    option.setName("muc_tieu")
                        .setDescription("Người chơi bạn muốn treo cổ.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("guide")
                .setDescription("Xem luật chơi, mục tiêu và các vai trò cơ bản.")
        ),

    // Logic xử lý lệnh Slash Command
    async execute(interaction, client) {
        // Defer reply immediately to prevent interaction timeout, using ephemeral for initial status messages
        await interaction.deferReply({ ephemeral: true }); 

        // enforce single active channel if configured
        const cfg = loadMasoiConfig();
        if (cfg.channelId && cfg.channelId !== interaction.channel.id) {
            return interaction.editReply({ content: `❌ Bot Ma Sói hiện chỉ hoạt động trên kênh <#${cfg.channelId}>. Dùng lệnh "/masoik" (quyền Manage Guild) để cập nhật kênh.` });
        }
        
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;
        let game = activeWerewolfGames.get(channelId);

        // --- Xử lý GUIDE ---
        if (subcommand === "guide") {
            const roleDescriptions = Object.entries(ROLES).map(([key, role]) => 
                `**[${role.name}]** (${role.team === 'Werewolf' ? 'Ma Sói' : 'Dân Làng'}): ${role.description}`
            ).join('\n');

            const guideMessage = `
                ### 🐺 Hướng Dẫn Chơi Ma Sói Cơ Bản 🌙
                
                **Mục tiêu:**
                * **Phe Dân Làng:** Loại bỏ TẤT CẢ Ma Sói.
                * **Phe Ma Sói:** Đạt số lượng bằng hoặc nhiều hơn Dân Làng.

                **Các Vòng Lặp:**
                1.  **Đêm:** Ma Sói và các vai trò đặc biệt thực hiện năng lực bí mật qua DM của Bot. Kênh chung bị khóa.
                2.  **Ngày:** Bot thông báo nạn nhân (nếu có). Tất cả thảo luận và dùng lệnh \`/masoi vote @người_chơi\` để treo cổ người bị nghi ngờ.

                **Vai trò Cơ bản:**
                ${roleDescriptions}
                
                **Các Lệnh Chính:**
                * \`/masoi start <số_lượng>\`: Bắt đầu đăng ký game mới.
                * \`/masoi join\`: Tham gia phòng chờ.
                * \`/masoi ready\`: Bắt đầu game (chỉ Host).
                * \`/masoi vote <@người_chơi>\`: Bỏ phiếu treo cổ (chỉ ban ngày).
            `;
            return interaction.editReply({ content: guideMessage }); 
        }

        // --- Xử lý START ---
        if (subcommand === "start") {
            if (game && game.status !== 'finished') {
                return interaction.editReply({ content: "❌ Một trò chơi Ma Sói đang diễn ra hoặc đang chờ trong kênh này!" });
            }

            const numPlayers = interaction.options.getInteger("so_luong");

            // Khởi tạo trạng thái game
            game = {
                status: 'pending', 
                neededPlayers: numPlayers,
                channelId: channelId,
                players: new Map([[interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true }]]), 
                roles: new Map(), 
                gameMaster: interaction.user.id,
                day: 0,
                nightActions: new Map(), 
                dayVotes: new Map(),
            };
            activeWerewolfGames.set(channelId, game);

            // Build lobby embed + buttons
            const embed = new EmbedBuilder()
                .setTitle('🔮 Phòng chờ Ma Sói')
                .setDescription(`**Host:** <@${interaction.user.id}>\n**Số người cần:** **${numPlayers}**\n\n**Danh sách người chơi:**\n• <@${interaction.user.id}>`)
                .setColor('#5865F2');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('masoi_join').setLabel('Tham gia').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('masoi_leave').setLabel('Rời game').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('masoi_start').setLabel('Bắt đầu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('masoi_cancel').setLabel('Hủy game').setStyle(ButtonStyle.Secondary),
            );

            // Gửi tin nhắn Lobby không ephemeral
            const lobbyMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
            game.lobbyMessageId = lobbyMsg.id;

            // Chỉnh sửa tin nhắn defer ban đầu (ephemeral)
            return interaction.editReply({ content: `📣 **Trò chơi Ma Sói đã mở đăng ký!** Lobby tạo tại <#${interaction.channel.id}>`, embeds: [] });
            
        // --- Xử lý JOIN ---
        } else if (subcommand === "join") {
            if (!game || game.status !== 'pending') {
                return interaction.editReply({ content: "❌ Hiện không có trò chơi Ma Sói nào đang chờ đăng ký." });
            }
            if (game.players.has(interaction.user.id)) {
                return interaction.editReply({ content: "Bạn đã tham gia rồi!" });
            }

            game.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true });

            await interaction.editReply({ content: `✅ Bạn đã tham gia trò chơi!` });
            
            // Send public announcement
            return interaction.channel.send(`**${interaction.user.username}** đã tham gia! Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`);

        // --- Xử lý READY (Bắt đầu Game) ---
        } else if (subcommand === "ready") {
            if (!game || game.status !== 'pending' || game.gameMaster !== interaction.user.id) {
                return interaction.editReply({ content: "❌ Bạn không phải quản trò hoặc game chưa sẵn sàng." });
            }

            // 1. Chia vai trò
            const rolesAssigned = assignRoles(game); 
            
            if (!rolesAssigned) {
                return interaction.editReply({ content: `❌ Cần ít nhất 8 người để bắt đầu. Hiện tại: ${game.players.size} người.` });
            }
            
            // 2. Gửi DM vai trò cho từng người
            for (const [userId, roleKey] of game.roles.entries()) {
                const role = ROLES[roleKey] || { name: 'Vai trò ẩn', description: '' }; 
                try {
                    const user = await client.users.fetch(userId);
                    await user.send(`🎭 **Vai trò của bạn là: ${role.name}**!\n- Mô tả: ${role.description}`);
                } catch (err) {
                    console.error(`Không thể gửi DM vai trò cho ${userId}:`, err);
                }
            }

            // 3. Chuyển sang Đêm đầu tiên
            game.status = 'night';
            game.day = 1;
            
            // 4. Khóa kênh và thông báo
            try {
                // Khóa kênh chat chung
                await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false,
                });

                // Chỉnh sửa tin nhắn lobby thành thông báo bắt đầu
                const lobbyMessage = await interaction.channel.messages.fetch(game.lobbyMessageId);
                const disabledComponents = lobbyMessage.components.map(row => {
                    const r = row.toJSON();
                    r.components = r.components.map(c => ({ ...c, disabled: true }));
                    return r;
                });
                await lobbyMessage.edit({ 
                    content: "✨ **ĐỦ NGƯỜI! Trò chơi bắt đầu!**",
                    embeds: [],
                    components: disabledComponents
                }).catch(()=>{});

                await interaction.channel.send({ content: "🌑 **ĐÊM THỨ NHẤT** đã đến. Kênh chat đã bị khóa. Kiểm tra tin nhắn riêng tư (DM) với Bot để biết vai trò và thực hiện hành động đêm của bạn!" });
            } catch (error) {
                console.error("Lỗi khi khóa kênh hoặc cập nhật tin nhắn lobby:", error);
            }

            // Gửi tin nhắn ephemeral xác nhận
            await interaction.editReply({ content: '✨ Trò chơi đã bắt đầu! Đã gửi vai trò qua DM.' });
            
            // 5. Kích hoạt logic hành động đêm
            handleNightActions(game, client); 

        // --- Xử lý VOTE (Ban Ngày) ---
        } else if (subcommand === "vote") {
            if (!game || game.status !== 'day') {
                return interaction.editReply({ content: "❌ Hiện đang không phải thời gian bỏ phiếu (Đang Đêm hoặc game chưa bắt đầu)." });
            }

            const targetUser = interaction.options.getUser("muc_tieu");
            const voterId = interaction.user.id;

            // Kiểm tra tính hợp lệ
            if (!game.players.has(targetUser.id) || !game.players.get(targetUser.id)?.isAlive) {
                return interaction.editReply({ content: "❌ Người chơi này không hợp lệ hoặc đã chết." });
            }
            if (!game.players.get(voterId)?.isAlive) {
                return interaction.editReply({ content: "❌ Người chết không được bỏ phiếu!" });
            }
            if (targetUser.id === voterId) {
                return interaction.editReply({ content: "❌ Bạn không thể tự bỏ phiếu treo cổ mình!" });
            }

            // Lưu phiếu bầu
            game.dayVotes.set(voterId, targetUser.id);
            
            // Đếm phiếu
            const voteCounts = {};
            for (const targetId of game.dayVotes.values()) {
                voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
            }

            // Gửi thông báo
            await interaction.editReply({ content: `✅ Bạn đã bỏ phiếu treo cổ **${targetUser.username}**.` });
            
            const totalAlive = Array.from(game.players.values()).filter(p => p.isAlive).length;
            const neededVotes = Math.floor(totalAlive / 2) + 1; 

            // Kiểm tra đủ phiếu để treo cổ
            if (voteCounts[targetUser.id] >= neededVotes) {
                
                const hangedId = targetUser.id;
                const hangedRoleKey = game.roles.get(hangedId);
                const hangedRole = ROLES[hangedRoleKey] || { name: 'Vai trò ẩn', team: 'Unknown' };

                game.players.get(hangedId).isAlive = false;
                
                await interaction.channel.send(
                    `🔨 **Đã có đủ ${neededVotes} phiếu!** Người bị treo cổ là **<@${hangedId}>**!\n` +
                    `😭 Họ là **${hangedRole.name}**. ` + 
                    (hangedRole.team === 'Werewolf' ? 'MA SÓI ĐÃ BỊ LOẠI! 🎉' : 'DÂN LÀNG ĐÃ BỊ GIẾT NHẦM! 💔')
                );
                
                // Kiểm tra thắng thua
                if (!checkWinCondition(game, interaction.channel)) {
                    // Nếu game chưa kết thúc, chuyển sang đêm mới
                    await advanceToNight(game, client); 
                }
                
                // Xóa phiếu bầu sau khi treo cổ
                game.dayVotes.clear(); 
                
            } else {
                await interaction.channel.send(`Phiếu bầu cho **${targetUser.username}**: **${voteCounts[targetUser.id] || 0}**/${neededVotes} phiếu. Tổng số phiếu bầu hiện tại: ${game.dayVotes.size}/${totalAlive}`);
            }
        } else {
            return interaction.editReply({ content: "Lệnh con không hợp lệ." });
        }
    },

    // Component interaction handler for buttons/selects (cho các nút Tham gia/Bắt đầu, hoặc Select Menu hành động đêm)
    async component(interaction, client, gameStates) {
        const customId = interaction.customId || '';
        const parts = customId.split('_');
        // expected formats: masoi_join | masoi_leave | masoi_start | masoi_cancel
        // or: masoi_action_<channelId>_<ROLE>
        const action = parts[1];

        const channelId = interaction.channel ? interaction.channel.id : null;
        const game = channelId ? activeWerewolfGames.get(channelId) : null;

        // Helper to rebuild a lobby embed (best-effort)
        function buildLobbyEmbed(game, originalEmbed) {
            const embed = new EmbedBuilder();
            // Try to preserve original title/color
            if (originalEmbed) {
                if (originalEmbed.title) embed.setTitle(originalEmbed.title);
                if (originalEmbed.color) embed.setColor(originalEmbed.color);
            } else {
                embed.setTitle('🔮 Phòng chờ Ma Sói');
                embed.setColor('#5865F2');
            }
            const players = Array.from(game.players.values()).map(p => `• <@${p.id}>`).join('\n') || 'Chưa có người chơi.';
            embed.setDescription(`**Host:** <@${game.gameMaster}>\n**Số người cần:** **${game.players.size}/${game.neededPlayers}** người\n\n**Danh sách người chơi:**\n${players}`);
            return embed;
        }

        // JOIN
        if (action === 'join') {
            if (!game || game.status !== 'pending') {
                return interaction.reply({ content: '❌ Hiện không có phòng chờ để tham gia.', ephemeral: true });
            }
            if (game.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Bạn đã ở trong phòng này rồi.', ephemeral: true });
            }
            if (game.players.size >= game.neededPlayers) {
                return interaction.reply({ content: '❌ Phòng đã đầy!', ephemeral: true });
            }

            game.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true });
            await interaction.deferUpdate(); // Defer để có thể chỉnh sửa tin nhắn gốc
            
            // update original message embed
            const origEmbed = interaction.message.embeds[0];
            const newEmbed = buildLobbyEmbed(game, origEmbed);
            await interaction.message.edit({ embeds: [newEmbed], components: interaction.message.components }).catch(()=>{});
            
            // Thông báo công khai (không cần ephemeral)
            await interaction.channel.send(`**${interaction.user.username}** đã tham gia! Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`).catch(()=>{});
            return;
        }

        // LEAVE
        if (action === 'leave' || action === 'quit') {
            if (!game || !game.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Bạn không ở trong phòng này.', ephemeral: true });
            }
            game.players.delete(interaction.user.id);
            await interaction.deferUpdate();
            
            // update original message embed
            const origEmbed = interaction.message.embeds[0];
            const newEmbed = buildLobbyEmbed(game, origEmbed);
            await interaction.message.edit({ embeds: [newEmbed], components: interaction.message.components }).catch(()=>{});

            await interaction.channel.send(`**${interaction.user.username}** đã rời game. Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`).catch(()=>{});
            return;
        }

        // START (alias for ready)
        if (action === 'start' || action === 'ready') {
            if (!game) return interaction.reply({ content: '❌ Không có game trong kênh.', ephemeral: true });
            if (game.gameMaster !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ host mới có thể bắt đầu game.', ephemeral: true });
            
            const rolesAssigned = assignRoles(game);
            if (!rolesAssigned) return interaction.reply({ content: `❌ Cần ít nhất 8 người để bắt đầu. Hiện tại: ${game.players.size} người.`, ephemeral: true });

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

            // Cập nhật trạng thái game
            game.status = 'night';
            game.day = 1;

            // Khóa kênh và thông báo
            try {
                const channel = await client.channels.fetch(game.channelId);
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
                
                // Cập nhật tin nhắn lobby
                await interaction.deferUpdate();
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

                await channel.send('🌑 **ĐÊM THỨ NHẤT** đã đến. Kênh chat đã bị khóa. Kiểm tra DM để thực hiện hành động đêm của bạn!');
            } catch (err) {
                console.error('Lỗi khi khóa kênh hoặc thông báo bắt đầu:', err);
            }

            handleNightActions(game, client);
            return;
        }

        // CANCEL / STOP
        if (action === 'cancel' || action === 'stop' || action === 'huy') {
            if (!game) return interaction.reply({ content: 'Không có game để hủy.', ephemeral: true });
            if (game.gameMaster !== interaction.user.id) return interaction.reply({ content: 'Chỉ host có thể hủy game.', ephemeral: true });
            activeWerewolfGames.delete(game.channelId);
            
            // Xóa/Vô hiệu hóa tin nhắn lobby
            await interaction.deferUpdate();
            await interaction.message.edit({ content: '**Trò chơi đã bị hủy bởi host.**', embeds: [], components: [] }).catch(()=>{});
            
            // Mở lại kênh nếu nó đang bị khóa (cho trường hợp game đã bắt đầu)
            if (game.status !== 'pending') {
                 try {
                    const channel = await client.channels.fetch(game.channelId);
                    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: true });
                 } catch (err) {
                    console.error('Lỗi khi mở khóa kênh:', err);
                 }
            }

            return;
        }

        // Night action select menus (customId: masoi_action_<channelId>_<ROLE>)
        if (action === 'action') {
            // parts: [ 'masoi', 'action', '<channelId>', '<ROLE>' ]
            const targetChannelId = parts[2];
            const roleKey = parts[3];
            // interaction.values chỉ có cho Select Menu
            const selected = interaction.values && interaction.values[0]; 

            if (!targetChannelId || !roleKey || !selected) {
                return interaction.reply({ content: '❌ Lựa chọn không hợp lệ.', ephemeral: true });
            }
            
            const targetGame = activeWerewolfGames.get(targetChannelId);
            if (!targetGame) return interaction.reply({ content: '❌ Game không còn tồn tại.', ephemeral: true });

            // Kiểm tra người thực hiện hành động có còn sống và có đúng vai trò đó không
            if (targetGame.roles.get(interaction.user.id) !== roleKey) {
                 return interaction.reply({ content: '❌ Bạn không có vai trò này hoặc không được phép hành động lúc này.', ephemeral: true });
            }
            if (!targetGame.players.get(interaction.user.id)?.isAlive) {
                 return interaction.reply({ content: '❌ Người chết không thể hành động!', ephemeral: true });
            }


            // store night action
            targetGame.nightActions.set(roleKey, { targetId: selected, performerId: interaction.user.id });
            await interaction.update({ content: `✅ Bạn đã chọn <@${selected}> cho vai **${ROLES[roleKey]?.name || roleKey}**. Hành động đêm của bạn đã được ghi nhận.`, components: [] });
            
            // Kiểm tra xem tất cả hành động đêm đã hoàn tất chưa
            const rolesThatAct = Object.keys(ROLES).filter(key => ROLES[key].canActAtNight);
            const aliveRolesThatAct = rolesThatAct.filter(key => 
                Array.from(targetGame.roles.entries()).some(([userId, rk]) => 
                    rk === key && targetGame.players.get(userId)?.isAlive
                )
            );
            // Nếu số lượng hành động đã ghi nhận bằng số lượng vai trò còn sống cần hành động, thì chuyển sang ngày
            if (targetGame.nightActions.size >= aliveRolesThatAct.length) {
                // Đợi một chút để người chơi nhận thông báo xác nhận
                await new Promise(resolve => setTimeout(resolve, 3000)); 
                advanceToNight(targetGame, client);
            }
            return;
        }

        // default: unknown action
        return interaction.reply({ content: '❌ Tác vụ không được nhận diện.', ephemeral: true });
    }
};