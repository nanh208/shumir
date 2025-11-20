// BattleManager.mjs
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { activeWildPets } from './SpawnSystem.mjs'; // Đã sửa đường dẫn
import { Database } from './Database.mjs';
import { Pet } from './Pet.mjs';
import { calculateDamage, tryCatchPet } from './GameLogic.mjs';
import { getSkillById } from './SkillList.mjs';

const activeBattles = new Map(); 

// Hàm hỗ trợ: Xóa Pet khỏi thế giới (Kênh chat + Map)
async function removePetFromWorld(petId, client) {
    const wildInfo = activeWildPets.get(petId);
    if (wildInfo) {
        try {
            const channel = await client.channels.fetch(wildInfo.channelId);
            const msg = await channel.messages.fetch(wildInfo.messageId);
            if (msg) await msg.delete(); 
        } catch (e) {
            console.log("Tin nhắn pet đã bị xóa trước đó.");
        }
        activeWildPets.delete(petId); 
    }
}

export async function handleInteraction(interaction) {
    const { customId, user, client } = interaction;

    // 1. KHIÊU CHIẾN
    if (customId.startsWith('challenge_')) {
        const petId = customId.split('_')[1];
        const wildInfo = activeWildPets.get(petId);

        if (!wildInfo || wildInfo.isBattling) {
            return interaction.reply({ content: "⚠️ Pet này đã biến mất hoặc đang có người khác đánh!", ephemeral: true });
        }

        const userData = Database.getUser(user.id);
        if (!userData.pets.length) return interaction.reply({ content: "Bạn chưa có Pet!", ephemeral: true });
        
        // Lấy dữ liệu Pet đầu tiên từ DB và tạo Pet instance
        const playerPet = new Pet(userData.pets[0]); 

        wildInfo.isBattling = true; 
        activeWildPets.set(petId, wildInfo);

        const wildPet = wildInfo.petData;
        activeBattles.set(user.id, { playerPet, wildPet, turn: 1, logs: [] });

        await showBattleInterface(interaction, user.id);
    }

    // 2. ĐÁNH NHAU (Turn)
    if (customId.startsWith('use_skill_')) {
        const skillIndex = parseInt(customId.split('_')[2]);
        await processTurn(interaction, skillIndex);
    }

    // 3. KẾT THÚC: GIẾT
    if (customId === 'btn_kill') {
        const battle = activeBattles.get(user.id);
        if (battle) {
            await removePetFromWorld(battle.wildPet.id, client);
            
            // Cập nhật XP & Item (cần sửa)
            const xpEarned = 500;
            const userData = Database.getUser(user.id);
            userData.inventory.candies.normal += 1;

            // Update EXP cho Pet (Lấy Pet đầu tiên)
            const playerPetIndex = userData.pets.findIndex(p => p.id === battle.playerPet.id);
            if(playerPetIndex !== -1) {
                const updatedPet = new Pet(userData.pets[playerPetIndex]);
                const leveledUp = updatedPet.addExp(xpEarned);
                userData.pets[playerPetIndex] = updatedPet.getDataForSave();
                
                let lvUpMsg = leveledUp ? `\n🎉 **Lên Cấp!** Pet của bạn đạt cấp ${updatedPet.level}!` : '';

                Database.updateUser(user.id, userData);

                await interaction.update({ 
                    content: `💀 Bạn đã hạ gục **${battle.wildPet.name}**!\n🎁 Nhận được: ${xpEarned} XP và 1 🍬. ${lvUpMsg}`, 
                    components: [], 
                    embeds: [] 
                });
            } else {
                Database.updateUser(user.id, userData);
                await interaction.update({ content: `💀 Bạn đã hạ gục **${battle.wildPet.name}**!\n🎁 Nhận được: ${xpEarned} XP và 1 🍬.`, components: [], embeds: [] });
            }
            activeBattles.delete(user.id);
        }
    }
    
    // 4. KẾT THÚC: THU PHỤC
    if (customId === 'btn_catch') {
        const battle = activeBattles.get(user.id);
        if (!battle) return;

        const success = tryCatchPet(battle.wildPet, 'Common');
        
        await removePetFromWorld(battle.wildPet.id, client); // Luôn xóa pet wild sau khi thử catch

        if (success) {
            battle.wildPet.ownerId = user.id;
            Database.addPetToUser(user.id, battle.wildPet);
            
            await interaction.update({ 
                content: `🎉 **XUẤT SẮC!** Bạn đã thu phục thành công **${battle.wildPet.name}**!`, 
                components: [], 
                embeds: [] 
            });
        } else {
            // Cập nhật Pet player (nếu bị dame)
            const playerPetIndex = Database.getUser(user.id).pets.findIndex(p => p.id === battle.playerPet.id);
            if (playerPetIndex !== -1) {
                const userData = Database.getUser(user.id);
                userData.pets[playerPetIndex] = battle.playerPet.getDataForSave();
                Database.updateUser(user.id, userData);
            }
            
            await interaction.update({ 
                content: `💥 **THẤT BẠI!** ${battle.wildPet.name} đã phá bóng và bỏ chạy mất!`, 
                components: [], 
                embeds: [] 
            });
        }
        activeBattles.delete(user.id);
    }
}

async function showBattleInterface(interaction, battleId) {
    const battle = activeBattles.get(battleId);
    const { playerPet, wildPet } = battle;
    
    const pStats = playerPet.getStats();
    const wStats = wildPet.getStats();
    
    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${playerPet.name} 🆚 ${wildPet.name}`)
        .setDescription(`Lượt: ${battle.turn}\n\n` +
            `🦸 **Bạn (${playerPet.rarity} Lv ${playerPet.level})**: ${Math.round(playerPet.currentHP)}/${pStats.HP} HP\n` +
            `👾 **Địch (${wildPet.rarity} Lv ${wildPet.level})**: ${Math.round(wildPet.currentHP)}/${wStats.HP} HP`)
        .setColor(0xFF0000);

    if (battle.logs.length > 0) {
        embed.addFields({ name: 'Nhật ký chiến đấu', value: battle.logs.slice(-3).join('\n') });
    }

    const row = new ActionRowBuilder();
    playerPet.skills.forEach((skillId, index) => {
        const skillInfo = getSkillById(skillId); 
        const btnLabel = skillInfo ? skillInfo.name : `Skill ${index + 1}`;

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`use_skill_${playerPet.id}_${index}`) // Thêm Pet ID để xác định trận đấu dễ hơn nếu cần
                .setLabel(btnLabel)
                .setStyle(ButtonStyle.Primary)
        );
    });

    if (interaction.message) {
        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}

async function processTurn(interaction, skillIndex) {
   const battle = activeBattles.get(interaction.user.id);
   if (!battle) return interaction.reply({ content: "Trận đấu đã kết thúc!", ephemeral: true });

   const { playerPet, wildPet } = battle;
    
    // Đảm bảo Pet đang sống
    if (playerPet.currentHP <= 0 || wildPet.currentHP <= 0) return showVictoryScreen(interaction);

   // 1. Player đánh
   const pSkill = playerPet.skills[skillIndex];
    if (!pSkill) return interaction.update({ content: "Skill không hợp lệ!", components: [] });
    
   const pDmg = calculateDamage(playerPet, wildPet, pSkill);
   wildPet.currentHP -= pDmg; // Dùng currentHP
    wildPet.currentHP = Math.max(0, wildPet.currentHP);
    
   const pSkillName = getSkillById(pSkill)?.name || "Đánh thường";
   battle.logs.push(`👊 Bạn dùng **${pSkillName}** gây ${Math.round(pDmg)} st.`);

   // Check Win
   if (wildPet.currentHP <= 0) return showVictoryScreen(interaction);

   // 2. Wild đánh (Random skill)
   const wSkill = wildPet.skills[Math.floor(Math.random() * wildPet.skills.length)];
   const wDmg = calculateDamage(wildPet, playerPet, wSkill);
   playerPet.currentHP -= wDmg; // Dùng currentHP
    playerPet.currentHP = Math.max(0, playerPet.currentHP);
    
   const wSkillName = getSkillById(wSkill)?.name || "Đánh thường";
   battle.logs.push(`💢 Địch dùng **${wSkillName}** gây ${Math.round(wDmg)} st.`);
    
    // Lưu lại HP của Pet người chơi vào DB (vì nó đã thay đổi)
    const userData = Database.getUser(interaction.user.id);
    const petIndex = userData.pets.findIndex(p => p.id === playerPet.id);
    if(petIndex !== -1) {
        userData.pets[petIndex].currentHP = playerPet.currentHP;
        Database.updateUser(interaction.user.id, userData);
    }
    
   // Check Lose
   if (playerPet.currentHP <= 0) {
       const wildInfo = activeWildPets.get(wildPet.id);
       if(wildInfo) { wildInfo.isBattling = false; activeWildPets.set(wildPet.id, wildInfo); }

       return interaction.update({ content: "☠️ Pet của bạn đã kiệt sức. Bạn thua cuộc!", components: [], embeds: [] });
   }

   battle.turn++;
   await showBattleInterface(interaction, interaction.user.id);
}

async function showVictoryScreen(interaction) {
    const battle = activeBattles.get(interaction.user.id);
    const wildPet = battle.wildPet;
    
    let content = `Chúc mừng! Bạn đã đánh bại ${wildPet.name}! Chọn hành động:`;
    
    // Nếu Pet còn HP (> 0) thì không thể thu phục (Tùy logic game, ở đây giả định phải đánh về 0 HP mới bắt được)
    if (wildPet.currentHP > 0) content = `Pet của bạn đã chiến thắng, nhưng ${wildPet.name} vẫn còn HP! Bạn chỉ có thể giết.`;
    
    const embed = new EmbedBuilder().setTitle("🏆 VICTORY!").setColor(0x00FF00).setDescription(content);
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_kill').setLabel('Giết (Lấy đồ/EXP)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_catch').setLabel('Thu Phục').setStyle(ButtonStyle.Success).setDisabled(wildPet.currentHP > 0) // Disable nếu còn HP
    );
    await interaction.update({ embeds: [embed], components: [row] });
}