import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Database } from './Database.mjs';
import { spawnWildPet, Pet } from './GameLogic.mjs';
import { EMOJIS, RARITY_COLORS, RARITY } from './Constants.mjs';

const GACHA_PRICE = 500; // Giá vé quay: 500 Tiền

// Hàm Defer an toàn (Tránh lỗi Unknown Interaction)
async function safeDefer(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }
    } catch (e) {}
}

export async function handleGacha(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    // 1. Kiểm tra tiền
    if ((user.gold || 0) < GACHA_PRICE) {
        return interaction.reply({ 
            content: `🚫 Bạn không đủ tiền! Cần **${GACHA_PRICE}** ${EMOJIS.CURRENCY} (Hiện có: ${user.gold || 0} ${EMOJIS.CURRENCY}).`, 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    // 2. Xử lý giao diện chờ (Defer)
    await safeDefer(interaction);

    // 3. Trừ tiền
    user.gold -= GACHA_PRICE;
    Database.updateUser(userId, user);

    // 4. Hiệu ứng Animation (Edit message liên tục)
    const frames = [
        `🎰 **Đang bỏ ${GACHA_PRICE} ${EMOJIS.CURRENCY} vào máy...**`,
        "🔮 **Đang triệu hồi...** ⬜⬜⬜",
        "🔮 **Đang triệu hồi...** 🟪⬜⬜",
        "🔮 **Đang triệu hồi...** 🟪🟦⬜",
        "🔮 **Đang triệu hồi...** 🟪🟦🟨",
        "💥 **BÙM!**"
    ];

    try {
        for (const frame of frames) {
            await interaction.editReply({ content: frame });
            await new Promise(r => setTimeout(r, 600)); // Đợi 0.6s mỗi khung hình
        }
    } catch (e) {
        // Bỏ qua lỗi nếu user xóa tin nhắn giữa chừng
    }

    // 5. Random Pet (Cơ chế Gacha: Tăng tỷ lệ VIP)
    // 1% Mythic, 4% Legendary, 10% Epic, 20% Rare, còn lại thường
    let rarity = RARITY.COMMON;
    const rand = Math.random() * 100;
    
    if (rand < 1) rarity = RARITY.MYTHIC;       // 1%
    else if (rand < 5) rarity = RARITY.LEGENDARY; // 4%
    else if (rand < 15) rarity = RARITY.EPIC;     // 10%
    else if (rand < 35) rarity = RARITY.RARE;     // 20%
    else if (rand < 65) rarity = RARITY.UNCOMMON; // 30%
    else rarity = RARITY.COMMON;                  // 35%

    // Tạo Pet
    const isVip = (rarity === RARITY.LEGENDARY || rarity === RARITY.MYTHIC);
    const rawPet = spawnWildPet(rarity, isVip);
    const newPet = new Pet(rawPet);
    
    // Đảm bảo chỉ số đầy đủ
    newPet.ownerId = userId;
    newPet.currentHP = newPet.getStats().HP;
    newPet.currentMP = newPet.getStats().MP;

    // 6. Lưu vào Database
    const petData = newPet.getDataForSave();
    user.pets.push(petData);
    Database.updateUser(userId, user);

    // 7. Hiển thị kết quả
    const color = RARITY_COLORS[newPet.rarity];
    const stats = newPet.getStats();
    
    const embed = new EmbedBuilder()
        .setTitle(`🎉 CHÚC MỪNG! BẠN NHẬN ĐƯỢC:`)
        .setDescription(`### ${newPet.name.toUpperCase()} (${newPet.rarity})\n*${newPet.getRace()}* • Hệ: **${newPet.element}**`)
        .setColor(color)
        .addFields(
            { name: '📊 Chỉ số cơ bản', value: `❤️ HP: ${stats.HP}\n⚔️ ATK: ${stats.ATK}\n🛡️ DEF: ${stats.DEF}\n⚡ SPD: ${stats.SPD}`, inline: true },
            { name: '💰 Số dư còn lại', value: `**${user.gold}** ${EMOJIS.CURRENCY}`, inline: true }
        )
        .setFooter({ text: `Đã thêm vào túi đồ (Vị trí: ${user.pets.length})` });

    // Lấy ảnh
    const match = newPet.icon.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) {
        const url = `https://cdn.discordapp.com/emojis/${match[3]}.${match[1]?'gif':'png'}?size=96`;
        embed.setThumbnail(url);
    }

    // Nút quay tiếp
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gacha_roll_again')
            .setLabel(`Quay tiếp (${GACHA_PRICE})`)
            .setEmoji('🎰')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ content: null, embeds: [embed], components: [row] });
}