// BattleManager.mjs - HỆ THỐNG CHIẾN ĐẤU & THU PHỤC (V3 FINAL SYNCHRONIZED - PUBLIC BATTLE)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
// Import removePetFromWorld từ SpawnSystem để xóa pet khi bắt/thắng
import { activeWildPets, removePetFromWorld } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
// Import Pet Class riêng biệt
import { Pet } from './Pet.mjs'; 
// Import Logic Game - ĐÃ THÊM processSkillEffect
import { calculateDamage, createDungeonBoss, processSkillEffect } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { ELEMENT_ICONS, CATCH_BALLS, RARITY_CONFIG } from './Constants.mjs'; 

const activeBattles = new Map(); 
const pendingChallenges = new Map(); // Dùng cho PvP
// ==========================================
// 1. HELPERS (HÀM HỖ TRỢ)
// ==========================================

function createHealthBar(current, max) {
    const totalBars = 12; 
    const safeMax = max > 0 ? max : 1;
    const percent = Math.max(0, Math.min(current / safeMax, 1));
    const filledBars = Math.round(percent * totalBars);
    
    // Đảm bảo không lặp số âm
    const fillCount = Math.max(0, filledBars);
    const emptyCount = Math.max(0, totalBars - filledBars);

    const filled = '🟩'.repeat(fillCount);
    const empty = '⬛'.repeat(emptyCount); 
    return `${filled}${empty} (${Math.round(percent * 100)}%)`;
}

function getEmojiUrl(emojiStr) {
    if (!emojiStr) return null;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}?size=96`;
    return null; 
}

function calculateCatchChance(playerPet, wildPet, ballRate) {
    // HP càng thấp tỷ lệ càng cao (Max 1.5x khi HP thấp)
    const hpPercent = (wildPet.currentHP || 1) / (wildPet.getStats().HP || 100); 
    const hpFactor = (1 - hpPercent) * 1.5; 
    
    // Chênh lệch cấp độ (Pet mình cao hơn thì dễ bắt hơn)
    const levelDiff = (playerPet.level - wildPet.level) * 0.02;
    
    // Khấu trừ theo độ hiếm
    let rarityPenalty = 0;
    if (wildPet.rarity === 'Epic') rarityPenalty = 0.1;
    if (wildPet.rarity === 'Legendary') rarityPenalty = 0.3;
    if (wildPet.rarity === 'Mythic') rarityPenalty = 0.5;

    let chance = (0.3 + hpFactor + levelDiff - rarityPenalty) * ballRate;
    return Math.max(0.01, Math.min(0.95, chance)); // Min 1%, Max 95%
}

// ⚡️ ĐÃ XÓA LOGIC GEMINI: Hàm này chỉ còn là stub
async function generateBattleLore(attackerPet, defenderPet, skill, damage) {
    return null; 
}


// ==========================================
// 2. ROUTING & INIT (ĐỊNH TUYẾN & KHỞI TẠO)
// ==========================================

export async function handleInteraction(interaction) {
    const { customId, user } = interaction;
    const uid = user.id;

    // --- PVP ROUTING ---
    if (customId.startsWith('pvp_')) {
        const battle = activeBattles.get(uid);
        if (customId.startsWith('pvp_accept_')) await startPvPMatch(interaction, customId.replace('pvp_accept_', ''));
        else if (customId.startsWith('pvp_decline_')) {
             pendingChallenges.delete(customId.replace('pvp_decline_', ''));
             await interaction.update({content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, parseInt(customId.split('_').pop()), battle);
        else if (customId === 'pvp_surrender') {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1, battle.p1.id === uid ? battle.p1 : battle.p2, "đầu hàng");
        }
        return;
    }

    // --- PVE: BẮT ĐẦU TRẬN CHIẾN (KHIÊU CHIẾN TỪ SPAWN) ---
    if (customId.startsWith('challenge_')) {
        
        // ⚡️ FIX LỖI 10062 & CẢNH BÁO: Defer ngay lập tức cho challenge_
        if (!interaction.deferred && !interaction.replied) {
            // DÒNG 122 ĐÃ SỬA: Loại bỏ tham số ephemeral để loại bỏ cảnh báo Node.js và fix lỗi 10062
            await interaction.deferReply(); 
        }
        
        const petId = customId.replace('challenge_', '');
        const info = activeWildPets.get(petId);
        
        // Kiểm tra Pet tồn tại
        if (!info) {
             // Dùng followUp với ephemeral flag vì đã defer
             // ⚡️ ĐÃ FIX: ephemeral: true -> flags
             await interaction.followUp({ content: "⚠️ Pet này đã biến mất hoặc đã bị bắt!", flags: MessageFlags.Ephemeral }); 
             return;
        }
        
        // Kiểm tra xem có ai đang đánh không (nếu không phải chính mình)
        if (info.isBattling && info.userId !== uid) {
             // Dùng followUp vì đã defer
            // ⚡️ ĐÃ FIX: ephemeral: true -> flags
            return interaction.followUp({ content: "⚠️ Người khác đang đánh Pet này!", flags: MessageFlags.Ephemeral }); 
        }

        const userData = Database.getUser(uid);
        if (!userData.pets.length) {
             // Dùng followUp vì đã defer
            // ⚡️ ĐÃ FIX: ephemeral: true -> flags
             return interaction.followUp({ content: "🚫 Bạn cần có Pet để chiến đấu!", flags: MessageFlags.Ephemeral }); 
        }


        // Đánh dấu Pet đang bị đánh để người khác không ks
        info.isBattling = true; 
        info.userId = uid; 
        activeWildPets.set(petId, info);

        // Khởi tạo Battle State (chưa có message ID)
        activeBattles.set(uid, {
            mode: 'pve', type: 'wild',
            playerPet: new Pet(userData.pets[0]), // Pet đầu tiên trong đội hình
            wildPet: new Pet(info.petData), 
            petMessageId: info.messageId,
            petChannelId: info.channelId,
            petId: petId,
            turn: 1, 
            logs: ["⚔️ **TRẬN CHIẾN BẮT ĐẦU!**"]
        });

        // Luôn dùng editReply sau khi defer.
        const battleMessage = await showPvEInterface(interaction, uid, false);
        
        // LƯU LẠI MESSAGE ID CỦA BATTLE MESSAGE VỪA TẠO
        if (battleMessage && battleMessage.id) {
            const battle = activeBattles.get(uid);
            battle.battleMessageId = battleMessage.id;
            // Cập nhật lại state
            activeBattles.set(uid, battle);
        }
        return;
    }

    // --- PVE: XỬ LÝ CÁC NÚT TRONG TRẬN ---
    const battle = activeBattles.get(uid);
    
    // ✅ Bắt tương tác không hợp lệ: Nếu không tìm thấy battle session
    if (!battle && customId.startsWith('battle_')) {
        // Trả lời riêng tư để thông báo cho người nhấn nút không liên quan
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        return interaction.reply({ content: "🚫 Trận đấu đã kết thúc hoặc không tồn tại, hoặc không phải trận đấu của bạn.", flags: MessageFlags.Ephemeral }); 
    }
    
    if (battle) {
        // ⚡️ FIX LỖI: Defer cho mọi tương tác trong trận đấu
        // Nếu tương tác là một nút *không phải* menu riêng tư, phải defer để tránh timeout.
        // Chỉ deferUpdate nếu chưa defer/reply
        if (!interaction.deferred && !interaction.replied && !customId.includes('catch_menu')) {
            await interaction.deferUpdate(); 
        }

        if (customId.startsWith('battle_skill_')) {
            await processPvETurn(interaction, parseInt(customId.split('_').pop()), battle);
        } else if (customId === 'battle_catch_menu') {
            // showCatchMenu có logic defer/update riêng (ephemeral: true)
            await showCatchMenu(interaction, battle);
        } else if (customId.startsWith('battle_use_ball_')) {
            const ballKey = customId.replace('battle_use_ball_', '');
            await handleCatchTurn(interaction, battle, ballKey);
        } else if (customId === 'battle_run') {
            await handleRunAction(interaction, battle);
        } else if (customId === 'battle_back') {
            // Quay lại menu chính (công khai)
            await showPvEInterface(interaction, uid, false); 
        }
        return;
    }
}

// ==========================================
// 3. GIAO DIỆN BATTLE (UI) - PVE
// ==========================================

// ✅ THAY ĐỔI: isEphemeral mặc định là false để hiển thị công khai
async function showPvEInterface(interaction, uid, isEphemeral = false) {
    const battle = activeBattles.get(uid);
    const { playerPet, wildPet } = battle;
    
    const pStats = playerPet.getStats();
    const wStats = wildPet.getStats(); 
    
    // Lấy Icon & Màu sắc
    const playerIcon = getEmojiUrl(playerPet.icon);
    const wildIcon = getEmojiUrl(wildPet.icon);
    const wildColor = RARITY_CONFIG[wildPet.rarity]?.color || 0xFF0000;

    // --- TẠO EMBED ---
    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${playerPet.name} 🆚 ${wildPet.name} (Turn ${battle.turn})`)
        .setDescription(`\`\`\`diff\n${battle.logs.slice(-5).join('\n')}\n\`\`\``) // Log 5 dòng cuối
        .setColor(wildColor)
        .addFields(
            { 
                name: `${playerPet.icon} **BẠN** (Lv.${playerPet.level})`, 
                value: `${createHealthBar(playerPet.currentHP, pStats.HP)}\n❤️ **${Math.round(playerPet.currentHP)}/${pStats.HP}** | 💧 **${Math.round(playerPet.currentMP)}/${pStats.MP}**\n⚔️ ATK: ${pStats.ATK} | 🛡️ DEF: ${pStats.DEF}`, 
                inline: false 
            },
            { 
                name: `VS`, value: `\u200B`, inline: false 
            },
            { 
                name: `${wildPet.icon} **ĐỐI THỦ** (Lv.${wildPet.level})`, 
                value: `${createHealthBar(wildPet.currentHP, wStats.HP)}\n❤️ **${Math.round(wildPet.currentHP)}/${wStats.HP}** | 💧 **${Math.round(wildPet.currentMP)}/${wStats.MP}**\n✨ Rank: ${wildPet.rarity} | 🧬 Gen: ${wildPet.gen}`, 
                inline: false 
            }
        );

    // Hiển thị ảnh: Wild Pet làm ảnh to (Image), Player Pet làm ảnh nhỏ (Thumbnail)
    if (wildIcon) embed.setImage(wildIcon);
    if (playerIcon) embed.setThumbnail(playerIcon);

    // --- TẠO NÚT BẤM (SKILLS & ACTIONS) ---
    const rowSkills = new ActionRowBuilder();
    const skills = playerPet.skills || ['S1']; 
    
    // Row 1: 4 Skill Buttons
    skills.forEach((sid, idx) => {
        const s = getSkillById(sid) || getSkillById('S1'); // Fallback S1 nếu skill lỗi
        const canUse = s && playerPet.currentMP >= s.manaCost;
        rowSkills.addComponents(
            new ButtonBuilder()
                .setCustomId(`battle_skill_${idx}`)
                .setLabel(`${s?.name || 'Skill'} (${s?.manaCost || 0})`)
                .setStyle(canUse ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(!canUse)
        );
    });

    // Row 2: Action Buttons (Catch, Run)
    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('battle_catch_menu').setLabel('🌐 Thu Phục').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('battle_run').setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    // Payload sử dụng cờ isEphemeral truyền vào
    const payload = { 
        embeds: [embed], 
        components: [rowSkills, rowActions], 
        // ⚡️ ĐÃ FIX: Dùng flags: MessageFlags.Ephemeral
        ...(isEphemeral ? { flags: MessageFlags.Ephemeral } : {})
    };

    // ⚡️ CHỈNH SỬA: Luôn dùng editReply nếu đã defer/replied (phản hồi tương tác ban đầu)
    if (interaction.replied || interaction.deferred) {
        // Trường hợp update (các lượt đánh sau) hoặc khi đã defer từ challenge_
        const editedMessage = await interaction.editReply(payload);
        return editedMessage; 
    } else {
        // Trường hợp update (fallback cho các tương tác button)
        const updatedMessage = await interaction.update(payload);
        return updatedMessage; 
    }
}

// --- MENU CHỌN BÓNG (TRONG TRẬN) ---
async function showCatchMenu(interaction, battle) {
    // FIX: Luôn Defer/Update trước khi xử lý
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

    const userData = Database.getUser(interaction.user.id);
    const balls = userData.inventory.balls || {};
    const wildPet = battle.wildPet;
    const playerPet = battle.playerPet;

    const maxHP = wildPet.getStats().HP || 100;
    const hpPercent = Math.round((wildPet.currentHP / maxHP) * 100) || 0;

    const embed = new EmbedBuilder()
        .setTitle(`🌐 THU PHỤC: ${wildPet.name}`)
        .setDescription(`HP Địch: **${hpPercent}%** (Càng thấp càng dễ bắt)\nHãy chọn loại bóng để ném! (Mất 1 lượt đánh nếu thất bại)`)
        .setColor(0x00FF00);

    const rowBalls = new ActionRowBuilder();
    let hasBall = false;

    for (const [key, config] of Object.entries(CATCH_BALLS)) {
        const count = balls[key] || 0;
        if (count > 0) {
            hasBall = true;
            // Tính tỷ lệ dự kiến
            let rate = calculateCatchChance(playerPet, wildPet, config.successRate);
            
            rowBalls.addComponents(
                new ButtonBuilder()
                    .setCustomId(`battle_use_ball_${key}`)
                    .setLabel(`${config.name} (${count}) - ${Math.round(rate * 100)}%`)
            );
        }
    }

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('battle_back').setLabel('⬅️ Quay lại đánh tiếp').setStyle(ButtonStyle.Secondary)
    );

    // ✅ Thao tác riêng tư (ephemeral: true)
    const payload = { embeds: [embed], components: [rowBalls, rowBack], flags: MessageFlags.Ephemeral }; 

    if (!hasBall) {
        embed.setDescription("🚫 **Bạn không có bóng nào!** Hãy quay lại chiến đấu.");
        await interaction.update({ embeds: [embed], components: [rowBack], flags: MessageFlags.Ephemeral }); 
    } else {
        await interaction.update(payload);
    }
}

// ==========================================
// 4. LOGIC XỬ LÝ (TURN) - PVE
// ==========================================

// --- XỬ LÝ TẤN CÔNG (SKILL) ---
async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    
    // 🚫 ĐÃ XÓA: Lệnh deferUpdate đã được chuyển lên handleInteraction. (Giữ nguyên)

    // 1. Player Attack
    const pSkillId = playerPet.skills[skillIndex];
    const pSkill = getSkillById(pSkillId) || getSkillById('S1'); 
    
    // Kiểm tra lại MP (Server-side check)
    if (playerPet.currentMP < pSkill.manaCost) {
         // Dùng flags
         await interaction.followUp({ content: "⚠️ Không đủ Mana!", flags: MessageFlags.Ephemeral }); 
         // Quay lại UI công khai
         return showPvEInterface(interaction, interaction.user.id, false);
    }

    playerPet.currentMP = Math.max(0, playerPet.currentMP - pSkill.manaCost);

    // Tính toán Damage (Sử dụng GameLogic)
    const dmgRes = calculateDamage(playerPet, wildPet, pSkillId, {buff: []}); // Thêm current weather giả
    const damageDealt = Number(dmgRes.damage) || 0;

    // --- LOGIC APPLY DAMAGE & EFFECT ---
    
    // **********************************
    // ⚡️ THAY THẾ LOGIC LOG BẰNG FALLBACK
    // **********************************
    let logEntry;

    // ⚡️ SỬA LỖI: Dùng thuộc tính 'type' (đã sửa trong Constants.mjs) thay vì damageType
    if (pSkill.type !== 'heal' && pSkill.type !== 'buff' && damageDealt > 0) {
        wildPet.currentHP = Math.max(0, wildPet.currentHP - damageDealt);
        
        // Gọi Fallback logic (vì AI đã bị xóa/tắt)
        const lore = null; // generateBattleLore đã trả về null
        
        // Sử dụng logEntry mặc định
        logEntry = `👊 **${playerPet.name}** dùng [${pSkill.name}] gây **${damageDealt}** ST.`;
        if (dmgRes.isCrit) logEntry += " (CRIT!)";
        if (dmgRes.multiplier > 1.0) logEntry += " (Khắc hệ!)";
        
        battle.logs.push(logEntry);
    } else {
        battle.logs.push(`✨ **${playerPet.name}** dùng [${pSkill.name}]!`);
    }
    
    // Gọi hàm xử lý hiệu ứng (Hồi máu, Buff, Debuff, Hút máu...)
    processSkillEffect(playerPet, wildPet, pSkill, battle.logs, damageDealt);

    // Check Win
    if (wildPet.currentHP <= 0) return endBattle(interaction, battle, 'win');

    // 2. Wild Pet Attack
    await wildPetTurn(battle);

    // Check Lose
    if (playerPet.currentHP <= 0) return endBattle(interaction, battle, 'lose');

    battle.turn++;
    updatePlayerPetDB(interaction.user.id, playerPet);
    
    // ✅ Cập nhật giao diện công khai
    await showPvEInterface(interaction, interaction.user.id, false);
}

// --- XỬ LÝ NÉM BÓNG (MẤT 1 LƯỢT) ---
async function handleCatchTurn(interaction, battle, ballKey) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const wildPet = battle.wildPet;
    
    // ⚡️ FIX LỖI: Defer update ngay lập tức 
    await interaction.deferUpdate();
    
    // Trừ bóng
    if (userData.inventory.balls[ballKey] > 0) {
        userData.inventory.balls[ballKey]--;
        Database.updateUser(userId, userData);
    } else {
        // Nếu hack/bug mà không có bóng
        // Quay lại UI công khai
        return showPvEInterface(interaction, userId, false); 
    }


    // Tính tỷ lệ
    const ballConfig = CATCH_BALLS[ballKey];
    const successRate = calculateCatchChance(battle.playerPet, wildPet, ballConfig.successRate);
    const roll = Math.random();

    if (roll < successRate) {
        // BẮT THÀNH CÔNG
        battle.logs.push(`🎉 **BẮT THÀNH CÔNG!** ${wildPet.name} đã bị thu phục.`);
        
        // Thêm Pet vào DB
        wildPet.ownerId = userId;
        wildPet.currentHP = wildPet.getStats().HP; // Hồi máu khi bắt về
        Database.addPetToUser(userId, wildPet.getDataForSave());
        
        return endBattle(interaction, battle, 'caught');
    } else {
        // BẮT THẤT BẠI -> MẤT LƯỢT -> QUÁI ĐÁNH
        battle.logs.push(`❌ **Thất bại!** ${wildPet.name} đã thoát khỏi ${ballConfig.name}.`);
        
        await wildPetTurn(battle); // Quái đánh trả
        
        if (battle.playerPet.currentHP <= 0) {
            return endBattle(interaction, battle, 'lose');
        }
        
        battle.turn++;
        updatePlayerPetDB(userId, battle.playerPet);
        // ✅ Cập nhật giao diện công khai
        await showPvEInterface(interaction, userId, false);
    }
}

// --- LOGIC QUÁI ĐÁNH TRẢ ---
async function wildPetTurn(battle, forcedSkillId = null) { // ⚡️ ĐÃ FIX: Cho phép truyền forcedSkillId
    const { playerPet, wildPet } = battle;
    
    // 1. Chọn Skill: Dùng forcedSkillId nếu có, nếu không thì chọn ngẫu nhiên
    let skillId = forcedSkillId;
    if (!skillId) {
        skillId = wildPet.skills.length > 0 ? wildPet.skills[Math.floor(Math.random() * wildPet.skills.length)] : 'S1';
    }
      
    const skill = getSkillById(skillId) || getSkillById('S1');
    
    // 2. Kiểm tra Mana và xử lý fallback
    if (wildPet.currentMP < skill.manaCost) {
        const basicSkill = getSkillById('S1');
        
        if (skillId !== 'S1' && wildPet.currentMP >= basicSkill.manaCost) {
            // ⚡️ FIX LOGIC: Gọi lại hàm với skill cơ bản (không gọi return)
            return wildPetTurn(battle, basicSkill.id); 
        } else {
            // Hết mana cho cả skill thường và skill cơ bản
            battle.logs.push(`🔸 **${wildPet.name}** kiệt sức, không thể tấn công.`);
            return; // Bỏ lượt
        }
    }

    // Trừ Mana sau khi xác nhận có thể tấn công
    wildPet.currentMP = Math.max(0, wildPet.currentMP - skill.manaCost);
    
    // Tính damage
    const res = calculateDamage(wildPet, playerPet, skillId, {buff: []});
    const damageDealt = Number(res.damage) || 0;


    // **********************************
    // ⚡️ THAY THẾ LOGIC LOG BẰNG FALLBACK
    // **********************************
    let logEntry;
    
    // Áp dụng damage
    if (skill.type !== 'heal' && skill.type !== 'buff' && damageDealt > 0) {
        playerPet.currentHP = Math.max(0, playerPet.currentHP - damageDealt);
        
        // Gọi Fallback logic (vì AI đã bị xóa/tắt)
        const lore = null; // generateBattleLore đã trả về null
        
        // Sử dụng logEntry mặc định
        logEntry = `👾 **${wildPet.name}**:\n > 🔸 Địch dùng [${skill.name}] gây **${damageDealt}** ST.`;
        if (res.isCrit) logEntry += " (CRIT!)";
        if (res.multiplier > 1.0) logEntry += " (Khắc hệ!)";
        
        battle.logs.push(logEntry);
    } else {
        battle.logs.push(`🔸 Địch dùng [${skill.name}]!`);
    }

    // Áp dụng Effect (Quái hồi máu, buff...)
    processSkillEffect(wildPet, playerPet, skill, battle.logs, damageDealt);
}

// --- CHẠY TRỐN ---
async function handleRunAction(interaction, battle) {
    const pSpd = battle.playerPet.getStats().SPD;
    const wSpd = battle.wildPet.getStats().SPD;
    const chance = 0.5 + (pSpd - wSpd) * 0.002; // Base 50% + chênh lệch Speed
    
    if (Math.random() < Math.min(0.9, Math.max(0.1, chance))) {
        await endBattle(interaction, battle, 'run');
    } else {
        await interaction.deferUpdate();
        battle.logs.push(`❌ **Chạy thất bại!**`);
        await wildPetTurn(battle);
        if (battle.playerPet.currentHP <= 0) return endBattle(interaction, battle, 'lose');
        // ✅ Cập nhật giao diện công khai
        await showPvEInterface(interaction, interaction.user.id, false);
    }
}

// ==========================================
// 5. KẾT THÚC TRẬN ĐẤU
// ==========================================

async function endBattle(interaction, battle, result) {
    const { wildPet } = battle;
    const userId = interaction.user.id;

    // Xóa Battle Session
    activeBattles.delete(userId);
    
    // Xử lý Pet ngoài thế giới (Spawn System)
    if (result === 'win' || result === 'caught') {
        // Nếu thắng hoặc bắt được: Xóa Pet khỏi thế giới vĩnh viễn
        removePetFromWorld(battle.petId, interaction.client);
    } else if (result === 'run' || result === 'lose') {
        // Nếu chạy hoặc thua: Reset trạng thái để người khác có thể đánh
        const info = activeWildPets.get(battle.petId);
        if (info) {
            info.isBattling = false;
            info.userId = null;
            activeWildPets.set(battle.petId, info);
        }
    }

    let title = "", desc = "", color = 0x000000;

    if (result === 'win') {
        title = "🏆 CHIẾN THẮNG!";
        // Logic thưởng
        const xpGain = Math.floor(wildPet.level * 50); 
        const candyGain = Math.floor(Math.random() * 3) + 1;
        
        const userData = Database.getUser(userId);
        userData.inventory.candies.normal += candyGain;
        
        // Cộng XP cho Pet người chơi (giả định pet đầu tiên)
        const pInstance = new Pet(userData.pets[0]);
        const leveledUp = pInstance.addExp(xpGain);
        userData.pets[0] = pInstance.getDataForSave();
        Database.updateUser(userId, userData);

        desc = `Hạ gục **${wildPet.name}**!\n🎁 **+${xpGain} XP** | **+${candyGain} 🍬**` + (leveledUp ? `\n🆙 **LÊN CẤP!**` : "");
        color = 0x00FF00;
    } else if (result === 'caught') {
        title = "🎉 THU PHỤC THÀNH CÔNG!";
        desc = `**${wildPet.name}** đã về đội của bạn!`;
        color = 0xFFFF00;
    } else if (result === 'lose') {
        title = "💀 THẤT BẠI...";
        desc = "Pet của bạn đã ngất xỉu. Hãy dùng Kẹo hồi phục sức khỏe!";
        color = 0xFF0000;
    } else if (result === 'run') {
        title = "🏃 ĐÃ CHẠY TRỐN!";
        desc = "Thoát khỏi trận chiến an toàn.";
        color = 0xCCCCCC;
    }

    const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setThumbnail(getEmojiUrl(wildPet.icon));
    
    // Nút đóng (Disabled)
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('battle_close').setLabel('Kết thúc').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    // ✅ Sửa lỗi/hoàn thành tương tác bằng tin nhắn công khai
    if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [embed], components: [row] });
    else await interaction.update({ embeds: [embed], components: [row] });
}

function updatePlayerPetDB(userId, petInstance) {
    const userData = Database.getUser(userId);
    const index = userData.pets.findIndex(p => p.id === petInstance.id);
    if (index !== -1) {
        userData.pets[index] = petInstance.getDataForSave();
        Database.updateUser(userId, userData);
    }
}

// ==========================================
// 6. LOGIC PVP (GIỮ NGUYÊN & CẬP NHẬT LOGIC)
// ==========================================

export async function startPvPMatch(interaction, cid) {
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
        // Lưu ý: Nút của người chơi khác sẽ không bị Disable, nhưng logic ở processPvPTurn sẽ chặn thao tác
        row.addComponents(new ButtonBuilder().setCustomId(`pvp_skill_${idx}`).setLabel(s ? s.name : 'Skill').setStyle(ButtonStyle.Primary).setDisabled(current.pet.currentMP < s?.manaCost));
    });
    row.addComponents(new ButtonBuilder().setCustomId('pvp_surrender').setLabel('🏳️').setStyle(ButtonStyle.Secondary));
    
    const payload = { content: `Lượt của <@${turnOwner}>`, embeds: [embed], components: [row] };
    if(interaction.message) await interaction.update(payload); else await interaction.reply(payload);
}

async function processPvPTurn(interaction, idx, battle) {
    const uid = interaction.user.id;
    // Kiểm tra lượt: Nếu không phải lượt của người này, trả lời riêng tư để chặn
    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    if (battle.turnOwner !== uid) return interaction.reply({ content: "Chưa đến lượt!", flags: MessageFlags.Ephemeral }); 
    
    // ⚡️ FIX LỖI: Defer update ngay lập tức (PVP)
    await interaction.deferUpdate();
    
    const atk = uid === battle.p1.id ? battle.p1 : battle.p2;
    const def = uid === battle.p1.id ? battle.p2 : battle.p1;
    const skill = getSkillById((atk.pet.skills || ['S1'])[idx]);
    
    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    if (atk.pet.currentMP < skill.manaCost) return interaction.followUp({ content: "Thiếu MP!", flags: MessageFlags.Ephemeral }); 
    atk.pet.currentMP -= skill.manaCost;

    // Tính Damge
    const res = calculateDamage(atk.pet, def.pet, skill.id, {buff:[]});
    
    // Áp dụng Damage (nếu ko phải buff/heal thuần túy)
    // ⚡️ SỬA LỖI: Dùng thuộc tính 'type' (đã sửa trong Constants.mjs) thay vì damageType
    if (skill.type !== 'heal' && skill.type !== 'buff' && res.damage > 0) {
        def.pet.currentHP = Math.max(0, def.pet.currentHP - res.damage);
        
        // **********************************
        // ⚡️ THÊM LOGIC FALLBACK CHO PVP (AI đã bị xóa)
        // **********************************
        const lore = null; 
        const logEntry = lore ? `💥 **${atk.user.username}**:\n > *${lore}*` : `👊 **${atk.pet.name}** dùng [${skill.name}] gây **${res.damage}** ST.`;
        battle.logs.push(logEntry);
        // Giới hạn log để tránh quá tải
        if (battle.logs.length > 20) battle.logs = battle.logs.slice(-20); 
    }
    
    // Xử lý Effect
    processSkillEffect(atk.pet, def.pet, skill, battle.logs, res.damage);

    if (def.pet.currentHP <= 0) {
        activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
        // Cập nhật tin nhắn công khai cuối cùng
        return interaction.editReply({ content: `🏆 **${atk.user.username}** thắng!`, embeds: [], components: [] });
    }
    battle.turnOwner = def.id;
    await updatePvPInterface(interaction, battle);
}

async function endPvP(interaction, battle, winner) {
    activeBattles.delete(battle.p1.id); activeBattles.delete(battle.p2.id);
    await interaction.update({ content: `🏆 **${winner.user.username}** thắng (đối thủ đầu hàng)!`, embeds: [], components: [] });
}