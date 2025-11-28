// commands/empire/attack.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attack')
        .setDescription('Điều quân tấn công lãnh thổ khác (Cẩn thận, kẻ thua sẽ mất tất cả!)')
        .addIntegerOption(opt => opt.setName('x').setDescription('Tọa độ X').setRequired(true))
        .addIntegerOption(opt => opt.setName('y').setDescription('Tọa độ Y').setRequired(true))
        .addIntegerOption(opt => opt.setName('infantry').setDescription('Số lượng Bộ binh').setMinValue(0))
        .addIntegerOption(opt => opt.setName('archer').setDescription('Số lượng Cung thủ').setMinValue(0))
        .addIntegerOption(opt => opt.setName('cavalry').setDescription('Số lượng Kỵ binh').setMinValue(0)),

    async execute(interaction) {
        const manager = await loadManager();
        const attacker = manager.getPlayer(interaction.user.id);
        
        // 1. Validation người đánh
        if (!attacker) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });
        if (interaction.channelId !== attacker.privateChannelId) return interaction.reply({ content: "Hãy ra lệnh từ Sảnh Chỉ Huy (Kênh riêng)!", ephemeral: true });

        const army = {
            infantry: interaction.options.getInteger('infantry') || 0,
            archer: interaction.options.getInteger('archer') || 0,
            cavalry: interaction.options.getInteger('cavalry') || 0
        };

        if (army.infantry + army.archer + army.cavalry <= 0) {
            return interaction.reply("⛔ Bạn định đi đánh nhau bằng tay không à? Hãy chọn số lượng lính.");
        }

        // Kiểm tra xem có đủ lính không
        if ((attacker.units.infantry || 0) < army.infantry || 
            (attacker.units.archer || 0) < army.archer || 
            (attacker.units.cavalry || 0) < army.cavalry) {
            return interaction.reply("⛔ Bạn không đủ quân trong trại lính!");
        }

        const tx = interaction.options.getInteger('x');
        const ty = interaction.options.getInteger('y');
        const defender = manager.getPlayerAt(tx, ty);

        // Validation mục tiêu
        if (!defender) return interaction.reply("🌫️ Vùng này không có ai sống.");
        if (defender.id === attacker.id) return interaction.reply("⛔ Không thể tự đánh mình.");
        if (defender.age === 1) return interaction.reply("🛡️ Đối thủ đang ở **Kỷ Nguyên Khai Hoang** và được bảo hộ tuyệt đối.");

        // === BẮT ĐẦU XỬ LÝ ===
        // Dùng deferReply vì xử lý DB và gửi nhiều tin nhắn sẽ tốn thời gian
        await interaction.deferReply();

        // 2. Tính toán kết quả trận đấu
        const report = manager.resolveBattle(attacker.id, defender.id, army);

        // 3. XỬ LÝ SỤP ĐỔ (Nếu có)
        // Logic: Nếu thủ thua -> Hàm resolveBattle đã bật cờ isCollapsed -> Ta thực hiện reset ở đây
        if (report.isCollapsed) {
            await manager.demotePlayer(interaction.guild, defender.id);
        }

        // 4. Gửi báo cáo cho Người Tấn Công
        const resultColor = report.isVictory ? 0x2ecc71 : 0xe74c3c; 
        const resultTitle = report.isVictory ? "🏆 CHIẾN THẮNG!" : "💀 THẤT BẠI!";
        let description = report.isVictory 
            ? "Quân địch đã bị đánh bại và cướp bóc!" 
            : "Hàng phòng thủ địch quá mạnh, quân ta phải rút lui!";

        if (report.isCollapsed) description += "\n🔥 **ĐỐI PHƯƠNG ĐÃ SỤP ĐỔ VÀ BỊ RESET!**";

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ Chiến Báo: Vùng [${tx}, ${ty}]`)
            .setColor(resultColor)
            .setDescription(`**${resultTitle}**\n${description}`)
            .addFields(
                { name: '🔥 Sức mạnh', value: `Công: **${report.attackPower}**\nThủ (Địch): **${report.defensePower}**`, inline: true },
                { name: '☠️ Thương vong (Quân ta)', value: `💀 Chết: ${report.losses.attacker.dead.infantry} Bộ, ${report.losses.attacker.dead.archer} Cung`, inline: true },
                { name: '💰 Chiến lợi phẩm', value: report.isVictory 
                    ? `🍞 ${report.loot.food} | 🪵 ${report.loot.wood} | 🪙 ${report.loot.gold}` 
                    : "Không cướp được gì.", inline: false }
            );

        await interaction.editReply({ embeds: [embed] });

        // 5. Gửi báo cáo cho Người Phòng Thủ (Vào kênh riêng)
        try {
            const defChannel = interaction.guild.channels.cache.get(defender.privateChannelId);
            if (defChannel) {
                const isCollapsed = report.isCollapsed;
                const alertTitle = isCollapsed ? "🚨 ĐẾ CHẾ SỤP ĐỔ! 🚨" : "⚠️ BÁO ĐỘNG: BỊ TẤN CÔNG!";
                const alertDesc = isCollapsed 
                    ? `**Thành trì thất thủ trước quân đội của ${attacker.username}!**\nBạn đã bị cướp sạch tài nguyên và giáng xuống làm **Lãnh Chúa (Giai đoạn 1)**.\nHãy làm lại từ đầu!`
                    : `Lãnh địa bị tấn công bởi **${attacker.username}**. Bạn đã đẩy lùi được chúng!`;

                const alertEmbed = new EmbedBuilder()
                    .setTitle(alertTitle)
                    .setColor(isCollapsed ? 0x000000 : 0xe74c3c) // Đen nếu chết, Đỏ nếu bị đánh
                    .setDescription(alertDesc)
                    .addFields(
                         { name: '☠️ Thiệt hại', value: `Quân chết: ${report.losses.defender.dead.infantry} Bộ, ${report.losses.defender.dead.archer} Cung...`, inline: false }
                    );
                
                await defChannel.send({ content: `<@${defender.id}>`, embeds: [alertEmbed] });
            }
        } catch (e) {
            console.error("Lỗi gửi tin nhắn cho defender:", e);
        }

        // 6. THÔNG BÁO TOÀN SERVER (Chỉ khi có sụp đổ)
        if (report.isCollapsed) {
            const publicChannelId = manager.getPublicChannel(interaction.guildId);
            if (publicChannelId) {
                const pubChannel = interaction.guild.channels.cache.get(publicChannelId);
                if (pubChannel) {
                    await pubChannel.send({
                        content: `🔥 **TIN NÓNG CHIẾN SỰ** 🔥 @here`,
                        embeds: [{
                            title: "💀 MỘT ĐẾ CHẾ VỪA BỊ XÓA SỔ!",
                            description: `Vương quốc của **${defender.username}** tại [${tx}, ${ty}] đã sụp đổ hoàn toàn trước vó ngựa của **${attacker.username}**!\n\nKẻ bại trận đã quay về thời kỳ đồ đá. Bản đồ thế giới lại đổi chủ.`,
                            color: 0x2f3136,
                            thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/484/484167.png' } // Icon mộ bia hoặc lửa
                        }]
                    });
                }
            }
        }
    }
};