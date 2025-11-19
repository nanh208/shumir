// commands/pvpAdv.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { readJSON } = require("../utils");
const { duel } = require("../pvpSystem");
const petsFile = "./data/pets.json";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pvpadv")
        .setDescription("PvP nâng cao với nhiều pet")
        .addUserOption(option => option.setName("target").setDescription("Chọn đối thủ").setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser("target");
        const data = readJSON(petsFile);
        const userPets = data.users[interaction.user.id]?.pets || [];
        const targetPets = data.users[target.id]?.pets || [];
        if(!userPets.length || !targetPets.length) return interaction.reply("❌ Một trong hai chưa có pet!");
        // duel logic: so sánh tổng chỉ số của pet đầu tiên
        const winner = duel(interaction.user.id, target.id);
        await interaction.reply(`⚔️ PvP kết quả: Người thắng <@${winner}>`);
    }
};
