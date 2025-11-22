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
// Đã thêm POKEBALLS vào import
import { ELEMENT_ICONS, RARITY_COLORS, POKEBALLS } from './Constants.mjs'; 

const PET_XP_BASE = 100;
const DEATH_COOLDOWN = 10 * 60 * 1000; // 10 Phút
const activeBattles = new Map(); 
const pendingChallenges = new Map();

// --- HỆ THỐNG THỜI TIẾT CHO ARENA ---
const WEATHER_DATA = {
    'SUNNY': { 
        name: '☀️ Nắng Gắt', 
        buff: ['Fire', 'Light'], 
        nerf: ['Water', 'Dark'], 
        desc: 'Hệ Fire/Light sát thương tăng, Water/Dark giảm.' 
    },
    'RAINY': { 
        name: '🌧️ Mưa Rào', 
        buff: ['Water', 'Ice'], 
        nerf: ['Fire', 'Earth'], 
        desc: 'Hệ Water/Ice sát thương tăng, Fire/Earth giảm.' 
    },
    'SANDSTORM': { 
        name: '🌪️ Bão Cát', 
        buff: ['Earth', 'Rock'], 
        nerf: ['Wind', 'Lightning'], 
        desc: 'Hệ Earth/Rock sát thương tăng, Wind/Lightning giảm.' 
    },
    'CLEAR': { 
        name: '☁️ Trời Quang', 
        buff: [], 
        nerf: [], 
        desc: 'Không có hiệu ứng đặc biệt.' 
    }
};

// --- BIẾN TOÀN CỤC CHO RAID BOSS ---
let globalRaidManager = null;

export function setRaidManagerRef(manager) {
    globalRaidManager = manager;
    console.log("✅ BattleManager đã kết nối với RaidBossManager.");
}

// ==========================================
// 1. HELPERS
// ==========================================

const BASE_CATCH_RATES = {
    'Common': 0.50, 'Uncommon': 0.40, 'Rare': 0.25, 
    'Epic': 0.15, 'Legendary': 0.05, 'Boss': 0.01, 'Mythic': 0.001 
};

function calculateCatchRate(playerPet, wildPet) {
    const rarityKey = wildPet.rarity in BASE_CATCH_RATES ? wildPet.rarity : 'Common';
    const baseRate = BASE_CATCH_RATES[rarityKey];
    const playerLevel = playerPet.level;
    const wildLevel = wildPet.level;
    const levelDiff = playerLevel - wildLevel;
    let levelBonus = Math.min(0.15, Math.max(-0.15, levelDiff * 0.01));
    let finalRate = baseRate + levelBonus;
    
    // Tỉ lệ bắt cũng phụ thuộc vào HP của Pet hoang dã (càng yếu càng dễ bắt)
    const hpRatio = wildPet.currentHP / wildPet.getStats().HP;
    let hpBonus = (1 - hpRatio) * 0.25; // Tối đa 25% bonus khi HP còn 0
    
    finalRate += hpBonus;
    
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
    
    const petIndex = userData.activePetIndex !== undefined ? userData.activePetIndex : 0;

    // [FIXED] Defer Reply cho lệnh /startAdventure
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply(); 
    }
    await startBattleLogic(interaction, userId, userData, petIndex, 'adventure', difficulty);
}

export async function createPvPChallenge(interaction, opponent) {
    // --- KIỂM TRA KÊNH ARENA ---
    const serverId = interaction.guildId;
    const arenaChannelId = Database.getArenaChannel(serverId);
    
    if (arenaChannelId && interaction.channelId !== arenaChannelId) {
        return interaction.reply({ 
            content: `⚠️ **PvP không hợp lệ!** Vui lòng vào đấu trường <#${arenaChannelId}> để thách đấu.`,
            flags: [MessageFlags.Ephemeral] 
        });
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

// Hàm khởi tạo trận đấu
async function startBattleLogic(interaction, userId, userData, petIndex, type, param) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply(); 
        }
    } catch (e) { }

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
        const diff = typeof param === 'number' ? param : 1;
        wildPetInstance = createBossPet(diff); 
    } else if (type === 'wild' || type === 'raid_boss') {
        // Kiểm tra xem data truyền vào có phải là Class Pet chưa, nếu chưa thì tạo mới
        if (param.petData instanceof Pet) {
            wildPetInstance = param.petData;
        } else {
            wildPetInstance = new Pet(param.petData);
        }
        
        wildPetId = param.petId; 
    }

    // 5. Tạo Session Battle
    activeBattles.set(userId, {
        mode: 'pve', 
        type: type, 
        difficulty: type === 'adventure' ? param : 1,
        playerPet: new Pet(petData), // Pet của người chơi cũng cần đảm bảo là Class
        wildPet: wildPetInstance, 
        wildPetId: wildPetId, 
        turn: 1, logs: ["⚔️ **Trận đấu bắt đầu!**"]
    });

    // 6. Chuyển cảnh sang giao diện chiến đấu
    const msg = await interaction.editReply({ content: "🔥 Đang vào trận...", components: [] });
    const battle = activeBattles.get(userId);
    if (battle) battle.messageId = msg.id;

    // Gọi giao diện 
    await showPvEInterface(interaction, userId);
}

// ==================================================================
// 3. ROUTER XỬ LÝ TƯƠNG TÁC BUTTON
// ==================================================================

export async function handleInteraction(interaction) {
    const { customId, user, client } = interaction;
    const uid = user.id;

    // 0. KHỐI LỌC NGƯỜI CHƠI KHÁC
    const customIdParts = customId.split('_');
    const customIdOwnerId = customIdParts[customIdParts.length - 1]; 
    
    if (customIdParts.length > 1 && !isNaN(customIdOwnerId) && customIdOwnerId !== uid) {
        if (!customId.startsWith('pvp_accept_') && !customId.startsWith('pvp_decline_')) {
            return interaction.reply({ content: "🚫 Bạn không phải chủ nhân của trận đấu này.", flags: [MessageFlags.Ephemeral] });
        }
    }

    // 1. XỬ LÝ NÚT "KHIÊU CHIẾN"
    if (customId.startsWith('challenge_')) {
        const petId = customId.replace('challenge_', '');
        let info = null;
        let battleType = 'wild';

        // KIỂM TRA RAID BOSS
        if (globalRaidManager && globalRaidManager.activeBoss && (globalRaidManager.activeBoss.id === petId || globalRaidManager.activeBoss.pet.id === petId)) {
             info = { petData: globalRaidManager.activeBoss.pet, isBattling: false };
             battleType = 'raid_boss';
        }
        // TÌM PET THƯỜNG
        if (!info) {
            info = activeWildPets.get(petId);
            battleType = 'wild';
        }
        
        // Defer Reply sớm
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        // [SỬA LỖI KHIÊU CHIẾN ĐÃ BỊ HẠ]
        if (!info) {
             // Xóa nút khỏi tin nhắn gốc
             if (interaction.message) await interaction.message.edit({ components: [] }).catch(() => {});
             return interaction.editReply({ content: "⚠️ **Mục tiêu đã biến mất hoặc bị hạ gục!**" });
        }

        // Kiểm tra Battle Lock
        if (battleType === 'wild') {
            if (info.isBattling) return interaction.editReply({ content: "⚠️ Pet này đang bị người khác đánh!" });
            info.isBattling = true; 
            activeWildPets.set(petId, info);
        }

        const userData = Database.getUser(uid);
        if (!userData.pets.length) return interaction.editReply({ content: "🚫 Bạn cần có Pet để chiến đấu!" });

        const petIndex = userData.activePetIndex !== undefined ? userData.activePetIndex : 0;
        await startBattleLogic(interaction, uid, userData, petIndex, battleType, { petData: info.petData, petId: petId });
        return;
    }

    // 2. PVP ROUTING
    if (customId.startsWith('pvp_')) {
        const battle = activeBattles.get(uid);
        // Defer Update cho các nút hành động PvP (skill, surrender)
        if (customId.startsWith('pvp_skill_') || customId.startsWith('pvp_surrender')) {
             try {
                 if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); 
             } catch(e) {}
        }
        
        const skillIndex = parseInt(customIdParts[customIdParts.length - 2]); 
        
        if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, skillIndex, battle);
        else if (customId.startsWith('pvp_accept_')) await startPvPMatch(interaction, customId.replace('pvp_accept_', ''));
        else if (customId.startsWith('pvp_decline_')) {
             pendingChallenges.delete(customId.replace('pvp_decline_', ''));
             await interaction.editReply({content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_surrender')) {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1);
        }
        return;
    }

    // 3. LOGIC TRONG TRẬN ĐẤU (PVE)
    const battle = activeBattles.get(uid);
    
    // [CẬP NHẬT] Defer Update an toàn cho các nút hành động trong PvE
    try {
        if (!interaction.deferred && !interaction.replied) {
             // Lọc ra các nút BẮT PET/QUAY LẠI/CLAIM/DEFEAT/BALL_XXX để chúng được defer riêng
             if (!['btn_claim', 'btn_defeat', 'btn_select_ball', 'btn_cancel_catch'].includes(customId) && !customId.startsWith('ball_')) {
                 await interaction.deferUpdate();
             }
        }
    } catch(e) {
         console.error(`Lỗi Defer PvE cho ${customId}:`, e.message);
         if (e.code === 10062) return; 
    }

    if (!battle && !['btn_claim', 'btn_defeat'].includes(customId)) {
          return interaction.editReply({ content: "Hết phiên chiến đấu.", embeds: [], components: [] });
    }
    else if (customId.startsWith('use_skill_')) {
        const skillIndex = parseInt(customIdParts[customIdParts.length - 2]);
        await processPvETurn(interaction, skillIndex, battle);
    } 
    else if (['btn_claim', 'btn_defeat'].includes(customId)) await handlePvEEndActions(interaction, customId, client); 
    // ROUTING MỚI CHO HỆ THỐNG BẮT PET CHI TIẾT
    else if (customId.startsWith('btn_select_ball')) await showCatchBallInterface(interaction, battle); // Nút kích hoạt giao diện chọn bóng
    else if (customId.startsWith('ball_')) await handleCatchAction(interaction, battle); // Nút chọn bóng cụ thể
    else if (customId.startsWith('btn_cancel_catch')) await showPvEInterface(interaction, uid); // Nút hủy chọn bóng
    // END ROUTING MỚI
    else if (customId.startsWith('btn_run')) await handleRunAction(interaction, battle);
    else if (customId.startsWith('btn_heal')) await handleHealAction(interaction, battle);
    else if (customId.startsWith('btn_mana')) await handleManaAction(interaction, battle);
}


// ==================================================================
// 4. LOGIC PVE & VIEW
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

    let currentWildHP = wildPet.currentHP;
    let maxWildHP = wStats.HP;
    
    if (battle.type === 'raid_boss' && globalRaidManager && globalRaidManager.activeBoss) {
        currentWildHP = globalRaidManager.activeBoss.currentHP;
        maxWildHP = globalRaidManager.activeBoss.maxHP;
    }

    const wildInfo = 
`❤️ ${createStatusBar(currentWildHP, maxWildHP, 'EnemyHP')}
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
        row1.addComponents(new ButtonBuilder().setCustomId(`use_skill_${idx}_${uid}`).setLabel(btnLabel).setStyle(ButtonStyle.Primary).setDisabled(!canUse));
    });
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`btn_heal_${uid}`).setLabel('💊 Hồi Máu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`btn_mana_${uid}`).setLabel('💧 Hồi Mana').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`btn_run_${uid}`).setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    // THAY THẾ: Nút Bắt Pet đơn giản bằng nút kích hoạt giao diện chọn bóng
    if (battle.type === 'wild' && wildPet.rarity !== 'Boss' && wildPet.rarity !== 'RaidBoss') {
        const catchRate = calculateCatchRate(playerPet, wildPet);
        const catchBtn = new ButtonBuilder()
            .setCustomId(`btn_select_ball_${uid}`) // Nút kích hoạt giao diện chọn bóng
            .setLabel(`⭐ Bắt (${Math.round(catchRate * 100)}%)`) 
            .setStyle(ButtonStyle.Success)
            .setDisabled(wildPet.currentHP <= 0); 
            
        row2.addComponents(catchBtn);
    }

    const payload = { embeds: [embed], components: [row1, row2] };
    
    // Xử lý cập nhật giao diện an toàn
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch (e) { 
        console.error("Lỗi showPvEInterface:", e.message); 
    }
}

async function showCatchBallInterface(interaction, battle) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const { playerPet, wildPet } = battle;

    // Defer riêng cho nút này (đã loại khỏi defer chung trong handleInteraction)
    try {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    } catch (e) { return; }
    
    // 1. Tính Tỷ Lệ Bắt Cơ Bản
    const baseRate = calculateCatchRate(playerPet, wildPet);
    const embed = new EmbedBuilder().setTitle("🔴 CHỌN POKÉ BALL")
        .setDescription(`Pet: **${wildPet.name}** (Lv.${wildPet.level}) - Tỉ lệ bắt cơ bản: **${Math.round(baseRate * 100)}%**` + 
        `\nHP hiện tại: **${Math.max(0, wildPet.currentHP)}/${wildPet.getStats().HP}**` +
        `\n*Chỉ số hiển thị là tỉ lệ khi dùng loại bóng đó.*`)
        .setColor(0x0099FF);

    const row = new ActionRowBuilder();
    let hasAvailableBall = false;

    // 2. Tạo nút cho từng loại bóng
    for (const key in POKEBALLS) {
        const ball = POKEBALLS[key];
        // Số lượng bóng người chơi có (Lấy từ Inventory của User)
        const count = userData.inventory.pokeballs?.[key] || 0; 
        
        let finalRate = baseRate * ball.multiplier;

        // Áp dụng bonus đặc biệt cho Dusk Ball
        if (key === 'dusk' && wildPet.elements.includes('Dark')) {
            finalRate *= 1.25; 
        }

        finalRate = Math.max(0.005, Math.min(1.0, finalRate));

        const btn = new ButtonBuilder()
            .setCustomId(`ball_${key}_${userId}`) 
            .setLabel(`${ball.icon} ${ball.name} | ${Math.round(finalRate * 100)}% [${count}]`)
            .setStyle(ball.style)
            .setDisabled(count <= 0 || wildPet.currentHP <= 0 || finalRate === 1.0); 

        row.addComponents(btn);
        if (count > 0) hasAvailableBall = true;
    }

    // Thêm nút Hủy/Quay lại
    row.addComponents(new ButtonBuilder().setCustomId(`btn_cancel_catch_${userId}`).setLabel('⬅️ Quay lại').setStyle(ButtonStyle.Secondary));

    // 3. Cập nhật giao diện
    if (!hasAvailableBall && wildPet.rarity !== 'Boss') {
        embed.setDescription("⚠️ **Bạn không có Poké Ball nào!** Vui lòng Quay lại.");
    }
    
    // Sử dụng editReply vì đã deferUpdate ở trên
    try {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch(e) {
         console.error("Lỗi showCatchBallInterface khi editReply:", e.message);
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
        if (battle.type === 'raid_boss' && globalRaidManager) {
            const isBossDefeated = globalRaidManager.trackDamage(interaction.user.id, pRes.damage);
            battle.wildPet.currentHP = globalRaidManager.activeBoss.currentHP; 
            if (pRes.vampHeal > 0) battle.logs.push(`🩸 **${playerPet.name}** hút ${pRes.vampHeal} HP.`);
            if (isBossDefeated) {
                return showPvEVictory(interaction, battle);
            }
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

async function processEnemyTurn(interaction, battle) {
    const { playerPet, wildPet } = battle;
    let weather = { buff: [] };
    if (battle.type === 'wild') {
        const wildInfo = activeWildPets.get(wildPet.id);
        if (wildInfo) weather = wildInfo.weather || { buff: [] };
    }

    const wStart = wildPet.processTurnEffects();
    if (wStart.log.length) battle.logs.push(...wStart.log);
    
    if (wildPet.currentHP <= 0 && battle.type !== 'raid_boss') return showPvEVictory(interaction, battle);
    if (battle.type === 'raid_boss' && wildPet.currentHP <= 0) return showPvEVictory(interaction, battle);

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
    // [CẬP NHẬT] Defer Update
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); 

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
    // [CẬP NHẬT] Defer Update
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); 
    
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
    // [CẬP NHẬT] Defer Update
    const petToClearId = battle.wildPetId; 
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

    if (battle.type === 'adventure' || battle.type === 'raid_boss') {
        battle.logs.push("🚫 Không thể chạy khi đánh Boss/Dungeon!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    const rate = 0.5 + (battle.playerPet.getStats().SPD / battle.wildPet.getStats().SPD) * 0.2;
    if (Math.random() < rate) {
        activeBattles.delete(interaction.user.id);
        if (petToClearId) { } 
        return interaction.editReply({ content: "🏃 **Chạy thành công!**", embeds: [], components: [] });
    }
    battle.logs = ["❌ **Chạy thất bại!**"];
    
    const wRes = calculateDamage(battle.wildPet, battle.playerPet, 'S1', {buff: []});
    battle.playerPet.currentHP = Math.max(0, battle.playerPet.currentHP - wRes.damage);
    battle.logs.push(`🔸 Địch đánh **${wRes.damage}** ST.`);
    
    if(battle.playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);
    await showPvEInterface(interaction, interaction.user.id);
}

async function handleCatchAction(interaction, battle) {
    const userId = interaction.user.id;
    const { playerPet, wildPet, wildPetId } = battle;
    const customIdParts = interaction.customId.split('_');
    const ballType = customIdParts.length > 1 && customIdParts[0] === 'ball' ? customIdParts[1] : 'poke'; 
    const ballConfig = POKEBALLS[ballType] || POKEBALLS['poke'];

    // Phải deferUpdate trước khi editReply, vì đây là tương tác nút
    try {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    } catch (e) { return; }


    if (battle.type !== 'wild' || wildPet.rarity === 'Boss' || wildPet.rarity === 'RaidBoss') {
        battle.logs = ["🚫 **Boss quá mạnh!** Không thể thu phục."];
        // Quay lại giao diện chiến đấu chính
        return showPvEInterface(interaction, userId); 
    }
    
    const userData = Database.getUser(userId);
    if (!userData.inventory.pokeballs) userData.inventory.pokeballs = {};
    if (!userData.pets) userData.pets = [];
    
    if ((userData.inventory.pokeballs[ballType] || 0) < 1) {
        const name = ballConfig ? ballConfig.name : "Poké Ball";
        battle.logs = [`🚫 Hết ${name}! Vui lòng chọn bóng khác.`];
        // Quay lại giao diện chọn bóng
        return showCatchBallInterface(interaction, battle); 
    }
    if (userData.pets.length >= 10) {
        battle.logs = ["🚫 Kho Pet đã đầy (Tối đa 10)."];
        // Quay lại giao diện chọn bóng
        return showCatchBallInterface(interaction, battle); 
    }

    // 1. TRỪ BÓNG VÀO INVENTORY
    userData.inventory.pokeballs[ballType] -= 1; 

    // 2. TÍNH TỈ LỆ BẮT CUỐI CÙNG
    const baseCatchRate = calculateCatchRate(playerPet, wildPet);
    let finalCatchRate = baseCatchRate * ballConfig.multiplier;

    // 3. ÁP DỤNG THƯỞNG ĐẶC BIỆT (Ví dụ: Dusk Ball cho hệ Dark)
    if (ballType === 'dusk' && wildPet.elements.includes('Dark')) {
        finalCatchRate *= 1.25; 
    }
    // Master Ball luôn bắt thành công
    if (ballType === 'master') {
        finalCatchRate = 1.0; 
    }

    finalCatchRate = Math.max(0.005, Math.min(1.0, finalCatchRate));
    
    if (Math.random() < finalCatchRate) {
        // BẮT THÀNH CÔNG
        wildPet.ownerId = userId;
        const wildPetStats = wildPet.getStats ? wildPet.getStats() : wildPet.baseStats;
        wildPet.currentHP = wildPetStats.HP; 
        wildPet.currentMP = wildPetStats.MP;
        
        const petToSave = wildPet.getDataForSave ? wildPet.getDataForSave() : wildPet;
        Database.addPetToUser(userId, petToSave);
        
        battle.logs = [`🎉 **BẮT THÀNH CÔNG!** (${ballConfig.name} - ${Math.round(finalCatchRate * 100)}%) ${wildPet.name} đã được thêm vào kho.`];
        
        activeBattles.delete(userId);
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);
        
        Database.updateUser(userId, userData); // Cập nhật sau khi trừ bóng
        await interaction.editReply({ content: battle.logs.join('\n'), embeds: [], components: [] });
    } else {
        // BẮT TRƯỢT
        battle.logs = [`💢 **BẮT TRƯỢT!** (${ballConfig.name} - ${Math.round(finalCatchRate * 100)}%)`];
        
        Database.updateUser(userId, userData); // Cập nhật sau khi trừ bóng
        // Sau khi bắt trượt, đến lượt Pet địch tấn công
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
        userData.inventory.candies.normal = (userData.inventory.candies.normal || 0) + 2;
        userData.inventory.potions = (userData.inventory.potions || 0) + 1; 
        Database.updateUser(userId, userData);

        embed.setDescription(embed.data.description + `\n\n🔪 Đã kết liễu tự động.\nNhận **2 🍬 Kẹo & 1 💊 Thuốc**.`);
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);
        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));

    } else if (type === 'raid_boss') {
        embed.setTitle("🏆 BOSS RAID BỊ HẠ GỤT!");
        embed.setDescription("Boss đã bị tiêu diệt! Kiểm tra tin nhắn kênh server để xem Bảng Xếp Hạng sát thương và nhận thưởng!");
        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Đóng').setStyle(ButtonStyle.Secondary));
    } else {
        row.addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));
    }
    
    // [FIXED] Xử lý lỗi InteractionNotReplied an toàn (rất quan trọng)
    try {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (e) {
        if (e.code === 'InteractionNotReplied' || e.code === 10062) {
             await interaction.followUp({ 
                 content: `🏆 **CHIẾN THẮNG!** Tin nhắn cũ không thể cập nhật (Đã hết hạn).`, 
                 embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] 
             }).catch(() => {});
        } else {
            console.error("Lỗi showPvEVictory:", e.message);
        }
    }
}

async function handlePvEEndActions(interaction, customId, client) {
    const userId = interaction.user.id;
    const tempBattle = activeBattles.get(userId);
    let targetPetId = tempBattle ? tempBattle.wildPetId : null;
    let playerPetData = tempBattle ? tempBattle.playerPet : null;

    // [FIXED] Phải deferUpdate trước khi editReply, nếu chưa defer
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate(); // Khắc phục lỗi InteractionNotReplied ở đây
        }
    } catch (e) {
        console.error("❌ Discord Client Error (handlePvEEndActions):", e.message); 
        return; 
    }

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
            if(info && info.isBattling !== undefined) { 
                info.isBattling = false; activeWildPets.set(targetPetId, info); 
            }
        }
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

    if (targetPetId && customId === 'btn_claim' && tempBattle?.type === 'wild') {
        removePetFromWorld(targetPetId, client); 
    }
}

// ==================================================================
// 5. LOGIC PVP (ARENA & WEATHER)
// ==================================================================

async function startPvPMatch(interaction, cid) {
    const { challenger, opponent } = pendingChallenges.get(cid);
    pendingChallenges.delete(cid);
    
      // [FIXED] Defer lại tương tác Accept để có thể Edit tin nhắn
    try {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    } catch(e) {}
    
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

    const weatherKeys = Object.keys(WEATHER_DATA);
    const randomKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
    const initWeather = WEATHER_DATA[randomKey];

    const state = {
        mode: 'pvp', 
        p1: { user: challenger, pet: p1, id: challenger.id }, 
        p2: { user: opponent, pet: p2, id: opponent.id },
        turnOwner: (p1.getStats().SPD >= p2.getStats().SPD) ? challenger.id : opponent.id,
        round: 1, 
        weather: initWeather, // Lưu trạng thái thời tiết
        logs: [`⚡ **Bắt đầu!**`, `Thời tiết: **${initWeather.name}**`]
    };
    activeBattles.set(challenger.id, state);
    activeBattles.set(opponent.id, state);
    await updatePvPInterface(interaction, state);
}

async function updatePvPInterface(interaction, battle) {
    const { p1, p2, turnOwner, weather } = battle;
    const p1Stats = p1.pet.getStats(); const p2Stats = p2.pet.getStats();
    
    const p1Display = `❤️ ${createStatusBar(p1.pet.currentHP, p1Stats.HP, 'HP')}\n✨ ${createStatusBar(p1.pet.currentMP, p1Stats.MP, 'MP')}`;
    const p2Display = `❤️ ${createStatusBar(p2.pet.currentHP, p2Stats.HP, 'EnemyHP')}\n✨ ${createStatusBar(p2.pet.currentMP, p2Stats.MP, 'MP')}`;

    const embed = new EmbedBuilder().setTitle(`⚔️ PVP - ARENA`).setColor(0xFF0000)
        .setDescription(`👉 Lượt của: <@${turnOwner}>\n☁️ **Thời tiết:** ${weather.name}\n*${weather.desc}*\n` + "```yaml\n" + (battle.logs.slice(-3).join('\n')) + "\n```")
        .addFields(
            { name: `${p1.pet.name}`, value: p1Display, inline: true },
            { name: `${p2.pet.name}`, value: p2Display, inline: true }
        );
    
    const p1Img = getEmojiUrl(p1.pet.icon);
    const p2Img = getEmojiUrl(p2.pet.icon); 
    if (p2Img) embed.setThumbnail(p2Img); 
    if (p1Img) embed.setImage(p1Img); 

    const current = turnOwner === p1.id ? p1 : p2;
    const row = new ActionRowBuilder();
    current.pet.skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const btnLabel = s ? `${s.name} | ⚔️${s.power}`.slice(0, 80) : 'Skill';
        row.addComponents(new ButtonBuilder().setCustomId(`pvp_skill_${idx}_${current.id}`).setLabel(btnLabel).setStyle(ButtonStyle.Primary).setDisabled(current.pet.currentMP < s?.manaCost));
    });
    row.addComponents(new ButtonBuilder().setCustomId(`pvp_surrender_${current.id}`).setLabel('🏳️').setStyle(ButtonStyle.Secondary));
    
    const payload = { content: ` `, embeds: [embed], components: [row] };
    
    try {
        if(interaction.replied || interaction.deferred) await interaction.editReply(payload); 
        else await interaction.reply(payload);
    } catch (e) {
        console.error("Lỗi updatePvPInterface:", e.message);
    }
}

async function processPvPTurn(interaction, idx, battle) {
    // [FIXED] deferUpdate đã được gọi trong handleInteraction
    
    const uid = interaction.user.id;
    if (battle.turnOwner !== uid) return interaction.followUp({ content: "Chưa đến lượt!", flags: [MessageFlags.Ephemeral] });
    
    const atk = uid === battle.p1.id ? battle.p1 : battle.p2;
    const def = uid === battle.p1.id ? battle.p2 : battle.p1;
    const skill = getSkillById((atk.pet.skills || ['S1'])[idx]);
    
    if (atk.pet.currentMP < skill.manaCost) return interaction.followUp({ content: "Thiếu MP!", flags: [MessageFlags.Ephemeral] });
    atk.pet.currentMP -= skill.manaCost;

    // TÍNH DAMAGE VỚI THỜI TIẾT
    const res = calculateDamage(atk.pet, def.pet, skill.id, battle.weather);
    
    let logMsg = `👊 **${atk.pet.name}** dùng ${skill.name}`;
    if (res.multiplier > 1) logMsg += " (Buff 🔥)";
    else if (res.multiplier < 1) logMsg += " (Nerf 🔽)";
    
    logMsg += ` gây **${res.damage}** ST.`;
    battle.logs = [logMsg];

    def.pet.currentHP = Math.max(0, def.pet.currentHP - res.damage);
    processSkillEffect(atk.pet, def.pet, skill, battle.logs, res.damage);

    // LOGIC ĐỔI THỜI TIẾT TỪ SKILL
    if (skill.weatherChange && WEATHER_DATA[skill.weatherChange]) {
        battle.weather = WEATHER_DATA[skill.weatherChange];
        battle.logs.push(`⛈️ **Thời tiết đã chuyển thành: ${battle.weather.name}**`);
    }
    else if (skill.name.includes("Mưa")) {
        battle.weather = WEATHER_DATA['RAINY'];
        battle.logs.push(`⛈️ **${atk.pet.name} gọi Mưa Rào!**`);
    } else if (skill.name.includes("Nắng")) {
        battle.weather = WEATHER_DATA['SUNNY'];
        battle.logs.push(`☀️ **${atk.pet.name} gọi Nắng Gắt!**`);
    }

    if (def.pet.currentHP <= 0) {
        activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
        return interaction.editReply({ content: `🏆 **${atk.user.username}** thắng!`, embeds: [], components: [] });
    }
    battle.turnOwner = def.id;
    await updatePvPInterface(interaction, battle);  
}

async function endPvP(interaction, battle, winner) {
    activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
    await interaction.editReply({ content: `🏆 **${winner.user.username}** thắng (đối thủ đầu hàng)!`, embeds: [], components: [] });
}