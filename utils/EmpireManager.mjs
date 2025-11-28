// utils/EmpireManager.mjs
import fs from 'fs';
import path from 'path';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

const dataPath = path.resolve('./data/empire-players.json');
const configPath = path.resolve('./data/empire-config.json');
const marketPath = path.resolve('./data/empire-market.json');
const alliancePath = path.resolve('./data/empire-alliances.json'); // [MỚI]

// --- CẤU HÌNH ---
const DEMO_ROLE_IDS = { 
    1: '1443758479125909534', 
    2: '1443758670495223859', 
    3: '1443758813252419717' 
};
const ROLE_NAMES = { 1: 'Lãnh Chúa', 2: 'Nhà Chiến Lược', 3: 'Hoàng Đế' };

const WEATHER_TYPES = [
    { name: '☀️ Nắng đẹp', effect: 'Bình thường', id: 'sunny' },
    { name: '🌧️ Mưa bão', effect: 'Tốc độ hành quân giảm 50%', id: 'rain' },
    { name: '🔥 Hạn hán', effect: 'Sản lượng Lương thực giảm 50%', id: 'drought' },
    { name: '🌫️ Sương mù', effect: 'Do thám thất bại', id: 'fog' }
];

const PRODUCTION_RATES = {
    farm: b => 100 * b, lumber_mill: b => 100 * b, gold_mine: b => 50 * b, iron_mine: b => 30 * b
};

const UNIT_STATS = {
    infantry: { name: "Bộ Binh", cost: { food: 50, gold: 10 }, power: 10 },
    archer: { name: "Cung Thủ", cost: { food: 80, wood: 50, gold: 20 }, power: 15 },
    cavalry: { name: "Kỵ Binh", cost: { food: 150, gold: 100, iron: 20 }, power: 30 },
    // [AGE 3 UNITS]
    elephant: { name: "Voi Chiến", cost: { food: 500, gold: 300, iron: 50 }, power: 80 },
    siege_ram: { name: "Xe Công Thành", cost: { wood: 500, iron: 200, gold: 200 }, power: 50 }
};

const UPGRADE_COSTS = {
    farm: { wood: 100 }, lumber_mill: { wood: 100, gold: 50 },
    gold_mine: { wood: 200, food: 200 }, iron_mine: { wood: 500, gold: 200 },
    town_hall: { wood: 1000, food: 1000, gold: 1000 },
    // [AGE 3 BUILDING]
    siege_workshop: { wood: 1000, iron: 500, gold: 500 }
};

const MAP_SIZE = 20;

const STARTER_DATA = {
    resources: { food: 500, wood: 500, gold: 200, iron: 0 },
    buildings: { town_hall: 1, farm: 1, lumber_mill: 1, gold_mine: 0, iron_mine: 0, barracks: 0, wall: 0, siege_workshop: 0 },
    units: { infantry: 0, archer: 0, cavalry: 0, elephant: 0, siege_ram: 0 },
    age: 1,
};

export class EmpireManager {
    constructor() {
        this.players = {};
        this.config = {};
        this.market = [];
        this.alliances = {}; // [MỚI]
        this.weather = WEATHER_TYPES[0];
        this.loadData();

        setInterval(() => this.changeWeather(), 1000 * 60 * 60);
    }

    loadData() {
        try {
            if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));
            this.players = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({}));
            this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            if (!fs.existsSync(marketPath)) fs.writeFileSync(marketPath, JSON.stringify([]));
            this.market = JSON.parse(fs.readFileSync(marketPath, 'utf8'));

            // [MỚI] Load Alliance
            if (!fs.existsSync(alliancePath)) fs.writeFileSync(alliancePath, JSON.stringify({}));
            this.alliances = JSON.parse(fs.readFileSync(alliancePath, 'utf8'));

        } catch (e) { console.error("Error loading data:", e); }
    }

    saveData() { 
        fs.writeFileSync(dataPath, JSON.stringify(this.players, null, 2)); 
        fs.writeFileSync(marketPath, JSON.stringify(this.market, null, 2));
        fs.writeFileSync(alliancePath, JSON.stringify(this.alliances, null, 2)); // [MỚI]
    }

    getPlayer(userId) { return this.players[userId] || null; }
    getPlayerAt(x, y) { return Object.values(this.players).find(p => p.position.x === x && p.position.y === y); }
    getUnitStats() { return UNIT_STATS; }
    getUpgradeCosts() { return UPGRADE_COSTS; }
    getPublicChannel(guildId) { return this.config[guildId] || null; }

    // --- LOGIC THỜI TIẾT ---
    changeWeather() {
        const random = Math.floor(Math.random() * WEATHER_TYPES.length);
        this.weather = WEATHER_TYPES[random];
    }
    getCurrentWeather() { return this.weather; }

    // --- LOGIC CHỢ ---
    addListing(sellerId, type, amount, price) {
        const listing = {
            id: Date.now().toString(36).slice(-5).toUpperCase(),
            sellerId,
            sellerName: this.players[sellerId].username,
            type,
            amount: parseInt(amount),
            price: parseInt(price),
            timestamp: Date.now()
        };
        this.market.push(listing);
        this.saveData();
        return listing;
    }

    buyListing(buyerId, listingId) {
        const listingIndex = this.market.findIndex(l => l.id === listingId);
        if (listingIndex === -1) return { success: false, msg: "Đơn hàng không tồn tại." };
        
        const listing = this.market[listingIndex];
        const buyer = this.players[buyerId];
        const seller = this.players[listing.sellerId];

        if (buyer.id === listing.sellerId) return { success: false, msg: "Không thể tự mua hàng của mình." };
        if (buyer.resources.gold < listing.price) return { success: false, msg: "Không đủ vàng." };

        buyer.resources.gold -= listing.price;
        buyer.resources[listing.type] += listing.amount;
        
        if (seller) {
            const tax = Math.floor(listing.price * 0.1);
            seller.resources.gold += (listing.price - tax);
        }

        this.market.splice(listingIndex, 1);
        this.saveData();
        return { success: true, item: listing };
    }

    // --- LOGIC LIÊN MINH [MỚI] ---
    createAlliance(leaderId, name) {
        if (Object.values(this.alliances).find(a => a.name === name)) return { success: false, msg: "Tên đã tồn tại." };
        const player = this.players[leaderId];
        if (player.allianceId) return { success: false, msg: "Bạn đang ở trong liên minh khác." };
        if (player.resources.gold < 1000) return { success: false, msg: "Cần 1000 Vàng." };

        player.resources.gold -= 1000;
        const allianceId = Date.now().toString(36).toUpperCase();
        this.alliances[allianceId] = { id: allianceId, name: name, leaderId: leaderId, members: [leaderId], createdAt: Date.now() };

        player.allianceId = allianceId;
        this.saveData();
        return { success: true, id: allianceId };
    }

    joinAlliance(playerId, allianceId) {
        const alliance = this.alliances[allianceId];
        const player = this.players[playerId];
        if (!alliance) return { success: false, msg: "Liên minh không tồn tại." };
        if (player.allianceId) return { success: false, msg: "Rời liên minh cũ trước." };
        if (alliance.members.length >= 10) return { success: false, msg: "Liên minh đã đầy." };

        alliance.members.push(playerId);
        player.allianceId = allianceId;
        this.saveData();
        return { success: true, name: alliance.name };
    }

    leaveAlliance(playerId) {
        const player = this.players[playerId];
        if (!player.allianceId) return { success: false, msg: "Chưa tham gia liên minh." };
        const alliance = this.alliances[player.allianceId];
        if (alliance.leaderId === playerId) return { success: false, msg: "Chủ liên minh không thể rời." };

        alliance.members = alliance.members.filter(id => id !== playerId);
        player.allianceId = null;
        this.saveData();
        return { success: true };
    }

    getAlliance(id) { return this.alliances[id]; }

    // --- LOGIC TÀI NGUYÊN ---
    calculateProduction(player) {
        const now = Date.now();
        const last = player.lastCollection || now;
        const diffHours = (now - last) / (1000 * 60 * 60);
        if (diffHours <= 0) return null;

        let foodMod = 1;
        if (this.weather.id === 'drought') foodMod = 0.5;

        return {
            food: Math.floor(PRODUCTION_RATES.farm(player.buildings.farm || 0) * diffHours * foodMod),
            wood: Math.floor(PRODUCTION_RATES.lumber_mill(player.buildings.lumber_mill || 0) * diffHours),
            gold: Math.floor(PRODUCTION_RATES.gold_mine(player.buildings.gold_mine || 0) * diffHours),
            iron: Math.floor(PRODUCTION_RATES.iron_mine(player.buildings.iron_mine || 0) * diffHours),
            hours: diffHours
        };
    }

    harvestResources(userId) {
        const player = this.getPlayer(userId);
        if (!player) return null;
        const produced = this.calculateProduction(player);
        if (!produced) return { success: false };

        player.resources.food += produced.food;
        player.resources.wood += produced.wood;
        player.resources.gold += produced.gold;
        player.resources.iron += produced.iron;
        
        player.lastCollection = Date.now();
        this.saveData();
        return { success: true, received: produced };
    }

    // --- LOGIC RESET ---
    async demotePlayer(guild, playerId) {
        const player = this.players[playerId];
        if (!player) return;

        // Reset dữ liệu nhưng giữ lại Alliance nếu muốn (hoặc kick luôn tùy bạn)
        // Ở đây tôi giữ allianceId null để về sơ khai hoàn toàn
        player.resources = { ...STARTER_DATA.resources };
        player.buildings = { ...STARTER_DATA.buildings };
        player.units = { ...STARTER_DATA.units };
        player.age = 1;
        player.allianceId = null; // Kick khỏi liên minh khi sụp đổ
        this.saveData();

        try {
            const member = await guild.members.fetch(playerId);
            if (member) {
                const role2 = guild.roles.cache.get(DEMO_ROLE_IDS[2]);
                const role3 = guild.roles.cache.get(DEMO_ROLE_IDS[3]);
                if (role2) await member.roles.remove(role2);
                if (role3) await member.roles.remove(role3);

                const role1 = guild.roles.cache.get(DEMO_ROLE_IDS[1]);
                if (role1) await member.roles.add(role1);
            }
        } catch (e) { console.error(`Lỗi role:`, e); }
    }

    // --- LOGIC CHIẾN ĐẤU (Có check Alliance) ---
    resolveBattle(attackerId, defenderId, attackingUnits) {
        const attacker = this.players[attackerId];
        const defender = this.players[defenderId];

        // [MỚI] Check Đồng Minh
        if (attacker.allianceId && defender.allianceId && attacker.allianceId === defender.allianceId) {
            return { error: true, msg: "⛔ Không thể tấn công thành viên cùng Liên Minh!" };
        }

        let isCollapsed = false;
        let attackPower = (attackingUnits.infantry * UNIT_STATS.infantry.power) + 
                          (attackingUnits.archer * UNIT_STATS.archer.power) + 
                          (attackingUnits.cavalry * UNIT_STATS.cavalry.power) +
                          (attackingUnits.elephant || 0) * UNIT_STATS.elephant.power + 
                          (attackingUnits.siege_ram || 0) * UNIT_STATS.siege_ram.power;

        const wallBonus = 1 + ((defender.buildings.wall || 0) * 0.1);
        let defensePower = ((defender.units.infantry || 0) * UNIT_STATS.infantry.power) + 
                           ((defender.units.archer || 0) * UNIT_STATS.archer.power) + 
                           ((defender.units.cavalry || 0) * UNIT_STATS.cavalry.power) +
                           ((defender.units.elephant || 0) * UNIT_STATS.elephant.power);
                           
        defensePower = Math.floor(defensePower * wallBonus);

        const isVictory = attackPower > defensePower;
        let loot = { food: 0, wood: 0, gold: 0, iron: 0 };
        let losses = { attacker: {}, defender: {} };

        if (isVictory) {
            loot.food = Math.floor(defender.resources.food * 0.5);
            loot.wood = Math.floor(defender.resources.wood * 0.5);
            loot.gold = Math.floor(defender.resources.gold * 0.5);
            loot.iron = Math.floor(defender.resources.iron * 0.5);

            defender.resources.food -= loot.food; attacker.resources.food += loot.food;
            defender.resources.wood -= loot.wood; attacker.resources.wood += loot.wood;
            defender.resources.gold -= loot.gold; attacker.resources.gold += loot.gold;
            defender.resources.iron -= loot.iron; attacker.resources.iron += loot.iron;

            losses.attacker = this.killTroops(attackingUnits, 0.1);
            losses.defender = this.killTroops(defender.units, 1.0);
            isCollapsed = true;
        } else {
            losses.attacker = this.killTroops(attackingUnits, 0.5);
            losses.defender = this.killTroops(defender.units, 0.1);
        }

        // Cập nhật quân Attacker
        attacker.units.infantry -= (attackingUnits.infantry - losses.attacker.remaining.infantry);
        attacker.units.archer -= (attackingUnits.archer - losses.attacker.remaining.archer);
        attacker.units.cavalry -= (attackingUnits.cavalry - losses.attacker.remaining.cavalry);
        if (attacker.units.elephant) attacker.units.elephant -= ((attackingUnits.elephant||0) - (losses.attacker.remaining.elephant||0));
        if (attacker.units.siege_ram) attacker.units.siege_ram -= ((attackingUnits.siege_ram||0) - (losses.attacker.remaining.siege_ram||0));

        if (!isCollapsed) defender.units = losses.defender.remaining;
        this.saveData();

        return { isVictory, isCollapsed, attackPower, defensePower, loot, losses };
    }

    killTroops(units, percent) {
        const result = { remaining: {}, dead: {} };
        for (const type of Object.keys(units)) {
            if (typeof units[type] !== 'number') continue;
            result.remaining[type] = Math.floor(units[type] * (1 - percent));
            result.dead[type] = units[type] - result.remaining[type];
        }
        return result;
    }

    findEmptyPosition() {
        let x, y, key, attempts = 0;
        const occupied = new Set(Object.values(this.players).map(p => `${p.position.x},${p.position.y}`));
        do {
            x = Math.floor(Math.random() * MAP_SIZE);
            y = Math.floor(Math.random() * MAP_SIZE);
            key = `${x},${y}`;
            attempts++;
        } while (occupied.has(key) && attempts < 1000);
        return { x, y };
    }

    async registerUser(interaction) {
        const userId = interaction.user.id;
        if (this.players[userId]) return { status: 'exist', data: this.players[userId] };
        const member = interaction.member;
        const privateChannel = await this.createPlayerChannel(interaction.guild, member);
        if (!privateChannel) return { status: 'error', msg: 'Bot thiếu quyền tạo kênh.' };
        await this.assignAgeRole(member, 1);
        const pos = this.findEmptyPosition();
        this.players[userId] = {
            ...STARTER_DATA,
            id: userId, username: interaction.user.username,
            privateChannelId: privateChannel.id, position: pos,
            joinedAt: Date.now(), lastCollection: Date.now()
        };
        this.saveData();
        await privateChannel.send({ content: `<@${userId}>`, embeds: [{ title: "🏰 Khởi Tạo Vương Quốc", description: `Vị trí: **[${pos.x}, ${pos.y}]**`, color: 0x00FF00 }] });
        return { status: 'success', channelId: privateChannel.id };
    }

    async assignAgeRole(member, age) {
        const guild = member.guild;
        let roleId = DEMO_ROLE_IDS[age];
        let role = null;
        if (roleId) role = guild.roles.cache.get(roleId);
        if (!role) {
            const roleName = ROLE_NAMES[age];
            role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                try {
                    role = await guild.roles.create({ name: roleName, color: age === 3 ? 'Gold' : (age === 2 ? 'Red' : 'Green') });
                } catch (e) { return null; }
            }
        }
        try {
            for (const [key, id] of Object.entries(DEMO_ROLE_IDS)) {
                if (parseInt(key) !== age) {
                    const oldRole = guild.roles.cache.get(id) || guild.roles.cache.find(r => r.name === ROLE_NAMES[key]);
                    if (oldRole && member.roles.cache.has(oldRole.id)) await member.roles.remove(oldRole);
                }
            }
            if (role) await member.roles.add(role);
            return role;
        } catch (e) { return null; }
    }

    async createPlayerChannel(guild, member) {
        try {
            let category = guild.channels.cache.find(c => c.name === "EMPIRE WORLDS" && c.type === 4);
            if (!category) category = await guild.channels.create({ name: "EMPIRE WORLDS", type: 4 });
            return await guild.channels.create({
                name: `lãnh-địa-${member.user.username}`.replace(/[^a-z0-9]/g, ''),
                parent: category.id,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
            });
        } catch (e) { return null; }
    }
}
export const empireManager = new EmpireManager();