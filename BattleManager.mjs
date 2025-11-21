// BattleManager.mjs - HỆ THỐNG CHIẾN ĐẤU & THU PHỤC (V3 FINAL FULL - KHÔNG LƯỢC BỎ)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// Import removePetFromWorld từ SpawnSystem để xóa pet khi bắt/thắng
import { activeWildPets, removePetFromWorld } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
// Import Pet Class riêng biệt
import { Pet } from './Pet.mjs'; 
// Import Logic Game
import { calculateDamage, createDungeonBoss } from './GameLogic.mjs'; 
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
    const hpPercent = (wildPet.currentHP || 1) / (wildPet.baseStats?.HP || 100); 
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
             interaction.update({content:"Đã từ chối", embeds:[], components:[]});
        }
        else if (customId.startsWith('pvp_skill_')) await processPvPTurn(interaction, parseInt(customId.split('_').pop()), battle);
        else if (customId === 'pvp_surrender') {
             if(battle) endPvP(interaction, battle, battle.p1.id === uid ? battle.p2 : battle.p1, battle.p1.id === uid ? battle.p1 : battle.p2, "đầu hàng");
        }
        return;
    }

    // --- PVE: BẮT ĐẦU TRẬN CHIẾN (KHIÊU CHIẾN TỪ SPAWN) ---
    if (customId.startsWith('challenge_')) {
        const petId = customId.replace('challenge_', '');
        const info = activeWildPets.get(petId);
        
        // Kiểm tra Pet tồn tại
        if (!info) return interaction.reply({ content: "⚠️ Pet này đã biến mất hoặc đã bị bắt!", ephemeral: true });
        
        // Kiểm tra xem có ai đang đánh không (nếu không phải chính mình)
        if (info.isBattling && info.userId !== uid) {
            return interaction.reply({ content: "⚠️ Người khác đang đánh Pet này!", ephemeral: true });
        }

        const userData = Database.getUser(uid);
        if (!userData.pets.length) return interaction.reply({ content: "🚫 Bạn cần có Pet để chiến đấu!", ephemeral: true });

        // Đánh dấu Pet đang bị đánh để người khác không ks
        info.isBattling = true; 
        info.userId = uid; 
        activeWildPets.set(petId, info);

        // Khởi tạo Battle State
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

        // Gọi giao diện battle (Ephemeral = true để riêng tư)
        await showPvEInterface(interaction, uid);
        return;
    }

    // --- PVE: XỬ LÝ CÁC NÚT TRONG TRẬN ---
    const battle = activeBattles.get(uid);
    
    // Nếu không tìm thấy battle session và action bắt đầu bằng battle_ -> Lỗi
    if (!battle && customId.startsWith('battle_')) {
        return interaction.reply({ content: "🚫 Trận đấu đã kết thúc hoặc không tồn tại.", ephemeral: true });
    }
    
    if (battle) {
        if (customId.startsWith('battle_skill_')) {
            await processPvETurn(interaction, parseInt(customId.split('_').pop()), battle);
        } else if (customId === 'battle_catch_menu') {
            await showCatchMenu(interaction, battle);
        } else if (customId.startsWith('battle_use_ball_')) {
            const ballKey = customId.replace('battle_use_ball_', '');
            await handleCatchTurn(interaction, battle, ballKey);
        } else if (customId === 'battle_run') {
            await handleRunAction(interaction, battle);
        } else if (customId === 'battle_back') {
            await showPvEInterface(interaction, uid); // Quay lại menu chính từ menu bắt
        }
        return;
    }
}

// ==========================================
// 3. GIAO DIỆN BATTLE (UI) - PVE
// ==========================================

async function showPvEInterface(interaction, uid) {
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

    const payload = { embeds: [embed], components: [rowSkills, rowActions], ephemeral: true };

    // Gửi hoặc Update (Sử dụng ephemeral: true để riêng tư)
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
}

// --- MENU CHỌN BÓNG (TRONG TRẬN) ---
async function showCatchMenu(interaction, battle) {
    // FIX: Luôn Defer trước khi xử lý
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

    const userData = Database.getUser(interaction.user.id);
    const balls = userData.inventory.balls || {};
    const wildPet = battle.wildPet;
    const playerPet = battle.playerPet;

    const maxHP = wildPet.baseStats?.HP || 100;
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
                    .setEmoji(config.icon || '🔴')
                    .setStyle(ButtonStyle.Primary)
            );
        }
    }

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('battle_back').setLabel('⬅️ Quay lại đánh tiếp').setStyle(ButtonStyle.Secondary)
    );

    if (!hasBall) {
        embed.setDescription("🚫 **Bạn không có bóng nào!** Hãy quay lại chiến đấu.");
        await interaction.update({ embeds: [embed], components: [rowBack] });
    } else {
        await interaction.update({ embeds: [embed], components: [rowBalls, rowBack] });
    }
}

// ==========================================
// 4. LOGIC XỬ LÝ (TURN) - PVE
// ==========================================

// --- XỬ LÝ TẤN CÔNG (SKILL) ---
async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    
    // Defer update để tránh timeout nếu tính toán lâu
    await interaction.deferUpdate();

    // 1. Player Attack
    const pSkillId = playerPet.skills[skillIndex];
    const pSkill = getSkillById(pSkillId) || getSkillById('S1'); 
    
    // Kiểm tra lại MP (Server-side check)
    if (playerPet.currentMP < pSkill.manaCost) {
         await interaction.followUp({ content: "⚠️ Không đủ Mana!", ephemeral: true });
         // Gọi lại giao diện chính mà không defer nữa (vì đã defer rồi)
         return showPvEInterface(interaction, interaction.user.id);
    }

    playerPet.currentMP -= pSkill.manaCost;

    // Tính toán Damage (Đã có hàm an toàn trong GameLogic)
    const dmgRes = calculateDamage(playerPet, wildPet, pSkillId);
    const damageDealt = Number(dmgRes.damage) || 0;

    let log = "";
    // Xử lý đặc biệt cho HEAL/BUFF (nếu damage = 0 và có effect)
    if (pSkill.damageType === 'HEAL' || pSkill.damageType === 'BUFF') {
        log = `✨ **${playerPet.name}** dùng [${pSkill.name}]!`;
        // Logic heal/buff đơn giản tại đây nếu GameLogic chưa xử lý
        if(pSkill.heal) {
             const healAmount = Math.floor(playerPet.getStats().HP * pSkill.heal);
             playerPet.currentHP = Math.min(playerPet.getStats().HP, playerPet.currentHP + healAmount);
             log += ` Hồi ${healAmount} HP.`;
        }
    } else {
        wildPet.currentHP = Math.max(0, wildPet.currentHP - damageDealt);
        log = `👊 **${playerPet.name}** dùng [${pSkill.name}] gây **${damageDealt}** ST.`;
        if (dmgRes.isCrit) log += " (CRIT!)";
    }
    
    battle.logs.push(log);

    // Check Win
    if (wildPet.currentHP <= 0) return endBattle(interaction, battle, 'win');

    // 2. Wild Pet Attack
    await wildPetTurn(battle);

    // Check Lose
    if (playerPet.currentHP <= 0) return endBattle(interaction, battle, 'lose');

    battle.turn++;
    updatePlayerPetDB(interaction.user.id, playerPet);
    
    await showPvEInterface(interaction, interaction.user.id);
}

// --- XỬ LÝ NÉM BÓNG (MẤT 1 LƯỢT) ---
async function handleCatchTurn(interaction, battle, ballKey) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const wildPet = battle.wildPet;
    
    // Trừ bóng
    if (userData.inventory.balls[ballKey] > 0) {
        userData.inventory.balls[ballKey]--;
        Database.updateUser(userId, userData);
    } else {
        // Nếu hack/bug mà không có bóng
        return showPvEInterface(interaction, userId); 
    }

    await interaction.deferUpdate();

    // Tính tỷ lệ
    const ballConfig = CATCH_BALLS[ballKey];
    const successRate = calculateCatchChance(battle.playerPet, wildPet, ballConfig.successRate);
    const roll = Math.random();

    if (roll < successRate) {
        // BẮT THÀNH CÔNG
        battle.logs.push(`🎉 **BẮT THÀNH CÔNG!** ${wildPet.name} đã bị thu phục.`);
        
        // Thêm Pet vào DB
        wildPet.ownerId = userId;
        wildPet.currentHP = wildPet.baseStats.HP; // Hồi máu khi bắt về
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
        await showPvEInterface(interaction, userId);
    }
}

// --- LOGIC QUÁI ĐÁNH TRẢ ---
async function wildPetTurn(battle) {
    const { playerPet, wildPet } = battle;
    // Wild Pet chọn skill (S1 mặc định hoặc random)
    const skillId = wildPet.skills.length > 0 ? wildPet.skills[Math.floor(Math.random() * wildPet.skills.length)] : 'S1';
    const res = calculateDamage(wildPet, playerPet, skillId);
    
    const damageDealt = Number(res.damage) || 0;
    playerPet.currentHP = Math.max(0, playerPet.currentHP - damageDealt);
    
    const skillName = getSkillById(skillId)?.name || 'Đánh thường';
    battle.logs.push(`🔸 Địch dùng [${skillName}] gây **${damageDealt}** ST.`);
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
        await showPvEInterface(interaction, interaction.user.id);
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

    // Fix Warning: Bỏ 'ephemeral' trong editReply
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
// 6. LOGIC PVP (GIỮ NGUYÊN)
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