// commands/pvp.js
const { SlashCommandBuilder } = require("discord.js");
const { duel } = require("../pvpSystem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pvp")
        .setDescription("Đấu pet với người khác")
        .addUserOption(option => option.setName("target").setDescription("Chọn đối thủ")),
    async execute(interaction) {
        const target = interaction.options.getUser("target");
        const winner = duel(interaction.user.id, target.id);
        await interaction.reply(`Người thắng: <@${winner}>`);
    }
};
