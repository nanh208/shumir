// MarketSystem.mjs
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { Database } from './Database.mjs';
import { Pet } from './GameLogic.mjs';

export async function handleMarketCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
        await showMarket(interaction);
    } else if (subcommand === 'sell') {
        await sellPet(interaction);
    }
}

// --- HIỂN THỊ CHỢ & MUA ---
async function showMarket(interaction) {
    const marketData = Database.getMarket();
    if (!marketData.length) return interaction.reply({ content: "🏪 Chợ hiện đang trống!", ephemeral: true });

    // Tạo Select Menu để mua
    const options = marketData.slice(0, 25).map(item => ({
        label: `${item.petName} (Lv.${item.petLevel}) - ${item.price} Gold`,
        description: `Người bán: ${item.sellerName}`,
        value: item.id,
        emoji: '💰'
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('market_buy_select')
            .setPlaceholder('🛒 Chọn Pet để mua')
            .addOptions(options)
    );

    const embed = new EmbedBuilder()
        .setTitle("🏪 CHỢ ĐEN THÚ CƯNG")
        .setDescription("Chọn Pet bên dưới để mua. Tiền sẽ trừ trực tiếp.")
        .setColor(0xFFA500);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// --- BÁN PET ---
async function sellPet(interaction) {
    const price = interaction.options.getInteger('price');
    const petIndex = interaction.options.getInteger('slot') - 1; // Slot nhập từ 1
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    if (price < 0) return interaction.reply({ content: "🚫 Giá không hợp lệ!", ephemeral: true });
    if (!user.pets[petIndex]) return interaction.reply({ content: "🚫 Không tìm thấy Pet ở vị trí này!", ephemeral: true });

    const petToSell = user.pets[petIndex];
    
    // Xóa khỏi túi người bán
    user.pets.splice(petIndex, 1);
    Database.updateUser(userId, user);

    // Đưa lên chợ
    const listing = {
        id: Date.now().toString(),
        sellerId: userId,
        sellerName: interaction.user.username,
        petData: petToSell,
        petName: petToSell.name,
        petLevel: petToSell.level,
        price: price,
        timestamp: Date.now()
    };

    Database.addListing(listing);

    await interaction.reply({ content: `✅ Đã treo bán **${petToSell.name}** với giá **${price} Gold**!` });
}

// --- XỬ LÝ MUA (Handle Interaction) ---
export async function handleMarketBuy(interaction) {
    const listingId = interaction.values[0];
    const buyerId = interaction.user.id;
    const buyer = Database.getUser(buyerId);
    const market = Database.getMarket();
    
    const listing = market.find(l => l.id === listingId);

    if (!listing) return interaction.reply({ content: "🚫 Vật phẩm này không còn tồn tại!", ephemeral: true });
    if (listing.sellerId === buyerId) return interaction.reply({ content: "🚫 Không thể mua hàng của chính mình!", ephemeral: true });
    if (buyer.gold < listing.price) return interaction.reply({ content: "🚫 Bạn không đủ tiền!", ephemeral: true });

    // 1. Trừ tiền người mua
    buyer.gold -= listing.price;
    
    // 2. Thêm Pet cho người mua
    const boughtPet = listing.petData;
    boughtPet.ownerId = buyerId; // Đổi chủ
    buyer.pets.push(boughtPet);
    
    // 3. Cộng tiền người bán
    const seller = Database.getUser(listing.sellerId);
    if (seller) {
        seller.gold = (seller.gold || 0) + listing.price;
        Database.updateUser(listing.sellerId, seller);  
    }

    // 4. Xóa listing
    Database.removeListing(listingId);
    Database.updateUser(buyerId, buyer);

    await interaction.update({ content: `🎉 **GIAO DỊCH THÀNH CÔNG!**\nBạn đã mua **${listing.petName}** với giá ${listing.price} Gold.`, components: [], embeds: [] });
}