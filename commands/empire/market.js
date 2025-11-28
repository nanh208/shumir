// commands/empire/market.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

const RESOURCE_EMOJIS = {
    food: '🍞', wood: '🪵', iron: '⛓️'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Hệ thống Chợ giao thương')
        .addSubcommand(sub => 
            sub.setName('view').setDescription('Xem danh sách hàng đang bán'))
        .addSubcommand(sub => 
            sub.setName('sell').setDescription('Đăng bán tài nguyên')
            .addStringOption(op => op.setName('type').setDescription('Loại').setRequired(true)
                .addChoices({name:'Thực', value:'food'}, {name:'Gỗ', value:'wood'}, {name:'Sắt', value:'iron'}))
            .addIntegerOption(op => op.setName('amount').setDescription('Số lượng').setRequired(true).setMinValue(1))
            .addIntegerOption(op => op.setName('price').setDescription('Giá bán (Vàng)').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => 
            sub.setName('buy').setDescription('Mua hàng theo ID')
            .addStringOption(op => op.setName('id').setDescription('Mã đơn hàng').setRequired(true))),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);
        
        // Giao dịch ở kênh nào cũng được, không bắt buộc kênh riêng
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });

        const sub = interaction.options.getSubcommand();

        // --- XEM CHỢ ---
        if (sub === 'view') {
            const market = manager.market;
            if (market.length === 0) return interaction.reply("🏚️ Chợ hiện đang trống trơn.");

            const embed = new EmbedBuilder()
                .setTitle("🏪 Sàn Giao Dịch Tài Nguyên")
                .setColor(0xF1C40F)
                .setDescription("Gõ `/market buy id:[Mã]` để mua.")
                .setFooter({ text: "Thuế giao dịch: 10% (Người bán chịu)" });

            // Chỉ hiện tối đa 10 đơn hàng mới nhất
            const listings = market.slice(-10).map(l => 
                `**ID: ${l.id}** | ${RESOURCE_EMOJIS[l.type]} **${l.amount}** giá 🪙 **${l.price}**\n👤 *${l.sellerName}*`
            ).join('\n────────────────\n');

            embed.addFields({ name: 'Đơn hàng mới nhất', value: listings || "Trống" });
            return interaction.reply({ embeds: [embed] });
        }

        // --- BÁN HÀNG ---
        if (sub === 'sell') {
            const type = interaction.options.getString('type');
            const amount = interaction.options.getInteger('amount');
            const price = interaction.options.getInteger('price');

            if (player.resources[type] < amount) {
                return interaction.reply({ content: `⛔ Bạn không đủ ${RESOURCE_EMOJIS[type]} để bán.`, ephemeral: true });
            }

            // Trừ đồ trong kho
            player.resources[type] -= amount;
            
            // Đăng lên chợ
            const listing = manager.addListing(player.id, type, amount, price);

            return interaction.reply(`✅ **Đã treo bán thành công!**\n📦 ${amount} ${RESOURCE_EMOJIS[type]} với giá ${price} Vàng.\nMã đơn: **${listing.id}**`);
        }

        // --- MUA HÀNG ---
        if (sub === 'buy') {
            const id = interaction.options.getString('id');
            const result = manager.buyListing(player.id, id);

            if (!result.success) {
                return interaction.reply({ content: `❌ Lỗi: ${result.msg}`, ephemeral: true });
            }

            const l = result.item;
            return interaction.reply(`🎉 **Giao dịch thành công!**\nBạn đã mua **${l.amount} ${RESOURCE_EMOJIS[l.type]}** với giá ${l.price} Vàng.`);
        }
    }
};