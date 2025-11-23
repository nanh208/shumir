import { EmbedBuilder } from 'discord.js';
import { Database } from './Database.mjs'; 
import { BOSS_REWARD_TIERS, BOSS_DROPS, RAID_BOSS_HOURS, RARITY, DIFFICULTY_LEVELS, PVP_EVENT_CONFIG } from './Constants.mjs'; 
import { createBossPet, applyDifficultyMultiplier } from './GameLogic.mjs';

export class RaidBossManager {
    constructor(client) {
        this.client = client;
        this.activeBoss = null; // PVE Boss Raid
        this.damageTracker = new Map(); // Map<UserId, TotalDamage>

        // [MỚI] State quản lý sự kiện PVP Boss
        this.activePVPEvent = null; // { id, status, participants, bossPet, messageId, timer }
        this.pvpSignups = new Map(); // Map<UserId, {pet, username}>
    }

    // --- PVE BOSS LOGIC (Giữ nguyên) ---

    async spawnNewBoss(channelId, difficultyMultiplier) {
        if (this.activeBoss) {
            console.warn("Boss hiện tại vẫn đang hoạt động.");
            return null;
        }
        // ... (Code PVE Boss Logic cũ) ...
        // [Chú ý]: Cần đảm bảo Database.addItemToUser tồn tại hoặc thay thế bằng logic lưu item.
    }

    trackDamage(userId, damage) {
        // ... (Code trackDamage cũ, chỉ dành cho PVE Boss) ...
    }

    async distributeRewards() {
        // ... (Code distributeRewards cũ, chỉ dành cho PVE Boss) ...
    }

    async notifyResults(results, totalDamage) {
        // ... (Code notifyResults cũ) ...
    }

    // --- MỚI: PVP ARENA BOSS LOGIC ---

    async startArenaBossEvent(channelId, serverId, difficultyKey) {
        if (this.activePVPEvent || this.activeBoss) {
            console.warn("Đang có sự kiện Boss đang diễn ra.");
            return;
        }

        const difficultyMultiplier = DIFFICULTY_LEVELS[difficultyKey]?.multiplier || 1.0; 

        // 1. Tạo Pet Boss PVP (Legendary/Mythic, Gen cao)
        // Cần giả định createBossPet hoặc spawnWildPet có sẵn từ GameLogic
        let bossPet = createBossPet(10); 
        bossPet.name = `BOSS ARENA: ${bossPet.name}`;
        bossPet.rarity = PVP_EVENT_CONFIG.BOSS_RARITY; 
        bossPet.level = (bossPet.level || 50) + PVP_EVENT_CONFIG.LEVEL_BOOST; 
        
        bossPet = applyDifficultyMultiplier(bossPet, difficultyMultiplier);
        bossPet.currentHP = bossPet.getStats().HP;
        bossPet.currentMP = bossPet.getStats().MP;

        this.activePVPEvent = {
            id: 'ARENA_BOSS_' + Date.now().toString(36),
            status: 'SIGNUP',
            boss: bossPet,
            participants: new Map(),
            messageId: null,
            timer: null,
            channelId: channelId,
            serverId: serverId
        };
        this.pvpSignups.clear(); 

        // 2. Gửi thông báo Đăng ký
        const channel = await this.client.channels.fetch(channelId);
        if (channel && typeof channel.send === 'function') {
            const embed = new EmbedBuilder()
                .setTitle(`⚔️ EVENT BOSS ARENA ĐÃ MỞ ĐĂNG KÝ!`)
                .setDescription(`
                    **Mục tiêu:** ${bossPet.name} (Lv.${bossPet.level}, ${bossPet.rarity})
                    **Thời gian đăng ký:** ${PVP_EVENT_CONFIG.SIGNUP_DURATION / 60000} phút.
                    **HP Boss:** ${bossPet.currentHP.toLocaleString()}
                    
                    *Nhấn 'Tham gia' để đăng ký chiến đấu Pet Active mạnh nhất của bạn!*
                `)
                .setColor(0x0099FF);
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pvp_signup').setLabel('Tham gia (Dùng Pet Active)').setStyle(ButtonStyle.Success)
            );

            const msg = await channel.send({ content: '@here', embeds: [embed], components: [row] });
            this.activePVPEvent.messageId = msg.id;

            // 3. Thiết lập timer cho 5 phút đăng ký
            this.activePVPEvent.timer = setTimeout(() => {
                this.startPVPBattle();
            }, PVP_EVENT_CONFIG.SIGNUP_DURATION);
        }
    }
    
    async handleSignup(interaction) {
        if (this.activePVPEvent?.status !== 'SIGNUP') {
            return interaction.reply({ content: "🚫 Đã hết thời gian đăng ký hoặc sự kiện chưa bắt đầu.", ephemeral: true });
        }
        if (this.pvpSignups.has(interaction.user.id)) {
            return interaction.reply({ content: "🚫 Bạn đã đăng ký rồi.", ephemeral: true });
        }
        
        const userData = Database.getUser(interaction.user.id);
        const petData = userData.pets[userData.activePetIndex];
        
        if (!petData) {
            return interaction.reply({ content: "🚫 Bạn chưa có Pet Active.", ephemeral: true });
        }

        // Lưu Pet Active của người chơi
        this.pvpSignups.set(interaction.user.id, { 
            pet: new Pet(petData), // Tạo Pet instance từ Pet.mjs
            username: interaction.user.username 
        });
        
        // Ghi nhận tương tác
        await interaction.reply({ content: `✅ Đăng ký thành công với Pet: **${petData.name}** (Lv.${petData.level})!`, ephemeral: true });

        // Cập nhật số lượng đăng ký trên tin nhắn
        const channel = await this.client.channels.fetch(this.activePVPEvent.channelId);
        if (channel && this.activePVPEvent.messageId) {
            const msg = await channel.messages.fetch(this.activePVPEvent.messageId).catch(() => null);
            if (msg) {
                const embed = EmbedBuilder.from(msg.embeds[0])
                    .setFooter({ text: `Số lượng đăng ký: ${this.pvpSignups.size}` });
                msg.edit({ embeds: [embed] }).catch(() => {});
            }
        }
    }

    async startPVPBattle() {
        if (this.activePVPEvent?.status !== 'SIGNUP') return;
        this.activePVPEvent.status = 'BATTLE';

        if (this.pvpSignups.size < 1) {
            this.endPVPEvent("Không có người chơi tham gia.");
            return;
        }

        const channel = await this.client.channels.fetch(this.activePVPEvent.channelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(`🔥 TRẬN ĐẤU BOSS ARENA BẮT ĐẦU!`)
                .setDescription(`
                    **${this.pvpSignups.size}** người chơi đã tham gia.
                    **Boss:** ${this.activePVPEvent.boss.name}
                    *Các trận đấu sẽ được khởi tạo lần lượt. Hãy sẵn sàng chiến đấu trong kênh này!*
                `)
                .setColor(0xFF4500);

            // Xóa nút đăng ký
            channel.messages.fetch(this.activePVPEvent.messageId)
                .then(msg => msg.edit({ embeds: [embed], components: [] }))
                .catch(() => {});
            
            // Xóa sự kiện sau một thời gian (ví dụ 15 phút)
            setTimeout(() => {
                this.endPVPEvent("Hết thời gian chiến đấu Arena.");
            }, 15 * 60 * 1000); 
            
            // TODO: Logic khởi tạo từng trận đấu PVP Boss (Cần hàm từ BattleManager)
            // Vì logic này cần gọi BattleManager, ta sẽ bổ sung logic này ở BattleManager
        }
    }

    endPVPEvent(reason) {
        console.log(`[PVP Event] Kết thúc: ${reason}`);
        // Gửi thông báo kết thúc nếu cần
        this.activePVPEvent = null;
        this.pvpSignups.clear();
    }
}