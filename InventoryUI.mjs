// InventoryUI.js
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Database } from './Database.mjs';
import { Pet } from './Pet.mjs';

const ITEMS_PER_PAGE = 5; // Số pet hiển thị mỗi trang

export async function showInventory(interaction, page = 0) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;

    // 1. Thông tin Túi đồ
    const inv = userData.inventory;
    let desc = `🍬 Kẹo thường: **${inv.candies.normal}**\n🍭 Kẹo cao cấp: **${inv.candies.high}**\n📦 Hòm: **${inv.crates.common}**\n\n`;

    // 2. Thông tin Danh sách Pet (Phân trang)
    const totalPages = Math.ceil(pets.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentPets = pets.slice(start, end);

    if (pets.length === 0) {
        desc += "*Bạn chưa có Pet nào.*";
    } else {
        desc += `**DANH SÁCH PET (${pets.length})**\n`;
        currentPets.forEach((pData, index) => {
            const p = new Pet(pData);
            desc += `**${start + index + 1}.** ${p.icon} **${p.name}** [Lv.${p.level}] - ${p.rarity}\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎒 TÚI ĐỒ CỦA ${interaction.user.username}`)
        .setDescription(desc)
        .setColor(0x0099FF)
        .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` });

    // 3. Tạo nút điều hướng
    const row = new ActionRowBuilder();
    
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`inv_prev_${page}`)
            .setLabel('◀️ Trước')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0), // Khóa nếu ở trang đầu
        new ButtonBuilder()
            .setCustomId('inv_refresh')
            .setLabel('🔄')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`inv_next_${page}`)
            .setLabel('Sau ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1 || totalPages === 0) // Khóa nếu ở trang cuối
    );

    if (interaction.message && interaction.customId) {
        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}