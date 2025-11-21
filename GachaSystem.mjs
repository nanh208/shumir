// GachaSystem.mjs
import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Database } from './Database.mjs';
import { spawnWildPet, Pet } from './GameLogic.mjs';
import { EMOJIS, RARITY_COLORS } from './Constants.mjs';

const GACHA_PRICE = 500; // 500 Vàng/lượt

export async function handleGacha(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    // 1. Check tiền
    if (user.gold < GACHA_PRICE) {
        return interaction.reply({ content: `🚫 Bạn không đủ tiền! Cần **${GACHA_PRICE} Gold** (Hiện có: ${user.gold}).`, ephemeral: true });
    }

    // 2. Trừ tiền
    user.gold -= GACHA_PRICE;
    Database.updateUser(userId, user);

    // 3. Animation
    await interaction.reply({ content: "🎰 **Đang triệu hồi...**", fetchReply: true });
    
    const frames = ["📦...", "📦... ✨", "📦... ✨💫", "💥 **BÙM!**"];
    for (const frame of frames) {
        await new Promise(r => setTimeout(r, 800)); // Đợi 0.8s
        await interaction.editReply({ content: frame });
    }

    // 4. Random Pet
    // Tăng tỉ lệ ra hiếm hơn một chút so với Wild
    const rawPet = spawnWildPet(Math.random() < 0.1); // 10% cơ hội VIP
    const newPet = new Pet(rawPet);
    newPet.ownerId = userId;
    newPet.currentHP = newPet.getStats().HP;
    newPet.currentMP = newPet.getStats().MP;

    // Lưu
    const petData = newPet.getDataForSave();
    user.pets.push(petData);
    Database.updateUser(userId, user);

    // 5. Hiển thị kết quả
    const color = RARITY_COLORS[newPet.rarity];
    const embed = new EmbedBuilder()
        .setTitle(`🎰 GACHA RESULT: ${newPet.rarity.toUpperCase()}`)
        .setDescription(`Bạn nhận được **${newPet.name}**!`)
        .setColor(color)
        .addFields(
            { name: 'Stats', value: `HP: ${newPet.getStats().HP} | ATK: ${newPet.getStats().ATK}`, inline: true },
            { name: 'Số dư còn lại', value: `${user.gold} Gold`, inline: true }
        );

    const match = newPet.icon.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) embed.setImage(`https://cdn.discordapp.com/emojis/${match[3]}.${match[1]?'gif':'png'}?size=96`);

    await interaction.editReply({ content: null, embeds: [embed] });
}