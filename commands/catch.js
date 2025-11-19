// commands/catch.js
const { SlashCommandBuilder } = require("discord.js");
const { catchPet } = require("../catchSystem");
const { readJSON } = require("../utils");
const petsFile = "./data/pets.json";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("catch")
        .setDescription("Thu phục một pet ngoài tự nhiên")
        .addStringOption(option => option.setName("id").setDescription("ID pet muốn bắt").setRequired(true))
        .addStringOption(option => option.setName("ball").setDescription("Loại bóng").setRequired(true)),
    async execute(interaction) {
        const petId = interaction.options.getString("id");
        const ballType = interaction.options.getString("ball");
        const result = catchPet(interaction.user.id, petId, ballType);
        if (!result || !result.ok) {
            const reason = result && result.reason;
            if (reason === 'locked') return interaction.reply({ content: '⛔ Pet đang bị người khác tấn công, thử lại sau.', ephemeral: true });
            if (reason === 'not_found') return interaction.reply({ content: '❌ Không tìm thấy pet với ID này.', ephemeral: true });
            return interaction.reply({ content: '❌ Thu phục thất bại!', ephemeral: true });
        }
        await interaction.reply({ content: `✅ Bạn đã thu phục thành công pet!`, ephemeral: false });
    }
};
