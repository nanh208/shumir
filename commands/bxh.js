// commands/bxh.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bxh')
		.setDescription('📊 Xem bảng xếp hạng người chơi nối từ'),

	async execute(interaction) {
		let scores = {};
		try {
			scores = JSON.parse(fs.readFileSync('./scores.json', 'utf8'));
		} catch {
			scores = {};
		}

		const sorted = Object.entries(scores)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		if (sorted.length === 0) {
			return interaction.reply("📊 Chưa có ai giành chiến thắng nào!");
		}

		let description = "";
		for (let i = 0; i < sorted.length; i++) {
			const [userId, score] = sorted[i];
			const user = await interaction.client.users.fetch(userId).catch(() => null);
			const name = user ? user.username : `Người chơi ${userId}`;
			description += `**${i + 1}. ${name}** — ${score} điểm\n`;
		}

		const embed = new EmbedBuilder()
			.setTitle("🏅 BẢNG XẾP HẠNG NỐI TỪ")
			.setDescription(description)
			.setColor("#FFD700")
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
