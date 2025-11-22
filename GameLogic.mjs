import { 
    PET_TEMPLATES, ELEMENTS, RARITY, 
    RARITY_CONFIG, RARITY_WEIGHTS, EMOJIS, 
    LEVEL_CONFIG, ELEMENT_ADVANTAGE, PASSIVES, EVOLUTION_CHAINS,
    RARITY_COLORS // <--- THÊM CÁI NÀY VÀO
} from './Constants.mjs';

import { getRandomSkills, getSkillById } from './SkillList.mjs';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 1. CLASS PET (CORE LOGIC)
// ==========================================
export class Pet {
    constructor(data) {
        this.id = data.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.name = data.name;
        this.nickname = data.nickname || data.name; // Hỗ trợ đổi tên
        this.icon = data.icon || EMOJIS.PET_ICONS[0];
        
        this.element = data.element;
        this.race = data.race || 'Unknown';
        this.rarity = data.rarity;

        // Chỉ số cơ bản (Template)
        const defaults = { HP: 1000, MP: 500, ATK: 100, SATK: 100, DEF: 100, SPD: 100 };
        this.baseStats = { ...defaults, ...data.baseStats };
        
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.gen = data.gen || randomInt(1, 100); // Gen càng cao chỉ số càng mạnh
        this.statPoints = data.statPoints || 0; // Điểm tiềm năng chưa cộng

        // Skill & Effect
        this.skills = data.skills || getRandomSkills(this.rarity); 
        this.activeEffects = data.activeEffects || []; 

        // --- PASSIVE SYSTEM ---
        if (data.passive) {
            this.passive = data.passive;
        } else {
            // Tìm passive theo tên Pet trong Template, nếu không có thì random
            const template = PET_TEMPLATES.find(t => t.name === this.name);
            this.passive = template?.passive || randomElement(Object.keys(PASSIVES));
        }

        // Tính toán chỉ số thực tế
        this.currentStats = this.calculateStats(); 
        
        // Máu/Mana hiện tại (Nếu không có dữ liệu cũ thì full)
        this.currentHP = data.currentHP !== undefined ? data.currentHP : this.currentStats.HP;
        this.currentMP = data.currentMP !== undefined ? data.currentMP : this.currentStats.MP;
    }

    // Tính chỉ số dựa trên Base, Level, Gen và Rarity
    calculateStats() {
        const rConfig = RARITY_CONFIG[this.rarity] || RARITY_CONFIG['Common'];
        const multiplier = rConfig.statMultiplier; 
        const genFactor = 0.8 + (this.gen / 100) * 0.4; // Gen 100 = 1.2x stats
        
        // Bonus từ cấp độ (Tự động tăng)
        const autoStatBonus = (this.level - 1) * 5; 

        const b = this.baseStats;
        const safeGet = (val) => val || 100;

        const calc = (baseVal, manualBonus = 0) => {
            return Math.floor((safeGet(baseVal) + autoStatBonus + manualBonus) * multiplier * genFactor);
        };

        return { 
            HP: calc(b.HP), 
            MP: calc(b.MP), 
            ATK: calc(b.ATK), 
            SATK: calc(b.SATK || b.MATK), 
            DEF: calc(b.DEF), 
            SPD: calc(b.SPD) 
        };
    }

    // Lấy chỉ số cuối cùng (Bao gồm cả Buff/Debuff trong trận)
    getStats() {
        const stats = this.calculateStats();
        let finalStats = { ...stats };

        this.activeEffects.forEach(effect => {
            if (effect.type === 'buff' || effect.type === 'debuff') {
                const key = effect.stat; // hp, atk, def...
                const multiplier = 1 + effect.value; // value ví dụ 0.2 hoặc -0.1
                
                const statMap = { 'hp': 'HP', 'mp': 'MP', 'atk': 'ATK', 'satk': 'SATK', 'def': 'DEF', 'spd': 'SPD' };
                const finalKey = statMap[key.toLowerCase()] || key.toUpperCase();

                if (finalStats[finalKey] !== undefined) {
                     finalStats[finalKey] = Math.floor(finalStats[finalKey] * multiplier);
                }
            }
        });
        
        for (const key in finalStats) finalStats[key] = Math.max(1, finalStats[key]);
        return finalStats;
    }

    getExpToNextLevel() {
        return Math.floor(LEVEL_CONFIG.BASE_XP * Math.pow(LEVEL_CONFIG.XP_MULTIPLIER, this.level - 1));
    }

    // Cộng XP và Xử lý lên cấp
    addExp(amount, pointsPerLevel = 3) {
        const maxLv = RARITY_CONFIG[this.rarity].maxLv;
        if (this.level >= maxLv) return false;

        this.xp += amount;
        let leveledUp = false;
        let reqXp = this.getExpToNextLevel();

        while (this.xp >= reqXp && this.level < maxLv) {
            this.xp -= reqXp;
            this.level++;
            this.statPoints += pointsPerLevel; // Cộng điểm tiềm năng
            leveledUp = true;
            reqXp = this.getExpToNextLevel();
        }

        if (leveledUp) {
            const newStats = this.calculateStats();
            this.currentHP = newStats.HP;
            this.currentMP = newStats.MP;
        }
        return leveledUp;
    }

    // Cộng điểm tiềm năng (Dùng cho InventoryUI)
    incrementStat(statKey) {
        if (this.statPoints > 0) {
            const mapKey = { 'hp': 'HP', 'mp': 'MP', 'atk': 'ATK', 'satk': 'SATK', 'def': 'DEF', 'spd': 'SPD' };
            const key = mapKey[statKey.toLowerCase()];
            
            if (this.baseStats[key] !== undefined) {
                const amount = (key === 'HP' || key === 'MP') ? 10 : 2;
                this.baseStats[key] += amount;
                this.statPoints--;
                return true;
            }
        }
        return false;
    }

    // Logic kết thúc lượt (Xử lý hiệu ứng & Passive Regen)
    processTurnEffects() {
        let turnLog = [];
        let newEffects = [];
        const maxHP = this.calculateStats().HP;
        
        // 1. Xử lý Active Effects (Dot, Buff hết hạn)
        this.activeEffects.forEach(effect => {
            if (effect.turns > 0) {
                if (effect.type === 'dot') {
                    const dotDmg = Math.floor(maxHP * effect.value);
                    this.currentHP = Math.max(0, this.currentHP - dotDmg);
                    turnLog.push(`🔥 **${this.name}** mất ${dotDmg} HP do ${effect.name}.`);
                }
                effect.turns--;
                newEffects.push(effect);
            } else if (effect.turns === 0) {
                 turnLog.push(`Start **${effect.name}** trên người **${this.name}** đã hết tác dụng.`);
            }
        });
        this.activeEffects = newEffects;

        // 2. Passive: REGEN (Tái tạo)
        if (this.passive === 'REGEN') {
            const heal = Math.floor(maxHP * 0.05);
            if (this.currentHP < maxHP && this.currentHP > 0) {
                this.currentHP = Math.min(maxHP, this.currentHP + heal);
                turnLog.push(`🌿 [Nội tại] **${this.name}** tự hồi phục ${heal} HP.`);
            }
        }

        return { log: turnLog };
    }

    // Xử lý Tiến hóa
    checkEvolution() {
        const evoData = EVOLUTION_CHAINS[this.name];
        if (evoData && this.level >= evoData.level) {
            return evoData;
        }
        return null;
    }

    evolve() {
        const evoData = this.checkEvolution();
        if (!evoData) return false;

        const newTemplate = PET_TEMPLATES.find(t => t.name === evoData.target);
        if (!newTemplate) return false;

        this.name = newTemplate.name;
        this.race = newTemplate.race;
        // Tăng base stats mạnh khi tiến hóa
        this.baseStats.HP += 500;
        this.baseStats.ATK += 100;
        this.baseStats.DEF += 100;
        
        return true;
    }

    getDataForSave() {
        return {
            id: this.id, name: this.name, nickname: this.nickname, icon: this.icon,
            element: this.element, race: this.race, rarity: this.rarity,
            baseStats: this.baseStats,
            level: this.level, xp: this.xp, gen: this.gen, statPoints: this.statPoints,
            currentHP: this.currentHP, currentMP: this.currentMP,
            skills: this.skills, activeEffects: this.activeEffects,
            passive: this.passive
        };
    }
    
    calculateCombatPower() {
        const s = this.getStats();
        return Math.floor(s.HP/10 + s.ATK + s.DEF + s.SPD + (s.SATK||0));
    }
    
    getRace() { return this.race; }
    
    // Helper cho hiển thị màu
    getColor() { return RARITY_COLORS[this.rarity] || 0x0099FF; }
}

// ==========================================
// 2. BATTLE LOGIC (DAMAGE & EFFECTS)
// ==========================================

export function calculateDamage(attacker, defender, skillId, currentWeather) { 
    const skill = getSkillById(skillId); 
    if (!skill) return { damage: 0, isCrit: false, multiplier: 1.0, log: 'Lỗi Skill' };
    
    const atkStats = attacker.getStats();
    const defStats = defender.getStats();

    const atkVal = skill.type === 'Physical' ? atkStats.ATK : (atkStats.SATK || atkStats.ATK);
    const defVal = defStats.DEF; 

    let damage = (atkVal * skill.power) / Math.max(defVal * 0.5, 1); 
    damage *= (0.9 + Math.random() * 0.2); 

    // --- 1. PASSIVE: BERSEKER (Cuồng nộ) ---
    if (attacker.passive === 'BERSEKER' && (attacker.currentHP / atkStats.HP) < 0.3) {
        damage *= 1.5; 
    }

    // --- 2. ELEMENTAL ADVANTAGE (Khắc hệ) ---
    let multiplier = 1.0;
    const adv = ELEMENT_ADVANTAGE[skill.element];
    if (adv) {
        if (adv.advantage.includes(defender.element)) multiplier = 1.5; 
        else if (adv.disadvantage.includes(defender.element)) multiplier = 0.75; 
    }

    // --- 3. WEATHER BONUS ---
    if (skill.weatherBonus && currentWeather && currentWeather.buff.includes(skill.weatherBonus.element)) {
        multiplier *= 1.2;
    }

    damage *= multiplier;

    // --- 4. CRITICAL HIT ---
    let critChance = 0.10; 
    if (attacker.passive === 'CRIT_MASTER') critChance += 0.20; 
    
    const isCrit = Math.random() < critChance;
    if (isCrit) damage *= 1.5; 

    // --- 5. EVASION (Né tránh) ---
    const isEvaded = (defender.passive === 'EVASION' && Math.random() < 0.15);
    if (isEvaded) damage = 0;

    damage = Math.floor(damage);

    // --- 6. HÚT MÁU & PHẢN DAME (Sau khi chốt damage) ---
    let vampHeal = 0;
    let thornDamage = 0;

    if (damage > 0) {
        if (attacker.passive === 'VAMPIRISM') {
            vampHeal = Math.floor(damage * 0.15);
            attacker.currentHP = Math.min(atkStats.HP, attacker.currentHP + vampHeal);
        }
        if (defender.passive === 'THORNS') {
            thornDamage = Math.floor(damage * 0.10);
            attacker.currentHP = Math.max(0, attacker.currentHP - thornDamage);
        }
    }

    return { 
        damage, 
        isCrit, 
        multiplier, 
        isEvaded,
        vampHeal, 
        thornDamage 
    };
}

export function processSkillEffect(caster, target, skill, logs, damageGained = 0) {
    if (!skill.effect) return logs;
    const { type, target: effectTarget, stat, value } = skill.effect;
    const pet = effectTarget === 'self' ? caster : target;
    let logMsg = "";

    switch (type) {
        case 'buff':
        case 'debuff':
            pet.activeEffects.push({ name: skill.name, stat: stat, value: (type === 'debuff' ? -1 : 1) * value, type: type, turns: 3 });
            const icon = type === 'buff' ? '⬆️' : '⬇️';
            logMsg = `${icon} **${pet.name}**: ${type.toUpperCase()} ${stat.toUpperCase()} ${Math.round(value * 100)}% (3 turn).`;
            break;
        case 'heal':
            const heal = Math.floor(caster.getStats().HP * value);
            caster.currentHP = Math.min(caster.getStats().HP, caster.currentHP + heal);
            logMsg = `💚 **${caster.name}** hồi phục **${heal}** HP!`;
            break;
        case 'lifesteal':
            const steal = Math.floor(damageGained * value);
            caster.currentHP = Math.min(caster.getStats().HP, caster.currentHP + steal);
            logMsg = `🩸 **${caster.name}** hút **${steal}** HP từ sát thương!`;
            break;
        case 'dot': 
            pet.activeEffects.push({ name: skill.name, stat: 'hp', value: value, type: 'dot', turns: 3 });
            logMsg = `☠️ **${pet.name}** bị dính hiệu ứng đốt cháy (${Math.round(value*100)}% HP/turn)!`;
            break;
    }
    if(logMsg) logs.push(logMsg);
    return logs;
}

// ==========================================
// 3. SPAWN & GENERATION (UPDATED)
// ==========================================

/**
 * Áp dụng hệ số độ khó vào chỉ số Pet (HP, ATK, DEF, SATK).
 * @param {Pet} petInstance 
 * @param {number} multiplier 
 */
export function applyDifficultyMultiplier(petInstance, multiplier) {
    if (multiplier === 1.0) return petInstance;

    const newBaseStats = { ...petInstance.baseStats };
    
    // Áp dụng multiplier cho các chỉ số chiến đấu
    newBaseStats.HP = Math.round(newBaseStats.HP * multiplier);
    newBaseStats.ATK = Math.round(newBaseStats.ATK * multiplier);
    newBaseStats.SATK = Math.round(newBaseStats.SATK * multiplier);
    newBaseStats.DEF = Math.round(newBaseStats.DEF * multiplier);
    
    petInstance.baseStats = newBaseStats;
    
    // Scale level based on difficulty (nhân căn bậc hai)
    petInstance.level = Math.round(petInstance.level * Math.sqrt(multiplier)); 
    petInstance.level = Math.max(1, petInstance.level);

    // Cập nhật HP/MP hiện tại
    const currentStats = petInstance.getStats();
    petInstance.currentHP = currentStats.HP;
    petInstance.currentMP = currentStats.MP;
    
    return petInstance;
}

// --- CẤU HÌNH ĐỘ KHÓ CHO BOSS ---
const DIFFICULTY_MULTIPLIERS = {
    'dễ': 1,
    'bth': 3,
    'khó': 10,
    'siêu khó': 50,
    'ác quỷ': 250,
    'kẻ hủy diệt': 1000
};

// Hàm tạo Boss (Đã gộp logic cũ và mới, trả về Pet Class)
export function createBossPet(difficultyString = 'dễ') {
    // 1. Lấy hệ số nhân từ chuỗi độ khó (mặc định là 1 nếu không tìm thấy)
    const multiplier = DIFFICULTY_MULTIPLIERS[difficultyString] || 1;

    // 2. Chỉ số cơ bản của Boss (Template)
    const baseStatsTemplate = {
        HP: 50000,  // 50k máu cơ bản
        MP: 10000,
        ATK: 500,
        SATK: 500,
        DEF: 200,
        SPD: 50
    };

    // 3. Nhân chỉ số theo độ khó
    const finalStats = {
        HP: baseStatsTemplate.HP * multiplier,
        MP: baseStatsTemplate.MP * multiplier,
        ATK: baseStatsTemplate.ATK * (1 + multiplier * 0.1),
        SATK: baseStatsTemplate.SATK * (1 + multiplier * 0.1),
        DEF: baseStatsTemplate.DEF * (1 + multiplier * 0.2),
        SPD: baseStatsTemplate.SPD
    };

    // 4. Trả về NEW PET để BattleManager dùng được các hàm getStats, calculateStats
    return new Pet({
        id: `boss_${Date.now()}`,   
        name: `BOSS DRAGONOID [${difficultyString.toUpperCase()}]`,
        race: 'Dragon',
        rarity: 'Boss', // Rarity này giúp chặn bắt
        element: 'Fire',
        baseStats: finalStats,
        level: 99,
        skills: ['S1', 'S2', 'S3'],
        icon: '🐲',
        passive: 'BERSEKER',
        currentHP: finalStats.HP,
        currentMP: finalStats.MP
    });
}

// Hàm tạo Wild Pet
export function spawnWildPet(rarityKey = RARITY.COMMON) {
    const template = randomElement(PET_TEMPLATES);
    const element = randomElement(Object.values(ELEMENTS)); 
    const wildLevel = randomInt(1, 5);

    return new Pet({
        name: template.name,
        race: template.race,
        baseStats: { 
            HP: template.baseHP, MP: template.baseMP,
            ATK: template.baseATK, SATK: template.baseSATK, 
            DEF: template.baseDEF, SPD: template.baseSPD
        },
        element: element,
        rarity: rarityKey, 
        level: wildLevel,
        gen: randomInt(1, 100),
        icon: randomElement(EMOJIS.PET_ICONS),
        skills: getRandomSkills(rarityKey),
        passive: template.passive || null 
    });
}