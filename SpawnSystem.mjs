import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawnWildPet, Pet } from './GameLogic.mjs'; 
import { Database } from './Database.mjs'; 
import { RARITY_CONFIG, RARITY, ELEMENTS, ELEMENT_ICONS, RAID_BOSS_HOURS, RAID_BOSS_MINUTE, RARITY_WEIGHTS, DIFFICULTY_LEVELS } from './Constants.mjs'; 
import { RaidBossManager } from './RaidBossManager.mjs'; 

// =======================================================
// BIẾN LƯU TRỮ (ĐƯỢC EXPORT ĐỂ DÙNG CHUNG)
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

export class SpawnSystem {
    constructor(client) {
        this.client = client;
        const config = Database.getConfig() || {}; 
        this.channelId = config.spawnChannelId || null;
        
        this.raidManager = new RaidBossManager(client); 
        this.randomSpawnInterval = null; 
        this.scheduledSpawnChecker = null; 
        
        this.currentWeather = WEATHERS.CLEAR; 
        this.lastWeatherMessageId = null; 
    }

    start() {
        console.log("🚀 Hệ thống Spawn đã khởi động.");
        if (!this.channelId) return console.log("⚠️ Chưa cài đặt kênh Spawn! Hãy dùng lệnh /setup_spawn");

        this.spawnBatch(); 
        this.scheduleRandomSpawn();
        this.startScheduledRaidChecker();
    }

    scheduleRandomSpawn() {
        const TEN_MINUTES = 10 * 60 * 1000;
        const now = Date.now();
        const nextMark = Math.ceil(now / TEN_MINUTES) * TEN_MINUTES;
        const delay = nextMark - now;

        setTimeout(() => {
            this.spawnBatch();
            this.randomSpawnInterval = setInterval(() => {
                this.spawnBatch(); 
            }, TEN_MINUTES); 
        }, delay);
    }
    
    startScheduledRaidChecker() {
        this.scheduledSpawnChecker = setInterval(async () => {
            const now = new Date();
            if (RAID_BOSS_HOURS.includes(now.getUTCHours()) && now.getUTCMinutes() === RAID_BOSS_MINUTE) {
                if (this.raidManager.activeBoss) return;
                
                const serverConfig = Database.getServerConfig(this.channelId); 
                const difficultyKey = serverConfig?.difficulty || 'ác quỷ'; 
                const difficultyMultiplier = DIFFICULTY_LEVELS?.[difficultyKey]?.multiplier || 250; 
                
                await this.raidManager.spawnNewBoss(this.channelId, difficultyMultiplier);
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
        if (!this.channelId) return;
        let channel;
        try { channel = await this.client.channels.fetch(this.channelId); } catch (e) { return; }

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

    async createOnePet(channel, isVip) {
        const rarity = this.pickRandomRarity(); 
        let rawPetData = spawnWildPet(rarity, isVip);
        let pet = new Pet(rawPetData); 

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
        } else if (pet.gen >= 90) {
            title = `✨ [Lv.${pet.level}] PET ĐỘT BIẾN: ${pet.name.toUpperCase()}`; 
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
                    value: `🧬 Gen: **${pet.gen}%** ${weatherBoostMsg}`, 
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

// 👇 HÀM NÀY ĐÃ ĐƯỢC CHUYỂN VỀ ĐÂY ĐỂ CÁC FILE KHÁC GỌI
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