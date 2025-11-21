// SpawnSystem.mjs (ĐÃ CẬP NHẬT LỊCH BOSS RAID 3 GIỜ/LẦN)

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawnWildPet, Pet } from './GameLogic.mjs'; 
import { Database } from './Database.mjs'; 
import { RARITY_CONFIG, RARITY, ELEMENTS, ELEMENT_ICONS } from './Constants.mjs'; 
import { RaidBossManager } from './RaidBossManager.mjs'; 
// Nhớ cập nhật Imports cho lịch mới (RAID_BOSS_HOURS, RAID_BOSS_MINUTE)
import { RAID_BOSS_HOURS, RAID_BOSS_MINUTE, DIFFICULTY_LEVELS } from './Constants.mjs';
export const activeWildPets = new Map();

// --- THIẾT LẬP LỊCH BOSS RAID MỚI (UTC) ---
// Giả định các hằng số này đã được cập nhật trong Constants.mjs
// RAID_BOSS_HOURS = [1, 4, 7, 10, 13, 16, 19, 22]
// RAID_BOSS_MINUTE = 30 

// --- HỆ THỐNG THỜI TIẾT (CẬP NHẬT ĐỦ 10 HỆ) ---
const WEATHERS = {
    CLEAR: { name: "Trời Quang", icon: "☀️", buff: [ELEMENTS.FIRE, ELEMENTS.GRASS], color: 0xFFA500 },
    RAIN:  { name: "Mưa Rào",  icon: "🌧️", buff: [ELEMENTS.WATER, ELEMENTS.ELECTRIC], color: 0x0099FF },
    STORM: { name: "Bão Tố",   icon: "⛈️", buff: [ELEMENTS.WIND, ELEMENTS.DRAGON], color: 0x800080 },
    SNOW:  { name: "Bão Tuyết",icon: "❄️", buff: [ELEMENTS.ICE, ELEMENTS.WATER], color: 0xFFFFFF },
    NIGHT: { name: "Đêm Đen",  icon: "🌑", buff: [ELEMENTS.DARK, ELEMENTS.EARTH], color: 0x2C3E50 },
    HOLY:  { name: "Thánh Địa",icon: "✨", buff: [ELEMENTS.LIGHT, ELEMENTS.FIRE], color: 0xFFFFE0 }
};

// ==========================================
// --- HÀM HỖ TRỢ: LẤY LINK ẢNH TỪ EMOJI ---
// ==========================================
function getEmojiUrl(emojiStr) {
    if (!emojiStr) return null;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) {
        const isAnimated = match[1] === 'a';
        const id = match[3];
        return `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=96`;
    }
    return null; 
}

export class SpawnSystem {
    constructor(client) {
        this.client = client;
        const config = Database.getConfig();
        this.channelId = config.spawnChannelId || null;
        
        // Khởi tạo RaidBossManager và Timer
        this.raidManager = new RaidBossManager(client); 
        this.randomSpawnInterval = null; // Timer cho spawn ngẫu nhiên 10 phút
        this.scheduledSpawnChecker = null; // Interval check Boss Raid
        
        this.currentWeather = WEATHERS.CLEAR; // Mặc định
        this.lastWeatherMessageId = null; 
    }

    updateChannel(newId) {
        this.channelId = newId;
        console.log(`🔄 Hệ thống Spawn đã chuyển sang kênh ID: ${newId}`);
        this.restartSystem();
    }

    restartSystem() {
        if (this.randomSpawnInterval) clearTimeout(this.randomSpawnInterval);
        if (this.scheduledSpawnChecker) clearInterval(this.scheduledSpawnChecker);
        activeWildPets.clear();
        this.start();
    }

    // ==========================================
    // --- KHỞI ĐỘNG HỆ THỐNG & ĐẶT HẸN GIỜ ---
    // ==========================================
    start() {
        console.log("🚀 Hệ thống Spawn V2 đã khởi động...");
        
        if (!this.channelId) {
            console.log("⚠️ CẢNH BÁO: Chưa cài đặt kênh Spawn! Hãy dùng lệnh /setup_spawn");
            return;
        }

        // 1. SPAWN NGAY LẬP TỨC KHI KHỞI ĐỘNG
        console.log("⚡ Đang thực hiện spawn ngay lập tức...");
        this.spawnBatch();

        // 2. THIẾT LẬP TIMER CHO SPAWN NGẪU NHIÊN (10 phút/lần)
        this.scheduleRandomSpawn();

        // 3. THIẾT LẬP INTERVAL CHECK BOSS RAID THEO LỊCH
        this.startScheduledRaidChecker();
    }
    
    scheduleRandomSpawn() {
        const now = new Date();
        const msSinceLastTenMinuteMark = now.getTime() % (10 * 60 * 1000);
        let delay = (10 * 60 * 1000) - msSinceLastTenMinuteMark;
        delay = Math.ceil(delay / 1000) * 1000;
        
        console.log(`⏱️ Đợt Spawn Pet ngẫu nhiên tiếp theo sau: ${Math.round(delay / 1000 / 60)} phút`);
        
        this.randomSpawnInterval = setTimeout(() => {
            this.spawnBatch(); // Spawn lần đầu theo lịch
            
            this.randomSpawnInterval = setInterval(() => {
                this.spawnBatch(); // Spawn định kỳ mỗi 10 phút
            }, 10 * 60 * 1000); 
        }, delay);
    }
    
    // ==========================================
    // --- XỬ LÝ LỊCH BOSS RAID MỚI (2:30, 5:30,...) ---
    // ==========================================
    startScheduledRaidChecker() {
        // Kiểm tra mỗi phút để đảm bảo bắt kịp mốc giờ XX:30
        this.scheduledSpawnChecker = setInterval(async () => {
            const now = new Date();
            const currentHour = now.getUTCHours(); 
            const currentMinute = now.getUTCMinutes(); 
            
            // Kiểm tra: Phải là giờ trong lịch VÀ đúng phút đã định (30)
            if (RAID_BOSS_HOURS.includes(currentHour) && currentMinute === RAID_BOSS_MINUTE) {
                
                // Lấy độ khó server
                const serverConfig = Database.getServerConfig(this.channelId);
                const difficultyKey = serverConfig?.difficulty || 'dễ';
                const difficultyMultiplier = DIFFICULTY_LEVELS[difficultyKey]?.multiplier || 1.0;

                // Khởi tạo Boss Raid
                await this.raidManager.spawnNewBoss(this.channelId, difficultyMultiplier);
                
                // Đặt cờ để tránh spawn lặp lại trong 1 phút
                this.isSpawning = true; 
                setTimeout(() => { this.isSpawning = false; }, 60 * 1000);
            }
        }, 60 * 1000); // Kiểm tra mỗi phút
    }


    // --- RANDOM THỜI TIẾT MỚI MỖI ĐỢT ---
    changeWeather() {
        const keys = Object.keys(WEATHERS);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.currentWeather = WEATHERS[randomKey];
    }

    // ==========================================
    // --- XỬ LÝ SPAWN THEO LÔ (BATCH) ---
    // ==========================================
    async spawnBatch() {
        if (!this.channelId) return;

        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) {
            console.log("⚠️ Không tìm thấy kênh Spawn. Vui lòng kiểm tra ID.");
            return;
        }

        // 1. Dọn dẹp Pet cũ VÀ XÓA TIN NHẮN CŨ
        await this.clearOldPets(channel);
        
        // 2. Đổi Thời Tiết & Thông báo
        this.changeWeather();
        await this.sendWeatherAnnouncement(channel);
        
        // 3. Spawn 10 Pet (Ngẫu nhiên/Thường)
        for (let i = 0; i < 10; i++) {
            const isVip = (i === 9) && (Math.random() < 0.3); // 30% cơ hội Boss/Vip slot cuối
            await new Promise(resolve => setTimeout(resolve, 1500)); // Delay 1.5s
            await this.createOnePet(channel, isVip);
        }
    }

    // --- HÀM HỖ TRỢ: DỌN DẸP PET CŨ (Xóa Pet và tin nhắn của nó) ---
    async clearOldPets(channel) {
        // Xóa tin nhắn Thời tiết cũ
        if (this.lastWeatherMessageId) {
            try {
                const oldWeatherMsg = await channel.messages.fetch(this.lastWeatherMessageId);
                if (oldWeatherMsg && oldWeatherMsg.deletable) await oldWeatherMsg.delete();
            } catch (e) { }
            this.lastWeatherMessageId = null;
        }

        if (activeWildPets.size > 0) {
            console.log(`🗑️ Đang dọn dẹp ${activeWildPets.size} Pet hoang dã cũ...`);
            const petsToDelete = Array.from(activeWildPets.entries());
            for (const [petId, info] of petsToDelete) {
                if (!info.isBattling) { 
                    try {
                        const oldMsg = await channel.messages.fetch(info.messageId);
                        if (oldMsg && oldMsg.deletable) await oldMsg.delete();
                    } catch (e) { }
                    activeWildPets.delete(petId);
                } else {
                    console.log(`⚠️ Giữ lại Pet ${petId} vì đang chiến đấu.`);
                }
            }
        }
    }

    // --- HÀM HỖ TRỢ: GỬI THÔNG BÁO THỜI TIẾT ---
    async sendWeatherAnnouncement(channel) {
        const w = this.currentWeather;
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const weatherEmbed = new EmbedBuilder()
            .setTitle(`⏰ **[${timeStr}] THỜI GIAN ĐIỂM - THỜI TIẾT THAY ĐỔI**`)
            .setDescription(`Thời tiết hiện tại: **${w.name}** ${w.icon}\nPet hệ **${w.buff.join(', ')}** sẽ xuất hiện nhiều hơn và mạnh hơn!`)
            .setColor(w.color);

        const message = await channel.send({ embeds: [weatherEmbed] });
        this.lastWeatherMessageId = message.id;
    }

    // ==========================================
    // --- TẠO VÀ GỬI TIN NHẮN 1 PET ---
    // ==========================================
    async createOnePet(channel, isVip) {
        // 1. Lấy data thô & tạo instance Pet
        // [CẬP NHẬT]: Dùng spawnWildPet(isVip) cũ. Logic áp dụng độ khó server sẽ được thêm ở đây nếu cần.
        let rawPetData = spawnWildPet(isVip);
        let pet = new Pet(rawPetData);
        
        // 2. Xử lý Weather Boost
        let weatherBoostMsg = "";
        if (this.currentWeather.buff.includes(pet.element)) {
            pet.gen = Math.min(100, pet.gen + 15); 
            pet.currentStats = pet.calculateStats(); 
            pet.currentHP = pet.currentStats.HP;
            pet.currentMP = pet.currentStats.MP;
            
            weatherBoostMsg = `\n⚡ **WEATHER BOOST:** ${this.currentWeather.icon} Sức mạnh tăng cường!`;
        }

        // 3. Chuẩn bị dữ liệu hiển thị
        const stats = pet.getStats();
        const rarityInfo = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG[RARITY.COMMON];
        const rarityColor = rarityInfo.color;
        const rarityIcon = rarityInfo.icon || '⚪'; 
        const elementIcon = ELEMENT_ICONS[pet.element] || '❓';
        
        // 4. Xử lý Tiêu đề & Thumbnail (Boss/Đột Biến)
        let titlePrefix = `${rarityIcon} [Lv.${pet.level}] **PET HOANG DÃ:**`;
        let thumbnail = null;

        if (isVip) {
            titlePrefix = `${rarityIcon} 👑 [BOSS Lv.${pet.level}] **BOSS HOÀNG KIM:**`;
            thumbnail = "https://media.tenor.com/2roX3uxz_68AAAAi/cat.gif";
        } else if (pet.gen >= 90) {
            titlePrefix = `${rarityIcon} ✨ [Lv.${pet.level}] **PET ĐỘT BIẾN:**`; 
        }

        // 5. Tạo Embed
        const petImageUrl = getEmojiUrl(pet.icon);

        const embed = new EmbedBuilder()
            .setColor(rarityColor)
            .setTitle(`${titlePrefix} ${pet.name.toUpperCase()}`)
            .setDescription(
                `**Hệ:** ${elementIcon} ${pet.element} | **Tộc:** ${pet.race}\n` +
                `**Rank:** ${rarityIcon} ${pet.rarity} (x${rarityInfo.statMultiplier} Power)\n` +
                `**Gen:** ${pet.gen}/100 🧬 ${weatherBoostMsg}`
            )
            .setThumbnail(thumbnail)
            .addFields(
                { 
                    name: '📊 Chỉ số Chiến đấu', 
                    value: `❤️ HP: **${stats.HP}** 💧 MP: **${stats.MP}**\n` +
                            `⚔️ ATK: **${stats.ATK}** 🪄 SATK: **${stats.MATK || stats.SATK || 0}**\n` + 
                            `🛡️ DEF: **${stats.DEF}** ⚡ SPD: **${stats.SPD}**`,
                    inline: false 
                }
            );
        
        if (petImageUrl) {
            embed.setImage(petImageUrl);
        } else {
            embed.setDescription(`# ${pet.icon}\n` + embed.data.description);
        }

        // 6. Tạo Buttons
        const btnStyle = isVip ? ButtonStyle.Danger : (pet.gen >= 90 ? ButtonStyle.Success : ButtonStyle.Primary);
        const btnLabel = isVip ? '⚔️ SĂN BOSS' : '⚔️ BẮT PET';

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`challenge_${pet.id}`) 
                    .setLabel(btnLabel)
                    .setStyle(btnStyle) 
            );

        // 7. Gửi tin nhắn & Lưu vào Map
        try {
            const message = await channel.send({ embeds: [embed], components: [row] });

            activeWildPets.set(pet.id, { 
                petData: pet, 
                messageId: message.id, 
                channelId: channel.id,
                isBattling: false 
            }); 
        } catch (error) {
            console.error("Lỗi spawn:", error);
        }
    }
}