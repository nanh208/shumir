const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 1. Hàm load Manager (Chỉ khai báo, CHƯA CHẠY NGAY)
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Xem thông tin vương quốc của bạn'),

    async execute(interaction) {
        // 2. Bây giờ mới lấy Manager ra dùng
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);

        // --- KIỂM TRA ĐĂNG KÝ ---
        if (!player) {
            return interaction.reply({ 
                content: "⚠️ Bạn chưa có vương quốc! Hãy dùng `/register` để khởi tạo.", 
                ephemeral: true 
            });
        }

        // --- KIỂM TRA KÊNH RIÊNG (Bảo mật) ---
        if (player.privateChannelId && interaction.channelId !== player.privateChannelId) {
             return interaction.reply({ 
                 content: `🕵️ **Bảo mật:** Vui lòng chỉ xem thông tin tài sản tại lãnh địa riêng <#${player.privateChannelId}>!`, 
                 ephemeral: true 
             });
        }

        // --- TÍNH TOÁN SẢN LƯỢNG (Phải để trong này mới có dữ liệu player) ---
        const farmRate = (player.buildings.farm || 0) * 100;
        const woodRate = (player.buildings.lumber_mill || 0) * 100;
        const goldRate = (player.buildings.gold_mine || 0) * 50;
        const ironRate = (player.buildings.iron_mine || 0) * 30;

        // Lấy thông tin thời tiết
        const weather = manager.getCurrentWeather();

        // --- TẠO EMBED HIỂN THỊ ---
        const embed = new EmbedBuilder()
            .setTitle(`🏰 Lãnh địa của ${interaction.user.username}`)
            .setColor(0x0099FF)
            .setDescription(`📍 Tọa độ: **[${player.position?.x || 0}, ${player.position?.y || 0}]**`)
            .addFields(
                { 
                    name: '💰 Tài nguyên (Sản lượng/Giờ)', 
                    value: `🍞 Thực: **${Math.floor(player.resources.food)}** (+${farmRate}/h)\n` +
                           `🪵 Gỗ: **${Math.floor(player.resources.wood)}** (+${woodRate}/h)\n` +
                           `🪙 Vàng: **${Math.floor(player.resources.gold)}** (+${goldRate}/h)\n` +
                           `⛓️ Sắt: **${Math.floor(player.resources.iron)}** (+${ironRate}/h)`, 
                    inline: false 
                },
                { 
                    name: '⚔️ Quân đội', 
                    value: `🛡️ Bộ binh: ${player.units.infantry || 0}\n` +
                           `🏹 Cung thủ: ${player.units.archer || 0}\n` +
                           `🐎 Kỵ binh: ${player.units.cavalry || 0}\n` +
                           `🐘 Voi chiến: ${player.units.elephant || 0}\n` +
                           `🚜 Xe công thành: ${player.units.siege_ram || 0}`,
                    inline: true 
                },
                { 
                    name: '🏠 Công trình Chính', 
                    value: `🏛️ Nhà chính: Lv${player.buildings.town_hall}\n` +
                           `🌾 Ruộng: Lv${player.buildings.farm} | 🪓 Gỗ: Lv${player.buildings.lumber_mill}\n` +
                           `⚔️ Trại lính: Lv${player.buildings.barracks} | 🛠️ Xưởng: Lv${player.buildings.siege_workshop || 0}`, 
                    inline: false 
                },
                {
                    name: '🌤️ Thời tiết hiện tại',
                    value: `${weather.name} *(Hiệu ứng: ${weather.effect})*`,
                    inline: false
                }
            )
            .setFooter({ text: `Kỷ nguyên: ${player.age} | ID: ${interaction.user.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};