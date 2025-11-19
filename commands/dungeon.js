// commands/dungeon.js
const { SlashCommandBuilder } = require("discord.js");
const { generateBoss, calculateVictory, rewardPlayer } = require("../dungeonSystem");
const { readJSON } = require("../utils");
const { addItemToInventory } = require("../inventorySystem");
const petsFile = "./data/pets.json";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Đi ải: run hoặc adv (nâng cao) với pet của bạn")
        .addSubcommand(sub => sub.setName('run').setDescription('Đi ải thường').addStringOption(opt => opt.setName('pet').setDescription('ID pet của bạn').setRequired(true)).addStringOption(opt => opt.setName('difficulty').setDescription('Chọn độ khó').setRequired(true)))
        .addSubcommand(sub => sub.setName('adv').setDescription('Đi ải nâng cao (thêm quà)').addStringOption(opt => opt.setName('pet').setDescription('ID pet của bạn').setRequired(true)).addStringOption(opt => opt.setName('difficulty').setDescription('Chọn độ khó').setRequired(true))),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const petIdRaw = interaction.options.getString('pet');
        const difficulty = interaction.options.getString('difficulty');
        const petId = Number(petIdRaw);

        const data = readJSON(petsFile);
        const user = data.users[interaction.user.id];
        if (!user || !Array.isArray(user.pets)) return interaction.reply({ content: '❌ Bạn không có pet nào.', ephemeral: true });
        const pet = user.pets.find(p => Number(p.id) === petId);
        if (!pet) return interaction.reply({ content: '❌ Không tìm thấy pet của bạn với ID này.', ephemeral: true });

        const boss = generateBoss(pet.level || 1, difficulty);
        const success = calculateVictory(pet, boss);
        if (success) {
            rewardPlayer(interaction.user.id, difficulty);
            if (sub === 'adv') {
                // extra rewards for adv
                addItemToInventory(interaction.user.id, { type: 'candy', name: '🍬 Kẹo', qty: Math.floor(Math.random()*3)+1 });
                addItemToInventory(interaction.user.id, { type: 'chest', rarity: 'Common' });
                await interaction.reply({ content: `🏆 Bạn đã đánh bại boss ${boss.name} và nhận thưởng hòm + kẹo!`, ephemeral: false });
            } else {
                await interaction.reply({ content: `Bạn đã đánh bại boss ${boss.name} và nhận thưởng!`, ephemeral: false });
            }
        } else {
            await interaction.reply({ content: `Bạn thất bại trước boss ${boss.name}!`, ephemeral: false });
        }
    }
};
