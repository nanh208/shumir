// commands/dungeonAdv.js
const { SlashCommandBuilder } = require("discord.js");
const { generateBoss, calculateVictory, rewardPlayer } = require("../dungeonSystem");
const { addItemToInventory } = require("../inventorySystem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dungeonadv")
        .setDescription("Đi ải nâng cao với hòm và kẹo")
        .addStringOption(option => option.setName("difficulty").setDescription("Chọn độ khó").setRequired(true)),
    async execute(interaction) {
        const difficulty = interaction.options.getString("difficulty");
        const boss = generateBoss(10, difficulty);
        const success = calculateVictory({}, boss); // cần pet người dùng
        if(success){
            rewardPlayer(interaction.user.id, difficulty);
            // phần thưởng hòm + kẹo
            addItemToInventory(interaction.user.id, { type:"candy", name:"🍬 Kẹo bình thường", qty:2 });
            addItemToInventory(interaction.user.id, { type:"chest", rarity:"Common" });
            await interaction.reply(`🏆 Bạn đã đánh bại boss ${boss.name} và nhận thưởng hòm + kẹo!`);
        } else {
            await interaction.reply(`💀 Bạn thất bại trước boss ${boss.name}!`);
        }
    }
};
