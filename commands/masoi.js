// commands/masoi.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { activeWerewolfGames } = require("../utils/activeWerewolfGames.js"); // GIỮ LẠI DÒNG NÀY
const { 
    assignRoles, 
    handleNightActions, 
    checkWinCondition, 
    ROLES,
    advanceToNight 
} = require("../utils/werewolfLogic.js"); 
// ĐÃ XÓA DÒNG require("../data/activeWerewolfGames.js") LẶP LẠI Ở ĐÂY
module.exports = {
// ... (phần còn lại của code)
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
        // Bổ sung lệnh Guide (Hướng dẫn)
        .addSubcommand(subcommand =>
            subcommand
                .setName("guide")
                .setDescription("Xem luật chơi, mục tiêu và các vai trò cơ bản.")
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;
        let game = activeWerewolfGames.get(channelId);

        // --- Xử lý GUIDE ---
// --- Xử lý GUIDE ---
        if (subcommand === "guide") {
             const guideMessage = `
                ### 🐺 Hướng Dẫn Chơi Ma Sói Cơ Bản 🌙
                
                **Mục tiêu:**
                * **Phe Dân Làng:** Loại bỏ TẤT CẢ Ma Sói.
                * **Phe Ma Sói:** Đạt số lượng bằng hoặc nhiều hơn Dân Làng.

                **Các Vòng Lặp:**
                1.  **Đêm:** Ma Sói và các vai trò đặc biệt thực hiện năng lực bí mật qua DM của Bot. Kênh chung bị khóa.
                2.  **Ngày:** Bot thông báo nạn nhân (nếu có). Tất cả thảo luận và dùng lệnh \`/masoi vote @người_chơi\` để treo cổ người bị nghi ngờ.

                **Vai trò Cơ bản:**
                ${Object.entries(ROLES).map(([key, role]) => 
                    // Lặp qua các vai trò được định nghĩa và hiển thị
                    `**[${role.name}]** (${role.team === 'Werewolf' ? 'Ma Sói' : 'Dân Làng'}): ${role.description}`
                ).join('\n')}
                
                // ... các lệnh chính
            `;
            return interaction.reply({ content: guideMessage, ephemeral: false }); 
        }

        // --- Xử lý START ---
        if (subcommand === "start") {
            if (game && game.status !== 'finished') {
                return interaction.reply({ content: "❌ Một trò chơi Ma Sói đang diễn ra hoặc đang chờ trong kênh này!", ephemeral: true });
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

            return interaction.reply({
                content:
                    `📣 **Trò chơi Ma Sói đã mở đăng ký!**\n` +
                    `Số người chơi cần: **${numPlayers}**\n\n` +
                    `👉 Gõ **/masoi join** để tham gia.\n` +
                    `**Hiện tại: ${game.players.size}/${numPlayers} người.**`,
            });
            
        // --- Xử lý JOIN ---
        } else if (subcommand === "join") {
            if (!game || game.status !== 'pending') {
                return interaction.reply({ content: "❌ Hiện không có trò chơi Ma Sói nào đang chờ đăng ký.", ephemeral: true });
            }
            if (game.players.has(interaction.user.id)) {
                return interaction.reply({ content: "Bạn đã tham gia rồi!", ephemeral: true });
            }

            game.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isAlive: true });

            await interaction.reply({ content: `✅ Bạn đã tham gia trò chơi!`, ephemeral: true });
            
            return interaction.channel.send(`**${interaction.user.username}** đã tham gia! Hiện tại: **${game.players.size}/${game.neededPlayers}** người.`);

        // --- Xử lý READY (Bắt đầu Game) ---
        } else if (subcommand === "ready") {
            if (!game || game.status !== 'pending' || game.gameMaster !== interaction.user.id) {
                return interaction.reply({ content: "❌ Bạn không phải quản trò hoặc game chưa sẵn sàng.", ephemeral: true });
            }

            // 1. Chia vai trò
            const rolesAssigned = assignRoles(game); 
            
            if (!rolesAssigned) {
                 return interaction.reply({ content: `❌ Cần ít nhất 8 người để bắt đầu. Hiện tại: ${game.players.size} người.`, ephemeral: true });
            }
            
            // 2. Gửi DM vai trò cho từng người
            for (const [userId, roleKey] of game.roles.entries()) {
                const role = ROLES[roleKey] || { name: 'Vai trò ẩn' }; 
                const user = await client.users.fetch(userId);
                await user.send(`🎭 **Vai trò của bạn là: ${role.name}**!\n- Mô tả: ${role.description}`);
            }

            // 3. Chuyển sang Đêm đầu tiên
            game.status = 'night';
            game.day = 1;
            
            // 4. Khóa kênh và thông báo
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
            });
            
            await interaction.reply({ 
                content: "✨ **ĐỦ NGƯỜI! Trò chơi bắt đầu!**\n" +
                         "🌑 **ĐÊM THỨ NHẤT** đã đến. Kênh chat đã bị khóa. Kiểm tra tin nhắn riêng tư (DM) với Bot để biết vai trò và thực hiện hành động đêm của bạn!",
            });
            
            // 5. Kích hoạt logic hành động đêm
            handleNightActions(game, client); 

        // --- Xử lý VOTE (Ban Ngày) ---
        } else if (subcommand === "vote") {
            if (!game || game.status !== 'day') {
                return interaction.reply({ content: "❌ Hiện đang không phải thời gian bỏ phiếu (Đang Đêm hoặc game chưa bắt đầu).", ephemeral: true });
            }

            const targetUser = interaction.options.getUser("muc_tieu");
            const voterId = interaction.user.id;

            // Kiểm tra tính hợp lệ
            if (!game.players.has(targetUser.id) || !game.players.get(targetUser.id)?.isAlive) {
                return interaction.reply({ content: "❌ Người chơi này không hợp lệ hoặc đã chết.", ephemeral: true });
            }
            if (!game.players.get(voterId)?.isAlive) {
                return interaction.reply({ content: "❌ Người chết không được bỏ phiếu!", ephemeral: true });
            }
            if (targetUser.id === voterId) {
                return interaction.reply({ content: "❌ Bạn không thể tự bỏ phiếu treo cổ mình!", ephemeral: true });
            }

            // Lưu phiếu bầu
            game.dayVotes.set(voterId, targetUser.id);
            
            // Đếm phiếu
            const voteCounts = {};
            for (const targetId of game.dayVotes.values()) {
                voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
            }

            // Gửi thông báo
            await interaction.reply({ content: `✅ Bạn đã bỏ phiếu treo cổ **${targetUser.username}**.`, ephemeral: true });
            
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
                await interaction.channel.send(`Phiếu bầu cho **${targetUser.username}**: **${voteCounts[targetUser.id]}**/${neededVotes} phiếu.`);
            }
        } else {
            return interaction.reply({ content: "Lệnh không hợp lệ.", ephemeral: true });
        }
    }
};