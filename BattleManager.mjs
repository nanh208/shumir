// BattleManager.mjs (FULL VERSION - ĐÃ CẬP NHẬT LOGIC TẤN CÔNG WILD PET VÀ CATCH RATE)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { activeWildPets } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
import { Pet, calculateDamage, processSkillEffect, catchPetLogic, createDungeonBoss } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { ELEMENT_ICONS } from './Constants.mjs';

const PET_XP_BASE = 100;
const activeBattles = new Map(); 
const pendingChallenges = new Map();

// ==========================================
// 1. HELPERS (NẰM TRONG FILE ĐỂ TRÁNH LỖI IMPORT)
// ==========================================

// Tỷ lệ bắt cơ bản dựa trên độ hiếm (có thể điều chỉnh)
const BASE_CATCH_RATES = {
    'Common': 0.50, // 50%
    'Uncommon': 0.40, // 40%
    'Rare': 0.25, // 25%
    'Epic': 0.15, // 15%
    'Legendary': 0.05, // 5%
    'Boss': 0.01 // 1% (Boss Hoàng Kim)
};

/**
 * Tính toán tỷ lệ bắt Pet dựa trên độ hiếm và chênh lệch cấp độ.
 * @param {Pet} playerPet - Pet của người chơi (dùng để so sánh Level).
 * @param {Pet} wildPet - Pet hoang dã.
 * @returns {number} Tỷ lệ bắt (từ 0 đến 1).
 */
function calculateCatchRate(playerPet, wildPet) {
    // 1. Lấy tỷ lệ cơ bản dựa trên độ hiếm
    const rarityKey = wildPet.rarity in BASE_CATCH_RATES ? wildPet.rarity : 'Common';
    const baseRate = BASE_CATCH_RATES[rarityKey];
    
    // 2. Tính toán buff từ Level
    const playerLevel = playerPet.level;
    const wildLevel = wildPet.level;
    const levelDiff = playerLevel - wildLevel;

    // Mỗi 1 level chênh lệch có lợi sẽ tăng/giảm 1% tỷ lệ cơ bản (max +/- 15%)
    let levelBonus = Math.min(0.15, Math.max(-0.15, levelDiff * 0.01));

    let finalRate = baseRate + levelBonus;
    
    // Đảm bảo tỷ lệ nằm trong khoảng [0, 1]
    finalRate = Math.max(0.005, Math.min(1.0, finalRate)); // Tối thiểu 0.5%
    
    return finalRate;
}

function createHealthBar(current, max) {
    const totalBars = 10;
    const safeMax = max > 0 ? max : 1;
    const percent = Math.max(0, Math.min(current / safeMax, 1));
    const filledBars = Math.round(percent * totalBars);
    const filled = '🟩'.repeat(filledBars);
    const empty = '⬜'.repeat(Math.max(0, totalBars - filledBars)); 
    return `${filled}${empty} (${Math.round(percent * 100)}%)`;
}

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

function getElementDisplay(elementName) {
    if (!elementName) return '❓ Vô Hệ';
    const icon = ELEMENT_ICONS[elementName] || '❓';
    return `${icon} ${elementName}`; 
}

// Export hàm này để SpawnSystem hoặc Index có thể gọi nếu cần xóa rác
export async function removePetFromWorld(petId, client) {
    const info = activeWildPets.get(petId);
    if (info) {
        try {
            const channel = await client.channels.fetch(info.channelId);
            const msg = await channel.messages.fetch(info.messageId);
            if (msg) await msg.delete();
        } catch(e) { }
        activeWildPets.delete(petId);
    }
}

// ==========================================
// 2. ROUTER & INIT
// ==========================================

export async function startAdventure(interaction, difficulty) {
    const userId = interaction.user.id;
    if (activeBattles.has(userId)) return interaction.reply({ content: "🚫 Bạn đang bận!", ephemeral: true });
    const userData = Database.getUser(userId);
    if (!userData.pets.length) return interaction.reply({ content: "🚫 Cần có Pet!", ephemeral: true });
    
    activeBattles.set(userId, {
        mode: 'pve', type: 'adventure', difficulty, 
        playerPet: new Pet(userData.pets[0]), 
        wildPet: createDungeonBoss(difficulty), 
        turn: 1, logs: ["⚔️ **Vào Hầm Ngục!**"]
    });
    await showPvEInterface(interaction, userId);
}

export async function createPvPChallenge(interaction, opponent) {
    const cid = `${interaction.user.id}_vs_${opponent.id}`;
    pendingChallenges.set(cid, { challenger: interaction.user, opponent, time: Date.now() });
    const embed = new EmbedBuilder().setTitle("⚔️ THÁCH ĐẤU").setDescription(`**${interaction.user.username}** VS **${opponent.username}**`).setColor(0xFFA500);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pvp_accept_${cid}`).setLabel('Chiến').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pvp_decline_${cid}`).setLabel('Sợ').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ content: `<@${opponent.id}>`, embeds: [embed], components: [row] });
}

export async function handleInteraction(interaction) {
    const { customId, user, client } = interaction;
    const uid = user.id;

    // PVP ROUTING
    if (customId.startsWith('pvp_')) {
        const battle = activeBattles.get(uid);
        if (customId.startsWith('pvp_accept_')) await startPvPMatch(interaction, customId.replace('pvp_accept_', ''));
        else if (customId.startsWith('pvp_decline_')) {
             pendingChallenges.delete(customId.replace('pvp_decline_', ''));
             interaction.update({content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, parseInt(customId.split('_').pop()), battle);
        else if (customId === 'pvp_surrender') {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1, battle.p1.id === uid ? battle.p1 : battle.p2, "đầu hàng");
        }
        return;
    }

    // PVE ROUTING
    const battle = activeBattles.get(uid);
    
    if (customId.startsWith('challenge_')) {
        const petId = customId.replace('challenge_', '');
        const info = activeWildPets.get(petId);
        if (!info) return interaction.reply({ content: "⚠️ Pet này không tồn tại!", ephemeral: true });
        if (info.isBattling) return interaction.reply({ content: "⚠️ Pet này đang bị người khác đánh!", ephemeral: true });

        const userData = Database.getUser(uid);
        if (!userData.pets.length) return interaction.reply({ content: "🚫 Cần Pet!", ephemeral: true });

        info.isBattling = true; activeWildPets.set(petId, info);
        activeBattles.set(uid, {
            mode: 'pve', type: 'wild',
            playerPet: new Pet(userData.pets[0]),
            wildPet: info.petData,
            turn: 1, logs: ["⚔️ **Gặp Pet Hoang Dã!**"]
        });
        await showPvEInterface(interaction, uid);
    }
    else if (!battle && !['btn_kill', 'btn_catch', 'btn_claim', 'btn_defeat'].includes(customId)) {
         return interaction.reply({ content: "Hết phiên chiến đấu.", ephemeral: true });
    }
    else if (customId.startsWith('use_skill_')) await processPvETurn(interaction, parseInt(customId.split('_').pop()), battle);
    else if (['btn_kill', 'btn_catch', 'btn_claim', 'btn_defeat'].includes(customId)) await handlePvEEndActions(interaction, customId, client);
    else if (customId === 'btn_run') await handleRunAction(interaction, battle);
    else if (customId === 'btn_heal') await handleHealAction(interaction, battle);
}


// ==================================================================
// 3. LOGIC PVE & VIEW
// ==================================================================

async function showPvEInterface(interaction, uid) {
    const battle = activeBattles.get(uid);
    if (!battle) return;
    const { playerPet, wildPet } = battle;
    
    const pStats = playerPet.getStats();
    const wStats = wildPet.getStats(); 
    const wildColor = wildPet.getColor ? wildPet.getColor() : 0x0099FF;

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ PVE: ${playerPet.name} 🆚 ${wildPet.name}`)
        .setColor(wildColor)
        .addFields(
            { name: `You (Lv.${playerPet.level})`, value: `${createHealthBar(playerPet.currentHP, pStats.HP)}\nHP: ${Math.round(playerPet.currentHP)}/${pStats.HP} | MP: ${Math.round(playerPet.currentMP)}/${pStats.MP}`, inline: true },
            { name: `Enemy (Lv.${wildPet.level})`, value: `${createHealthBar(wildPet.currentHP, wStats.HP)}\nHP: ${Math.round(wildPet.currentHP)}/${wStats.HP} | MP: ${Math.round(wildPet.currentMP)}/${wStats.MP}`, inline: true }
        )
        .setDescription("```diff\n" + (battle.logs.slice(-6).join('\n') || "Start!") + "\n```");
    
    const img = getEmojiUrl(wildPet.icon);
    if (img) embed.setImage(img);

    const row1 = new ActionRowBuilder();
    const skills = playerPet.skills || ['S1']; 
    skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const canUse = s && playerPet.currentMP >= s.manaCost;
        row1.addComponents(new ButtonBuilder().setCustomId(`use_skill_${idx}`).setLabel(`${s?.name || 'Skill'} (${s?.manaCost})`).setStyle(ButtonStyle.Primary).setDisabled(!canUse));
    });
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_heal').setLabel('💊 Hồi Máu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_run').setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row1, row2] };
    if (interaction.message) await interaction.update(payload);
    else await interaction.reply({ ...payload, ephemeral: true });
}

async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    battle.logs = []; 
    const pSkillId = (playerPet.skills || ['S1'])[skillIndex];
    const pSkill = getSkillById(pSkillId);
    if (!pSkill) return interaction.reply({ content: "Lỗi skill!", ephemeral: true });

    // 1. Player Action
    const pStart = playerPet.processTurnEffects();
    if (pStart.log.length) battle.logs.push(...pStart.log);
    if (playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);

    if (playerPet.currentMP < pSkill.manaCost) {
         battle.logs.push(`⚠️ Thiếu MP!`);
         return showPvEInterface(interaction, interaction.user.id);
    }
    playerPet.currentMP -= pSkill.manaCost;

    const wildInfo = activeWildPets.get(wildPet.id);
    const weather = wildInfo ? wildInfo.weather : { buff: [] }; 
    const pRes = calculateDamage(playerPet, wildPet, pSkillId, weather);
    
    let pLog = pRes.isCrit ? `💥 **CRIT!**` : `👊`;
    pLog += ` **${playerPet.name}** dùng [${pSkill.name}] gây **${pRes.damage}** ST.`;
    if(pRes.multiplier > 1) pLog += " 🔥";
    battle.logs.push(pLog);

    wildPet.currentHP = Math.max(0, wildPet.currentHP - pRes.damage);
    processSkillEffect(playerPet, wildPet, pSkill, battle.logs, pRes.damage);

    if (wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

    // 2. Wild Pet Action (LOGIC TỐI ƯU HÓA)
    const wStart = wildPet.processTurnEffects();
    if (wStart.log.length) battle.logs.push(...wStart.log);
    if (wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

    // 2.1. Tìm skill mạnh nhất có thể dùng, nếu không thì mặc định là S1
    let wSkillId = 'S1';
    let wSkill = getSkillById('S1');
    
    // Tìm skill cao cấp hơn có đủ MP (ưu tiên skill đầu tiên tìm thấy)
    const highLevelSkill = (wildPet.skills || []).find(sid => {
        const s = getSkillById(sid);
        // Kiểm tra skill hợp lệ, có đủ MP, và không phải là S1
        return s && wildPet.currentMP >= s.manaCost && sid !== 'S1'; 
    });
    
    if (highLevelSkill) {
        wSkillId = highLevelSkill;
        wSkill = getSkillById(wSkillId);
    }
    
    // 2.2. Thực hiện tấn công
    if (!wSkill) {
        battle.logs.push(`❌ Lỗi Pet! Không thể tấn công.`);
    } 
    // Nếu có skill (là S1 hoặc skill cao cấp) VÀ Pet có đủ MP cho skill đó
    else if (wSkill && wildPet.currentMP >= wSkill.manaCost) {
        // Thực hiện tấn công
        wildPet.currentMP -= wSkill.manaCost;
        const wRes = calculateDamage(wildPet, playerPet, wSkillId, weather);
        playerPet.currentHP = Math.max(0, playerPet.currentHP - wRes.damage);
        
        const skillName = wSkillId === 'S1' ? 'Đòn Đánh Cơ Bản' : wSkill.name;
        battle.logs.push(`🔸 Địch dùng [${skillName}] gây **${wRes.damage}** ST.`);
        processSkillEffect(wildPet, playerPet, wSkill, battle.logs, wRes.damage);
    } 
    else {
        // Trường hợp không đủ MP cho skill cao cấp (Dự phòng)
        battle.logs.push(`💤 Địch nghỉ ngơi.`);
    }

    // 3. Save & Next
    const userData = Database.getUser(interaction.user.id);
    const pIdx = userData.pets.findIndex(p => p.id === playerPet.id);
    if(pIdx !== -1) {
        userData.pets[pIdx].currentHP = playerPet.currentHP;
        userData.pets[pIdx].currentMP = playerPet.currentMP;
        userData.pets[pIdx].activeEffects = playerPet.activeEffects;
        Database.updateUser(interaction.user.id, userData);
    }

    if (playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);
    battle.turn++;
    await showPvEInterface(interaction, interaction.user.id);
}

async function handleHealAction(interaction, battle) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    if (!userData.inventory?.candies?.normal || userData.inventory.candies.normal < 1) {
        battle.logs.push("🚫 Hết Kẹo!");
        return showPvEInterface(interaction, userId);
    }
    userData.inventory.candies.normal -= 1;
    const maxHP = battle.playerPet.getStats().HP;
    const heal = Math.floor(maxHP * 0.3);
    battle.playerPet.currentHP = Math.min(maxHP, battle.playerPet.currentHP + heal);
    Database.updateUser(userId, userData);
    battle.logs = [`💊 Hồi **${heal}** HP.`];
    // Boss hit
    const wRes = calculateDamage(battle.wildPet, battle.playerPet, 'S1', {buff: []});
    battle.playerPet.currentHP = Math.max(0, battle.playerPet.currentHP - wRes.damage);
    battle.logs.push(`🔸 Địch đánh **${wRes.damage}** ST.`);
    if (battle.playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);
    await showPvEInterface(interaction, userId);
}

async function handleRunAction(interaction, battle) {
    const petToClearId = battle.wildPet.id; 
    
    if (battle.type === 'adventure') {
        battle.logs.push("🚫 Không thể chạy!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    const rate = 0.5 + (battle.playerPet.getStats().SPD / battle.wildPet.getStats().SPD) * 0.2;
    if (Math.random() < rate) {
        activeBattles.delete(interaction.user.id);
        
        // --- SỬA LỖI: CHỈ XÓA PET KHỎI MAP, KHÔNG GỌI removePetFromWorld (KHÔNG XÓA TIN NHẮN) ---
        // Xóa Pet khỏi map activeWildPets
        if (activeWildPets.has(petToClearId)) {
            activeWildPets.delete(petToClearId);
        }
        
        // Cập nhật tin nhắn để thông báo chạy thành công (Tin nhắn cũ được sửa thành thông báo)
        return interaction.update({ content: "🏃 **Chạy thành công!**", embeds: [], components: [] });
    }
    battle.logs = ["❌ **Chạy thất bại!**"];
    const wRes = calculateDamage(battle.wildPet, battle.playerPet, 'S1', {buff: []});
    battle.playerPet.currentHP = Math.max(0, battle.playerPet.currentHP - wRes.damage);
    battle.logs.push(`🔸 Địch đánh **${wRes.damage}** ST.`);
    if(battle.playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);
    await showPvEInterface(interaction, interaction.user.id);
}

async function showPvEVictory(interaction, battle) {
    const { playerPet, wildPet, type } = battle;
    const userId = interaction.user.id;
    const totalXP = Math.round((wildPet.level * PET_XP_BASE + wildPet.getStats().HP / 10) * (type === 'adventure' ? 1.5 : 1));
    
    const userData = Database.getUser(userId);
    const pIdx = userData.pets.findIndex(p => p.id === playerPet.id);
    let lvMsg = "";
    if(pIdx !== -1) {
        const pInstance = new Pet(userData.pets[pIdx]);
        if (pInstance.addXp(totalXP)) lvMsg = `\n🆙 **LÊN CẤP ${pInstance.level}!**`;
        userData.pets[pIdx] = pInstance.getDataForSave();
        Database.updateUser(userId, userData);
    }
    activeBattles.delete(userId);

    const embed = new EmbedBuilder().setTitle("🏆 CHIẾN THẮNG").setColor(0x00FF00).setDescription(`Hạ gục **${wildPet.name}**!\nNhận: **${totalXP} XP** ${lvMsg}`);
    const row = new ActionRowBuilder();
    if (type === 'wild') {
        // Tính toán tỷ lệ bắt và hiển thị
        const catchRate = calculateCatchRate(playerPet, wildPet);
        embed.setFooter({ text: `Tỷ lệ bắt: ${Math.round(catchRate * 100)}%` });
        
        row.addComponents(
            new ButtonBuilder().setCustomId('btn_catch').setLabel('Bắt').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_kill').setLabel('Kết Liễu').setStyle(ButtonStyle.Danger)
        );
        // Xóa Pet khỏi world sau 60s để tránh bug/spam
        setTimeout(() => removePetFromWorld(wildPet.id, interaction.client), 60000); 
    } else {
        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));
    }
    await interaction.update({ embeds: [embed], components: [row] });
}

async function handlePvEEndActions(interaction, customId, client) {
    const userId = interaction.user.id;
    
    // Tìm petId từ messageId
    let targetPetId = null;
    let wildPetData = null;
    let playerPetData = null; // Thêm biến để lấy Pet của người chơi

    for (const [pid, info] of activeWildPets.entries()) {
        if (info.messageId === interaction.message.id) { 
            targetPetId = pid; 
            wildPetData = info.petData;
            break; 
        }
    }

    // Lấy Pet của người chơi từ trận chiến đã kết thúc
    const tempBattle = activeBattles.get(userId);
    if(tempBattle && tempBattle.playerPet) {
        playerPetData = tempBattle.playerPet;
    }

    if (customId === 'btn_defeat') {
        activeBattles.delete(userId);
        if (targetPetId) {
             const info = activeWildPets.get(targetPetId);
             if(info) { info.isBattling = false; activeWildPets.set(targetPetId, info); }
        }
        return interaction.update({ content: "💀 **THẤT BẠI!**", embeds: [], components: [] });
    }

    const wildInfo = activeWildPets.get(targetPetId);
    if (!wildInfo && customId !== 'btn_claim') return interaction.reply({ content: "⚠️ Pet không tồn tại.", ephemeral: true });

    if (customId === 'btn_catch') {
        // --- LOGIC BẮT PET MỚI ---
        const catchRate = calculateCatchRate(playerPetData, wildPetData); // Tính tỷ lệ bắt
        
        if (Math.random() < catchRate) { // Bắt thành công
            const userData = Database.getUser(userId);
            if (userData.pets.length >= 10) return interaction.followUp({ content: "🚫 Kho đầy!", ephemeral: true });
            
            wildPetData.ownerId = userId;
            // Reset HP cho Pet sau khi bắt
            wildPetData.currentHP = wildPetData.baseStats.HP; 
            
            const petToSave = wildPetData.getDataForSave ? wildPetData.getDataForSave() : wildPetData;
            Database.addPetToUser(userId, petToSave);
            await interaction.update({ content: `🎉 **BẮT THÀNH CÔNG!** Tỷ lệ bắt: **${Math.round(catchRate * 100)}%**`, embeds: [], components: [] });
        } else { // Bắt trượt
            await interaction.update({ content: `💢 **BẮT TRƯỢT!** Tỷ lệ bắt: **${Math.round(catchRate * 100)}%**`, embeds: [], components: [] });
        }
        // --- KẾT THÚC LOGIC BẮT PET MỚI ---
    } else if (customId === 'btn_kill') {
        const userData = Database.getUser(userId);
        userData.inventory.candies.normal = (userData.inventory.candies.normal || 0) + 2;
        Database.updateUser(userId, userData);
        await interaction.update({ content: `🔪 Đã kết liễu. Nhận **2 🍬**.`, embeds: [], components: [] });
    } else {
        await interaction.update({ content: "✅ Xong.", embeds: [], components: [] });
    }
    
    // Chỉ xóa tin nhắn nếu là Pet Wild (có targetPetId)
    if (targetPetId) removePetFromWorld(targetPetId, client);
}

// ==================================================================
// 5. LOGIC PVP
// ==================================================================

async function startPvPMatch(interaction, cid) {
    const { challenger, opponent } = pendingChallenges.get(cid);
    pendingChallenges.delete(cid);
    const p1 = new Pet(Database.getUser(challenger.id).pets[0]);
    const p2 = new Pet(Database.getUser(opponent.id).pets[0]);
    const state = {
        mode: 'pvp', p1: { user: challenger, pet: p1, id: challenger.id }, p2: { user: opponent, pet: p2, id: opponent.id },
        turnOwner: (p1.getStats().SPD >= p2.getStats().SPD) ? challenger.id : opponent.id,
        round: 1, logs: ["⚡ **Bắt đầu!**"]
    };
    activeBattles.set(challenger.id, state);
    activeBattles.set(opponent.id, state);
    await updatePvPInterface(interaction, state);
}

async function updatePvPInterface(interaction, battle) {
    const { p1, p2, turnOwner } = battle;
    const p1Stats = p1.pet.getStats(); const p2Stats = p2.pet.getStats();
    const embed = new EmbedBuilder().setTitle(`⚔️ PVP`).setColor(0xFF0000)
        .addFields(
            { name: `${p1.pet.name}`, value: `${createHealthBar(p1.pet.currentHP, p1Stats.HP)}\nHP: ${Math.round(p1.pet.currentHP)} | MP: ${Math.round(p1.pet.currentMP)}`, inline: true },
            { name: `${p2.pet.name}`, value: `${createHealthBar(p2.pet.currentHP, p2Stats.HP)}\nHP: ${Math.round(p2.pet.currentHP)} | MP: ${Math.round(p2.pet.currentMP)}`, inline: true }
        ).setDescription(`👉 <@${turnOwner}>`);
    
    const current = turnOwner === p1.id ? p1 : p2;
    const row = new ActionRowBuilder();
    current.pet.skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        row.addComponents(new ButtonBuilder().setCustomId(`pvp_skill_${idx}`).setLabel(s ? s.name : 'Skill').setStyle(ButtonStyle.Primary).setDisabled(current.pet.currentMP < s?.manaCost));
    });
    row.addComponents(new ButtonBuilder().setCustomId('pvp_surrender').setLabel('🏳️').setStyle(ButtonStyle.Secondary));
    
    const payload = { content: `Lượt của <@${turnOwner}>`, embeds: [embed], components: [row] };
    if(interaction.message) await interaction.update(payload); else await interaction.reply(payload);
}

async function processPvPTurn(interaction, idx, battle) {
    const uid = interaction.user.id;
    if (battle.turnOwner !== uid) return interaction.reply({ content: "Chưa đến lượt!", ephemeral: true });
    const atk = uid === battle.p1.id ? battle.p1 : battle.p2;
    const def = uid === battle.p1.id ? battle.p2 : battle.p1;
    const skill = getSkillById((atk.pet.skills || ['S1'])[idx]);
    
    if (atk.pet.currentMP < skill.manaCost) return interaction.reply({ content: "Thiếu MP!", ephemeral: true });
    atk.pet.currentMP -= skill.manaCost;

    const res = calculateDamage(atk.pet, def.pet, skill.id, {buff:[]});
    def.pet.currentHP = Math.max(0, def.pet.currentHP - res.damage);
    processSkillEffect(atk.pet, def.pet, skill, battle.logs, res.damage);

    if (def.pet.currentHP <= 0) {
        activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
        return interaction.update({ content: `🏆 **${atk.user.username}** thắng!`, embeds: [], components: [] });
    }
    battle.turnOwner = def.id;
    await updatePvPInterface(interaction, battle);
}

async function endPvP(interaction, battle, winner) {
    activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
    await interaction.update({ content: `🏆 **${winner.user.username}** thắng (đối thủ đầu hàng)!`, embeds: [], components: [] });
}