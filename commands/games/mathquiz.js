// commands/games/mathquiz.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Generate random expression as string and evaluate safely
function genExpression(difficulty = 3) {
  // difficulty: số lượng phép toán
  const ops = ['+', '-', '*', '/'];
  let expr = '' + randInt(1, 12);
  for (let i = 0; i < difficulty; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num;
    if (op === '/') {
      // ensure divisible by picking a factor
      const a = randInt(1, 12);
      const b = randInt(1, 12);
      num = b;
      expr = `(${expr}${op}${num})`;
    } else {
      num = randInt(1, 20);
      expr = `(${expr}${op}${num})`;
    }
  }
  // simplify repeated parentheses
  return expr;
}

function safeEval(expr) {
  // do arithmetic only
  // eslint-disable-next-line no-new-func
  return Function(`"use strict";return (${expr});`)();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mathquiz')
    .setDescription('🧠 Đố toán — giải biểu thức. (Bot sinh bài ngẫu nhiên)'),
  cooldown: 3,
  async execute(interaction, client, gameStates) {
    // deferred by index.js
    const difficulty = Math.floor(Math.random() * 3) + 2; // 2..4 ops
    const expr = genExpression(difficulty);
    // compute correct answer (round to 2 decimals)
    let answer;
    try {
      answer = safeEval(expr);
      // round to 2 decimals for floats
      answer = Math.round(answer * 100) / 100;
    } catch {
      return interaction.editReply('❌ Lỗi khi tạo bài — thử lại.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🧠 MathQuiz')
      .setDescription(`Hãy tính giá trị của biểu thức sau (kết quả làm tròn 2 chữ số thập phân nếu cần):\n\n\`${expr}\`\n\nGõ đáp án bằng tin nhắn (ví dụ: 42 hoặc 3.14). Bạn có 30s để gửi câu trả lời.`)
      .setColor('Purple')
      .setFooter({ text: 'Bạn thắng nếu gửi đáp án chính xác. Bot sẽ không tiết lộ đáp án nếu bạn thua.' });

    const msg = await interaction.editReply({ embeds: [embed] });

    const filter = m => m.author.id === interaction.user.id && !m.author.bot && m.channelId === interaction.channelId;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', m => {
      const userAns = parseFloat(m.content.trim());
      if (isNaN(userAns)) {
        m.reply({ content: '❗ Vui lòng gửi một số hợp lệ.', ephemeral: true }).catch(()=>{});
        collector.stop('invalid');
        return;
      }
      const ok = Math.abs(userAns - answer) < 0.01;
      if (ok) {
        m.reply({ content: '🎉 Chính xác! Bạn đã trả lời đúng.', ephemeral: false }).catch(()=>{});
        collector.stop('win');
      } else {
        m.reply({ content: '❌ Sai rồi — bạn thua. (Bot sẽ không tiết lộ đáp án.)', ephemeral: false }).catch(()=>{});
        collector.stop('lose');
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'win') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('🏆 Bạn thắng!').setDescription('Bạn trả lời chính xác.').setColor('Green')] }).catch(()=>{});
      } else if (reason === 'lose' || reason === 'invalid') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('💀 Kết thúc').setDescription('Bạn đã thua hoặc gửi không hợp lệ. Mình sẽ không tiết lộ đáp án.').setColor('DarkRed')] }).catch(()=>{});
      } else {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('⌛ Hết thời gian').setDescription('Không có câu trả lời trong thời gian. Mình sẽ không tiết lộ đáp án.').setColor('Orange')] }).catch(()=>{});
      }
    });
  }
};
