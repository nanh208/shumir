const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const API_KEY = 'https://wttr.in'; // dùng wttr.in vì không cần API key

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Xem thời tiết ở một địa điểm ☁️')
    .addStringOption(option => option.setName('diadiem').setDescription('Tên thành phố hoặc quốc gia').setRequired(true)),

  async execute(interaction) {
    const location = interaction.options.getString('diadiem');
    // deferred by index.js
    try {
      const res = await fetch(`${API_KEY}/${encodeURIComponent(location)}?format=j1`);
      const data = await res.json();
      const current = data.current_condition[0];

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`☁️ Thời tiết tại ${location}`)
        .addFields(
          { name: '🌡️ Nhiệt độ', value: `${current.temp_C}°C`, inline: true },
          { name: '💧 Độ ẩm', value: `${current.humidity}%`, inline: true },
          { name: '🌬️ Gió', value: `${current.windspeedKmph} km/h`, inline: true },
        )
        .setFooter({ text: 'Dữ liệu từ wttr.in' });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Không thể lấy dữ liệu thời tiết.');
    }
  }
};
