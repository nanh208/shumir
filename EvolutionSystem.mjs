// EvolutionSystem.mjs
import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Database } from './Database.mjs';
import { EVOLUTION_CHAINS, PET_TEMPLATES, RARITY_CONFIG } from './Constants.mjs';
import { Pet } from './GameLogic.mjs';

function getEmojiUrl(emojiStr) { /* ... (Copy hàm getEmojiUrl từ các file trước) ... */ 
    if (!emojiStr) return null;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}?size=96`;
    return null;
}

export async function handleEvolve(interaction) {
    const userId = interaction.user.id;
    const user = Database.getUser(userId);

    // 1. Tìm các Pet đủ điều kiện tiến hóa
    const eligiblePets = user.pets.map((p, index) => ({ ...p, index })).filter(p => {
        const chain = EVOLUTION_CHAINS[p.name];
        // Điều kiện: Có trong chuỗi tiến hóa VÀ Đủ Level
        return chain && p.level >= chain.level;
    });

    if (eligiblePets.length === 0) {
        return interaction.reply({ content: "🚫 Bạn không có Pet nào đủ điều kiện tiến hóa (Cần đúng loại & đủ Level).", flags: [MessageFlags.Ephemeral] });
    }

    // 2. Nếu chưa chọn, hiện Menu
    if (!interaction.isStringSelectMenu()) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('evolve_select')
            .setPlaceholder('🧬 Chọn Pet để Tiến Hóa')
            .addOptions(eligiblePets.map(p => ({
                label: `${p.name} (Lv.${p.level})`,
                description: `Tiến hóa thành: ${EVOLUTION_CHAINS[p.name].target}`,
                value: p.index.toString(),
                emoji: '🧬'
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ content: "✨ **Đền thờ Tiến Hóa:** Chọn Pet bạn muốn thăng cấp sức mạnh!", components: [row], ephemeral: true });
    }

    // 3. Xử lý Tiến Hóa
    const index = parseInt(interaction.values[0]);
    const oldPetData = user.pets[index];
    const evoConfig = EVOLUTION_CHAINS[oldPetData.name];
    
    // Lấy Template mới
    const newTemplate = PET_TEMPLATES.find(t => t.name === evoConfig.target);
    if (!newTemplate) return interaction.reply({ content: "❌ Lỗi dữ liệu: Không tìm thấy dạng tiến hóa.", ephemeral: true });

    // Tạo Pet mới kế thừa chỉ số cũ nhưng dùng Base Stats mới
    const newPet = new Pet({
        ...oldPetData,
        name: newTemplate.name,
        race: newTemplate.race,
        baseStats: {
            HP: newTemplate.baseHP, MP: newTemplate.baseMP,
            ATK: newTemplate.baseATK, SATK: newTemplate.baseSATK,
            DEF: newTemplate.baseDEF, SPD: newTemplate.baseSPD
        },
        passive: newTemplate.passive || oldPetData.passive, // Nhận nội tại mới hoặc giữ cũ
        icon: newTemplate.icon || oldPetData.icon, // Cần update icon trong Constants nếu có
        rarity: oldPetData.rarity === 'Common' ? 'Uncommon' : oldPetData.rarity // Tăng nhẹ độ hiếm nếu thấp
    });

    // Hồi phục
    newPet.currentHP = newPet.getStats().HP;
    newPet.currentMP = newPet.getStats().MP;

    // Lưu đè vào vị trí cũ
    user.pets[index] = newPet.getDataForSave();
    Database.updateUser(userId, user);

    const embed = new EmbedBuilder()
        .setTitle("🧬 TIẾN HÓA THÀNH CÔNG!")
        .setDescription(`✨ **${oldPetData.name}** đã biến đổi thành **${newPet.name}**!`)
        .setColor(0xFFD700)
        .addFields(
            { name: 'Chỉ số mới', value: `❤️ HP: ${newPet.getStats().HP}\n⚔️ ATK: ${newPet.getStats().ATK}`, inline: true },
            { name: 'Nội tại', value: `${newPet.passive || 'Không đổi'}`, inline: true }
        );
    
    const img = getEmojiUrl(newPet.icon);
    if(img) embed.setImage(img);

    await interaction.update({ content: null, embeds: [embed], components: [] });
}