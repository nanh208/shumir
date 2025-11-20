// SkillList.js
import { ELEMENTS, RARITY } from './Constants.mjs';

/**
 * Cấu trúc Skill:
 * id, name, type (Physical/Magic), element, rarity, manaCost, power,
 * effect: { type: 'heal'|'buff'|'debuff', target: 'self'|'enemy', stat: 'HP'|'ATK'..., value: number (0.1 = 10%) }
 */

export const SKILL_DATABASE = [
    // --- 10 SKILL VẬT LÝ (COMMON - RARE) ---
    { id: 'phy_1', name: 'Cào Cấu', type: 'Physical', element: 'Physical', rarity: 'Common', mana: 5, power: 20, effect: null },
    { id: 'phy_2', name: 'Đấm Mạnh', type: 'Physical', element: 'Physical', rarity: 'Common', mana: 10, power: 30, effect: null },
    { id: 'phy_3', name: 'Thiết Đầu Công', type: 'Physical', element: 'Physical', rarity: 'Uncommon', mana: 15, power: 45, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.05 } },
    { id: 'phy_4', name: 'Chém Gió', type: 'Physical', element: 'Physical', rarity: 'Uncommon', mana: 15, power: 40, effect: null },
    { id: 'phy_5', name: 'Liên Hoàn Cước', type: 'Physical', element: 'Physical', rarity: 'Rare', mana: 30, power: 70, effect: null },
    { id: 'phy_6', name: 'Gồng Mình', type: 'Physical', element: 'Physical', rarity: 'Rare', mana: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.2 } },
    { id: 'phy_7', name: 'Vỏ Cứng', type: 'Physical', element: 'Physical', rarity: 'Uncommon', mana: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.3 } },
    { id: 'phy_8', name: 'Tấn Công Nhanh', type: 'Physical', element: 'Physical', rarity: 'Common', mana: 5, power: 25, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.1 } },
    { id: 'phy_9', name: 'Đập Đất', type: 'Physical', element: 'Physical', rarity: 'Rare', mana: 35, power: 60, effect: null },
    { id: 'phy_10', name: 'Cuồng Nộ', type: 'Physical', element: 'Physical', rarity: 'Epic', mana: 80, power: 100, effect: { type: 'debuff', target: 'self', stat: 'DEF', value: 0.2 } },

    // --- 50 SKILL NGUYÊN TỐ (Mẫu đại diện các hệ) ---
    
    // FIRE
    { id: 'fir_1', name: 'Đốm Lửa', type: 'Magic', element: 'Fire', rarity: 'Common', mana: 10, power: 25, effect: null },
    { id: 'fir_2', name: 'Cầu Lửa', type: 'Magic', element: 'Fire', rarity: 'Uncommon', mana: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'HP', value: 0.05 } }, // Burn
    { id: 'fir_3', name: 'Hỏa Ngục', type: 'Magic', element: 'Fire', rarity: 'Epic', mana: 80, power: 120, effect: null },
    { id: 'fir_4', name: 'Buff Nóng', type: 'Magic', element: 'Fire', rarity: 'Rare', mana: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.2 } },
    
    // WATER
    { id: 'wat_1', name: 'Bắn Nước', type: 'Magic', element: 'Water', rarity: 'Common', mana: 10, power: 20, effect: null },
    { id: 'wat_2', name: 'Thủy Triều', type: 'Magic', element: 'Water', rarity: 'Rare', mana: 40, power: 60, effect: null },
    { id: 'wat_3', name: 'Hồi Phục', type: 'Magic', element: 'Water', rarity: 'Epic', mana: 60, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.3 } }, // Heal 30%
    
    // GRASS
    { id: 'gra_1', name: 'Lá Bay', type: 'Magic', element: 'Grass', rarity: 'Common', mana: 10, power: 20, effect: null },
    { id: 'gra_2', name: 'Dây Leo', type: 'Magic', element: 'Grass', rarity: 'Uncommon', mana: 20, power: 35, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.2 } },
    { id: 'gra_3', name: 'Hút Nhựa Sống', type: 'Magic', element: 'Grass', rarity: 'Legendary', mana: 100, power: 80, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } }, // Hút máu

    // THUNDER
    { id: 'thu_1', name: 'Tia Điện', type: 'Magic', element: 'Thunder', rarity: 'Common', mana: 15, power: 30, effect: null },
    { id: 'thu_2', name: 'Sấm Sét', type: 'Magic', element: 'Thunder', rarity: 'Rare', mana: 50, power: 90, effect: null },
    { id: 'thu_3', name: 'Tê Liệt', type: 'Magic', element: 'Thunder', rarity: 'Epic', mana: 60, power: 40, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.5 } },

    // EARTH
    { id: 'ear_1', name: 'Ném Đá', type: 'Magic', element: 'Earth', rarity: 'Common', mana: 10, power: 25, effect: null },
    { id: 'ear_2', name: 'Giáp Đá', type: 'Magic', element: 'Earth', rarity: 'Rare', mana: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.4 } },
    { id: 'ear_3', name: 'Động Đất', type: 'Magic', element: 'Earth', rarity: 'Legendary', mana: 120, power: 150, effect: null },

    // AIR
    { id: 'air_1', name: 'Thổi Gió', type: 'Magic', element: 'Air', rarity: 'Common', mana: 10, power: 20, effect: null },
    { id: 'air_2', name: 'Cơn Lốc', type: 'Magic', element: 'Air', rarity: 'Rare', mana: 35, power: 60, effect: null },
    { id: 'air_3', name: 'Siêu Tốc', type: 'Magic', element: 'Air', rarity: 'Epic', mana: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.5 } },

    // ... (Thêm các skill khác để đủ số lượng 60)
];

export function getSkillById(id) {
    return SKILL_DATABASE.find(s => s.id === id);
}

export function getRandomSkills(count, maxRarityIndex) {
    // Logic lấy random skill dựa trên phẩm chất hòm/pet
    return SKILL_DATABASE.slice(0, count); // Mock
}