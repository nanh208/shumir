// GameLogic.mjs
import { Pet } from './Pet.mjs';
import { ELEMENT_ADVANTAGE, RARITY, RACES, ELEMENTS, RARITY_CONFIG } from './Constants.mjs';
import { getSkillById } from './SkillList.mjs';

// --- LOGIC SPAWN (XUẤT HIỆN) ---
export function spawnWildPet(isSpecialHour) {
    let rand = Math.random();
    let rarity = RARITY.COMMON; // Mặc định Common

    // Tỉ lệ random phẩm chất (Đã dùng RARITY_CONFIG thay vì hardcode)
    if (isSpecialHour) {
        rarity = Math.random() < 0.7 ? RARITY.LEGENDARY : RARITY.MYTHIC;
    } else {
        if (rand < 0.01) rarity = RARITY.MYTHIC;
        else if (rand < 0.02) rarity = RARITY.LEGENDARY;
        else if (rand < 0.06) rarity = RARITY.EPIC;
        else if (rand < 0.16) rarity = RARITY.RARE;
        else if (rand < 0.41) rarity = RARITY.UNCOMMON;
        else rarity = RARITY.COMMON;
    }

    const raceList = Object.values(RACES);
    const elemList = Object.values(ELEMENTS).filter(e => e !== 'Physical');
    
    const wildPet = new Pet({
        id: 'wild_' + Date.now(),
        rarity: rarity,
        race: raceList[Math.floor(Math.random() * raceList.length)],
        element: elemList[Math.floor(Math.random() * elemList.length)],
        gen: Math.floor(Math.random() * 100) + 1,
        level: Math.floor(Math.random() * 10) + 1,
    });
    
    // Cập nhật lại HP/MP ban đầu sau khi tạo Pet, tránh lỗi
    const finalStats = wildPet.getStats();
    wildPet.currentHP = finalStats.HP;
    wildPet.currentMP = finalStats.MP;
    
    return wildPet;
}

// --- LOGIC BẮT PET ---
export function tryCatchPet(wildPet, ballType) {
    // Sử dụng logic từ code bạn cung cấp (dựa trên RARITY_CONFIG)
    let baseRate = RARITY_CONFIG[wildPet.rarity]?.ballRate || 0.1; // Default 10%

    if (ballType === 'Legendary') return true; // Master Ball logic
    
    // Giả định bóng Common tăng 10%
    if (ballType === 'Common') baseRate += 0.1; 

    return Math.random() < baseRate;
}

// --- LOGIC COMBAT (PVP & PVE TURN) ---
export function calculateDamage(attacker, defender, skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return 0; // Đảm bảo skill tồn tại
    
    const aStats = attacker.getStats();
    const dStats = defender.getStats();

    // 1. Sức mạnh gốc (ATK hoặc SATK)
    let basePower = skill.type === 'Physical' ? aStats.ATK : aStats.SATK;
    
    // 2. Bonus cùng hệ (+20% SATK nếu là phép)
    if (skill.type === 'Magic' && attacker.element === skill.element) {
        basePower *= 1.2;
    }

    // 3. Khắc chế hệ (ELEMENT_ADVANTAGE phải là Map/Object chứa array)
    let typeMod = 1.0;
    const strengths = ELEMENT_ADVANTAGE[skill.element] || [];
    if (strengths.includes(defender.element)) {
        typeMod = 1.5; // Khắc hệ gây 150% dame
    }

    // 4. Tính sát thương: (Power * SkillPower / DefenderDEF) * Random(0.85 - 1.0)
    let damage = (basePower * skill.power / Math.max(1, dStats.DEF)) * typeMod;
    
    // Randomize chút xíu
    damage *= (0.85 + Math.random() * 0.15);
    
    // Đảm bảo không âm
    return Math.max(1, Math.floor(damage));
}

// --- LOGIC PVE (BOSS FIGHT) ---
export function calculatePvEResult(playerPet, bossPet) {
    const pOPS = playerPet.getOPS();
    const bOPS = bossPet.getOPS();

    // Điều kiện thua 1: Boss mạnh hơn 50%
    if (bOPS > pOPS * 1.5) {
        return { win: false, reason: "Boss quá mạnh (OPS > 150%)" };
    }

    // Điều kiện thua 2: Tỉ lệ xui xẻo 40% dù mạnh hơn
    if (pOPS >= bOPS && Math.random() < 0.4) {
        return { win: false, reason: "Bạn trượt chân té ngã (Xui xẻo 40%)" };
    }

    // Thắng
    return { win: true };
}