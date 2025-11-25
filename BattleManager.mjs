import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} from 'discord.js';

import { activeWildPets } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
import { Pet, calculateDamage, processSkillEffect, createBossPet } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { RARITY_CONFIG, REWARD_CONFIG, EMOJIS, RARITY } from './Constants.mjs';
import { showCatchBallInterface, handleCatchAction } from './CatchSystem.mjs';

const PET_XP_BASE = 100;
const DEATH_COOLDOWN = 10 * 60 * 1000; // 10 Phút

// --- [EXPORT] BIẾN TOÀN CỤC ---
export const activeBattles = new Map(); 
const pendingChallenges = new Map();

// ==========================================
// 1. HELPERS & SAFE UI (FIXED)
// ==========================================

// [FIX QUAN TRỌNG] Logic an toàn tuyệt đối cho SafeUI
export async function safeUpdateInterface(interaction, payload) {
    try {
        // Kiểm tra trạng thái thực tế của interaction
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        } else {
            // Nếu chưa defer/reply, phải dùng update (cho button) hoặc reply
            // Ở đây mặc định là update cho các nút bấm
            return await interaction.update(payload);
        }
    } catch (e) {
        // Xử lý các mã lỗi cụ thể
        if (e.code === 40060 || e.code === 'InteractionAlreadyReplied') {
            // Đã trả lời rồi mà không biết -> Cố gắng edit
            try { return await interaction.editReply(payload); } catch (err) {}
        } 
        else if (e.code === 'InteractionNotReplied') {
            // Chưa trả lời mà lại gọi edit -> Cố gắng update
            try { return await interaction.update(payload); } catch (err) {}
        }
        else if (e.code !== 10062) { // 10062 = Unknown Interaction (Hết hạn)
             console.error("SafeUI Error:", e.message);
        }
    }
}

// [FIX] Hàm Defer an toàn
async function safeDefer(interaction, type = 'update') {
    try {
        if (!interaction.deferred && !interaction.replied) {
            if (type === 'update') await interaction.deferUpdate();
            else await interaction.deferReply();
        }
    } catch (e) { /* Bỏ qua lỗi */ }
}

// [EXPORT] Hàm tính tỷ lệ bắt 
export function calculateCatchRate(playerPet, wildPet) {
    const rarityData = RARITY_CONFIG[wildPet.rarity] || RARITY_CONFIG['Common'];
    let baseRate = rarityData.ballRate || 0.5; 
    const levelDiff = playerPet.level - wildPet.level;
    let levelBonus = Math.max(-0.2, Math.min(0.2, levelDiff * 0.02)); 
    const hpPercent = wildPet.currentHP / wildPet.getStats().HP;
    let hpBonus = (1 - hpPercent) * 0.3; 
    return Math.max(0.01, Math.min(1.0, baseRate + levelBonus + hpBonus));
}

function createStatusBar(current, max, color = 'HP') {
    const totalBars = 8; 
    const safeMax = max > 0 ? max : 1;
    const percent = Math.max(0, Math.min(current / safeMax, 1));
    const filledBars = Math.round(percent * totalBars);
    let filledEmoji = '🟩';
    if (color === 'MP') filledEmoji = '🟦'; else if (color === 'EnemyHP') filledEmoji = '🟥'; 
    const filled = filledEmoji.repeat(filledBars);
    const empty = '⬛'.repeat(Math.max(0, totalBars - filledBars)); 
    return `${filled}${empty} | ${Math.round(current)}`;
}

function getEmojiUrl(emojiStr) {
    if (!emojiStr) return null;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}?size=96`;
    return null; 
}

function checkPetStatus(petData) {
    if (!petData.deathTime) return { isDead: false };
    const now = Date.now();
    if (now < petData.deathTime + DEATH_COOLDOWN) {
        return { isDead: true, remaining: Math.ceil((petData.deathTime + DEATH_COOLDOWN - now) / 60000) };
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

// --- HỆ THỐNG THỜI TIẾT & RAID ---
const WEATHER_DATA = {
    'SUNNY': { name: '☀️ Nắng Gắt', buff: ['Fire', 'Light'], nerf: ['Water', 'Dark'], desc: 'Buff Fire/Light, Nerf Water/Dark.' },
    'RAINY': { name: '🌧️ Mưa Rào', buff: ['Water', 'Ice'], nerf: ['Fire', 'Earth'], desc: 'Buff Water/Ice, Nerf Fire/Earth.' },
    'SANDSTORM': { name: '🌪️ Bão Cát', buff: ['Earth', 'Rock'], nerf: ['Wind', 'Lightning'], desc: 'Buff Earth/Rock, Nerf Wind/Lightning.' },
    'CLEAR': { name: '☁️ Trời Quang', buff: [], nerf: [], desc: 'Không hiệu ứng.' }
};

let globalRaidManager = null;
export function setRaidManagerRef(manager) {
    globalRaidManager = manager;
    console.log("✅ BattleManager đã kết nối với RaidBossManager.");
}

// ==========================================
// 2. ROUTER & INIT
// ==========================================

export async function startAdventure(interaction, difficulty) {
    const userId = interaction.user.id;
    if (activeBattles.has(userId)) return interaction.reply({ content: "🚫 Bạn đang bận!", flags: [MessageFlags.Ephemeral] });
    
    const userData = Database.getUser(userId);
    if (!userData.pets.length) return interaction.reply({ content: "🚫 Cần có Pet!", flags: [MessageFlags.Ephemeral] });
    
    const petIndex = userData.activePetIndex || 0;

    await safeDefer(interaction, 'reply');
    await startBattleLogic(interaction, userId, userData, petIndex, 'adventure', difficulty);
}

export async function createPvPChallenge(interaction, opponent) {
    const serverId = interaction.guildId;
    const arenaChannelId = Database.getArenaChannel(serverId);
    
    if (arenaChannelId && interaction.channelId !== arenaChannelId) {
        return interaction.reply({ content: `⚠️ **PvP không hợp lệ!** Vui lòng vào đấu trường <#${arenaChannelId}>.`, flags: [MessageFlags.Ephemeral] });
    }

    const cid = `${interaction.user.id}_vs_${opponent.id}`;
    pendingChallenges.set(cid, { challenger: interaction.user, opponent, time: Date.now() });
    const embed = new EmbedBuilder().setTitle("⚔️ THÁCH ĐẤU").setDescription(`**${interaction.user.username}** VS **${opponent.username}**`).setColor(0xFFA500);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pvp_accept_${cid}`).setLabel('Chiến').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pvp_decline_${cid}`).setLabel('Sợ').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ content: `<@${opponent.id}>`, embeds: [embed], components: [row] });
}

async function startBattleLogic(interaction, userId, userData, petIndex, type, param) {
    await safeDefer(interaction, 'reply');

    if (!userData.pets[petIndex]) {
        petIndex = 0;
        if (!userData.pets[0]) return interaction.editReply({ content: "🚫 Bạn không còn Pet nào!" });
        userData.activePetIndex = 0; 
        Database.updateUser(userId, userData);
    }
    
    const petData = userData.pets[petIndex];
    const petCheck = checkPetStatus(petData);
    if (petCheck.isDead) {
        return interaction.editReply({ content: `💀 **${petData.name}** cần nghỉ ngơi ${petCheck.remaining} phút.` });
    }
    if (petCheck.revived) Database.updateUser(userId, userData);

    let wildPetInstance;
    let wildPetId = null;

    if (type === 'adventure') {
        const diff = typeof param === 'number' ? param : 1;
        wildPetInstance = createBossPet(diff); 
    } else if (type === 'wild' || type === 'raid_boss') {
        wildPetInstance = (param.petData instanceof Pet) ? param.petData : new Pet(param.petData);
        wildPetId = param.petId; 
    }

    activeBattles.set(userId, {
        mode: 'pve', type: type, difficulty: type === 'adventure' ? param : 1,
        playerPet: new Pet(petData), wildPet: wildPetInstance, wildPetId: wildPetId, 
        turn: 1, logs: ["⚔️ **Trận đấu bắt đầu!**"]
    });

    try {
        const msg = await interaction.editReply({ content: "🔥 Đang vào trận...", components: [] });
        const battle = activeBattles.get(userId);
        if (battle) battle.messageId = msg.id;
    } catch(e) {}

    await showPvEInterface(interaction, userId);
}

// ==================================================================
// 3. XỬ LÝ TƯƠNG TÁC
// ==================================================================

export async function handleInteraction(interaction) {
    const { customId, user, client } = interaction;
    const uid = user.id;

    // 0. CHECK OWNER
    const customIdParts = customId.split('_');
    const customIdOwnerId = customIdParts[customIdParts.length - 1]; 
    if (customIdParts.length > 1 && !isNaN(customIdOwnerId) && customIdOwnerId !== uid) {
        if (!customId.startsWith('pvp_') && !customId.startsWith('challenge_')) {
            return interaction.reply({ content: "🚫 Bạn không phải chủ nhân trận đấu.", flags: [MessageFlags.Ephemeral] });
        }
    }

    // 1. KHIÊU CHIẾN (CHALLENGE)
    if (customId.startsWith('challenge_')) {
        const petId = customId.replace('challenge_', '');
        let info = null;
        let battleType = 'wild';

        if (globalRaidManager && globalRaidManager.activeBoss && (globalRaidManager.activeBoss.id === petId)) {
             info = { petData: globalRaidManager.activeBoss.pet, isBattling: false };
             battleType = 'raid_boss';
        }
        if (!info) {
            info = activeWildPets.get(petId);
            battleType = 'wild';
        }
        
        if (!info) {
             if (interaction.message) await interaction.message.edit({ components: [] }).catch(() => {});
             return interaction.reply({ content: "⚠️ Mục tiêu đã biến mất!", flags: [MessageFlags.Ephemeral] });
        }

        if (battleType === 'wild') {
            if (info.isBattling) return interaction.reply({ content: "⚠️ Đang bị người khác đánh!", flags: [MessageFlags.Ephemeral] });
            info.isBattling = true; activeWildPets.set(petId, info);
        }

        const userData = Database.getUser(uid);
        if (!userData.pets.length) return interaction.reply({ content: "🚫 Cần có Pet!", flags: [MessageFlags.Ephemeral] });

        // Defer Reply ở đây (Vì đây là bắt đầu trận mới)
        await safeDefer(interaction, 'reply');
        
        const petIndex = userData.activePetIndex || 0;
        await startBattleLogic(interaction, uid, userData, petIndex, battleType, { petData: info.petData, petId: petId });
        return;
    }

    // 2. PVP
    if (customId.startsWith('pvp_')) {
        const battle = activeBattles.get(uid);
        
        // Chỉ Defer Update cho skill/surrender
        if (customId.startsWith('pvp_skill_') || customId.startsWith('pvp_surrender')) {
             await safeDefer(interaction, 'update');
        }
        
        if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, parseInt(customIdParts[customIdParts.length - 2]), battle);
        else if (customId.startsWith('pvp_accept_')) await startPvPMatch(interaction, customId.replace('pvp_accept_', ''));
        else if (customId.startsWith('pvp_decline_')) {
             pendingChallenges.delete(customId.replace('pvp_decline_', ''));
             await safeUpdateInterface(interaction, {content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_surrender')) {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1);
        }
        if (customId === 'pvp_signup' && globalRaidManager) {
            // Lấy Pet Active của người chơi để đăng ký
            const userData = Database.getUser(uid);
            const activePetData = userData.pets[userData.activePetIndex];

            if (!activePetData) {
                return interaction.reply({ content: "🚫 Bạn cần chọn Pet Active trước khi đăng ký!", ephemeral: true });
            }
            
            // Chuyển xử lý đăng ký sang RaidBossManager
            await globalRaidManager.handleSignup(interaction); // Đã có logic lấy Pet Active trong handleSignup
            return;
        }
        return;
    }

    // 3. PVE & CATCH
    const battle = activeBattles.get(uid);

    // [QUAN TRỌNG] Danh sách KHÔNG Auto-Defer
    const noAutoDeferPrefixes = ['btn_select_ball', 'ball_', 'btn_cancel_catch', 'challenge_', 'pvp_'];
    
    if (!noAutoDeferPrefixes.some(prefix => customId.startsWith(prefix))) {
        await safeDefer(interaction, 'update');
    }

    if (!battle && !['btn_claim', 'btn_defeat'].includes(customId)) {
          try {
            if (interaction.deferred) await interaction.editReply({ content: "Hết phiên chiến đấu.", components: [] });
            else await interaction.reply({ content: "Hết phiên chiến đấu.", flags: [MessageFlags.Ephemeral] });
          } catch(e) {}
          return;
    }
    
    // === ROUTING ===
    
    if (customId.startsWith('btn_select_ball')) {
        await showCatchBallInterface(interaction, battle); 
    } 
    else if (customId.startsWith('ball_')) {
        await handleCatchAction(interaction, battle); 
    } 
    else if (customId.startsWith('btn_cancel_catch')) {
        await showPvEInterface(interaction, uid); 
    }
    else if (customId.startsWith('use_skill_')) {
        const skillIndex = parseInt(customIdParts[customIdParts.length - 2]);
        await processPvETurn(interaction, skillIndex, battle);
    } 
    else if (['btn_claim', 'btn_defeat'].includes(customId)) {
        await handlePvEEndActions(interaction, customId, client); 
    }
    else if (customId.startsWith('btn_run')) await handleRunAction(interaction, battle);
    else if (customId.startsWith('btn_heal')) await handleHealAction(interaction, battle);
    else if (customId.startsWith('btn_mana')) await handleManaAction(interaction, battle);
}

// ==================================================================
// 4. LOGIC PVE & VIEW
// ==================================================================

// [EXPORT]
export async function showPvEInterface(interaction, uid) {
    const battle = activeBattles.get(uid);
    if (!battle) return;
    const { playerPet, wildPet } = battle;
    
    const pStats = playerPet.getStats();
    const wStats = wildPet.getStats(); 
    const wildColor = wildPet.getColor ? wildPet.getColor() : 0x0099FF;

    if (battle.type === 'raid_boss' && globalRaidManager && globalRaidManager.activeBoss) {
        battle.wildPet.currentHP = globalRaidManager.activeBoss.currentHP;
    }

    const playerInfo = `❤️ ${createStatusBar(playerPet.currentHP, pStats.HP, 'HP')}\n✨ ${createStatusBar(playerPet.currentMP, pStats.MP, 'MP')}`;
    const wildInfo = `❤️ ${createStatusBar(wildPet.currentHP, wStats.HP, 'EnemyHP')}\n✨ ${createStatusBar(wildPet.currentMP, wStats.MP, 'MP')}`;

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${playerPet.name} 🆚 ${wildPet.name}`)
        .setColor(wildColor)
        .setDescription("```yaml\n" + (battle.logs.slice(-5).join('\n') || "Trận đấu bắt đầu!") + "\n```")
        .addFields(
            { name: `🛡️ Phe Ta: ${playerPet.name} (Lv.${playerPet.level})`, value: playerInfo, inline: true },
            { name: `⚔️ Phe Địch: ${wildPet.name} (Lv.${wildPet.level})`, value: wildInfo, inline: true }
        );
    
    const wildImg = getEmojiUrl(wildPet.icon);
    if (wildImg) embed.setThumbnail(wildImg);
    const playerImg = getEmojiUrl(playerPet.icon); 
    if (playerImg) embed.setImage(playerImg);

    const row1 = new ActionRowBuilder();
    const skills = playerPet.skills || ['S1']; 
    skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const canUse = s && playerPet.currentMP >= s.manaCost;
        const btnLabel = s ? `${s.name} | ⚔️${s.power} 💧${s.manaCost}`.slice(0, 80) : 'Skill';
        row1.addComponents(new ButtonBuilder().setCustomId(`use_skill_${idx}_${uid}`).setLabel(btnLabel).setStyle(ButtonStyle.Primary).setDisabled(!canUse));
    });
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`btn_heal_${uid}`).setLabel('💊 Hồi Máu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`btn_mana_${uid}`).setLabel('💧 Hồi Mana').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`btn_run_${uid}`).setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    if (battle.type === 'wild' && wildPet.rarity !== 'Boss' && wildPet.rarity !== 'RaidBoss' && wildPet.currentHP > 0) {
        row2.addComponents(
            new ButtonBuilder()
                .setCustomId(`btn_select_ball_${uid}`) 
                .setLabel(`Thu phục`) 
                .setEmoji('<a:Master:1441451727348830460>') 
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const payload = { embeds: [embed], components: [row1, row2] };
    await safeUpdateInterface(interaction, payload);
}

async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    battle.logs = []; 
    const pSkillId = (playerPet.skills || ['S1'])[skillIndex];
    const pSkill = getSkillById(pSkillId);
    if (!pSkill) return safeUpdateInterface(interaction, { content: "Lỗi skill!" });

    battle.logs.push(...playerPet.processTurnEffects().log);
    if (playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);

    if (playerPet.currentMP < pSkill.manaCost) {
          battle.logs.push(`⚠️ Thiếu MP!`);
          return showPvEInterface(interaction, interaction.user.id);
    }
    playerPet.currentMP -= pSkill.manaCost;

    const weather = activeWildPets.get(wildPet.id)?.weather || { buff: [] }; 
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
        if (battle.type === 'raid_boss' && globalRaidManager) {
            const isBossDefeated = globalRaidManager.trackDamage(interaction.user.id, pRes.damage);
            battle.wildPet.currentHP = globalRaidManager.activeBoss.currentHP; 
            if (pRes.vampHeal > 0) battle.logs.push(`🩸 **${playerPet.name}** hút ${pRes.vampHeal} HP.`);
            if (isBossDefeated) return showPvEVictory(interaction, battle);
        } else {
            wildPet.currentHP = Math.max(0, wildPet.currentHP - pRes.damage);
            if (pRes.vampHeal > 0) battle.logs.push(`🩸 **${playerPet.name}** hút ${pRes.vampHeal} HP.`);
            if (pRes.thornDamage > 0) battle.logs.push(`🌵 **${playerPet.name}** bị phản ${pRes.thornDamage} ST.`);
        }
    }

    processSkillEffect(playerPet, wildPet, pSkill, battle.logs, pRes.damage);

    if (wildPet.currentHP <= 0 && battle.type !== 'raid_boss') return showPvEVictory(interaction, battle);

    await processEnemyTurn(interaction, battle);
}

// [EXPORT]
export async function processEnemyTurn(interaction, battle) {
    const { playerPet, wildPet } = battle;
    battle.logs.push(...wildPet.processTurnEffects().log);
    
    if (wildPet.currentHP <= 0 && battle.type !== 'raid_boss') return showPvEVictory(interaction, battle);
    if (battle.type === 'raid_boss' && wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

    let wSkillId = 'S1';
    let wSkill = getSkillById('S1');
    
    const highLevelSkill = (wildPet.skills || []).find(sid => {
        const s = getSkillById(sid);
        return s && wildPet.currentMP >= s.manaCost && sid !== 'S1'; 
    });
    
    if (highLevelSkill) { wSkillId = highLevelSkill; wSkill = getSkillById(wSkillId); }
    
    if (wSkill && wildPet.currentMP >= wSkill.manaCost) {
        wildPet.currentMP -= wSkill.manaCost;
        const weather = activeWildPets.get(wildPet.id)?.weather || { buff: [] }; 
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

    const userData = Database.getUser(interaction.user.id);
    const pIdx = userData.pets.findIndex(p => p.id === playerPet.id);
    
    if(pIdx !== -1) {
        userData.pets[pIdx].currentHP = playerPet.currentHP;
        userData.pets[pIdx].currentMP = playerPet.currentMP;
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
    if (battle.type === 'adventure' || battle.type === 'raid_boss') {
        battle.logs.push("🚫 Không thể chạy khi đánh Boss/Dungeon!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    const rate = 0.5 + (battle.playerPet.getStats().SPD / battle.wildPet.getStats().SPD) * 0.2;
    if (Math.random() < rate) {
        activeBattles.delete(interaction.user.id);
        return safeUpdateInterface(interaction, { content: "🏃 **Chạy thành công!**", embeds: [], components: [] });
    }
    battle.logs = ["❌ **Chạy thất bại!**"];
    await processEnemyTurn(interaction, battle);
}

async function showPvEVictory(interaction, battle) {
    const { playerPet, wildPet, type, wildPetId, difficulty } = battle;
    const userId = interaction.user.id;
    
    // --- 1. CẤU HÌNH HỆ SỐ THƯỞNG THEO RANK ---
    const RARITY_REWARD_MULT = {
        'Common': 1.0,
        'Uncommon': 1.2,
        'Rare': 1.5,
        'Epic': 2.5,
        'Legendary': 5.0,
        'Mythical': 10.0,
        'Boss': 15.0,
        'RaidBoss': 20.0
    };

    // Lấy hệ số dựa trên Rarity của quái (Mặc định là 1.0)
    const rankMult = RARITY_REWARD_MULT[wildPet.rarity] || 1.0;
    const diffMult = typeof difficulty === 'number' ? difficulty : 1;

    // --- 2. TÍNH XP (KINH NGHIỆM) ---
    // Công thức: (Base + HP/15) * Độ khó * Rank Bonus
    const baseXP = (wildPet.level * PET_XP_BASE) + (wildPet.getStats().HP / 15);
    const totalXP = Math.round(baseXP * diffMult * rankMult);
    
    // --- 3. TÍNH VÀNG (GOLD) ---
    // Công thức: (Base + Level * 10) * Độ khó * Rank Bonus
    // REWARD_CONFIG lấy từ Constants.mjs (giả sử Base=50, PerLvl=10)
    const baseGoldConfig = REWARD_CONFIG.BASE_GOLD || 50;
    const goldPerLvl = REWARD_CONFIG.GOLD_PER_LEVEL || 10;
    
    let goldReward = Math.round(
        (baseGoldConfig + (wildPet.level * goldPerLvl)) 
        * diffMult 
        * rankMult
    );

    // Bonus riêng cho Raid Boss (đã khó lại còn trâu)
    if (type === 'raid_boss') {
        goldReward *= 2; 
    }

    // --- CẬP NHẬT DỮ LIỆU NGƯỜI CHƠI ---
    const userData = Database.getUser(userId);
    
    // Cộng XP cho Pet
    const pIdx = userData.pets.findIndex(p => p.id === playerPet.id);
    let lvMsg = "";
    if(pIdx !== -1) {
        const pInstance = new Pet(userData.pets[pIdx]);
        // Hồi phục full HP/MP sau khi thắng
        pInstance.currentHP = pInstance.getStats().HP;
        pInstance.currentMP = pInstance.getStats().MP;
        
        if (pInstance.addExp(totalXP)) {
            lvMsg = `\n🆙 **LÊN CẤP ${pInstance.level}!**`;
            // Hồi phục lại lần nữa để đảm bảo chỉ số mới được áp dụng
            pInstance.currentHP = pInstance.getStats().HP;
            pInstance.currentMP = pInstance.getStats().MP;
        }
        userData.pets[pIdx] = pInstance.getDataForSave();
    }
    
    // Cộng Tiền
    if (!userData.gold) userData.gold = 0;
    userData.gold += goldReward;

    // --- 4. TÍNH TOÁN DROP VẬT PHẨM (LOOT) ---
    let dropMsg = "";
    let loot = [];

    // Lấy tỷ lệ drop từ Config
    const rates = REWARD_CONFIG.DROP_RATES[wildPet.rarity] || REWARD_CONFIG.DROP_RATES['Common'];

    // Helper function random drop
    const tryDrop = (rate, itemKey, itemName, emoji, min = 1, max = 1) => {
        // Tăng nhẹ tỷ lệ rơi đồ nếu quái rank cao (Rank Mult)
        // Ví dụ: Legend (x5) sẽ tăng 20% tỷ lệ rơi gốc
        const adjustedRate = rate * (1 + (rankMult * 0.05)); 
        
        if (Math.random() < adjustedRate) {
            const qty = Math.floor(Math.random() * (max - min + 1)) + min;
            loot.push({ key: itemKey, qty: qty, name: itemName, emoji: emoji });
            return true;
        }
        return false;
    };

    // Logic Drop cụ thể
    if (type === 'wild' || type === 'adventure') {
        // Kẹo Exp
        if (tryDrop(rates.candy_norm, 'candies.normal', 'Kẹo Thường', EMOJIS.CANDY_NORMAL, 1, 3)) {}
        if (tryDrop(rates.candy_high, 'candies.high', 'Kẹo Cao Cấp', EMOJIS.CANDY_HIGH, 1, 2)) {}
        if (tryDrop(rates.candy_super, 'candies.super', 'Kẹo Siêu Cấp', EMOJIS.CANDY_SUPER, 1, 1)) {}
        
        // Hòm báu vật
        if (tryDrop(rates.box_com, 'crates.common', 'Hộp Thường', EMOJIS.BOX_COMMON, 1, 1)) {}
        if (tryDrop(rates.box_my, 'crates.mythic', 'Rương Thần Thoại', EMOJIS.BOX_MYTHIC, 1, 1)) {}

        // Sách Skill
        if (tryDrop(rates.skill_1, 'skillbooks.T1', 'Sách Skill I', '📖', 1, 1)) {}
        if (tryDrop(rates.skill_2, 'skillbooks.T2', 'Sách Skill II', '📘', 1, 1)) {}
        if (tryDrop(rates.skill_legend, 'skillbooks.LEGEND', 'Sách Huyền Thoại', '📜', 1, 1)) {}
        
        // Luôn rơi Potion hồi phục
        if (type === 'wild') {
            loot.push({ key: 'potions', qty: 1, name: 'Thuốc Hồi Phục', emoji: '💊' });
        }
    } 

    // Lưu vật phẩm vào Inventory
    if (!userData.inventory) userData.inventory = {};
    
    loot.forEach(item => {
        if (item.key.includes('.')) {
            const [main, sub] = item.key.split('.');
            if (!userData.inventory[main]) userData.inventory[main] = {};
            userData.inventory[main][sub] = (userData.inventory[main][sub] || 0) + item.qty;
        } else {
            userData.inventory[item.key] = (userData.inventory[item.key] || 0) + item.qty;
        }
        dropMsg += `+${item.qty} ${item.emoji} ${item.name}\n`;
    });

    Database.updateUser(userId, userData);
    activeBattles.delete(userId);

    // --- 5. XÂY DỰNG EMBED CHIẾN THẮNG ---
    const embed = new EmbedBuilder()
        .setTitle(`🏆 CHIẾN THẮNG: ${wildPet.name}`)
        .setColor(0x00FF00)
        .setDescription(`Bạn đã đánh bại **${wildPet.name}**!\nPet của bạn đã được hồi phục toàn bộ.`)
        .addFields(
            { 
                name: '💰 Phần Thưởng', 
                value: `+**${goldReward.toLocaleString()}** ${EMOJIS.CURRENCY} (Rank Bonus x${rankMult})\n` +
                       `+**${totalXP}** XP ${lvMsg}`, 
                inline: true 
            }
        );

    if (dropMsg) {
        embed.addFields({ name: '🎒 Vật Phẩm Rơi', value: dropMsg, inline: true });
    }

    const row = new ActionRowBuilder();
    
    // Xóa Pet khỏi map nếu là Wild Battle
    if (type === 'wild') {
        embed.setFooter({ text: `Độ hiếm: ${wildPet.rarity} | Bonus: x${rankMult}` });
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);
    }
    
    row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Thu Thập').setStyle(ButtonStyle.Success));
    
    await safeUpdateInterface(interaction, { embeds: [embed], components: [row] });
}

// ... (Giữ nguyên handlePvEEndActions)

// ==========================================
// [CẬP NHẬT] LOGIC PHẦN THƯỞNG PVP
// ==========================================

// ... (Giữ nguyên startPvPMatch, updatePvPInterface)

async function processPvPTurn(interaction, idx, battle) {
    // ... (Giữ nguyên logic tính damage cũ)
    const uid = interaction.user.id;
    if (battle.turnOwner !== uid) return interaction.followUp({ content: "Chưa đến lượt!", flags: [MessageFlags.Ephemeral] });
    
    const atk = uid === battle.p1.id ? battle.p1 : battle.p2;
    const def = uid === battle.p1.id ? battle.p2 : battle.p1;
    const skill = getSkillById((atk.pet.skills || ['S1'])[idx]);
    
    if (atk.pet.currentMP < skill.manaCost) return interaction.followUp({ content: "Thiếu MP!", flags: [MessageFlags.Ephemeral] });
    atk.pet.currentMP -= skill.manaCost;

    const res = calculateDamage(atk.pet, def.pet, skill.id, battle.weather);
    
    let logMsg = `👊 **${atk.pet.name}** dùng ${skill.name}`;
    if (res.multiplier > 1) logMsg += " (Buff 🔥)";
    else if (res.multiplier < 1) logMsg += " (Nerf 🔽)";
    logMsg += ` gây **${res.damage}** ST.`;
    
    battle.logs = [logMsg];
    def.pet.currentHP = Math.max(0, def.pet.currentHP - res.damage);
    processSkillEffect(atk.pet, def.pet, skill, battle.logs, res.damage);

    if (skill.weatherChange && WEATHER_DATA[skill.weatherChange]) {
        battle.weather = WEATHER_DATA[skill.weatherChange];
        battle.logs.push(`⛈️ Thời tiết: ${battle.weather.name}`);
    }

    // --- XỬ LÝ KHI KẾT THÚC TRẬN ĐẤU ---
    if (def.pet.currentHP <= 0) {
        activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);

        // Cộng thưởng cho người thắng
        const winnerData = Database.getUser(atk.id);
        const winGold = REWARD_CONFIG.PVP_WIN_GOLD;
        const winXP = 300; // XP cứng cho PvP
        
        winnerData.gold = (winnerData.gold || 0) + winGold;
        // Cộng XP cho pet thắng
        const wPet = new Pet(winnerData.pets[winnerData.activePetIndex]);
        wPet.addExp(winXP);
        winnerData.pets[winnerData.activePetIndex] = wPet.getDataForSave();
        Database.updateUser(atk.id, winnerData);

        // Cộng an ủi cho người thua
        const loserData = Database.getUser(def.id);
        const loseGold = REWARD_CONFIG.PVP_LOSE_GOLD;
        loserData.gold = (loserData.gold || 0) + loseGold;
        Database.updateUser(def.id, loserData);

        return safeUpdateInterface(interaction, { 
            content: `🏆 **${atk.user.username}** CHIẾN THẮNG!\n` +
                     `💰 Thắng: +${winGold}${EMOJIS.CURRENCY}, +${winXP}XP\n` +
                     `💸 Thua: +${loseGold}${EMOJIS.CURRENCY} (an ủi)`, 
            embeds: [], components: [] 
        });
    }
    battle.turnOwner = def.id;
    await updatePvPInterface(interaction, battle);  
}

async function endPvP(interaction, battle, winner) {
    activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
    
    // Xử lý thưởng khi đối thủ đầu hàng
    const winnerData = Database.getUser(winner.id);
    winnerData.gold = (winnerData.gold || 0) + REWARD_CONFIG.PVP_WIN_GOLD;
    Database.updateUser(winner.id, winnerData);

    await safeUpdateInterface(interaction, { 
        content: `🏆 **${winner.user.username}** thắng (đối thủ đầu hàng)!\n💰 Nhận +${REWARD_CONFIG.PVP_WIN_GOLD} ${EMOJIS.CURRENCY}`, 
        embeds: [], components: [] 
    });
}
// ... (Các hàm khác bên trên)

async function handlePvEEndActions(interaction, customId, client) {
    const userId = interaction.user.id;
    await safeDefer(interaction, 'update');

    const tempBattle = activeBattles.get(userId);
    let targetPetId = tempBattle ? tempBattle.wildPetId : null;
    let playerPetData = tempBattle ? tempBattle.playerPet : null;

    // Cố gắng tìm Pet ID từ tin nhắn nếu battle state đã mất
    if (!targetPetId) {
        for (const [pid, info] of activeWildPets.entries()) {
             if (interaction.message && info.messageId === interaction.message.id) { 
                 targetPetId = pid; 
                 break; 
             }
        }
    }

    // 1. Xử lý khi bấm nút THẤT BẠI (Defeat)
    if (customId === 'btn_defeat') {
        activeBattles.delete(userId); // Xóa trạng thái chiến đấu
        
        // Nếu là pet hoang dã, trả lại trạng thái tự do để người khác đánh
        if (targetPetId) {
            const info = activeWildPets.get(targetPetId);
            if(info) { 
                info.isBattling = false; 
                activeWildPets.set(targetPetId, info); 
            }
        }

        // Đánh dấu Pet của người chơi bị thương (Cooldown)
        const userData = Database.getUser(userId);
        // Tìm pet đang active để set cooldown
        if (userData.activePetIndex !== undefined && userData.pets[userData.activePetIndex]) {
            userData.pets[userData.activePetIndex].deathTime = Date.now();
            userData.pets[userData.activePetIndex].currentHP = 0; // Về 0 máu
            Database.updateUser(userId, userData);
        }

        return safeUpdateInterface(interaction, { 
            content: "💀 **THẤT BẠI!** Pet đã trọng thương (Cần nghỉ ngơi 10 phút hoặc dùng thuốc hồi phục).", 
            embeds: [], 
            components: [] 
        });
    }

    // 2. Xử lý khi bấm nút THU THẬP (Claim - Chiến thắng)
    if (customId === 'btn_claim') {
        await safeUpdateInterface(interaction, { 
            content: "✅ **Đã thu thập chiến lợi phẩm!**", 
            embeds: [], 
            components: [] 
        });
    } 

    // Xóa Pet hoang dã khỏi thế giới nếu đã chiến thắng và nhận quà
    if (targetPetId && customId === 'btn_claim' && tempBattle?.type === 'wild') {
        // Gọi hàm removePetFromWorld (được import từ SpawnSystem hoặc định nghĩa trong file này)
        // Lưu ý: Đảm bảo hàm này tồn tại. Nếu trong file này chưa có, dùng logic import
        try {
            const { removePetFromWorld } = await import('./SpawnSystem.mjs');
            await removePetFromWorld(targetPetId, client); 
        } catch (e) {
            // Fallback nếu import lỗi (xóa thủ công)
            const info = activeWildPets.get(targetPetId);
            if (info) {
                try {
                    const channel = await client.channels.fetch(info.channelId);
                    const msg = await channel.messages.fetch(info.messageId);
                    if (msg) await msg.delete();
                } catch(err) {}
                activeWildPets.delete(targetPetId);
            }
        }
    }
    
    // Dọn dẹp battle lần cuối
    activeBattles.delete(userId);
}