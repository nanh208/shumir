// events/messageCreate.js (Phiên bản Báo lỗi Spam)
const { Events } = require('discord.js');
const dictionary = require('../dictionary.js'); 
const dictionaryArray = Array.from(dictionary);
const prefix = "!";

// Hàm tạo độ trễ (delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
	name: Events.MessageCreate,
	async execute(message, gameStates) { // Nhận 'gameStates' từ index.js

        // 1. Bỏ qua bot
        if (message.author.bot) return;

        // -----------------------------------------------------
        // 2. LOGIC Xử lý Lệnh (!play, !stop)
        // (Giữ nguyên, không thay đổi)
        // -----------------------------------------------------
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === "play") {
                if (gameStates.has(message.channel.id)) {
                    return message.reply("Game đang diễn ra rồi! Dùng `!stop` để dừng.");
                }
                const randomWord = dictionaryArray[Math.floor(Math.random() * dictionaryArray.length)];
                const lastSyllable = randomWord.split(' ').pop();
                gameStates.set(message.channel.id, {
                    lastSyllable: lastSyllable,
                    lastUser: message.client.user.id,
                    usedWords: new Set([randomWord])
                });
                return message.channel.send(`🎉 **Game nối từ bắt đầu!**\nBot ra từ: **${randomWord}**\n\nLượt tiếp theo, mời bạn nối từ bắt đầu bằng: **${lastSyllable}**`);
            }

            if (command === "stop") {
                if (!gameStates.has(message.channel.id)) {
                    return message.reply("Không có game nào đang chạy để dừng.");
                }
                gameStates.delete(message.channel.id);
                return message.reply("🏁 **Game đã kết thúc!** Gõ `!play` để bắt đầu ván mới.");
            }
        } 
        
        // -----------------------------------------------------
        // 3. LOGIC Xử lý Trả lời (Chơi game)
        // -----------------------------------------------------
        else {
            const state = gameStates.get(message.channel.id);
            if (!state) return; 

            // --- SỬA LẠI: BÁO LỖI KHI SPAM ---
            if (message.author.id === state.lastUser) {
                // Thay vì "return;" (im lặng), chúng ta "reply"
                return message.reply("Bạn đã trả lời ở lượt trước rồi, hãy đợi người khác!");
            }
            // --- KẾT THÚC SỬA LỖI ---

            const newWord = message.content.trim();
            if (newWord === "") return;

            const normalizedWord = newWord.toLowerCase();
            const firstSyllable = normalizedWord.split(' ')[0];

            // 6. Kiểm tra logic (Sai âm tiết)
            if (firstSyllable !== state.lastSyllable) {
                await message.react('❌');
                return message.reply(`Sai rồi! Vẫn phải bắt đầu bằng \`${state.lastSyllable}\`.`);
            }

            // 7. Kiểm tra từ điển
            if (!dictionary.has(normalizedWord)) {
                await message.react('❌');
                return message.reply(`Từ \`${newWord}\` không có trong từ điển! Vẫn là \`${state.lastSyllable}\`.`);
            }
            
            // 8. Kiểm tra từ đã dùng
            if (state.usedWords.has(normalizedWord)) {
                await message.react('❌');
                return message.reply(`Từ \`${newWord}\` đã được dùng rồi! Vẫn là \`${state.lastSyllable}\`.`);
            }

            // ----- TỪ ĐÃ ĐÚNG -----
            await message.react('✅');
            await sleep(1500); // Vẫn giữ độ trễ "chờ từ mới"
            
            const newLastSyllable = normalizedWord.split(' ').pop();

            // 9. Cập nhật trạng thái
            state.lastSyllable = newLastSyllable;
            state.lastUser = message.author.id; // <-- Cập nhật bạn là người nói cuối
            state.usedWords.add(normalizedWord);
            
            // 10. Kiểm tra "Bí từ"
            let canContinue = false;
            for (const dictWord of dictionary) { 
                if (!state.usedWords.has(dictWord) && dictWord.split(' ')[0] === newLastSyllable) {
                    canContinue = true;
                    break;
                }
            }
            
            if (!canContinue) {
                message.channel.send(`🏆 **${newWord}**! Hết từ để nối rồi! **${message.author.username}** là người chiến thắng!`);
                gameStates.delete(message.channel.id); 
                message.channel.send("--- Gõ `!play` để bắt đầu vòng mới! ---");
            } else {
                message.channel.send(`Lượt tiếp theo: **${newLastSyllable}**`);
            }
        }
	},
};