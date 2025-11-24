import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawnWildPet, Pet, applyDifficultyMultiplier } from './GameLogic.mjs'; 
import { Database } from './Database.mjs'; 
import { 
    RARITY_CONFIG, RARITY, ELEMENTS, 
    RAID_BOSS_HOURS, RAID_BOSS_MINUTE, RARITY_WEIGHTS, DIFFICULTY_LEVELS,
    SCHEDULED_PVP_HOURS, SCHEDULED_PVP_MINUTE, PVP_EVENT_CONFIG,
    FIXED_HOURLY_SPAWN_HOURS, FIXED_SPAWN_RARITIES 
} from './Constants.mjs'; 
import { RaidBossManager } from './RaidBossManager.mjs'; 

// =======================================================
// BIẾN LƯU TRỮ
// =======================================================
export const activeWildPets = new Map();

const WEATHERS = {
    CLEAR: { name: "Trời Quang", icon: "☀️", buff: [ELEMENTS.FIRE, ELEMENTS.GRASS], color: 0xFFA500 },
    RAIN:  { name: "Mưa Rào",  icon: "🌧️", buff: [ELEMENTS.WATER, ELEMENTS.ELECTRIC], color: 0x0099FF },
    STORM: { name: "Bão Tố",   icon: "⛈️", buff: [ELEMENTS.WIND, ELEMENTS.DRAGON], color: 0x800080 },
    SNOW:  { name: "Bão Tuyết",icon: "❄️", buff: [ELEMENTS.ICE, ELEMENTS.WATER], color: 0xFFFFFF },
    NIGHT: { name: "Đêm Đen",  icon: "🌑", buff: [ELEMENTS.DARK, ELEMENTS.EARTH], color: 0x2C3E50 },
    HOLY:  { name: "Thánh Địa",icon: "✨", buff: [ELEMENTS.LIGHT, ELEMENTS.FIRE], color: 0xFFFFE0 }
};

function getEmojiUrl(emojiStr) {
    if (!emojiStr) return null;
    if (emojiStr.startsWith('http')) return emojiStr;
    const match = emojiStr.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
    if (match) return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}?size=96`;
    return null; 
}

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class SpawnSystem {
    constructor(client) {
        this.client = client;
        this.raidManager = new RaidBossManager(client); // ✅ Đã khởi tạo ở đây là this.raidManager
        
        const config = Database.getConfig() || {}; 
        this.channelId = config.spawnChannelId || null;
        
        this.spawnTimer = null; 
        this.spawnTimeout = null; 
        this.bossCheckTimer = null; 
        
        this.currentWeather = WEATHERS.CLEAR; 
        this.lastWeatherMessageId = null; 
        
        this.lastFixedSpawnHour = -1; 
        
        this.pvpEvent = {
            active: false,
        };
    }

    start() {
        console.log("🚀 Hệ thống Spawn đã khởi động (Mode: Clock Alignment).");
        if (!this.channelId) return console.log("⚠️ Chưa cài đặt kênh Spawn! Hãy dùng lệnh /setup_spawn");

        this.stop(); 

        this.testSpawn();
        this.testBossSpawn(); 
        
        this.scheduleRandomSpawn();
        this.startScheduledRaidChecker(); 
    }

    stop() {
        if (this.spawnTimer) clearInterval(this.spawnTimer); 
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout); 
        if (this.bossCheckTimer) clearInterval(this.bossCheckTimer);
        this.spawnTimer = null;
        this.spawnTimeout = null;
        console.log("🛑 Đã dừng các luồng Spawn cũ.");
    }

    async getSafeSpawnChannel(channelId = this.channelId) {
        if (!channelId) return null;
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || typeof channel.send !== 'function') {
                console.error(`LỖI CẤU HÌNH: Kênh ID ${channelId} không phải là Kênh Văn bản!`);
                return null;
            }
            return channel;
        } catch (e) {
            console.error(`Lỗi fetch kênh ${channelId}:`, e.message);
            return null;
        }
    }
    
    async testSpawn() {
        const channel = await this.getSafeSpawnChannel();
        if (!channel) return;

        await this.clearOldPets(channel); 
        this.changeWeather();
        console.log("✨ Spawn 1 Pet kiểm tra khi khởi động.");
        await this.createOnePet(channel, false); 
    }
    
    async testBossSpawn() {
        if (!this.channelId) return;
        
        const serverId = this.client.guilds.cache.first()?.id;
        if (!serverId) return;
        
        const channel = await this.getSafeSpawnChannel();
        if (!channel) return;

        if (this.raidManager.activeBoss) return;
        
        const serverConfig = Database.getServerConfig(serverId); 
        const difficultyKey = serverConfig?.difficulty || 'ác quỷ'; 
        const difficultyMultiplier = DIFFICULTY_LEVELS?.[difficultyKey]?.multiplier || 250; 

        console.log("🔥 Spawn Boss Raid Test khi khởi động.");
        
        await this.raidManager.spawnNewBoss(this.channelId, difficultyMultiplier);
    }

    scheduleRandomSpawn() {
        const TEN_MINUTES = 10 * 60 * 1000;
        const now = Date.now();
        const nextMark = Math.ceil(now / TEN_MINUTES) * TEN_MINUTES;
        const delay = nextMark - now;

        console.log(`⏳ Đợt spawn định kỳ đầu tiên sẽ diễn ra sau: ${Math.round(delay/1000)}s.`);

        this.spawnTimeout = setTimeout(() => {
            this.spawnBatch();
            
            if (this.spawnTimer) clearInterval(this.spawnTimer);
            this.spawnTimer = setInterval(() => {
                this.spawnBatch(); 
            }, TEN_MINUTES);
            
        }, delay);
    }
    
    async startFixedRaritySpawn(channelId, serverId, difficultyMultiplier) {
        const channel = await this.getSafeSpawnChannel(channelId);
        if (!channel) return;

        const forcedRarity = randomElement(FIXED_SPAWN_RARITIES); 
        let scheduledPet = spawnWildPet(forcedRarity); 
        scheduledPet.gen = 90 + Math.random() * 10;
        
        scheduledPet = applyDifficultyMultiplier(scheduledPet, difficultyMultiplier);

        scheduledPet.currentStats = scheduledPet.calculateStats();
        scheduledPet.currentHP = scheduledPet.currentStats.HP;
        scheduledPet.currentMP = scheduledPet.currentStats.MP;
        
        const rarityCfg = RARITY_CONFIG[scheduledPet.rarity] || RARITY_CONFIG[RARITY.LEGENDARY];
        
        const announcementEmbed = new EmbedBuilder()
            .setTitle(`⭐ CỰC HIẾM! Pet ${scheduledPet.rarity} Đã Xuất Hiện!`)
            .setDescription(
                `Một Pet **${scheduledPet.rarity}** (Gen **${Math.floor(scheduledPet.gen)}%**) cực mạnh đã xuất hiện!\n` +
                `Mục tiêu: **${scheduledPet.name}** (Lv.${scheduledPet.level}) tại kênh <#${channelId}>!`
            )
            .setColor(rarityCfg.color)
            .setFooter({ text: "Hãy nhanh chóng tìm kiếm và khiêu chiến!" });

        await channel.send({ content: '@here', embeds: [announcementEmbed] });
        
        await this.createOnePet(channel, false, scheduledPet); 
        console.log(`[FixedSpawn] Spawned ${scheduledPet.name} (${scheduledPet.rarity})`);
    }

    startScheduledRaidChecker() {
        if (this.bossCheckTimer) clearInterval(this.bossCheckTimer);
        
        this.bossCheckTimer = setInterval(async () => {
            const now = new Date();
            const currentHour = now.getUTCHours();
            const currentMinute = now.getUTCMinutes();
            
            const serverId = this.client.guilds.cache.first()?.id;
            if (!serverId) return;
            
            const serverConfig = Database.getServerConfig(serverId); 
            // [FIX] Lấy độ khó dưới dạng chuỗi hoặc mặc định 'bình thường'
            const difficultyKey = serverConfig?.difficulty || 'bình thường'; 
            const difficultyMultiplier = DIFFICULTY_LEVELS?.[difficultyKey]?.multiplier || 1; 
            const arenaChannelId = serverConfig.arenaChannelId;

            // --- 1. FIXED RARITY SPAWN ---
            if (FIXED_HOURLY_SPAWN_HOURS.includes(currentHour) && currentMinute === 0) {
                if (currentHour !== this.lastFixedSpawnHour) {
                    this.lastFixedSpawnHour = currentHour; 
                    await this.startFixedRaritySpawn(this.channelId, serverId, difficultyMultiplier);
                }
            } else if (!FIXED_HOURLY_SPAWN_HOURS.includes(currentHour)) {
                this.lastFixedSpawnHour = -1; 
            }

            // --- 2. RAID BOSS ---
            if (RAID_BOSS_HOURS.includes(currentHour) && currentMinute === RAID_BOSS_MINUTE) {
                if (this.raidManager.activeBoss) return;
                await this.raidManager.spawnNewBoss(this.channelId, difficultyMultiplier);
            }
            
            // --- 3. PVP ARENA BOSS ---
            if (SCHEDULED_PVP_HOURS.includes(currentHour) && currentMinute === SCHEDULED_PVP_MINUTE) {
                if (!this.pvpEvent.active && !this.raidManager.activeBoss && arenaChannelId) {
                    if (this.raidManager) {
                        // [FIX] Truyền chuỗi difficultyKey vào hàm (thay vì để mặc định hoặc undefined)
                        await this.raidManager.startArenaBossEvent(arenaChannelId, serverId, difficultyKey);
                    }
                }
            }

        }, 60 * 1000); 
    }

    changeWeather() {
        const keys = Object.keys(WEATHERS);
        this.currentWeather = WEATHERS[keys[Math.floor(Math.random() * keys.length)]];
    }
    
    pickRandomRarity() {
        const rand = Math.random(); 
        let cumulative = 0;
        for (const { rarity, weight } of RARITY_WEIGHTS) {
            cumulative += weight;
            if (rand < cumulative) return rarity;
        }
        return RARITY.COMMON;
    }

    async spawnBatch() {
        const channel = await this.getSafeSpawnChannel();
        if (!channel) return;

        await this.clearOldPets(channel);
        this.changeWeather();
        await this.sendWeatherAnnouncement(channel);
        
        for (let i = 0; i < 10; i++) {
            const isVip = (i === 9) && (Math.random() < 0.3); 
            await new Promise(r => setTimeout(r, 1500)); 
            await this.createOnePet(channel, isVip);
        }
    }

    async clearOldPets(channel) {
        if (this.lastWeatherMessageId) {
            try {
                const oldMsg = await channel.messages.fetch(this.lastWeatherMessageId).catch(() => null);
                if (oldMsg && oldMsg.deletable) await oldMsg.delete();
            } catch (e) {}
            this.lastWeatherMessageId = null;
        }

        if (activeWildPets.size > 0) {
            const petsToDelete = Array.from(activeWildPets.entries());
            for (const [petId, info] of petsToDelete) {
                if (!info.isBattling) { 
                    try {
                        const oldMsg = await channel.messages.fetch(info.messageId).catch(() => null);
                        if (oldMsg && oldMsg.deletable) await oldMsg.delete();
                    } catch (e) {}
                    activeWildPets.delete(petId);
                }
            }
        }
    }

    async sendWeatherAnnouncement(channel) {
        const w = this.currentWeather;
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        const embed = new EmbedBuilder()
            .setTitle(`☁️ **THỜI TIẾT THAY ĐỔI [${timeStr}]**`)
            .setDescription(`Hiện tại đang là: **${w.name}** ${w.icon}\n🔥 Hệ được tăng cường: **${w.buff.join(', ')}**`)
            .setColor(w.color)
            .setThumbnail("https://cdn.dribbble.com/users/285475/screenshots/2083086/weather.gif");

        const message = await channel.send({ embeds: [embed] });
        this.lastWeatherMessageId = message.id;
    }
    
    async createOnePet(channel, isVip, customPet = null) {
        let pet;
        if (customPet) {
            pet = customPet;
        } else {
            const rarity = this.pickRandomRarity(); 
            let rawPetData = spawnWildPet(rarity, isVip);
            pet = new Pet(rawPetData); 
        }

        let weatherBoostMsg = "";
        if (this.currentWeather.buff.includes(pet.element)) {
            pet.gen = Math.min(100, pet.gen + 15); 
            pet.currentStats = pet.calculateStats(); 
            pet.currentHP = pet.currentStats.HP;
            weatherBoostMsg = `(+Boost ${this.currentWeather.icon})`;
        }

        const stats = pet.getStats();
        const rarityInfo = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG[RARITY.COMMON];
        const rarityIcon = rarityInfo.icon || '✨';
        
        let title = `${rarityIcon} [Lv.${pet.level}] PET HOANG DÃ: ${pet.name.toUpperCase()}`;
        let color = rarityInfo.color;
        let thumbnail = null;

        if (isVip) {
            title = `✨👑 BOSS HOÀNG KIM: ${pet.name.toUpperCase()}`;
            color = 0xFFD700;
            thumbnail = "https://media.tenor.com/2roX3uxz_68AAAAi/cat.gif";
        } else if (pet.gen >= 90 || pet.rarity === RARITY.MYTHIC || pet.rarity === RARITY.LEGENDARY) {
            title = `✨ [Lv.${pet.level}] PET ${pet.rarity.toUpperCase()}: ${pet.name.toUpperCase()}`; 
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(`**Hệ:** ${pet.element} | **Tộc:** ${pet.race} | **Rank:** ${rarityIcon} ${pet.rarity}`)
            .addFields(
                { 
                    name: '📊 Chỉ số Chiến đấu', 
                    value: `❤️ HP: **${stats.HP}** ⚡ SPD: **${stats.SPD}**\n` +
                           `⚔️ ATK: **${stats.ATK}** 🛡️ DEF: **${stats.DEF}**`,
                    inline: false 
                },
                { 
                    name: '✨ Thông tin Gen', 
                    value: `🧬 Gen: **${Math.floor(pet.gen)}%** ${weatherBoostMsg}`, 
                    inline: false 
                }
            );
        
        if (thumbnail) embed.setThumbnail(thumbnail);
        
        const img = getEmojiUrl(pet.icon);
        if (img) embed.setThumbnail(img); 
        else embed.setDescription(pet.icon + "\n" + embed.data.description);

        const btnStyle = isVip ? ButtonStyle.Danger : (pet.gen >= 90 ? ButtonStyle.Success : ButtonStyle.Primary);
        const btnLabel = isVip ? '⚔️ SĂN BOSS' : '⚔️ KHIÊU CHIẾN';
        
        const buttonId = `challenge_${String(pet.id)}`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel(btnLabel)
                .setStyle(btnStyle) 
        );

        try {
            const message = await channel.send({ embeds: [embed], components: [row] });
            
            activeWildPets.set(String(pet.id), { 
                petData: pet, 
                messageId: message.id, 
                channelId: channel.id,
                isBattling: false,
                weather: this.currentWeather 
            }); 
        } catch (error) {
            console.error(`Lỗi spawn:`, error.message);
        }
    }
}

export async function removePetFromWorld(wildPetId, client) {
    if (activeWildPets && activeWildPets.has(String(wildPetId))) {
        const petInfo = activeWildPets.get(String(wildPetId));
        activeWildPets.delete(String(wildPetId));
        
        if (client && petInfo && petInfo.channelId && petInfo.messageId) {
            try {
                const channel = await client.channels.fetch(petInfo.channelId);
                if (channel) {
                    const msg = await channel.messages.fetch(petInfo.messageId).catch(() => null);
                    if (msg && msg.deletable) await msg.delete();
                }
            } catch (error) {}
        }
        return true;
    }
    return false;
}