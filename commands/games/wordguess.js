// commands/games/wordguess.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const WORDS = [
  // danh sách từ để bot chọn ngẫu nhiên (không coi là "đáp án sẵn" vì random)
  'javascript','discord','mang','maytinh','laptrinh','tinhyeu','thanhcong','thachthuc','kythuat','giainhap'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordguess')
    .setDescription('🎯 Đoán chữ cái trong từ bí mật (kiểu Hangman).')
    .addIntegerOption(opt => opt.setName('attempts').setDescription('Số lần sai tối đa (mặc định 6)').setMinValue(1).setMaxValue(12)),

  cooldown: 5,
  async execute(interaction, client, gameStates) {
    // deferred by index.js
    const attemptsMax = interaction.options.getInteger('attempts') || 6;
    const word = WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
    const revealed = Array.from(word).map(ch => (ch === '-' ? '-' : '_'));
    const guessed = new Set();
    let wrong = 0;

    const embedStart = new EmbedBuilder()
      .setTitle('🎯 WordGuess — Đoán chữ')
      .setDescription(`Mình đã chọn một từ bí mật. Gõ **1 chữ cái** mỗi lần để đoán.\n\n${revealed.join(' ')}`)
      .setFooter({ text: `Bạn có ${attemptsMax} lần sai. Trò chơi sẽ không tiết lộ đáp án.` })
      .setColor('Purple');

    const msg = await interaction.editReply({ embeds: [embedStart] });

    const filter = m => !m.author.bot && m.channelId === interaction.channelId;
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });

    collector.on('collect', m => {
      // chỉ chấp nhận một ký tự (chữ cái)
      const guessRaw = m.content.trim().toLowerCase();
      if (!/^[a-zđươâêáàạảãấầậẩẫắằặẳẵêốớồộổỗíìịỉĩýỳỵỷỹôơưêáéíóúýạảđ]$/i.test(guessRaw) || guessRaw.length !== 1) {
        m.reply({ content: '❗ Gõ 1 chữ cái để đoán (ví dụ: a).', ephemeral: true }).catch(()=>{});
        return;
      }
      const ch = guessRaw;
      if (guessed.has(ch)) {
        m.reply({ content: `🔁 Bạn đã đoán chữ **${ch}** rồi.`, ephemeral: true }).catch(()=>{});
        return;
      }
      guessed.add(ch);
      if (word.includes(ch)) {
        // reveal positions
        for (let i = 0; i < word.length; i++) {
          if (word[i] === ch) revealed[i] = ch;
        }
        // win?
        if (!revealed.includes('_')) {
          collector.stop('won');
          m.reply({ content: `🎉 Chúc mừng ${m.author}! Bạn đã đoán đúng từ.`, ephemeral: false }).catch(()=>{});
          return;
        } else {
          m.reply({ content: `✅ Đúng! Hiện trạng: ${revealed.join(' ')}`, ephemeral: true }).catch(()=>{});
        }
      } else {
        wrong++;
        if (wrong >= attemptsMax) {
          collector.stop('lost');
          m.reply({ content: `❌ Bạn đã dùng hết ${attemptsMax} lần sai. Trò chơi kết thúc.`, ephemeral: false }).catch(()=>{});
          return;
        } else {
          m.reply({ content: `❌ Sai rồi (${wrong}/${attemptsMax}). Hiện trạng: ${revealed.join(' ')}`, ephemeral: true }).catch(()=>{});
        }
      }
      // update main embed
      const embedUpdate = new EmbedBuilder()
        .setTitle('🎯 WordGuess — Đoán chữ')
        .setDescription(`${revealed.join(' ')}\n\nĐã đoán: ${Array.from(guessed).join(', ') || 'Chưa có'}`)
        .setFooter({ text: `Sai: ${wrong}/${attemptsMax} — Trò chơi sẽ không tiết lộ đáp án.` })
        .setColor('Purple');
      msg.edit({ embeds: [embedUpdate] }).catch(()=>{});
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'won') {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Bạn thắng!')
          .setDescription(`Bạn đã đoán chính xác từ bí mật. Tuyệt vời!`)
          .setColor('Green');
        msg.edit({ embeds: [embed] }).catch(()=>{});
      } else if (reason === 'lost') {
        const embed = new EmbedBuilder()
          .setTitle('💀 Thua rồi!')
          .setDescription(`Bạn đã dùng hết lượt. Mình sẽ **không** tiết lộ đáp án theo luật chơi.`)
          .setColor('DarkRed');
        msg.edit({ embeds: [embed] }).catch(()=>{});
      } else {
        const embed = new EmbedBuilder()
          .setTitle('⌛ Hết thời gian')
          .setDescription('Trò chơi kết thúc do không có hoạt động. Mình sẽ không tiết lộ đáp án.')
          .setColor('Orange');
        msg.edit({ embeds: [embed] }).catch(()=>{});
      }
    });
  }
};
