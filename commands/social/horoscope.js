const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('horoscope')
    .setDescription('Xem tử vi hôm nay theo cung hoàng đạo 🔮')
    .addStringOption(option =>
      option.setName('cung')
        .setDescription('Chọn cung hoàng đạo của bạn')
        .setRequired(true)
        .addChoices(
          { name: 'Bạch Dương ♈', value: 'aries' },
          { name: 'Kim Ngưu ♉', value: 'taurus' },
          { name: 'Song Tử ♊', value: 'gemini' },
          { name: 'Cự Giải ♋', value: 'cancer' },
          { name: 'Sư Tử ♌', value: 'leo' },
          { name: 'Xử Nữ ♍', value: 'virgo' },
          { name: 'Thiên Bình ♎', value: 'libra' },
          { name: 'Bọ Cạp ♏', value: 'scorpio' },
          { name: 'Nhân Mã ♐', value: 'sagittarius' },
          { name: 'Ma Kết ♑', value: 'capricorn' },
          { name: 'Bảo Bình ♒', value: 'aquarius' },
          { name: 'Song Ngư ♓', value: 'pisces' }
        )
    ),

  async execute(interaction, client, gameStates) {
    const sign = interaction.options.getString('cung');
    // deferred by index.js
    try {
      const res = await fetch(`https://aztro.sameerkumar.website/?sign=${sign}&day=today`, { method: 'POST' });
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor('Gold')
        .setTitle(`🔮 Tử vi hôm nay của ${sign.toUpperCase()}`)
        .setDescription(data.description)
        .addFields(
          { name: 'Tình yêu ❤️', value: data.compatibility, inline: true },
          { name: 'Tâm trạng 😊', value: data.mood, inline: true },
          { name: 'Con số may mắn 🍀', value: data.lucky_number, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Không lấy được dữ liệu tử vi.');
    }
  }
};
