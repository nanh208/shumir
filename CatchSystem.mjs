import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Database } from './Database.mjs';
import { POKEBALLS } from './Constants.mjs';
import { removePetFromWorld } from './BattleManager.mjs'; 

const BASE_CATCH_RATES = { 'Common': 0.50, 'Uncommon': 0.40, 'Rare': 0.25, 'Epic': 0.15, 'Legendary': 0.05, 'Boss': 0.01, 'Mythic': 0.001 };

export function calculateCatchRate(playerPet, wildPet) {
    const rarityKey = wildPet.rarity in BASE_CATCH_RATES ? wildPet.rarity : 'Common';
    const baseRate = BASE_CATCH_RATES[rarityKey];
    const hpRatio = wildPet.currentHP / wildPet.getStats().HP;
    let finalRate = baseRate + ((1 - hpRatio) * 0.25);
    return Math.max(0.005, Math.min(1.0, finalRate));
}

export async function showCatchBallInterface(interaction, battle) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const { playerPet, wildPet } = battle;

    try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) { return; }
    
    const baseRate = calculateCatchRate(playerPet, wildPet);
    const embed = new EmbedBuilder().setTitle("🔴 CHỌN POKÉ BALL")
        .setDescription(`Pet: **${wildPet.name}**\nTỉ lệ gốc: **${Math.round(baseRate * 100)}%**\nHP: **${Math.round(wildPet.currentHP)}**`)
        .setColor(0x0099FF);

    const row = new ActionRowBuilder();
    for (const key in POKEBALLS) {
        const ball = POKEBALLS[key];
        const count = userData.inventory.pokeballs?.[key] || 0; 
        let finalRate = baseRate * ball.multiplier;
        if (key === 'dusk' && wildPet.element === 'Dark') finalRate *= 1.25;
        finalRate = Math.min(1.0, finalRate);

        row.addComponents(new ButtonBuilder().setCustomId(`ball_${key}_${userId}`)
            .setLabel(`${ball.name} (${Math.round(finalRate * 100)}%) [${count}]`).setStyle(ball.style).setDisabled(count <= 0));
    }
    row.addComponents(new ButtonBuilder().setCustomId(`btn_cancel_catch_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));
    
    try { await interaction.editReply({ embeds: [embed], components: [row] }); } catch(e) {}
}

export async function handleCatchAction(interaction, battle) {
    const userId = interaction.user.id;
    const { playerPet, wildPet, wildPetId } = battle;
    const ballType = interaction.customId.split('_')[1] || 'poke';
    const ballConfig = POKEBALLS[ballType] || POKEBALLS['poke'];

    try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) { return; }
    const { showPvEInterface, processEnemyTurn } = await import('./PvESystem.mjs');
    const { activeBattles } = await import('./BattleManager.mjs');

    const userData = Database.getUser(userId);
    if (!userData.inventory.pokeballs || userData.inventory.pokeballs[ballType] < 1) {
        battle.logs = ["🚫 Hết bóng!"];
        return showCatchBallInterface(interaction, battle);
    }
    if (userData.pets.length >= 10) {
        battle.logs = ["🚫 Kho đầy!"];
        return showCatchBallInterface(interaction, battle);
    }

    userData.inventory.pokeballs[ballType]--; 
    let finalRate = calculateCatchRate(playerPet, wildPet) * ballConfig.multiplier;
    if (ballType === 'dusk' && wildPet.element === 'Dark') finalRate *= 1.25;
    if (ballType === 'master') finalRate = 1.0;

    if (Math.random() < finalRate) {
        wildPet.ownerId = userId;
        wildPet.currentHP = wildPet.getStats().HP; 
        wildPet.currentMP = wildPet.getStats().MP;
        Database.addPetToUser(userId, wildPet.getDataForSave());
        
        activeBattles.delete(userId);
        if (wildPetId) removePetFromWorld(wildPetId, interaction.client);
        
        Database.updateUser(userId, userData);
        await interaction.editReply({ content: `🎉 Bắt thành công **${wildPet.name}**!`, embeds: [], components: [] });
    } else {
        battle.logs = [`💢 Bắt trượt!`];
        Database.updateUser(userId, userData);
        await processEnemyTurn(interaction, battle);
    }
}