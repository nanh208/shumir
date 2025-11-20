// GameLogic.mjs
import { 
    PET_TEMPLATES, ELEMENTS, RARITY, 
    RARITY_CONFIG, RARITY_WEIGHTS, EMOJIS, LEVEL_CONFIG, ELEMENT_ADVANTAGE 
} from './Constants.mjs';
import { getRandomSkills, getSkillById } from './SkillList.mjs';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 1. CLASS PET
// ==========================================
export class Pet {
    constructor(data) {
        this.id = data.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.name = data.name;
        this.icon = data.icon || EMOJIS.PET_ICONS[0];
        
        this.element = data.element;
        this.race = data.race || 'Unknown';
        this.rarity = data.rarity;

        // [FIX] Đảm bảo Base Stats luôn đầy đủ số, tránh NaN
        const defaults = { HP: 1000, MP: 500, ATK: 1000, DEF: 1000, SPD: 100, SATK: 1000 };
        // Merge defaults với data.baseStats
        this.baseStats = { ...defaults, ...data.baseStats };
        
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.maxLevel = RARITY_CONFIG[this.rarity].maxLv;
        
        this.skills = data.skills || getRandomSkills(this.rarity); 
        this.gen = data.gen || randomInt(1, 100);

        this.activeEffects = data.activeEffects || []; 

        this.currentStats = this.calculateStats();
        
        const finalStats = this.calculateFinalStats(); 
        this.currentHP = data.currentHP !== undefined ? data.currentHP : finalStats.HP;
        this.currentMP = data.currentMP !== undefined ? data.currentMP : finalStats.MP;
    }

    // --- HÀM TÍNH STATS (LOGIC PHÂN BỔ ĐIỂM) ---
    calculateStats() {
        const rConfig = RARITY_CONFIG[this.rarity] || RARITY_CONFIG['Common'];
        const multiplier = rConfig.statMultiplier; 
        const genFactor = 0.8 + (this.gen / 100) * 0.4; 

        // 1. Tính tổng điểm bonus từ Level (Mỗi level +25 điểm tổng vào Base)
        const totalBonusPoints = (this.level - 1) * LEVEL_CONFIG.POINTS_PER_LEVEL;

        // 2. Tính tổng Base Stats để chia tỷ lệ
        const b = this.baseStats;
        // Đảm bảo các giá trị b.* đều là số
        const safeHP = b.HP || 1000;
        const safeMP = b.MP || 500;
        const safeATK = b.ATK || 1000;
        const safeSATK = b.SATK || 1000;
        const safeDEF = b.DEF || 1000;
        const safeSPD = b.SPD || 100;

        const totalBase = safeHP + safeMP + safeATK + safeSATK + safeDEF + safeSPD;

        // 3. Hàm tính từng chỉ số
        const calc = (baseVal) => {
            if (!baseVal) baseVal = 100; // Fallback an toàn
            // Tỷ lệ phân bổ = BaseStat / Tổng Base
            const ratio = baseVal / totalBase;
            // Điểm cộng thêm = Tổng điểm bonus * Tỷ lệ
            const addedVal = totalBonusPoints * ratio;
            
            // Công thức: (Base + Điểm cộng thêm) * Rank * Gen
            return Math.floor((baseVal + addedVal) * multiplier * genFactor);
        };

        return {
            HP: calc(safeHP),
            MP: calc(safeMP), // MP giờ cũng scale theo level/rank
            ATK: calc(safeATK),
            SATK: calc(safeSATK),
            DEF: calc(safeDEF),
            SPD: calc(safeSPD)
        };
    }

    // --- HÀM TÍNH STATS CUỐI CÙNG (Áp dụng Buff/Debuff) ---
    calculateFinalStats() {
        const baseStats = this.calculateStats();
        let finalStats = { ...baseStats };

        this.activeEffects.forEach(effect => {
            if (effect.type === 'buff' || effect.type === 'debuff') {
                const statKey = effect.stat;
                if (finalStats[statKey] !== undefined) {
                     finalStats[statKey] = Math.floor(finalStats[statKey] * (1 + effect.value)); 
                }
            }
        });

        // Đảm bảo không âm và không NaN
        for (const key in finalStats) {
            finalStats[key] = Math.max(1, finalStats[key] || 1);
        }

        return finalStats;
    }

    // --- XỬ LÝ HIỆU ỨNG (DOT) ---
    processTurnEffects() {
        let turnLog = [];
        let newEffects = [];
        let totalDamage = 0;
        const maxHP = this.calculateFinalStats().HP; 
        
        this.activeEffects.forEach(effect => {
            if (effect.turns > 0) {
                if (effect.type === 'dot') {
                    const dotDamage = Math.floor(maxHP * effect.value);
                    this.currentHP = Math.max(0, this.currentHP - dotDamage);
                    totalDamage += dotDamage;
                    turnLog.push(`🔥 Mất ${dotDamage} HP do ${effect.name}.`);
                }
                effect.turns--;
                newEffects.push(effect);
            } else if (effect.turns === 0 && !effect.permanent) {
                 turnLog.push(`⏳ ${effect.name} đã kết thúc.`);
            } else {
                newEffects.push(effect);
            }
        });

        this.activeEffects = newEffects;
        return { log: turnLog, damage: totalDamage };
    }
    
    // --- LEVEL UP ---
    addXp(amount) {
        if (this.level >= this.maxLevel) return false;
        
        this.xp += amount;
        let leveledUp = false;
        
        let xpNeeded = Math.floor(LEVEL_CONFIG.BASE_XP * Math.pow(LEVEL_CONFIG.XP_MULTIPLIER, this.level - 1));

        while (this.xp >= xpNeeded && this.level < this.maxLevel) {
            this.xp -= xpNeeded;
            this.level++;
            leveledUp = true;
            xpNeeded = Math.floor(LEVEL_CONFIG.BASE_XP * Math.pow(LEVEL_CONFIG.XP_MULTIPLIER, this.level - 1));
        }

        if (leveledUp) {
            this.currentStats = this.calculateStats();
            // Hồi đầy máu/mana khi lên cấp
            const finals = this.calculateFinalStats();
            this.currentHP = finals.HP; 
            this.currentMP = finals.MP;
        }
        return leveledUp;
    }

    getStats() { return this.calculateFinalStats(); }
    getColor() { return RARITY_CONFIG[this.rarity]?.color || 0xFFFFFF; }

    getDataForSave() {
        return {
            id: this.id, name: this.name, icon: this.icon,
            element: this.element, race: this.race, rarity: this.rarity,
            baseStats: this.baseStats,
            level: this.level, xp: this.xp, gen: this.gen,
            currentHP: this.currentHP, currentMP: this.currentMP,
            skills: this.skills, activeEffects: this.activeEffects
        };
    }
}

// ==========================================
// 2. GAME FUNCTIONS
// ==========================================

export function calculateDamage(attacker, defender, skillId, currentWeather) { 
    const skill = getSkillById(skillId); 
    if (!skill) return { damage: 0, isCrit: false, multiplier: 1.0, weatherBonusApplied: false };
    
    const atkStats = attacker.getStats();
    const defStats = defender.getStats();

    // Dùng ATK hoặc SATK
    const atkVal = skill.type === 'Physical' ? atkStats.ATK : atkStats.SATK;
    const defVal = defStats.DEF; 

    // Công thức Damage
    let damage = (atkVal * skill.power) / Math.max(defVal, 1);
    damage *= (0.9 + Math.random() * 0.2);

    let multiplier = 1.0;
    let weatherBonusApplied = false;
    
    // Khắc hệ
    const adv = ELEMENT_ADVANTAGE[skill.element];
    if (adv) {
        if (adv.advantage.includes(defender.element)) multiplier = 1.5; 
        else if (adv.disadvantage.includes(defender.element)) multiplier = 0.5;
    }

    // Thời tiết
    if (skill.weatherBonus && currentWeather && currentWeather.buff.includes(skill.weatherBonus.element)) {
        multiplier *= (1.0 + skill.weatherBonus.power);
        weatherBonusApplied = true;
    }

    damage *= multiplier;

    return { 
        damage: Math.floor(damage), 
        isCrit: Math.random() < 0.15,
        multiplier: multiplier,
        weatherBonusApplied: weatherBonusApplied,
        skillEffect: skill.effect
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
            logMsg = `✨ ${pet.name}: ${type.toUpperCase()} ${stat} ${Math.round(value * 100)}% (3 turn).`;
            break;
        case 'heal':
            const heal = Math.floor(caster.getStats().HP * value);
            caster.currentHP = Math.min(caster.getStats().HP, caster.currentHP + heal);
            logMsg = `💖 ${caster.name} hồi ${heal} HP!`;
            break;
        case 'lifesteal':
            const steal = Math.floor(damageGained * value);
            caster.currentHP = Math.min(caster.getStats().HP, caster.currentHP + steal);
            logMsg = `💉 ${caster.name} hút ${steal} HP!`;
            break;
        case 'dot':
        case 'stunlock':
            pet.activeEffects.push({ name: skill.name, stat: stat, value: value, type: type, turns: 3 });
            logMsg = `⏳ ${pet.name} dính hiệu ứng ${type} (3 turn)!`;
            break;
    }
    logs.push(logMsg);
    return logs;
}

export function catchPetLogic(currentHP, maxHP, ballRate = 1.0) {
    const hpPercent = currentHP / maxHP;
    return Math.random() < ((1 - hpPercent) * ballRate);
}

export function createDungeonBoss(difficulty) {
    const template = PET_TEMPLATES[1]; // Dragonoid
    return new Pet({
        name: `BOSS ${template.name}`,
        race: template.race,
        // Boss mạnh gấp 5 lần HP, gấp 2 lần ATK/DEF
        baseStats: { 
            HP: template.baseHP * 5, 
            MP: template.baseMP * 2,
            ATK: template.baseATK * 2, 
            SATK: template.baseSATK * 2,
            DEF: template.baseDEF * 2,
            SPD: template.baseSPD 
        },
        element: ELEMENTS.DARK,
        rarity: RARITY.MYTHIC,
        level: difficulty * 10,
        skills: ['fir_ulti', 'dar_ulti', 'phy_19'],
        gen: 100
    });
}

// [FIX] Đảm bảo spawnWildPet truyền đủ Base Stats
export function spawnWildPet(isVip = false) {
    let rarity = RARITY.COMMON;
    if (isVip) rarity = RARITY.MYTHIC; 
    else {
        const rand = Math.random();
        let cumulative = 0;
        for (const rw of RARITY_WEIGHTS) {
            cumulative += rw.weight;
            if (rand < cumulative) { rarity = rw.rarity; break; }
        }
    }

    const template = randomElement(PET_TEMPLATES);
    const element = randomElement(Object.values(ELEMENTS)); 
    const wildLevel = randomInt(1, 5);

    return {
        name: template.name,
        race: template.race,
        // FIX: Truyền đầy đủ 6 chỉ số gốc
        baseStats: { 
            HP: template.baseHP || 1000,
            MP: template.baseMP || 500,
            ATK: template.baseATK || 1000, 
            SATK: template.baseSATK || 1000, 
            DEF: template.baseDEF || 1000,
            SPD: template.baseSPD || 100
        },
        element: element,
        rarity: rarity,
        level: wildLevel,
        gen: randomInt(1, 100),
        icon: randomElement(EMOJIS.PET_ICONS),
        skills: getRandomSkills(rarity)
    };
}