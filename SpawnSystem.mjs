import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawnWildPet } from './GameLogic.mjs';
import { Database } from './Database.mjs'; // Import để lấy cấu hình kênh
import { RARITY_COLORS } from './Constants.mjs';

// Map lưu trữ Pet đang tồn tại trên kênh chat
// Key: petId, Value: { petData, messageId, channelId, isBattling: boolean }
export const activeWildPets = new Map();

export class SpawnSystem {
    constructor(client) {
        this.client = client;
        // Lấy kênh từ Database ngay khi khởi tạo
        const config = Database.getConfig();
        this.channelId = config.spawnChannelId || null;
        this.interval = null;
        this.timeout = null;
    }

    // Hàm được gọi khi Admin dùng lệnh /setup_spawn
    updateChannel(newId) {
        this.channelId = newId;
        console.log(`🔄 Hệ thống Spawn đã chuyển sang kênh ID: ${newId}`);
        
        // Reset lại timer để spawn ngay lập tức tại kênh mới
        this.restartSystem();
    }

    // Khởi động lại hệ thống (dùng khi đổi kênh)
    restartSystem() {
        if (this.timeout) clearTimeout(this.timeout);
        if (this.interval) clearInterval(this.interval);
        
        // Xóa hết pet ở kênh cũ (nếu cần thiết)
        activeWildPets.clear();
        
        this.start();
    }

    start() {
        console.log("🚀 Hệ thống Spawn theo thời gian thực (10 phút/lần) đang khởi động...");
        
        if (!this.channelId) {
            console.log("⚠️ CẢNH BÁO: Chưa cài đặt kênh Spawn! Hãy dùng lệnh /setup_spawn");
            return;
        }

        // Spawn ngay lập tức 1 đợt khi vừa bật Bot (để không phải chờ)
        this.spawnBatch();

        // --- LOGIC TÍNH TOÁN THỜI GIAN THỰC ---
        // Mục tiêu: Spawn vào các phút xx:00, xx:10, xx:20...
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Tính số phút cần chờ đến mốc 10 phút tiếp theo
        // Ví dụ: 12:04 -> Mốc tiếp là 12:10 -> Chờ 6 phút
        const nextTenMinMark = Math.ceil((minutes + 1) / 10) * 10; 
        let delay = ((nextTenMinMark - minutes) * 60 * 1000) - (seconds * 1000);
        
        // Nếu delay <= 0 (trường hợp hiếm), set mặc định 10 phút
        if (delay <= 1000) delay = 10 * 60 * 1000;

        console.log(`⏳ Đợt Spawn tiếp theo sẽ diễn ra sau: ${Math.floor(delay/1000)} giây.`);

        // Set timeout để chạy đúng vào mốc thời gian đẹp
        this.timeout = setTimeout(() => {
            this.spawnBatch();
            
            // Sau đó lặp lại đều đặn mỗi 10 phút (600,000ms)
            this.interval = setInterval(() => {
                this.spawnBatch();
            }, 10 * 60 * 1000);
            
        }, delay);
    }

    async spawnBatch() {
        if (!this.channelId) return;

        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) {
            console.log(`❌ Lỗi: Không tìm thấy kênh có ID ${this.channelId}`);
            return;
        }

        // 1. DỌN DẸP PET CŨ (RESET)
        if (activeWildPets.size > 0) {
            console.log("🧹 Đang dọn dẹp Pet cũ...");
            // Copy map sang array để loop và delete async
            const petsToDelete = Array.from(activeWildPets.entries());
            
            for (const [petId, info] of petsToDelete) {
                try {
                    const oldMsg = await channel.messages.fetch(info.messageId);
                    if (oldMsg && oldMsg.deletable) {
                        await oldMsg.delete();
                    }
                } catch (e) { 
                    // Bỏ qua lỗi nếu tin nhắn đã bị xóa trước đó
                }
            }
            activeWildPets.clear(); // Xóa sạch bộ nhớ đệm
        }

        // 2. SPAWN 10 PET MỚI
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        await channel.send(`⏰ **[${timeStr}] THỜI GIAN ĐÃ ĐIỂM!** 10 Pet mới đã xuất hiện! (Sẽ reset sau 10 phút)`);
        
        for (let i = 0; i < 10; i++) {
            // Logic Random Boss VIP:
            // Con thứ 10 (index 9) có 50% tỉ lệ là Boss VIP (Legendary/Mythic)
            const isVip = (i === 9) && (Math.random() < 0.5); 
            
            // Delay nhẹ giữa mỗi lần gửi để tránh bị Discord chặn spam (Rate limit)
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            
            await this.createOnePet(channel, isVip);
        }
        console.log(`✅ Đã spawn xong 10 Pet tại kênh ${channel.name}`);
    }

    async createOnePet(channel, isVip) {
        // Tạo dữ liệu Pet
        const pet = spawnWildPet(isVip);
        const stats = pet.getStats();

        // Tạo Embed
        const embed = new EmbedBuilder()
            .setColor(pet.getColor()) // Màu theo phẩm chất
            .setTitle(`${isVip ? "👑 BOSS XUẤT HIỆN:" : "🐾 PET HOANG DÃ:"} ${pet.name.toUpperCase()}`)
            .setDescription(`Hệ: **${pet.element}** | Tộc: **${pet.race}**`)
            .setThumbnail(isVip ? "https://media.tenor.com/2roX3uxz_68AAAAi/cat.gif" : null) // Ảnh gif cho Boss (tuỳ chọn)
            .addFields(
                { name: '📊 Chỉ số', value: `❤️ HP: **${stats.HP}**\n⚔️ ATK: **${stats.ATK}**\n🛡️ DEF: **${stats.DEF}**`, inline: true },
                { name: '✨ Thông tin', value: `🧬 Gen: **${pet.gen}%**\n⭐ Rank: **${pet.rarity}**`, inline: true }
            );

        // Tạo Nút Khiêu Chiến
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`challenge_${pet.id}`) // ID duy nhất để xử lý sự kiện
                    .setLabel('⚔️ KHIÊU CHIẾN')
                    .setStyle(isVip ? ButtonStyle.Danger : ButtonStyle.Primary) // Boss nút đỏ, thường nút xanh
            );

        try {
            const message = await channel.send({ embeds: [embed], components: [row] });

            // Lưu vào bộ nhớ
            activeWildPets.set(pet.id, { 
                petData: pet, 
                messageId: message.id, 
                channelId: channel.id,
                isBattling: false // Trạng thái ban đầu: Chưa ai đánh
            });
        } catch (error) {
            console.error("Lỗi khi gửi tin nhắn spawn:", error);
        }
    }
}