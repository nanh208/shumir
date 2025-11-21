import { EmbedBuilder } from 'discord.js';
import { Database } from './Database.mjs'; 
import { BOSS_REWARD_TIERS, BOSS_DROPS, RAID_BOSS_HOURS, RARITY, DIFFICULTY_LEVELS } from './Constants.mjs'; 
import { createBossPet, applyDifficultyMultiplier } from './GameLogic.mjs';

export class RaidBossManager {
    constructor(client) {
        this.client = client;
        this.activeBoss = null;
        this.damageTracker = new Map(); // Map<UserId, TotalDamage>
    }

    /**
     * Khởi tạo Boss Raid mới và thông báo ra kênh.
     * @param {string} channelId Kênh để thông báo.
     * @param {number} difficultyMultiplier Hệ số độ khó server.
     */
    async spawnNewBoss(channelId, difficultyMultiplier) {
        if (this.activeBoss) {
            console.warn("Boss hiện tại vẫn đang hoạt động.");
            return null;
        }

        // Tạo Boss: Giả định createBossPet nhận mức độ khó cơ bản (ví dụ 10)
        let bossPet = createBossPet(10); 
        
        // Áp dụng hệ số độ khó Server
        bossPet = applyDifficultyMultiplier(bossPet, difficultyMultiplier);

        // Cập nhật Rank Boss
        bossPet.name = `BOSS RAID: ${bossPet.name}`;
        bossPet.rarity = RARITY.MYTHIC; 

        this.activeBoss = {
            id: 'BOSS_RAID_' + Date.now().toString(36),
            pet: bossPet,
            maxHP: bossPet.currentHP, // HP sau khi áp dụng độ khó
            currentHP: bossPet.currentHP,
            channelId: channelId,
            startTime: Date.now(),
            status: 'ACTIVE',
        };
        this.damageTracker.clear();

        // Gửi thông báo Boss
        const channel = await this.client.channels.fetch(channelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(`🚨 BOSS RAID: ${bossPet.name.toUpperCase()} ĐÃ XUẤT HIỆN!`)
                .setDescription(`
                    **HP Khủng:** ${this.activeBoss.maxHP.toLocaleString()}
                    **Độ Khó Server:** x${difficultyMultiplier}
                    Tất cả người chơi hãy hợp sức để hạ gục! Sát thương càng cao, phần thưởng càng lớn!
                `)
                .setColor(0xFF0000);
            
            channel.send({ content: '@here', embeds: [embed] });
        }

        return this.activeBoss;
    }

    /**
     * Ghi nhận sát thương trong trận đấu (dùng trong BattleManager khi đánh Boss).
     * @param {string} userId ID người chơi.
     * @param {number} damage Sát thương gây ra.
     * @returns {boolean} True nếu Boss bị hạ gục.
     */
    trackDamage(userId, damage) {
        if (!this.activeBoss || this.activeBoss.status !== 'ACTIVE') return false;

        // Cập nhật Damage Tracker
        const currentDamage = this.damageTracker.get(userId) || 0;
        this.damageTracker.set(userId, currentDamage + damage);

        // Cập nhật HP Boss
        this.activeBoss.currentHP = Math.max(0, this.activeBoss.currentHP - damage);

        if (this.activeBoss.currentHP <= 0) {
            this.activeBoss.status = 'DEFEATED';
            this.distributeRewards();
            return true;
        }
        return false;
    }

    /**
     * Xử lý phần thưởng khi Boss bị hạ gục (Quan trọng).
     */
    async distributeRewards() {
        const totalDamage = Array.from(this.damageTracker.values()).reduce((sum, dmg) => sum + dmg, 0);
        const results = []; 

        // 1. Tính toán % Damage và xếp hạng
        const rankedPlayers = Array.from(this.damageTracker.entries())
            .map(([userId, damage]) => ({
                userId,
                damage,
                percentage: damage / totalDamage
            }))
            .sort((a, b) => b.damage - a.damage);

        // 2. Phân phối phần thưởng theo Tier
        for (const player of rankedPlayers) {
            if (player.damage === 0) continue; 

            let rewards = [];
            let tierKey = 'PARTICIPANT';
            
            // Xác định Tier phần thưởng
            for (const key in BOSS_REWARD_TIERS) {
                if (player.percentage >= BOSS_REWARD_TIERS[key].minDamage) {
                    tierKey = key;
                    break; 
                }
            }
            const tierConfig = BOSS_REWARD_TIERS[tierKey];

            // 3. Drop Guaranteed Items (Gold/XP)
            rewards.push({ item_id: 'GOLD', count: 5000 + Math.floor(tierConfig.minDamage * 10000) });
            
            // 4. Drop Rare Items (theo BOSS_DROPS)
            BOSS_DROPS.forEach(drop => {
                let chance = drop.chance;

                // Tăng cơ hội rơi dựa trên Rare Drop Bonus của Tier
                if (drop.rarity !== 'Common') {
                    chance += tierConfig.rare_drop_bonus; 
                }

                if (Math.random() < chance) {
                    rewards.push({ item_id: drop.item_id, count: tierConfig.guaranteed + 1 });
                }
            });

            // 5. Thêm phần thưởng vào Database người chơi
            rewards.forEach(reward => {
                Database.addItemToUser(player.userId, reward.item_id, reward.count);
            });

            results.push({ ...player, tier: tierKey, rewards: rewards });
        }
        
        // 6. Thông báo kết quả
        this.notifyResults(results, totalDamage);
        this.activeBoss = null; // Kết thúc Raid
    }

    /**
     * Gửi thông báo kết quả.
     */
    async notifyResults(results, totalDamage) {
        const channelId = this.activeBoss?.channelId;
        if (!channelId) return;

        const channel = await this.client.channels.fetch(channelId);
        if (!channel) return;

        let leaderboard = results.slice(0, 10).map((r, index) => { 
            const user = this.client.users.cache.get(r.userId) || { username: `Người chơi #${index+1}` };
            const rewardList = r.rewards.map(item => ` ${item.count}x **${item.item_id}**`).join(', ');
            return `**${index + 1}. ${user.username}** (${(r.percentage * 100).toFixed(2)}% DMG - ${r.tier}) - ${rewardList}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🏆 BOSS RAID ${this.activeBoss.pet.name} ĐÃ BỊ HẠ GỤC!`)
            .setDescription(`
                **Tổng sát thương gây ra:** ${totalDamage.toLocaleString()}
                **Thời gian chiến đấu:** ${(Date.now() - this.activeBoss.startTime) / 60000} phút
            `)
            .addFields(
                { name: 'BẢNG XẾP HẠNG (TOP 10)', value: leaderboard.substring(0, 1024) || 'Không có người tham gia đủ điều kiện.' }
            )
            .setColor(0x00FF00)
            .setFooter({ text: 'Phần thưởng hiếm đã được gửi tự động vào kho đồ của bạn.' });

        channel.send({ embeds: [embed] });
    }
}