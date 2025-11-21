import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} from 'discord.js';

import { activeWildPets } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
import { Pet, calculateDamage, processSkillEffect, createDungeonBoss } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { ELEMENT_ICONS, RARITY_COLORS } from './Constants.mjs';

const PET_XP_BASE = 100;
const DEATH_COOLDOWN = 10 * 60 * 1000; // 10 Phút
const activeBattles = new Map(); 
const pendingChallenges = new Map();

// ==========================================
// 1. HELPERS
// ==========================================

const BASE_CATCH_RATES = {
    'Common': 0.50, 'Uncommon': 0.40, 'Rare': 0.25, 
    'Epic': 0.15, 'Legendary': 0.05, 'Boss': 0.01 
};

function calculateCatchRate(playerPet, wildPet) {
    const rarityKey = wildPet.rarity in BASE_CATCH_RATES ? wildPet.rarity : 'Common';
    const baseRate = BASE_CATCH_RATES[rarityKey];
    const playerLevel = playerPet.level;
    const wildLevel = wildPet.level;
    const levelDiff = playerLevel - wildLevel;
    let levelBonus = Math.min(0.15, Math.max(-0.15, levelDiff * 0.01));
    let finalRate = baseRate + levelBonus;
    return Math.max(0.005, Math.min(1.0, finalRate));
}

function createStatusBar(current, max, color = 'HP') {
    const totalBars = 8; 
    const safeMax = max > 0 ? max : 1;
    const percent = Math.max(0, Math.min(current / safeMax, 1));
    const filledBars = Math.round(percent * totalBars);
    
    let filledEmoji = '🟩';
    if (color === 'MP') filledEmoji = '🟦';
    else if (color === 'EnemyHP') filledEmoji = '🟥'; 
    
    const emptyEmoji = '⬛'; 
    const filled = filledEmoji.repeat(filledBars);
    const empty = emptyEmoji.repeat(Math.max(0, totalBars - filledBars)); 
    return `${filled}${empty} | ${Math.round(current)}`;
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

function checkPetStatus(petData) {
    if (!petData.deathTime) return { isDead: false };
    const now = Date.now();
    if (now < petData.deathTime + DEATH_COOLDOWN) {
        const remaining = Math.ceil((petData.deathTime + DEATH_COOLDOWN - now) / 60000);
        return { isDead: true, remaining };
    } else {
        petData.deathTime = null;
        if (petData.currentHP <= 0) petData.currentHP = 1; 
        return { isDead: false, revived: true };
    }
}

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
    if (activeBattles.has(userId)) return interaction.reply({ content: "🚫 Bạn đang bận!", flags: [MessageFlags.Ephemeral] });
    
    const userData = Database.getUser(userId);
    if (!userData.pets.length) return interaction.reply({ content: "🚫 Cần có Pet!", flags: [MessageFlags.Ephemeral] });
    
    // 💡 LẤY PET ĐỒNG HÀNH
    const petIndex = userData.activePetIndex !== undefined ? userData.activePetIndex : 0;

    // VÀO TRẬN LUÔN
    await startBattleLogic(interaction, userId, userData, petIndex, 'adventure', difficulty);
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

// Hàm khởi tạo trận đấu (Chung cho Adventure & Wild)
async function startBattleLogic(interaction, userId, userData, petIndex, type, param) {
    // 1. Defer an toàn (chỉ defer nếu chưa defer)
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply(); 
        }
    } catch (e) { console.log("Ack error:", e.message); }

    // 2. Kiểm tra Pet Đồng Hành hợp lệ
    if (!userData.pets[petIndex]) {
        petIndex = 0;
        if (!userData.pets[0]) return interaction.editReply({ content: "🚫 Bạn không còn Pet nào để chiến đấu!" });
        userData.activePetIndex = 0; 
        Database.updateUser(userId, userData);
    }
    
    const petData = userData.pets[petIndex];

    // 3. Check Chết
    const petCheck = checkPetStatus(petData);
    if (petCheck.isDead) {
        return interaction.editReply({ 
            content: `💀 **${petData.name}** (Đồng hành) đang trọng thương!\nCần nghỉ ngơi thêm **${petCheck.remaining} phút**.\n*Hãy vào \`/inventory\` để hồi phục hoặc chọn Pet khác.*`, 
            components: [] 
        });
    }
    if (petCheck.revived) Database.updateUser(userId, userData);

    // 4. Xác định đối thủ
    let wildPetInstance;
    let wildPetId = null;

    if (type === 'adventure') {
        wildPetInstance = createDungeonBoss(param); 
    } else if (type === 'wild') {
        wildPetInstance = param.petData; 
        wildPetId = param.petId; 
    }

    // 5. Tạo Session Battle
    activeBattles.set(userId, {
        mode: 'pve', type: type, difficulty: type === 'adventure' ? param : 1,
        playerPet: new Pet(petData), 
        wildPet: wildPetInstance, 
        wildPetId: wildPetId, 
        turn: 1, logs: ["⚔️ **Trận đấu bắt đầu!**"]
    });

    // 6. Chuyển cảnh sang giao diện chiến đấu
    const msg = await interaction.editReply({ content: "🔥 Đang vào trận...", components: [] });
    const battle = activeBattles.get(userId);
    if (battle) battle.messageId = msg.id;

    await showPvEInterface(interaction, userId);
}

export async function handleInteraction(interaction) {
    const { customId, user, client } = interaction;
    const uid = user.id;

    // 1. XỬ LÝ NÚT "KHIÊU CHIẾN" (WILD PET)
    if (customId.startsWith('challenge_')) {
        const petId = customId.replace('challenge_', '');
        const info = activeWildPets.get(petId);
        
        // Defer ngay lập tức để tránh timeout
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

        if (!info) return interaction.editReply({ content: "⚠️ Pet này không tồn tại hoặc đã biến mất!" });
        if (info.isBattling) return interaction.editReply({ content: "⚠️ Pet này đang bị người khác đánh!" });

        const userData = Database.getUser(uid);
        if (!userData.pets.length) return interaction.editReply({ content: "🚫 Bạn cần có Pet để chiến đấu!" });

        // 💡 TỰ ĐỘNG LẤY PET ĐỒNG HÀNH
        const petIndex = userData.activePetIndex !== undefined ? userData.activePetIndex : 0;

        // Đánh dấu Pet Wild đang bận
        info.isBattling = true; 
        activeWildPets.set(petId, info);
        
        // Bắt đầu chiến đấu ngay
        await startBattleLogic(interaction, uid, userData, petIndex, 'wild', { petData: info.petData, petId: petId });
        return;
    }

    // 2. PVP ROUTING
    if (customId.startsWith('pvp_')) {
        const battle = activeBattles.get(uid);
        if (!interaction.deferred && !interaction.replied && customId !== 'pvp_accept_') await interaction.deferUpdate(); 

        if (customId.startsWith('pvp_accept_')) await startPvPMatch(interaction, customId.replace('pvp_accept_', ''));
        else if (customId.startsWith('pvp_decline_')) {
             pendingChallenges.delete(customId.replace('pvp_decline_', ''));
             await interaction.editReply({content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, parseInt(customId.split('_').pop()), battle);
        else if (customId === 'pvp_surrender') {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1, battle.p1.id === uid ? battle.p1 : battle.p2, "đầu hàng");
        }
        return;
    }

    // 3. LOGIC TRONG TRẬN ĐẤU (PVE)
    const battle = activeBattles.get(uid);
    
    // Defer cho các nút skill/hành động trong trận
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

    if (!battle && !['btn_claim', 'btn_defeat'].includes(customId)) {
          return interaction.editReply({ content: "Hết phiên chiến đấu.", embeds: [], components: [] });
    }
    else if (customId.startsWith('use_skill_')) await processPvETurn(interaction, parseInt(customId.split('_').pop()), battle);
    else if (['btn_claim', 'btn_defeat'].includes(customId)) await handlePvEEndActions(interaction, customId, client); 
    else if (customId === 'btn_catch') await handleCatchAction(interaction, battle); 
    else if (customId === 'btn_run') await handleRunAction(interaction, battle);
    else if (customId === 'btn_heal') await handleHealAction(interaction, battle);
    else if (customId === 'btn_mana') await handleManaAction(interaction, battle);
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

    const playerInfo = 
`❤️ ${createStatusBar(playerPet.currentHP, pStats.HP, 'HP')}
✨ ${createStatusBar(playerPet.currentMP, pStats.MP, 'MP')}`;

    const wildInfo = 
`❤️ ${createStatusBar(wildPet.currentHP, wStats.HP, 'EnemyHP')}
✨ ${createStatusBar(wildPet.currentMP, wStats.MP, 'MP')}`;

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${playerPet.name} 🆚 ${wildPet.name}`)
        .setColor(wildColor)
        .setDescription("```yaml\n" + (battle.logs.slice(-5).join('\n') || "Trận đấu bắt đầu!") + "\n```")
        .addFields(
            { name: `🛡️ Phe Ta: ${playerPet.name} (Lv.${playerPet.level})`, value: playerInfo, inline: true },
            { name: `⚔️ Phe Địch: ${wildPet.name} (Lv.${wildPet.level})`, value: wildInfo, inline: true }
        );
    
    const wildImg = getEmojiUrl(wildPet.icon);
    const playerImg = getEmojiUrl(playerPet.icon); 

    if (wildImg) embed.setThumbnail(wildImg);
    if (playerImg) embed.setImage(playerImg);

    const row1 = new ActionRowBuilder();
    const skills = playerPet.skills || ['S1']; 
    skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const canUse = s && playerPet.currentMP >= s.manaCost;
        const btnLabel = s ? `${s.name} | ⚔️${s.power} 💧${s.manaCost}`.slice(0, 80) : 'Skill';
        row1.addComponents(new ButtonBuilder().setCustomId(`use_skill_${idx}`).setLabel(btnLabel).setStyle(ButtonStyle.Primary).setDisabled(!canUse));
    });
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_heal').setLabel('💊 Hồi Máu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_mana').setLabel('💧 Hồi Mana').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_run').setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    if (battle.type === 'wild') {
        const catchRate = calculateCatchRate(playerPet, wildPet);
        const catchBtn = new ButtonBuilder()
            .setCustomId('btn_catch')
            .setLabel(`⭐ Bắt (${Math.round(catchRate * 100)}%)`) 
            .setStyle(ButtonStyle.Success)
            .setDisabled(wildPet.currentHP <= 0); 
            
        row2.addComponents(catchBtn);
    }

    const payload = { embeds: [embed], components: [row1, row2] };
    
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    battle.logs = []; 
    const pSkillId = (playerPet.skills || ['S1'])[skillIndex];
    const pSkill = getSkillById(pSkillId);
    if (!pSkill) return interaction.editReply({ content: "Lỗi skill!" });

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
    
    let pLog = pRes.isCrit ? `💥 CRIT!` : `👊`;
    if (pRes.isEvaded) {
        pLog = `👻 **${wildPet.name}** đã NÉ hoàn toàn đòn đánh!`;
    } else {
        pLog += ` **${playerPet.name}** dùng [${pSkill.name}] gây **${pRes.damage}** ST.`;
        if(pRes.multiplier > 1) pLog += " 🔥";
    }
    battle.logs.push(pLog);

    if (!pRes.isEvaded) {
        wildPet.currentHP = Math.max(0, wildPet.currentHP - pRes.damage);
        if (pRes.vampHeal > 0) battle.logs.push(`🩸 **${playerPet.name}** hút ${pRes.vampHeal} HP.`);
        if (pRes.thornDamage > 0) battle.logs.push(`🌵 **${playerPet.name}** bị phản ${pRes.thornDamage} ST.`);
    }

    processSkillEffect(playerPet, wildPet, pSkill, battle.logs, pRes.damage);

    if (wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

    // 2. Wild Pet Action
    await processEnemyTurn(interaction, battle);
}

// Tách hàm xử lý lượt địch
async function processEnemyTurn(interaction, battle) {
    const { playerPet, wildPet } = battle;
    const wildInfo = activeWildPets.get(wildPet.id);
    const weather = wildInfo ? wildInfo.weather : { buff: [] };

    const wStart = wildPet.processTurnEffects();
    if (wStart.log.length) battle.logs.push(...wStart.log);
    if (wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

    let wSkillId = 'S1';
    let wSkill = getSkillById('S1');
    
    const highLevelSkill = (wildPet.skills || []).find(sid => {
        const s = getSkillById(sid);
        return s && wildPet.currentMP >= s.manaCost && sid !== 'S1'; 
    });
    
    if (highLevelSkill) {
        wSkillId = highLevelSkill;
        wSkill = getSkillById(wSkillId);
    }
    
    if (wSkill && wildPet.currentMP >= wSkill.manaCost) {
        wildPet.currentMP -= wSkill.manaCost;
        const wRes = calculateDamage(wildPet, playerPet, wSkillId, weather);
        
        let wLog = `🔸 Địch dùng [${wSkillId === 'S1' ? 'Đánh thường' : wSkill.name}]`;
        if (wRes.isEvaded) {
            wLog += ` nhưng **${playerPet.name}** đã NÉ ĐƯỢC!`;
        } else {
            wLog += ` gây **${wRes.damage}** ST.`;
            playerPet.currentHP = Math.max(0, playerPet.currentHP - wRes.damage);
            if (wRes.vampHeal > 0) battle.logs.push(`🩸 Địch hút ${wRes.vampHeal} HP.`);
            if (wRes.thornDamage > 0) battle.logs.push(`🌵 Địch bị phản ${wRes.thornDamage} ST.`);
        }
        battle.logs.push(wLog);
        processSkillEffect(wildPet, playerPet, wSkill, battle.logs, wRes.damage);
    } else {
        battle.logs.push(`💤 Địch nghỉ ngơi.`);
    }

    // 💡 LƯU TRẠNG THÁI VÀO ĐÚNG SLOT PET
    const userData = Database.getUser(interaction.user.id);
    // Tìm pet đang chiến đấu trong kho của user
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
    if (!userData.inventory.potions) userData.inventory.potions = 5;

    if (userData.inventory.potions < 1) {
        battle.logs.push("🚫 Hết Thuốc (Potion)!");
        return showPvEInterface(interaction, userId);
    }
    userData.inventory.potions -= 1;
    const maxHP = battle.playerPet.getStats().HP;
    const heal = Math.floor(maxHP * 0.3);
    battle.playerPet.currentHP = Math.min(maxHP, battle.playerPet.currentHP + heal);
    
    Database.updateUser(userId, userData);
    battle.logs = [`💊 Hồi **${heal}** HP (-1 Potion).`];
    await processEnemyTurn(interaction, battle);
}

async function handleManaAction(interaction, battle) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    if (!userData.inventory.potions) userData.inventory.potions = 5;

    if (userData.inventory.potions < 1) {
        battle.logs.push("🚫 Hết Thuốc (Potion)!");
        return showPvEInterface(interaction, userId);
    }
    userData.inventory.potions -= 1;
    const maxMP = battle.playerPet.getStats().MP;
    const restore = Math.floor(maxMP * 0.3); 
    battle.playerPet.currentMP = Math.min(maxMP, battle.playerPet.currentMP + restore);
    
    Database.updateUser(userId, userData);
    battle.logs = [`💧 Hồi **${restore}** MP (-1 Potion).`];
    await processEnemyTurn(interaction, battle);
}

async function handleRunAction(interaction, battle) {
    const petToClearId = battle.wildPetId; 
    if (battle.type === 'adventure') {
        battle.logs.push("🚫 Không thể chạy!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    const rate = 0.5 + (battle.playerPet.getStats().SPD / battle.wildPet.getStats().SPD) * 0.2;
    if (Math.random() < rate) {
        activeBattles.delete(interaction.user.id);
        
        if (petToClearId) {
            removePetFromWorld(petToClearId, interaction.client);
        }

        return interaction.editReply({ content: "🏃 **Chạy thành công!**", embeds: [], components: [] });
    }
    battle.logs = ["❌ **Chạy thất bại!**"];
    
    if (petToClearId) {
         const info = activeWildPets.get(petToClearId);
         if(info) { info.isBattling = false; activeWildPets.set(petToClearId, info); }
    }
    
    const wRes = calculateDamage(battle.wildPet, battle.playerPet, 'S1', {buff: []});
    battle.playerPet.currentHP = Math.max(0, battle.playerPet.currentHP - wRes.damage);
    battle.logs.push(`🔸 Địch đánh **${wRes.damage}** ST.`);
    
    if(battle.playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);
    await showPvEInterface(interaction, interaction.user.id);
}

// Xử lý nút bắt trong trận đấu
async function handleCatchAction(interaction, battle) {
    const userId = interaction.user.id;
    const { playerPet, wildPet, wildPetId } = battle;

    if (battle.type !== 'wild') {
        battle.logs.push("🚫 Không thể bắt pet này.");
        return showPvEInterface(interaction, userId);
    }

    const userData = Database.getUser(userId);
    if (!userData.pets) userData.pets = [];
    if (userData.pets.length >= 10) {
        battle.logs.push("🚫 Kho Pet đã đầy (Tối đa 10).");
        await processEnemyTurn(interaction, battle);
        return;
    }

    const catchRate = calculateCatchRate(playerPet, wildPet);

    if (Math.random() < catchRate) {
        // 🚨 Bắt Thành Công
        wildPet.ownerId = userId;
        const wildPetStats = wildPet.getStats ? wildPet.getStats() : wildPet.baseStats;
        wildPet.currentHP = wildPetStats.HP; // Hồi phục Pet
        wildPet.currentMP = wildPetStats.MP;
        
        const petToSave = wildPet.getDataForSave ? wildPet.getDataForSave() : wildPet;
        Database.addPetToUser(userId, petToSave);
        
        battle.logs = [`🎉 **BẮT THÀNH CÔNG!** (${Math.round(catchRate * 100)}%) ${wildPet.name} đã được thêm vào kho. Trận đấu kết thúc.`];
        
        // Dọn dẹp trạng thái và tin nhắn
        activeBattles.delete(userId);
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);
        
        await interaction.editReply({ 
            content: battle.logs.join('\n'), 
            embeds: [], 
            components: [] 
        });

    } else {
        // ❌ Bắt Thất Bại
        battle.logs = [`💢 **BẮT TRƯỢT!** (${Math.round(catchRate * 100)}%)`];
        
        // Bị Địch đánh trả 1 lượt
        await processEnemyTurn(interaction, battle);
    }
}


async function showPvEVictory(interaction, battle) {
    const { playerPet, wildPet, type, wildPetId } = battle;
    const userId = interaction.user.id;
    const totalXP = Math.round((wildPet.level * PET_XP_BASE + wildPet.getStats().HP / 10) * (type === 'adventure' ? 1.5 : 1));
    
    const userData = Database.getUser(userId);
    const pIdx = userData.pets.findIndex(p => p.id === playerPet.id);
    let lvMsg = "";
    
    if(pIdx !== -1) {
        const pInstance = new Pet(userData.pets[pIdx]);
        // Dùng addExp thay vì addXp (theo GameLogic mới)
        if (pInstance.addExp(totalXP)) lvMsg = `\n🆙 **LÊN CẤP ${pInstance.level}!**`;
        pInstance.currentHP = pInstance.getStats().HP;
        pInstance.currentMP = pInstance.getStats().MP;
        userData.pets[pIdx] = pInstance.getDataForSave();
        Database.updateUser(userId, userData);
    }
    activeBattles.delete(userId);

    const embed = new EmbedBuilder().setTitle("🏆 CHIẾN THẮNG (Pet đã hồi phục)").setColor(0x00FF00).setDescription(`Hạ gục **${wildPet.name}**!\nNhận: **${totalXP} XP** ${lvMsg}`);
    const row = new ActionRowBuilder();
    
    if (type === 'wild') {
        // TỰ ĐỘNG THỰC HIỆN KẾT LIỄU VÀ TRAO THƯỞNG
        userData.inventory.candies.normal = (userData.inventory.candies.normal || 0) + 2;
        userData.inventory.potions = (userData.inventory.potions || 0) + 1; 
        Database.updateUser(userId, userData);

        embed.setDescription(embed.data.description + `\n\n🔪 Đã kết liễu tự động.\nNhận **2 🍬 Kẹo & 1 💊 Thuốc**.`);
        
        // Xóa Pet Wild ngay khi đã xác định kết thúc
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);

        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));

    } else {
        // Adventure
        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));
    }
    
    await interaction.editReply({ embeds: [embed], components: [row] });
}


async function handlePvEEndActions(interaction, customId, client) {
    const userId = interaction.user.id;
    const tempBattle = activeBattles.get(userId);
    let targetPetId = tempBattle ? tempBattle.wildPetId : null;
    let playerPetData = tempBattle ? tempBattle.playerPet : null;

    // Fallback tìm ID Pet từ tin nhắn nếu không có Battle State (dùng cho tin nhắn cũ/expired)
    if (!targetPetId) {
        for (const [pid, info] of activeWildPets.entries()) {
            if (info.messageId === interaction.message.id) { 
                targetPetId = pid; break;
            }
        }
    }

    if (customId === 'btn_defeat') {
        activeBattles.delete(userId);
        if (targetPetId) {
            const info = activeWildPets.get(targetPetId);
            if(info) { 
                info.isBattling = false; activeWildPets.set(targetPetId, info); 
            }
        }
        // Death Cooldown
        const userData = Database.getUser(userId);
        const pIdx = userData.pets.findIndex(p => p.id === playerPetData?.id);
        if (pIdx !== -1) {
            userData.pets[pIdx].deathTime = Date.now();
            Database.updateUser(userId, userData);
        }
        return interaction.editReply({ content: "💀 **THẤT BẠI!** Pet đã trọng thương (Nghỉ 10p).", embeds: [], components: [] });
    }

    if (customId === 'btn_claim') {
        await interaction.editReply({ content: "✅ Xong.", embeds: [], components: [] });
    } 

    // Xóa Pet Wild KHỎI THẾ GIỚI chỉ khi CLAIM thành công
    if (targetPetId && customId === 'btn_claim') {
        removePetFromWorld(targetPetId, client); 
    }
}

// ==================================================================
// 5. LOGIC PVP
// ==================================================================

async function startPvPMatch(interaction, cid) {
    const { challenger, opponent } = pendingChallenges.get(cid);
    pendingChallenges.delete(cid);
    
    // 💡 SỬA ĐỔI: Lấy Pet theo activePetIndex thay vì pets[0]
    const u1 = Database.getUser(challenger.id);
    const u2 = Database.getUser(opponent.id);
    
    const p1Index = u1.activePetIndex !== undefined ? u1.activePetIndex : 0;
    const p2Index = u2.activePetIndex !== undefined ? u2.activePetIndex : 0;

    const p1Data = u1.pets[p1Index] || u1.pets[0];
    const p2Data = u2.pets[p2Index] || u2.pets[0];

    if (!p1Data || !p2Data) {
        return interaction.editReply({ content: "❌ Một trong hai người chơi không có Pet hoặc lỗi dữ liệu!" });
    }

    const p1 = new Pet(p1Data);
    const p2 = new Pet(p2Data);

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
    
    const p1Display = `❤️ ${createStatusBar(p1.pet.currentHP, p1Stats.HP, 'HP')}\n✨ ${createStatusBar(p1.pet.currentMP, p1Stats.MP, 'MP')}`;
    const p2Display = `❤️ ${createStatusBar(p2.pet.currentHP, p2Stats.HP, 'EnemyHP')}\n✨ ${createStatusBar(p2.pet.currentMP, p2Stats.MP, 'MP')}`;

    const embed = new EmbedBuilder().setTitle(`⚔️ PVP`).setColor(0xFF0000)
        .addFields(
            { name: `${p1.pet.name}`, value: p1Display, inline: true },
            { name: `${p2.pet.name}`, value: p2Display, inline: true }
        ).setDescription(`👉 <@${turnOwner}>`);
    
    const p1Img = getEmojiUrl(p1.pet.icon);
    const p2Img = getEmojiUrl(p2.pet.icon); 
    if (p2Img) embed.setThumbnail(p2Img); 
    if (p1Img) embed.setImage(p1Img); 

    const current = turnOwner === p1.id ? p1 : p2;
    const row = new ActionRowBuilder();
    current.pet.skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const btnLabel = s ? `${s.name} | ⚔️${s.power}`.slice(0, 80) : 'Skill';
        row.addComponents(new ButtonBuilder().setCustomId(`pvp_skill_${idx}`).setLabel(btnLabel).setStyle(ButtonStyle.Primary).setDisabled(current.pet.currentMP < s?.manaCost));
    });
    row.addComponents(new ButtonBuilder().setCustomId('pvp_surrender').setLabel('🏳️').setStyle(ButtonStyle.Secondary));
    
    const payload = { content: `Lượt của <@${turnOwner}>`, embeds: [embed], components: [row] };
    if(interaction.replied || interaction.deferred) await interaction.editReply(payload); else await interaction.reply(payload);
}

async function processPvPTurn(interaction, idx, battle) {
    const uid = interaction.user.id;
    if (battle.turnOwner !== uid) return interaction.reply({ content: "Chưa đến lượt!", flags: [MessageFlags.Ephemeral] });
    const atk = uid === battle.p1.id ? battle.p1 : battle.p2;
    const def = uid === battle.p1.id ? battle.p2 : battle.p1;
    const skill = getSkillById((atk.pet.skills || ['S1'])[idx]);
    
    if (atk.pet.currentMP < skill.manaCost) return interaction.reply({ content: "Thiếu MP!", flags: [MessageFlags.Ephemeral] });
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
    await interaction.editReply({ content: `🏆 **${winner.user.username}** thắng (đối thủ đầu hàng)!`, embeds: [], components: [] });
}