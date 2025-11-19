// commands/dungeon.js
const { SlashCommandBuilder } = require("discord.js");
const { generateBoss, calculateVictory, rewardPlayer } = require("../dungeonSystem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Đi ải và nhận thưởng")
        .addStringOption(option => option.setName("difficulty").setDescription("Chọn độ khó").setRequired(true)),
    async execute(interaction) {
        const difficulty = interaction.options.getString("difficulty");
        const boss = generateBoss(10, difficulty);
        const success = calculateVictory({}, boss); // cần pet người dùng
        if(success){
            rewardPlayer(interaction.user.id, difficulty);
            await interaction.reply(`Bạn đã đánh bại boss ${boss.name} và nhận thưởng!`);
        } else {
            await interaction.reply(`Bạn thất bại trước boss ${boss.name}!`);
        }
    }
};
