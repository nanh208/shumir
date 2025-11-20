// StarterPet.mjs
import { EmbedBuilder } from 'discord.js';
import { Database } from './Database.mjs';
import { spawnWildPet, Pet } from './GameLogic.mjs';
import { RARITY_CONFIG } from './Constants.mjs';

// --- HÀM HỖ TRỢ NỘI BỘ (Để không phải import từ file khác) ---
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

    // 2. Tạo Pet Random (Level 1)
    const rawPetData = spawnWildPet(false);
    rawPetData.level = 1; 
    
    // Tạo instance Pet để tính toán chỉ số chuẩn
    const newPet = new Pet(rawPetData);
    
    // Gán chủ sở hữu và hồi đầy máu
    newPet.ownerId = userId;
    newPet.currentHP = newPet.getStats().HP;
    newPet.currentMP = newPet.getStats().MP;

    // 3. Lưu vào Database
    const petToSave = newPet.getDataForSave();
    user.pets.push(petToSave);
    
    // Đánh dấu đã nhận
    user.hasClaimedStarter = true;
    
    // Tặng quà tân thủ
    user.inventory.candies.normal = (user.inventory.candies.normal || 0) + 5;

    Database.updateUser(userId, user);

    // 4. Hiển thị thông báo
    const rInfo = RARITY_CONFIG[newPet.rarity];
    const stats = newPet.getStats();
    const imgUrl = getEmojiUrl(newPet.icon);
    
    const embed = new EmbedBuilder()
        .setTitle("🎉 CHÚC MỪNG! BẠN ĐÃ NHẬN PET KHỞI ĐẦU")
        .setDescription(`Bạn đã triệu hồi thành công một người bạn đồng hành mới!\n\n**${newPet.name}** đã gia nhập đội hình.`)
        .setColor(rInfo.color)
        .addFields(
            { name: 'Thông tin', value: `Hệ: **${newPet.element}**\nTộc: **${newPet.race}**\nRank: ${rInfo.icon} **${newPet.rarity}**`, inline: true },
            { name: 'Chỉ số (Lv.1)', value: `❤️ HP: ${stats.HP}\n⚔️ ATK: ${stats.ATK}\n🛡️ DEF: ${stats.DEF}`, inline: true },
            { name: 'Quà tân thủ', value: `+5 🍬 Kẹo thường (Dùng để hồi máu)`, inline: false }
        )
        .setFooter({ text: "Dùng lệnh /inventory để xem, hoặc chờ Pet hoang dã xuất hiện để chiến đấu!" });

    if (imgUrl) embed.setImage(imgUrl);
    else embed.setThumbnail(imgUrl);

    await interaction.reply({ embeds: [embed] });
}