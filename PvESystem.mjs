import { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags 
} from 'discord.js';

// 👇 ĐÃ SỬA: Import removePetFromWorld từ SpawnSystem
import { activeWildPets, removePetFromWorld } from './SpawnSystem.mjs'; 
import { Database } from './Database.mjs';
import { Pet, calculateDamage, processSkillEffect, createBossPet } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 

import { 
    activeBattles, globalRaidManager,
    createStatusBar, getEmojiUrl, checkPetStatus 
} from './BattleManager.mjs';

import { calculateCatchRate } from './CatchSystem.mjs'; // Đã xóa import thừa

const PET_XP_BASE = 100;

// --- HÀM HỖ TRỢ GỬI TIN NHẮN AN TOÀN ---
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch (error) {
        console.error("Lỗi safeReply:", error.message);
        try { await interaction.followUp({ ...payload, ephemeral: true }); } catch (e) {}
    }
}

export async function startAdventure(interaction, difficulty) {
    const userId = interaction.user.id;
    if (activeBattles.has(userId)) return safeReply(interaction, { content: "🚫 Đang bận!", flags: [MessageFlags.Ephemeral] });
    const userData = Database.getUser(userId);
    if (!userData.pets.length) return safeReply(interaction, { content: "🚫 Cần có Pet!", flags: [MessageFlags.Ephemeral] });
    
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply(); 
    await startBattleLogic(interaction, userId, userData, userData.activePetIndex || 0, 'adventure', difficulty);
}

export async function startBattleLogic(interaction, userId, userData, petIndex, type, param) {
    if (!userData.pets[petIndex]) petIndex = 0;
    const petData = userData.pets[petIndex];
    
    const petCheck = checkPetStatus(petData);
    if (petCheck.isDead) return safeReply(interaction, { content: `💀 Pet đang hồi sức (${petCheck.remaining}p).` });
    if (petCheck.revived) Database.updateUser(userId, userData);

    let wildPetInstance, wildPetId = null;
    if (type === 'adventure') {
        wildPetInstance = createBossPet(typeof param === 'number' ? param : 1); 
    } else {
        wildPetInstance = param.petData instanceof Pet ? param.petData : new Pet(param.petData);
        wildPetId = param.petId; 
    }

    activeBattles.set(userId, {
        mode: 'pve', type, difficulty: 1,
        playerPet: new Pet(petData), 
        wildPet: wildPetInstance, 
        wildPetId: wildPetId, 
        turn: 1, logs: ["⚔️ **TRẬN ĐẤU BẮT ĐẦU!**"]
    });

    const msg = await interaction.editReply({ content: "🔥 Đang tải dữ liệu...", components: [] });
    const battle = activeBattles.get(userId);
    if (battle) battle.messageId = msg.id;

    await showPvEInterface(interaction, userId);
}

export async function showPvEInterface(interaction, uid) {
    const battle = activeBattles.get(uid);
    if (!battle) return;

    const { playerPet, wildPet } = battle;
    const pStats = playerPet.getStats();
    const wStats = wildPet.getStats(); 
    const wildColor = wildPet.getColor ? wildPet.getColor() : 0x0099FF;

    let currentWildHP = wildPet.currentHP;
    let maxWildHP = wStats.HP;
    if (battle.type === 'raid_boss' && globalRaidManager?.activeBoss) {
        currentWildHP = globalRaidManager.activeBoss.currentHP;
        maxWildHP = globalRaidManager.activeBoss.maxHP;
    }

    const skillInfoList = (playerPet.skills || ['S1']).map((sid, idx) => {
        const s = getSkillById(sid);
        if (!s) return `\`${idx+1}.\` Unknown`;
        const dmgInfo = s.power > 0 ? `⚔️**${s.power}**` : '🛡️Buff';
        return `**${idx + 1}. ${s.name}**: ${dmgInfo} | 💧**${s.manaCost}**`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${playerPet.name} 🆚 ${wildPet.name}`)
        .setColor(wildColor)
        .setDescription("```yaml\n" + (battle.logs.slice(-5).join('\n') || "Sẵn sàng...") + "\n```")
        .addFields(
            { 
                name: `🛡️ Phe Ta (Lv.${playerPet.level})`, 
                value: `${createStatusBar(playerPet.currentHP, pStats.HP, 'HP')}\n` + 
                       `${createStatusBar(playerPet.currentMP, pStats.MP, 'MP')}`, 
                inline: true 
            },
            { 
                name: `⚔️ Phe Địch (Lv.${wildPet.level})`, 
                value: `${createStatusBar(currentWildHP, maxWildHP, 'EnemyHP')}\n` + 
                       `${createStatusBar(wildPet.currentMP, wStats.MP, 'MP')}`, 
                inline: true 
            },
            {
                name: '📜 Chi tiết Kỹ năng',
                value: skillInfoList || "Không có kỹ năng",
                inline: false
            }
        );
    
    const wildImg = getEmojiUrl(wildPet.icon);
    const playerImg = getEmojiUrl(playerPet.icon); 
    
    if (playerImg) embed.setThumbnail(playerImg);
    if (wildImg) embed.setImage(wildImg);

    embed.setFooter({ text: `Lượt: ${battle.turn} | Chọn kỹ năng bên dưới để tấn công!` });

    const row1 = new ActionRowBuilder();
    const skills = playerPet.skills || ['S1'];
    skills.forEach((sid, idx) => {
        const s = getSkillById(sid);
        const canUse = s && playerPet.currentMP >= s.manaCost;
        
        let label = 'Đánh thường';
        if (s) {
            const shortName = s.name.length > 12 ? s.name.substring(0, 10) + '..' : s.name;
            const dmgDisplay = s.power > 0 ? `⚔️${s.power}` : '🛡️';
            label = `${shortName} | ${dmgDisplay} 💧${s.manaCost}`;
        }
        
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId(`use_skill_${idx}_${uid}`)
                .setLabel(label)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!canUse)
        );
    });
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`btn_heal_${uid}`).setLabel('💊 Hồi Máu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`btn_mana_${uid}`).setLabel('💧 Hồi Mana').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`btn_run_${uid}`).setLabel('🏃 Bỏ Chạy').setStyle(ButtonStyle.Danger)
    );

    if (battle.type === 'wild' && wildPet.rarity !== 'Boss' && wildPet.rarity !== 'RaidBoss') {
        const rate = calculateCatchRate(playerPet, wildPet);
        row2.addComponents(
            new ButtonBuilder()
                .setCustomId(`btn_select_ball_${uid}`)
                .setLabel(`Bắt (${Math.round(rate * 100)}%)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(wildPet.currentHP <= 0)
        );
    }

    await safeReply(interaction, { embeds: [embed], components: [row1, row2] });
}

export async function processPvETurn(interaction, skillIndex, battle) {
    const { playerPet, wildPet } = battle;
    battle.logs = []; 
    
    const pSkill = getSkillById((playerPet.skills || ['S1'])[skillIndex]);
    if (!pSkill) return safeReply(interaction, { content: "Lỗi skill!" });

    const pStart = playerPet.processTurnEffects();
    if (pStart.log.length) battle.logs.push(...pStart.log);
    if (playerPet.currentHP <= 0) return handlePvEEndActions(interaction, 'btn_defeat', interaction.client);

    if (playerPet.currentMP < pSkill.manaCost) {
          battle.logs.push(`⚠️ Thiếu MP!`);
          return showPvEInterface(interaction, interaction.user.id);
    }
    playerPet.currentMP -= pSkill.manaCost;

    const wildInfo = activeWildPets.get(String(wildPet.id));
    const weather = wildInfo ? wildInfo.weather : { buff: [] }; 
    const pRes = calculateDamage(playerPet, wildPet, pSkill.id, weather);
    
    let log = `👊 **${playerPet.name}** dùng [${pSkill.name}] gây **${pRes.damage}** ST.`;
    if (pRes.isCrit) log = `💥 CRIT! ${log}`;
    battle.logs.push(log);
    
    if (!pRes.isEvaded) {
        if (battle.type === 'raid_boss' && globalRaidManager) {
            const defeated = globalRaidManager.trackDamage(interaction.user.id, pRes.damage);
            battle.wildPet.currentHP = globalRaidManager.activeBoss.currentHP; 
            if (pRes.vampHeal > 0) battle.logs.push(`🩸 Hút ${pRes.vampHeal} HP.`);
            if (defeated) return showPvEVictory(interaction, battle);
        } else {
            wildPet.currentHP = Math.max(0, wildPet.currentHP - pRes.damage);
            if (pRes.vampHeal > 0) battle.logs.push(`🩸 Hút ${pRes.vampHeal} HP.`);
            if (pRes.thornDamage > 0) battle.logs.push(`🌵 Phản ${pRes.thornDamage} ST.`);
        }
    } else {
        battle.logs.push(`👻 Địch đã né đòn!`);
    }
    processSkillEffect(playerPet, wildPet, pSkill, battle.logs, pRes.damage);

    if (wildPet.currentHP <= 0 && battle.type !== 'raid_boss') return showPvEVictory(interaction, battle);

    await processEnemyTurn(interaction, battle);
}

export async function processEnemyTurn(interaction, battle) {
    const { playerPet, wildPet } = battle;
    let weather = { buff: [] };
    if (battle.type === 'wild') {
        const info = activeWildPets.get(String(wildPet.id));
        if (info) weather = info.weather || { buff: [] };
    }

    const wStart = wildPet.processTurnEffects();
    if (wStart.log.length) battle.logs.push(...wStart.log);
    if (wildPet.currentHP <= 0 && battle.type !== 'raid_boss') return showPvEVictory(interaction, battle);

    const wSkill = getSkillById('S1'); 
    const wRes = calculateDamage(wildPet, playerPet, 'S1', weather);
    
    battle.logs.push(`🔸 Địch dùng [Đánh thường] gây **${wRes.damage}** ST.`);
    if (!wRes.isEvaded) {
        playerPet.currentHP = Math.max(0, playerPet.currentHP - wRes.damage);
        if (wRes.vampHeal > 0) battle.logs.push(`🩸 Địch hút ${wRes.vampHeal} HP.`);
        if (wRes.thornDamage > 0) battle.logs.push(`🌵 Địch bị phản ${wRes.thornDamage} ST.`);
    }
    processSkillEffect(wildPet, playerPet, wSkill, battle.logs, wRes.damage);

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

export async function handleHealAction(interaction, battle) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); 
    const u = Database.getUser(interaction.user.id);
    if ((u.inventory.potions || 0) < 1) {
        battle.logs.push("🚫 Hết Potion!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    u.inventory.potions--;
    const max = battle.playerPet.getStats().HP;
    const heal = Math.floor(max * 0.3);
    battle.playerPet.currentHP = Math.min(max, battle.playerPet.currentHP + heal);
    Database.updateUser(interaction.user.id, u);
    battle.logs = [`💊 Hồi ${heal} HP.`];
    await processEnemyTurn(interaction, battle);
}

export async function handleManaAction(interaction, battle) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); 
    const u = Database.getUser(interaction.user.id);
    if ((u.inventory.potions || 0) < 1) { 
        battle.logs.push("🚫 Hết Potion!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    u.inventory.potions--;
    const max = battle.playerPet.getStats().MP;
    const restore = Math.floor(max * 0.3);
    battle.playerPet.currentMP = Math.min(max, battle.playerPet.currentMP + restore);
    Database.updateUser(interaction.user.id, u);
    battle.logs = [`💧 Hồi ${restore} MP.`];
    await processEnemyTurn(interaction, battle);
}

export async function handleRunAction(interaction, battle) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    if (battle.type === 'adventure' || battle.type === 'raid_boss') {
        battle.logs.push("🚫 Không thể chạy!");
        return showPvEInterface(interaction, interaction.user.id);
    }
    if (Math.random() < 0.5) {
        activeBattles.delete(interaction.user.id);
        return safeReply(interaction, { content: "🏃 Chạy thành công!", embeds: [], components: [] });
    }
    battle.logs = ["❌ Chạy thất bại!"];
    await processEnemyTurn(interaction, battle);
}

export async function showPvEVictory(interaction, battle) {
    const { playerPet, wildPet, type } = battle;
    const uid = interaction.user.id;
    const xp = Math.round((wildPet.level * 100 + 50) * (type === 'adventure' ? 1.5 : 1));
    
    const u = Database.getUser(uid);
    const idx = u.pets.findIndex(p => p.id === playerPet.id);
    let msg = "";
    if(idx !== -1) {
        const p = new Pet(u.pets[idx]);
        if (p.addExp(xp)) msg = `\n🆙 Lên cấp ${p.level}!`;
        p.currentHP = p.getStats().HP; p.currentMP = p.getStats().MP;
        u.pets[idx] = p.getDataForSave();
        Database.updateUser(uid, u);
    }
    activeBattles.delete(uid);

    const embed = new EmbedBuilder().setTitle("🏆 CHIẾN THẮNG").setColor(0x00FF00).setDescription(`Hạ gục **${wildPet.name}**!\nNhận: **${xp} XP** ${msg}`);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_claim').setLabel('Xong').setStyle(ButtonStyle.Primary));

    if (type === 'wild') {
        u.inventory.candies.normal = (u.inventory.candies.normal || 0) + 2;
        Database.updateUser(uid, u);
        embed.setDescription(embed.data.description + `\nNhận **2 🍬 Kẹo**.`);
        
        if (battle.wildPetId) {
            // 👇 ĐÃ SỬA: Gọi hàm từ SpawnSystem (đã import ở đầu)
            await removePetFromWorld(battle.wildPetId, interaction.client);
        }
    }

    await safeReply(interaction, { embeds: [embed], components: [row] });
}

export async function handlePvEEndActions(interaction, customId, client) {
    const uid = interaction.user.id;
    const battle = activeBattles.get(uid);
    const pid = battle?.wildPetId;
    
    try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) { return; }

    if (customId === 'btn_defeat') {
        activeBattles.delete(uid);
        if (pid) {
            const info = activeWildPets.get(String(pid));
            if(info) { info.isBattling = false; activeWildPets.set(String(pid), info); }
        }
        const u = Database.getUser(uid);
        if (u.pets[0]) { u.pets[0].deathTime = Date.now(); Database.updateUser(uid, u); }
        return safeReply(interaction, { content: "💀 **THẤT BẠI!** Pet cần hồi sức.", embeds: [], components: [] });
    }
    
    if (customId === 'btn_claim') await safeReply(interaction, { content: "✅ Xong.", embeds: [], components: [] });
}