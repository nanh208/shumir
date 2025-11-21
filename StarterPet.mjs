// StarterPet.mjs
import { EmbedBuilder } from 'discord.js';
import { Database } from './Database.mjs';
import { spawnWildPet, Pet } from './GameLogic.mjs';
import { RARITY_CONFIG, RARITY } from './Constants.mjs';

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

// --- LOGIC NHẬN PET KHỞI ĐẦU ---
export async function handleStarterCommand(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    if (user.hasClaimedStarter) {
        return interaction.reply({ 
            content: "🚫 **Bạn đã nhận Pet khởi đầu rồi!**", 
            ephemeral: true 
        });
    }

    const rawPetData = spawnWildPet(false);
    rawPetData.level = 1; 
    
    const newPet = new Pet(rawPetData);
    newPet.ownerId = userId;
    newPet.currentHP = newPet.getStats().HP;
    newPet.currentMP = newPet.getStats().MP;

    const petToSave = newPet.getDataForSave();
    user.pets.push(petToSave);
    user.hasClaimedStarter = true;
    
    // Tặng 5 Kẹo (XP) và 10 Thuốc (Hồi phục)
    user.inventory.candies.normal = (user.inventory.candies.normal || 0) + 5;
    user.inventory.potions = (user.inventory.potions || 0) + 10;

    Database.updateUser(userId, user);

    const rInfo = RARITY_CONFIG[newPet.rarity];
    const stats = newPet.getStats();
    const imgUrl = getEmojiUrl(newPet.icon);
    
    const embed = new EmbedBuilder()
        .setTitle("🎉 CHÚC MỪNG! BẠN ĐÃ NHẬN PET KHỞI ĐẦU")
        .setDescription(`**${newPet.name}** đã gia nhập đội hình.`)
        .setColor(rInfo.color)
        .addFields(
            { name: 'Thông tin', value: `Hệ: **${newPet.element}**\nTộc: **${newPet.race}**\nRank: ${rInfo.icon} **${newPet.rarity}**`, inline: true },
            { name: 'Chỉ số (Lv.1)', value: `❤️ HP: ${stats.HP}\n⚔️ ATK: ${stats.ATK}\n🛡️ DEF: ${stats.DEF}`, inline: true },
            { name: 'Quà tân thủ', value: `+5 🍬 Kẹo (XP)\n+10 💊 Thuốc (Hồi phục)`, inline: false }
        )
        .setFooter({ text: "Dùng lệnh /inventory để xem!" });

    if (imgUrl) embed.setImage(imgUrl);
    else embed.setThumbnail(imgUrl);

    await interaction.reply({ embeds: [embed] });
}

// --- LOGIC PET DEMO (DÙNG ĐỂ TEST, XÓA SAU) ---
export async function handleDemoPetCommand(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    // Tạo Pet Mythic siêu cấp
    const demoPet = new Pet({
        name: "TEST_GOD_DRAGON",
        race: "Dragon",
        element: "Fire",
        rarity: RARITY.MYTHIC,
        baseStats: { HP: 5000, MP: 2000, ATK: 3000, SATK: 3000, DEF: 2500, SPD: 200 },
        level: 50, // Level cao để test
        xp: 0,
        skills: ['S5', 'S2', 'S4'], // Set skill mạnh (cần đảm bảo ID đúng trong SkillList)
        gen: 100, // Gen max
        icon: '<:Rayquaza:1440702434644070533>'
    });

    demoPet.ownerId = userId;
    demoPet.currentHP = demoPet.getStats().HP;
    demoPet.currentMP = demoPet.getStats().MP;

    // Lưu vào DB
    const petToSave = demoPet.getDataForSave();
    user.pets.push(petToSave);
    
    // Tặng luôn thuốc để test
    user.inventory.potions = (user.inventory.potions || 0) + 50;

    Database.updateUser(userId, user);

    const embed = new EmbedBuilder()
        .setTitle("🛠️ ĐÃ NHẬN PET DEMO (TESTING)")
        .setDescription("Đã thêm Pet Mythic Lv.50 vào túi đồ để test.")
        .setColor(0xFF0000)
        .addFields(
            { name: 'Stats', value: `HP: ${demoPet.getStats().HP} | ATK: ${demoPet.getStats().ATK}`, inline: true }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}