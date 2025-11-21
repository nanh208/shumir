// StarterPet.mjs
import { EmbedBuilder } from 'discord.js';
import { Database } from './Database.mjs';

// ✅ SỬA LỖI IMPORT: Tách Pet và Logic ra 2 nguồn khác nhau
import { spawnWildPet } from './GameLogic.mjs';
import { Pet } from './Pet.mjs';

import { RARITY_CONFIG } from './Constants.mjs';

// --- HÀM HỖ TRỢ NỘI BỘ ---
function getEmojiUrl(emojiStr) {
    if (!emojiStr) return null;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) {
        const isAnimated = match[1] === 'a';
        const id = match[3];
        return `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=96`;
    }
    return null; 
}

// --- LOGIC XỬ LÝ LỆNH ---
export async function handleStarterCommand(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    // 1. Kiểm tra xem đã nhận chưa
    if (user.hasClaimedStarter) {
        return interaction.reply({ 
            content: "🚫 **Bạn đã nhận Pet khởi đầu rồi!** Hãy đi săn bắt thêm ở kênh Spawn.", 
            ephemeral: true 
        });
    }

    // Kiểm tra kho đầy
    if (user.pets.length >= 10) {
        return interaction.reply({ content: "🚫 Kho Pet của bạn đã đầy! Hãy thả bớt Pet trước khi nhận.", ephemeral: true });
    }

    // 2. Tạo Pet Random (Level 1)
    // spawnWildPet(false) tạo pet thường, sau đó ta chỉnh sửa lại thành Lv.1
    const rawPetData = spawnWildPet(false);
    rawPetData.level = 1; 
    rawPetData.xp = 0; // Reset XP về 0
    
    // Tạo instance Pet để tính toán chỉ số chuẩn theo Lv.1
    const newPet = new Pet(rawPetData);
    
    // Gán chủ sở hữu và hồi đầy máu theo stats mới
    newPet.ownerId = userId;
    const currentStats = newPet.getStats(); // Lấy stats đã tính toán
    newPet.currentHP = currentStats.HP;
    newPet.currentMP = currentStats.MP;

    // 3. Lưu vào Database
    // Lấy dữ liệu thuần (JSON) để lưu
    const petToSave = newPet.getDataForSave();
    user.pets.push(petToSave);
    
    // Đánh dấu đã nhận Starter Pet
    user.hasClaimedStarter = true;
    
    // Tặng quà tân thủ (Đảm bảo object inventory tồn tại)
    if (!user.inventory) user.inventory = { candies: { normal: 0 }, balls: {} };
    if (!user.inventory.candies) user.inventory.candies = { normal: 0 };
    
    user.inventory.candies.normal = (user.inventory.candies.normal || 0) + 5;

    Database.updateUser(userId, user);

    // 4. Hiển thị thông báo
    const rInfo = RARITY_CONFIG[newPet.rarity] || RARITY_CONFIG['Common'];
    const imgUrl = getEmojiUrl(newPet.icon);
    
    const embed = new EmbedBuilder()
        .setTitle("🎉 CHÚC MỪNG! BẠN ĐÃ NHẬN PET KHỞI ĐẦU")
        .setDescription(`Bạn đã triệu hồi thành công một người bạn đồng hành mới!\n\n**${newPet.name}** đã gia nhập đội hình.`)
        .setColor(rInfo.color)
        .addFields(
            { name: 'Thông tin', value: `Hệ: **${newPet.element}**\nTộc: **${newPet.race}**\nRank: ${rInfo.icon} **${newPet.rarity}**`, inline: true },
            { name: 'Chỉ số (Lv.1)', value: `❤️ HP: ${currentStats.HP}\n⚔️ ATK: ${currentStats.ATK}\n🛡️ DEF: ${currentStats.DEF}`, inline: true },
            { name: 'Quà tân thủ', value: `+5 🍬 Kẹo thường (Dùng để hồi máu/up cấp)`, inline: false }
        )
        .setFooter({ text: "Dùng lệnh /inventory để xem, hoặc chờ Pet hoang dã xuất hiện để chiến đấu!" });

    if (imgUrl) embed.setImage(imgUrl);
    else embed.setThumbnail(imgUrl);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}