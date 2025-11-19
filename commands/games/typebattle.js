// commands/games/typebattle.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function genString(len = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('typebattle')
    .setDescription('⚡ Thi gõ nhanh — ai gõ đúng chuỗi trước sẽ thắng.')
    .addIntegerOption(o => o.setName('length').setDescription('Độ dài chuỗi (mặc định 12)').setMinValue(5).setMaxValue(30)),

  cooldown: 5,
  async execute(interaction, client, gameStates) {
    // deferred by index.js
    const len = interaction.options.getInteger('length') || 12;
    const target = genString(len);
    const embed = new EmbedBuilder()
      .setTitle('⚡ Type Battle — Ai gõ nhanh thắng!')
      .setDescription(`Bạn và mọi người trong kênh compete nhé.\nGõ chính xác chuỗi sau **trong 12s**:\n\n\`${target}\``)
      .setFooter({ text: 'Ai gõ chính xác đầu tiên sẽ thắng.' })
      .setColor('Gold');

    const msg = await interaction.editReply({ embeds: [embed] });

    const filter = m => !m.author.bot && m.channelId === interaction.channelId;
    const collector = interaction.channel.createMessageCollector({ filter, time: 12000 });

    let winner = null;
    collector.on('collect', m => {
      if (m.content.trim() === target) {
        winner = m.author;
        m.reply({ content: `🏆 ${m.author} thắng!`, ephemeral: false }).catch(()=>{});
        collector.stop('win');
      } else {
        // ignore wrong attempts
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'win' && winner) {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('🏆 Kết quả').setDescription(`${winner} đã gõ đúng trước.`).setColor('Green')] }).catch(()=>{});
      } else {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('⌛ Hết thời gian').setDescription('Không ai gõ đúng. Thua rồi! (Bot không tiết lộ chuỗi) ').setColor('Orange')] }).catch(()=>{});
      }
    });
  }
};

