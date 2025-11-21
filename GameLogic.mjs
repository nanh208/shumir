// GameLogic.mjs
import { 
    PET_TEMPLATES, ELEMENTS, RARITY, 
    RARITY_CONFIG, RARITY_WEIGHTS, EMOJIS, LEVEL_CONFIG, ELEMENT_ADVANTAGE 
} from './Constants.mjs';
import { Pet } from './Pet.mjs'; 
import { getRandomSkills, getSkillById } from './SkillList.mjs';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 2. GAME FUNCTIONS
// ==========================================

export function calculateDamage(attacker, defender, skillId, currentWeather) { 
    const skill = getSkillById(skillId); 
    if (!skill) return { damage: 0, isCrit: false, multiplier: 1.0, weatherBonusApplied: false };
    
    const atkStats = attacker.getStats();
    const defStats = defender.getStats();

    // Dùng ATK hoặc SATK tùy loại skill
    const atkVal = skill.damageType === 'PHYSICAL' ? atkStats.ATK : atkStats.SATK;
    const defVal = defStats.DEF; 

    // Công thức Damage
    let damage = (atkVal * (skill.power || 1)) / Math.max(defVal, 1);
    damage *= (0.9 + Math.random() * 0.2); // Random variance 0.9 - 1.1

    let multiplier = 1.0;
    let weatherBonusApplied = false;
    
    // Khắc hệ
    const adv = ELEMENT_ADVANTAGE[skill.element];
    if (adv) {
        if (adv.advantage.includes(defender.element)) multiplier = 1.5; 
        else if (adv.disadvantage.includes(defender.element)) multiplier = 0.5;
    }

    // Thời tiết (Placeholder logic)
    if (skill.weatherBonus && currentWeather && currentWeather.buff.includes(skill.weatherBonus.element)) {
        multiplier *= 1.2;
        weatherBonusApplied = true;
    }

    damage *= multiplier;
    
    // Kiểm tra và sửa NaN/Inf
    if (isNaN(damage) || !isFinite(damage)) damage = 1;

    return { 
        damage: Math.max(1, Math.floor(damage)), 
        isCrit: Math.random() < 0.15, // 15% Crit rate
        multiplier: multiplier,
        weatherBonusApplied: weatherBonusApplied,
        skillEffect: skill.effect
    };
}

export function processSkillEffect(caster, target, skill, logs, damageGained = 0) { 
    // Logic xử lý hiệu ứng skill (Placeholder)
    return logs;
}

export function catchPetLogic(currentHP, maxHP, ballRate = 1.0) {
    const hpPercent = currentHP / maxHP;
    // HP càng thấp tỷ lệ bắt càng cao
    return Math.random() < ((1 - hpPercent) * ballRate);
}

export function createDungeonBoss(difficulty) {
    const template = PET_TEMPLATES[1]; // Dragonoid Template
    const diffLevelMap = { easy: 10, hard: 30, nightmare: 60 };
    const baseLevel = diffLevelMap[difficulty] || 1;
    
    return {
        name: `BOSS ${difficulty.toUpperCase()}`,
        race: template.race,
        element: template.element,
        rarity: RARITY.EPIC, 
        level: baseLevel * 2, 
        gen: 95,
        icon: '👑',
        skills: getRandomSkills(RARITY.EPIC),
        // ✅ FIX QUAN TRỌNG: Sử dụng key _Base để khớp với Pet.mjs
        baseStats: { 
            HP_Base: template.baseHP * 5, 
            MP_Base: template.baseMP * 2,
            ATK_Base: template.baseATK * 2, 
            SATK_Base: template.baseSATK * 2,
            DEF_Base: template.baseDEF * 2,
            SPD_Base: template.baseSPD 
        }
    };
}

// Hàm spawn Pet hoang dã
export function spawnWildPet(isVip = false, forceRarity = null) {
    let rarity = RARITY.COMMON;
    
    if (forceRarity) {
        rarity = forceRarity;
    } else if (isVip) {
        rarity = RARITY.MYTHIC; 
    } else {
        const rand = Math.random();
        let cumulative = 0;
        for (const rw of RARITY_WEIGHTS) {
            cumulative += rw.weight;
            if (rand < cumulative) { rarity = rw.rarity; break; }
        }
    }

    const template = randomElement(PET_TEMPLATES);
    const element = randomElement(Object.values(ELEMENTS)); 
    const wildLevel = randomInt(1, 10); // Level 1-10 cho wild pet

    return {
        name: template.name,
        race: template.race,
        element: element,
        rarity: rarity,
        level: wildLevel,
        gen: randomInt(1, 100),
        icon: randomElement(EMOJIS.PET_ICONS),
        skills: getRandomSkills(rarity),
        // ✅ FIX QUAN TRỌNG: Sử dụng key _Base để khớp với Pet.mjs
        // Giá trị mặc định phòng trường hợp template thiếu
        baseStats: { 
            HP_Base: template.baseHP || 1000,
            MP_Base: template.baseMP || 500,
            ATK_Base: template.baseATK || 100, 
            SATK_Base: template.baseSATK || 100, 
            DEF_Base: template.baseDEF || 50,
            SPD_Base: template.baseSPD || 100
        }
    };
}