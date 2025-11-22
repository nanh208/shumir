// SpawnSystem.mjs (ĐÃ CẬP NHẬT LỊCH BOSS RAID 3 GIỜ/LẦN)

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawnWildPet, Pet } from './GameLogic.mjs'; 
import { Database } from './Database.mjs'; 
import { RARITY_CONFIG, RARITY, ELEMENTS, ELEMENT_ICONS } from './Constants.mjs'; 
import { RaidBossManager } from './RaidBossManager.mjs'; 
// Nhớ cập nhật Imports cho lịch mới (RAID_BOSS_HOURS, RAID_BOSS_MINUTE)
import { RAID_BOSS_HOURS, RAID_BOSS_MINUTE, DIFFICULTY_LEVELS, RARITY_WEIGHTS } from './Constants.mjs'; // Thêm RARITY_WEIGHTS nếu cần cho logic chọn Pet

export const activeWildPets = new Map();

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
        // Giả định getConfig() sẽ lấy config server (Nếu bot chỉ chạy 1 server, nếu multi-server cần config theo Guild ID)
        const config = Database.getConfig() || {}; 
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

        // 1. [CẬP NHẬT] SPAWN LÔ NGAY LẬP TỨC KHI KHỞI ĐỘNG
        console.log("⚡ Đang thực hiện spawn lô ngay lập tức sau khi khởi động...");
        this.spawnBatch();

        // 2. THIẾT LẬP TIMER CHO SPAWN NGẪU NHIÊN (10 phút/lần)
        // Lần spawn tiếp theo sẽ được tính từ mốc 10 phút chẵn sau lần spawn ngay lập tức này.
        this.scheduleRandomSpawn();

        // 3. THIẾT LẬP INTERVAL CHECK BOSS RAID THEO LỊCH
        this.startScheduledRaidChecker();
    }
    
    // Sửa logic tính delay để spawn vào mốc 10 phút chẵn
    scheduleRandomSpawn() {
        const TEN_MINUTES = 10 * 60 * 1000;
        const now = new Date();
        
        // Tính thời gian đến mốc 10 phút chẵn tiếp theo (XX:00, XX:10, XX:20, ...)
        // Mục đích là để thiết lập setInterval cố định.
        const currentMs = now.getTime();
        const nextTenMinuteMark = Math.ceil(currentMs / TEN_MINUTES) * TEN_MINUTES;
        let delay = nextTenMinuteMark - currentMs;
        
        console.log(`⏱️ Đợt Spawn Pet ngẫu nhiên tiếp theo (định kỳ) sau: ${Math.round(delay / 1000)} giây`);
        
        this.randomSpawnInterval = setTimeout(() => {
            // Lần spawn đầu tiên theo lịch
            this.spawnBatch(); 
            
            // Sau đó, thiết lập vòng lặp định kỳ mỗi 10 phút
            this.randomSpawnInterval = setInterval(() => {
                this.spawnBatch(); // Spawn định kỳ mỗi 10 phút
            }, TEN_MINUTES); 
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
                
                // Tránh spawn Boss lặp lại trong cùng 1 phút
                if (this.raidManager.activeBoss) return;
                
                // Lấy độ khó server (Giả định lấy config toàn cục hoặc config cho kênh spawn)
                const serverConfig = Database.getServerConfig(this.channelId); 
                const difficultyKey = serverConfig?.difficulty || 'ác quỷ'; // Mặc định là 'ác quỷ' cho Raid Boss
                
                // Lấy hệ số nhân độ khó
                // Giả định DIFFICULTY_LEVELS là 1 object mapping như: { 'dễ': { multiplier: 1.0 }, 'ác quỷ': { multiplier: 250 } }
                const difficultyMultiplier = DIFFICULTY_LEVELS[difficultyKey]?.multiplier || 250; // Mặc định 250
                
                // Khởi tạo Boss Raid và truyền độ khó vào
                await this.raidManager.spawnNewBoss(this.channelId, difficultyMultiplier);
            }
        }, 60 * 1000); // Kiểm tra mỗi phút
    }


    // --- RANDOM THỜI TIẾT MỚI MỖI ĐỢT ---
    changeWeather() {
        const keys = Object.keys(WEATHERS);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.currentWeather = WEATHERS[randomKey];
    }
    
    // --- [NEW] TÍNH TOÁN TỶ LỆ RƠI CHUẨN XÁC (Dùng logic từ code cũ) ---
    pickRandomRarity() {
        const rand = Math.random(); 
        let cumulative = 0;
        
        for (const { rarity, weight } of RARITY_WEIGHTS) {
            cumulative += weight;
            if (rand < cumulative) return rarity;
        }
        return RARITY.COMMON;
    }

    // ==========================================
    // --- XỬ LÝ SPAWN THEO LÔ (BATCH) ---
    // ==========================================
    async spawnBatch() {
        if (!this.channelId) return;

        // Fetch kênh bằng cache trước, nếu không có thì fetch trực tiếp
        let channel = this.client.channels.cache.get(this.channelId);
        if (!channel) {
            try {
                channel = await this.client.channels.fetch(this.channelId);
            } catch (error) {
                console.log(`⚠️ Không tìm thấy hoặc không thể truy cập kênh Spawn ID: ${this.channelId}.`);
                return;
            }
        }

        // 1. Dọn dẹp Pet cũ VÀ XÓA TIN NHẮN CŨ
        await this.clearOldPets(channel);
        
        // 2. Đổi Thời Tiết & Thông báo
        this.changeWeather();
        await this.sendWeatherAnnouncement(channel);
        
        // 3. Spawn 10 Pet (Ngẫu nhiên/Thường)
        for (let i = 0; i < 10; i++) {
            // Chỉ slot cuối cùng có cơ hội 30% là Boss Hoàng Kim (isVip)
            const isVip = (i === 9) && (Math.random() < 0.3); 
            
            // Delay giữa các Pet để tránh flood
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            
            await this.createOnePet(channel, isVip);
        }
    }

    // --- HÀM HỖ TRỢ: DỌN DẸP PET CŨ (Xóa Pet và tin nhắn của nó) ---
    async clearOldPets(channel) {
        // Xóa tin nhắn Thời tiết cũ
        if (this.lastWeatherMessageId) {
            try {
                // messages.fetch() chỉ nên dùng khi message không nằm trong cache,
                // đối với tin nhắn vừa gửi có thể dùng channel.messages.cache.get()
                const oldWeatherMsg = await channel.messages.fetch(this.lastWeatherMessageId).catch(() => null);
                if (oldWeatherMsg && oldWeatherMsg.deletable) await oldWeatherMsg.delete();
            } catch (e) { 
                console.error("Lỗi xóa tin nhắn thời tiết:", e.message);
            }
            this.lastWeatherMessageId = null;
        }

        if (activeWildPets.size > 0) {
            console.log(`🗑️ Đang dọn dẹp ${activeWildPets.size} Pet hoang dã cũ...`);
            const petsToDelete = Array.from(activeWildPets.entries());
            
            for (const [petId, info] of petsToDelete) {
                // Giữ lại pet đang trong trận chiến
                if (!info.isBattling) { 
                    try {
                        const oldMsg = await channel.messages.fetch(info.messageId).catch(() => null);
                        if (oldMsg && oldMsg.deletable) await oldMsg.delete();
                    } catch (e) { 
                        // console.error(`Lỗi xóa tin nhắn Pet ${petId}:`, e.message); 
                    }
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
        // 1. Chọn Rarity ngẫu nhiên
        const rarity = this.pickRandomRarity(); 
        
        // 2. Lấy data thô & tạo instance Pet
        // Giả định spawnWildPet(rarity, isVip) đã hỗ trợ truyền rarity và vip status
        let rawPetData = spawnWildPet(rarity, isVip);
        let pet = new Pet(rawPetData); // Giả định Pet constructor nhận raw data và tính stats

        // 3. Xử lý Weather Boost
        let weatherBoostMsg = "";
        if (this.currentWeather.buff.includes(pet.element)) {
            // Tăng Gen 15 điểm
            pet.gen = Math.min(100, pet.gen + 15); 
            // Tính lại Stats sau khi tăng Gen
            pet.currentStats = pet.calculateStats(); 
            pet.currentHP = pet.currentStats.HP;
            //pet.currentMP = pet.currentStats.MP; // Giả định Pet class có method/logic này
            
            weatherBoostMsg = `\n⚡ **WEATHER BOOST:** ${this.currentWeather.icon} Sức mạnh tăng cường!`;
        }

        // 4. Chuẩn bị dữ liệu hiển thị
        const stats = pet.getStats();
        const rarityInfo = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG[RARITY.COMMON];
        const rarityColor = rarityInfo.color;
        const rarityIcon = rarityInfo.icon || '⚪'; 
        const elementIcon = ELEMENT_ICONS[pet.element] || '❓';
        
        // 5. Xử lý Tiêu đề & Thumbnail (Boss/Đột Biến)
        let titlePrefix = `${rarityIcon} [Lv.${pet.level}] **PET HOANG DÃ:**`;
        let thumbnail = null;

        if (isVip) {
            titlePrefix = `${rarityIcon} 👑 [BOSS Lv.${pet.level}] **BOSS HOÀNG KIM:**`;
            thumbnail = "https://media.tenor.com/2roX3uxz_68AAAAi/cat.gif";
        } else if (pet.gen >= 90) {
            titlePrefix = `${rarityIcon} ✨ [Lv.${pet.level}] **PET ĐỘT BIẾN:**`; 
        }

        // 6. Tạo Embed
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
                    value: `❤️ HP: **${stats.HP}** 💧 MP: **${stats.MP || 'N/A'}**\n` +
                            `⚔️ ATK: **${stats.ATK}** 🪄 SATK: **${stats.MATK || stats.SATK || 0}**\n` + 
                            `🛡️ DEF: **${stats.DEF}** ⚡ SPD: **${stats.SPD}**`,
                    inline: false 
                }
            );
        
        if (petImageUrl) {
            embed.setImage(petImageUrl);
        } else {
            // Nếu không có URL ảnh, hiển thị emoji Pet trong Description
            embed.setDescription(`${pet.icon}\n` + embed.data.description);
        }

        // 7. Tạo Buttons
        const btnStyle = isVip ? ButtonStyle.Danger : (pet.gen >= 90 ? ButtonStyle.Success : ButtonStyle.Primary);
        const btnLabel = isVip ? '⚔️ SĂN BOSS' : '⚔️ KHIÊU CHIẾN';

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`challenge_${pet.id}`) 
                    .setLabel(btnLabel)
                    .setStyle(btnStyle) 
            );

        // 8. Gửi tin nhắn & Lưu vào Map
        try {
            const message = await channel.send({ embeds: [embed], components: [row] });

            activeWildPets.set(pet.id, { 
                petData: pet, 
                messageId: message.id, 
                channelId: channel.id,
                isBattling: false 
            }); 
            console.log(`✅ Đã spawn Pet: ${pet.name} (${pet.id}) vào kênh ${channel.id}`);
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn spawn Pet ${pet.name} vào kênh ${channel.id}:`, error.message);
            // Có thể do thiếu quyền gửi tin nhắn
        }
    }
}