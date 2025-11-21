import { 
    PET_TEMPLATES, ELEMENTS, RARITY, 
    RARITY_CONFIG, RARITY_WEIGHTS, EMOJIS, LEVEL_CONFIG, ELEMENT_ADVANTAGE 
} from './Constants.mjs';
import { Pet } from './Pet.mjs'; 
import { getRandomSkills, getSkillById } from './SkillList.mjs';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// **********************************
// ⚡️ THÊM: HẰNG SỐ CRIT (Để chuẩn hóa)
// **********************************
const CRIT_RATE = 0.15; // 15% Crit rate
const CRIT_MULTIPLIER = 1.5; // 1.5x Crit Damage

// ==========================================
// 2. GAME FUNCTIONS
// ==========================================

export function calculateDamage(attacker, defender, skillId, currentWeather) { 
    const skill = getSkillById(skillId); 
    if (!skill) return { damage: 0, isCrit: false, multiplier: 1.0, weatherBonusApplied: false };
    
    const atkStats = attacker.getStats();
    const defStats = defender.getStats();

    // ⚡️ SỬA LỖI: Dùng skill.type thay vì skill.damageType
    const isPhysical = skill.type === 'Physical';
    
    const atkVal = isPhysical ? atkStats.ATK : atkStats.SATK;
    const defVal = defStats.DEF; 

    // Công thức Damage
    let damage = (atkVal * (skill.power || 1)) / Math.max(defVal, 1);
    damage *= (0.9 + Math.random() * 0.2); // Random variance 0.9 - 1.1

    let multiplier = 1.0;
    let weatherBonusApplied = false;
    let isCrit = Math.random() < CRIT_RATE; // Xác định Crit
    
    // Khắc hệ
    const adv = ELEMENT_ADVANTAGE[skill.element];
    if (adv) {
        if (adv.advantage.includes(defender.element)) multiplier *= 1.5; // Nhân thêm 1.5x
        else if (adv.disadvantage.includes(defender.element)) multiplier *= 0.5; // Nhân thêm 0.5x
    }
    
    // ⚡️ BỔ SUNG: Áp dụng sát thương chí mạng
    if (isCrit) {
        damage *= CRIT_MULTIPLIER;
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
        isCrit: isCrit, // Trả về trạng thái Crit đã tính
        multiplier: multiplier,
        weatherBonusApplied: weatherBonusApplied,
        skillEffect: skill.effect
    };
}

export function processSkillEffect(caster, target, skill, logs, damageGained = 0) { 
    if (!skill.effect) return logs;

    const effect = skill.effect;
    const stats = caster.getStats(); // Lấy stats hiện tại (stats.HP là Max HP)
    const targetObject = effect.target === 'self' ? caster : target;
    
    // 1. Xử lý HEAL (Hồi máu)
    if (effect.type === 'heal') {
        // ⚡️ SỬA LỖI: Đồng bộ hóa sử dụng effect.value (% HP Max)
        let healAmount = 0;
        if (effect.stat === 'HP') {
            healAmount = Math.floor(stats.HP * (effect.value || 0)); 
        }
        
        const oldHP = targetObject.currentHP;
        targetObject.currentHP = Math.min(stats.HP, targetObject.currentHP + healAmount);
        const actualHeal = targetObject.currentHP - oldHP;

        if (actualHeal > 0) {
            logs.push(`${targetObject.name} hồi phục **${actualHeal} HP** nhờ ${skill.name}!`);
        }
    }

    // 2. Xử lý BUFF (Tăng chỉ số)
    if (effect.type === 'buff') {
        if (!caster.buffs) caster.buffs = []; 
        
        // Thêm logic để kiểm tra và áp dụng Buff/Debuff (Giả định buff kéo dài 3 lượt nếu không định nghĩa)
        const newBuff = {
            name: skill.name,
            stat: effect.stat,   
            value: effect.value, 
            turns: effect.turns || 3 // Mặc định 3 lượt
        };
        
        caster.buffs.push(newBuff);
        logs.push(`${caster.name} nhận được **${skill.name}** (+${Math.floor(effect.value * 100)}% ${effect.stat}) trong ${newBuff.turns} lượt!`);
    }

    // 3. Xử lý DEBUFF / STUN (Giảm chỉ số hoặc Khống chế)
    if (effect.type === 'debuff' || effect.type === 'stunlock') {
        if (!target.debuffs) target.debuffs = []; 

        const chance = effect.chance || 1.0; 
        if (Math.random() < chance) {
            const newDebuff = {
                name: skill.name,
                stat: effect.stat, 
                type: effect.type,
                value: effect.value || 0,
                turns: effect.turns || 3 
            };
            target.debuffs.push(newDebuff);
            logs.push(`${target.name} bị dính hiệu ứng **${skill.name}**!`);
        } else {
            logs.push(`${target.name} đã kháng lại hiệu ứng của ${skill.name}!`);
        }
    }

    // 4. Xử lý LIFESTEAL (Hút máu - dựa trên damage gây ra)
    // ⚡️ SỬA LỖI: Đồng bộ hóa tên type thành 'lifesteal'
    if (effect.type === 'lifesteal' && damageGained > 0) {
        const vampAmount = Math.floor(damageGained * (effect.value || 0.1));
        if (vampAmount > 0) {
            // Đảm bảo không hồi quá Max HP
            caster.currentHP = Math.min(stats.HP, caster.currentHP + vampAmount); 
            logs.push(`${caster.name} hút **${vampAmount} HP** từ đối thủ!`);
        }
    }

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