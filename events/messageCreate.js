// events/messageCreate.js
const fs = require('fs');
const { Events } = require('discord.js');
const dictionary = require('../dictionary.js');
const dictionaryArray = Array.from(dictionary);
const prefix = "!";

// Load điểm từ file
let scores = {};
try {
    scores = JSON.parse(fs.readFileSync('./scores.json', 'utf8'));
} catch {
    scores = {};
}

const saveScores = () => {
    fs.writeFileSync('./scores.json', JSON.stringify(scores, null, 2));
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: Events.MessageCreate,
    async execute(message, gameStates) {
        if (message.author.bot) return;

        // 1. Xử lý lệnh !play, !stop
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === "play") {
                if (gameStates.has(message.channel.id))
                    return message.reply("Game đang diễn ra rồi! Dùng `!stop` để dừng.");

                const randomWord = dictionaryArray[Math.floor(Math.random() * dictionaryArray.length)];
                const lastSyllable = randomWord.split(' ').pop();

                gameStates.set(message.channel.id, {
                    lastSyllable,
                    lastUser: message.client.user.id,
                    usedWords: new Set([randomWord])
                });

                return message.channel.send(
                    `🎉 **Game nối từ bắt đầu!**\nBot ra từ: **${randomWord}**\n\nLượt tiếp theo, nối từ bắt đầu bằng: **${lastSyllable}**`
                );
            }

            if (command === "stop") {
                if (!gameStates.has(message.channel.id))
                    return message.reply("Không có game nào đang chạy để dừng.");
                gameStates.delete(message.channel.id);
                return message.reply("🏁 **Game đã kết thúc!** Gõ `!play` để bắt đầu ván mới.");
            }
        }

        // 2. Xử lý lượt nối từ
        else {
            const state = gameStates.get(message.channel.id);
            if (!state) return;

            if (message.author.id === state.lastUser)
                return message.reply("Bạn vừa trả lời lượt trước rồi, chờ người khác nha!");

            const newWord = message.content.trim().toLowerCase();
            if (newWord === "") return;

            const firstSyllable = newWord.split(' ')[0];

            if (firstSyllable !== state.lastSyllable) {
                await message.react('❌');
                return message.reply(`Sai rồi! Cần bắt đầu bằng \`${state.lastSyllable}\`.`);
            }

            if (!dictionary.has(newWord)) {
                await message.react('❌');
                return message.reply(`Từ \`${newWord}\` không có trong từ điển!`);
            }

            if (state.usedWords.has(newWord)) {
                await message.react('❌');
                return message.reply(`Từ \`${newWord}\` đã được dùng rồi!`);
            }

            // Nếu đúng
            await message.react('✅');
            await sleep(1500);

            const newLastSyllable = newWord.split(' ').pop();
            state.lastSyllable = newLastSyllable;
            state.lastUser = message.author.id;
            state.usedWords.add(newWord);

            // Kiểm tra còn từ để nối không
            let canContinue = false;
            for (const dictWord of dictionary) {
                if (!state.usedWords.has(dictWord) && dictWord.split(' ')[0] === newLastSyllable) {
                    canContinue = true;
                    break;
                }
            }

            if (!canContinue) {
                // --- Thắng game ---
                const winner = message.author;
                scores[winner.id] = (scores[winner.id] || 0) + 1;
                saveScores();

                message.channel.send(
                    `🏆 **${newWord}**! Hết từ để nối rồi!\n**${winner.username}** thắng và nhận được **+1 điểm!**`
                );

                gameStates.delete(message.channel.id);
                message.channel.send("--- Gõ `!play` để bắt đầu vòng mới! ---");
            } else {
                message.channel.send(`Lượt tiếp theo: **${newLastSyllable}**`);
            }
        }
    },
};
