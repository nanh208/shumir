// commands/pet.js - consolidated pet command (claim & code)
const { SlashCommandBuilder } = require("discord.js");
const { generatePet, addPetToUser } = require("../petSystem");
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON, choose, randomInt } = require('../utils');
const petCodesFile = path.resolve(__dirname, '../data/pet-codes.json');
// Utility functions for code lookup and marking usage
const petCodes = require('../data/pet-codes.json');

function getCodeReward(code, userId) {
    const entry = petCodes[code];
    if (!entry) return { error: 'Code not found.' };
    if (entry.usedBy.includes(userId)) return { error: 'Code already used.' };
    return { reward: entry.reward };
}

function markCodeUsed(code, userId) {
    if (!petCodes[code]) return false;
    if (!petCodes[code].usedBy.includes(userId)) {
        petCodes[code].usedBy.push(userId);
        // Save to file (sync for simplicity)
        const fs = require('fs');
        fs.writeFileSync(require('path').resolve(__dirname, '../data/pet-codes.json'), JSON.stringify(petCodes, null, 2));
        return true;
    }
    return false;
}
const petsFile = './data/pets.json';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Quản lý pet (claim, code)')
        .addSubcommand(sub => sub.setName('claim').setDescription('Nhận 1 pet ngẫu nhiên miễn phí'))
        .addSubcommand(sub => sub.setName('code').setDescription('Nhập giftcode').addStringOption(opt => opt.setName('giftcode').setDescription('Mã code').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'claim') {
            const pet = generatePet();
            addPetToUser(interaction.user.id, pet);
            return interaction.reply({ content: `Bạn đã nhận được pet: ${pet.icon} **${pet.name}** (ID: ${pet.id})`, ephemeral: false });
        }

        if (sub === 'code') {
            const codeRaw = interaction.options.getString('giftcode');
            const code = codeRaw.trim().toUpperCase();
            const { reward, error } = getCodeReward(code, interaction.user.id);
            if (error === 'Code not found.') return interaction.reply({ content: '❌ Giftcode không tồn tại.', ephemeral: true });
            if (error === 'Code already used.') return interaction.reply({ content: '⚠️ Bạn đã dùng code này rồi!', ephemeral: true });
            markCodeUsed(code, interaction.user.id);

            const rewards = reward || {};
            const data = readJSON(petsFile);
            if (!data.users) data.users = {};
            if (!data.users[interaction.user.id]) data.users[interaction.user.id] = { pets: [], inventory: [], xp: 0, coins: 0, candies: {} };

            let text = '🎁 Nhận code thành công! Bạn được:';

            if (rewards.rareCandy) {
                data.users[interaction.user.id].candies = data.users[interaction.user.id].candies || {};
                data.users[interaction.user.id].candies.rare = (data.users[interaction.user.id].candies.rare || 0) + rewards.rareCandy;
                text += `\n🍬 +${rewards.rareCandy} Kẹo Hiếm`;
            }

            if (rewards.randomBalls) {
                data.users[interaction.user.id].inventory = data.users[interaction.user.id].inventory || [];
                data.users[interaction.user.id].inventory.push({ type: 'ball', qty: rewards.randomBalls });
                text += `\n🔮 +${rewards.randomBalls} Bóng Ngẫu Nhiên`;
            }

            if (rewards.randomSkillScrolls) {
                data.users[interaction.user.id].inventory = data.users[interaction.user.id].inventory || [];
                data.users[interaction.user.id].inventory.push({ type: 'skill_scroll', qty: rewards.randomSkillScrolls });
                text += `\n📜 +${rewards.randomSkillScrolls} Cuộn skill`;
            }

            if (rewards.randomPet) {
                const excluded = (rewards.randomPet.exclude || []).map(e => e.toLowerCase());
                // simple pet pool (could be expanded)
                const pool = [
                    { name: 'Wolf', quality: 'Common' },
                    { name: 'Fox', quality: 'Common' },
                    { name: 'Bear', quality: 'Rare' },
                    { name: 'Tiger', quality: 'Rare' },
                    { name: 'MiniDragon', quality: 'Epic' }
                ].filter(p => !excluded.includes(p.quality.toLowerCase()));
                const chosen = pool[Math.floor(Math.random() * pool.length)];
                const newPet = generatePet(1, chosen.quality);
                newPet.name = chosen.name + '_' + newPet.id;
                addPetToUser(interaction.user.id, newPet);
                text += `\n🐾 Pet: **${newPet.name}** ( ${newPet.quality} ) - ID: ${newPet.id}`;
            }

            if (rewards.coins) {
                data.users[interaction.user.id].coins = (data.users[interaction.user.id].coins || 0) + rewards.coins;
                text += `\n💰 +${rewards.coins} xu`;
            }

            if (rewards.xp) {
                data.users[interaction.user.id].xp = (data.users[interaction.user.id].xp || 0) + rewards.xp;
                text += `\n⭐ +${rewards.xp} XP`;
            }

            writeJSON(petsFile, data);
            return interaction.reply({ content: text, ephemeral: false });
        }
    }
};
