// GameLogic.mjs (UPDATED V2)
import { 
    PET_TEMPLATES, ELEMENTS, RARITY, 
    RARITY_CONFIG, RARITY_WEIGHTS, EMOJIS, LEVEL_CONFIG, ELEMENT_ADVANTAGE, PASSIVES, EVOLUTION_CHAINS 
} from './Constants.mjs';
import { getRandomSkills, getSkillById } from './SkillList.mjs';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 1. CLASS PET (NÂNG CẤP)
// ==========================================
export class Pet {
    constructor(data) {
        this.id = data.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.name = data.name;
        this.icon = data.icon || EMOJIS.PET_ICONS[0];
        
        this.element = data.element;
        this.race = data.race || 'Unknown';
        this.rarity = data.rarity;

        const defaults = { HP: 1000, MP: 500, ATK: 1000, DEF: 1000, SPD: 100, SATK: 1000 };
        this.baseStats = { ...defaults, ...data.baseStats };
        
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.maxLevel = RARITY_CONFIG[this.rarity].maxLv;
        
        this.skills = data.skills || getRandomSkills(this.rarity); 
        this.gen = data.gen || randomInt(1, 100);

        this.activeEffects = data.activeEffects || []; 

        // --- NEW: PASSIVE ---
        // Nếu data có passive thì lấy, không thì tìm trong Template, không có nữa thì random
        if (data.passive) {
            this.passive = data.passive;
        } else {
            const template = PET_TEMPLATES.find(t => t.name === this.name);
            this.passive = template?.passive || randomElement(Object.keys(PASSIVES));
        }

        this.currentStats = this.calculateStats();
        const finalStats = this.calculateFinalStats(); 
        this.currentHP = data.currentHP !== undefined ? data.currentHP : finalStats.HP;
        this.currentMP = data.currentMP !== undefined ? data.currentMP : finalStats.MP;
    }

    // ... (Giữ nguyên calculateStats và calculateFinalStats từ code cũ) ...
    calculateStats() {
       // (Copy code cũ vào đây để tiết kiệm chỗ hiển thị)
       const rConfig = RARITY_CONFIG[this.rarity] || RARITY_CONFIG['Common'];
       const multiplier = rConfig.statMultiplier; 
       const genFactor = 0.8 + (this.gen / 100) * 0.4; 
       const totalBonusPoints = (this.level - 1) * LEVEL_CONFIG.POINTS_PER_LEVEL;
       const b = this.baseStats;
       const safeHP = b.HP || 1000; const safeMP = b.MP || 500; const safeATK = b.ATK || 1000;
       const safeSATK = b.SATK || 1000; const safeDEF = b.DEF || 1000; const safeSPD = b.SPD || 100;
       const totalBase = safeHP + safeMP + safeATK + safeSATK + safeDEF + safeSPD;
       const calc = (baseVal) => {
           if (!baseVal) baseVal = 100;
           const ratio = baseVal / totalBase;
           const addedVal = totalBonusPoints * ratio;
           return Math.floor((baseVal + addedVal) * multiplier * genFactor);
       };
       return { HP: calc(safeHP), MP: calc(safeMP), ATK: calc(safeATK), SATK: calc(safeSATK), DEF: calc(safeDEF), SPD: calc(safeSPD) };
    }

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
        for (const key in finalStats) finalStats[key] = Math.max(1, finalStats[key] || 1);
        return finalStats;
    }

    // --- NÂNG CẤP: XỬ LÝ PASSIVE TRONG TURN ---
    processTurnEffects() {
        let turnLog = [];
        let newEffects = [];
        let totalDamage = 0;
        const maxHP = this.calculateFinalStats().HP; 
        
        // Xử lý Effect cũ
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

        // --- KÍCH HOẠT PASSIVE: REGEN ---
        if (this.passive === 'REGEN') {
            const heal = Math.floor(maxHP * 0.05);
            if (this.currentHP < maxHP && this.currentHP > 0) {
                this.currentHP = Math.min(maxHP, this.currentHP + heal);
                turnLog.push(`🌿 **${PASSIVES.REGEN.name}**: Hồi ${heal} HP.`);
            }
        }

        return { log: turnLog, damage: totalDamage };
    }
    
    // ... (Giữ nguyên addXp, getStats, getColor) ...
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
            const finals = this.calculateFinalStats();
            this.currentHP = finals.HP; 
            this.currentMP = finals.MP;
        }
        return leveledUp;
    }
    getStats() { return this.calculateFinalStats(); }
    getColor() { return RARITY_CONFIG[this.rarity]?.color || 0xFFFFFF; }

    // --- NÂNG CẤP: LƯU THÔNG TIN PASSIVE ---
    getDataForSave() {
        return {
            id: this.id, name: this.name, icon: this.icon,
            element: this.element, race: this.race, rarity: this.rarity,
            baseStats: this.baseStats,
            level: this.level, xp: this.xp, gen: this.gen,
            currentHP: this.currentHP, currentMP: this.currentMP,
            skills: this.skills, activeEffects: this.activeEffects,
            passive: this.passive // Lưu passive
        };
    }
}

// ==========================================
// 2. GAME FUNCTIONS (NÂNG CẤP LOGIC)
// ==========================================

export function calculateDamage(attacker, defender, skillId, currentWeather) { 
    const skill = getSkillById(skillId); 
    if (!skill) return { damage: 0, isCrit: false, multiplier: 1.0, weatherBonusApplied: false };
    
    const atkStats = attacker.getStats();
    const defStats = defender.getStats();

    const atkVal = skill.type === 'Physical' ? atkStats.ATK : atkStats.SATK;
    const defVal = defStats.DEF; 

    let damage = (atkVal * skill.power) / Math.max(defVal, 1);
    damage *= (0.9 + Math.random() * 0.2);

    // --- KÍCH HOẠT PASSIVE: BERSEKER (Tăng dame khi máu thấp) ---
    if (attacker.passive === 'BERSEKER' && (attacker.currentHP / atkStats.HP) < 0.3) {
        damage *= 1.5;
    }

    let multiplier = 1.0;
    let weatherBonusApplied = false;
    
    const adv = ELEMENT_ADVANTAGE[skill.element];
    if (adv) {
        if (adv.advantage.includes(defender.element)) multiplier = 1.5; 
        else if (adv.disadvantage.includes(defender.element)) multiplier = 0.5;
    }

    if (skill.weatherBonus && currentWeather && currentWeather.buff.includes(skill.weatherBonus.element)) {
        multiplier *= (1.0 + skill.weatherBonus.power);
        weatherBonusApplied = true;
    }

    damage *= multiplier;

    // --- KÍCH HOẠT PASSIVE: CRIT_MASTER ---
    let critChance = 0.15;
    if (attacker.passive === 'CRIT_MASTER') critChance += 0.20;

    const isCrit = Math.random() < critChance;
    if (isCrit) damage *= 1.5;

    // --- KÍCH HOẠT PASSIVE: EVASION (Né đòn) ---
    if (defender.passive === 'EVASION' && Math.random() < 0.10) {
        damage = 0; // Né hoàn toàn
    }

    // --- KÍCH HOẠT PASSIVE: VAMPIRISM (Hút máu) ---
    let vampHeal = 0;
    if (attacker.passive === 'VAMPIRISM' && damage > 0) {
        vampHeal = Math.floor(damage * 0.10);
        attacker.currentHP = Math.min(atkStats.HP, attacker.currentHP + vampHeal);
    }

    // --- KÍCH HOẠT PASSIVE: THORNS (Phản dame) ---
    let thornDamage = 0;
    if (defender.passive === 'THORNS' && damage > 0) {
        thornDamage = Math.floor(damage * 0.10);
        attacker.currentHP = Math.max(0, attacker.currentHP - thornDamage);
    }

    return { 
        damage: Math.floor(damage), 
        isCrit: isCrit,
        multiplier: multiplier,
        weatherBonusApplied: weatherBonusApplied,
        skillEffect: skill.effect,
        vampHeal: vampHeal, // Trả về để log
        thornDamage: thornDamage, // Trả về để log
        isEvaded: (defender.passive === 'EVASION' && damage === 0)
    };
}

// ... (Giữ nguyên processSkillEffect, catchPetLogic, createDungeonBoss) ...
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
    const template = PET_TEMPLATES[1]; 
    return new Pet({
        name: `BOSS ${template.name}`,
        race: template.race,
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
        skills: ['S5', 'S2', 'S4'],
        gen: 100,
        passive: 'BERSEKER' // Boss luôn có nội tại này
    });
}

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
        skills: getRandomSkills(rarity),
        passive: template.passive || null // Lấy passive từ template
    };
}