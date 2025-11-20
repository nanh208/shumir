// SkillList.mjs
import { ELEMENTS, RARITY, RARITY_CONFIG } from './Constants.mjs';

export const SKILL_DATABASE = [
    // =============================================================
    // --- 1. PHYSICAL (VẬT LÝ) (50 SKILL) ---
    // (Giữ nguyên 50 skill vật lý đã xác nhận)
    // =============================================================
    { id: 'S1', name: 'Đấm Thường', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 0, power: 15, effect: null }, 
    { id: 'phy_01', name: 'Cào Cấu', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 5, power: 25, effect: null },
    { id: 'phy_02', name: 'Đột Kích Nhẹ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 8, power: 30, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.05 } },
    { id: 'phy_03', name: 'Lướt Gió', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 7, power: 28, effect: null },
    { id: 'phy_04', name: 'Gồng Nhẹ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 10, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.1 } },
    { id: 'phy_05', name: 'Đấm Mạnh', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 15, power: 40, effect: null },
    { id: 'phy_06', name: 'Thiết Giáp Nhỏ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.15 } },
    { id: 'phy_07', name: 'Tấn Công Liên Hoàn', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 25, power: 50, effect: null },
    { id: 'phy_08', name: 'Hất Tung Nhỏ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 28, power: 55, effect: null },
    { id: 'phy_09', name: 'Tê Tay', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 30, power: 60, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.1 } },
    { id: 'phy_10', name: 'Vỏ Cứng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 35, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.3 } },
    { id: 'phy_11', name: 'Giảm Kháng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 40, power: 65, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.2 } },
    { id: 'phy_12', name: 'Xuyên Giáp', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 50, power: 80, effect: null },
    { id: 'phy_13', name: 'Ném Đá Lớn', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 55, power: 85, effect: null },
    { id: 'phy_14', name: 'Thấu Xương', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 70, power: 100, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.25 } },
    { id: 'phy_15', name: 'Bền Bỉ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.3 } },
    { id: 'phy_16', name: 'Tấn Công Mù', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 90, power: 120, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.2 } },
    { id: 'phy_17', name: 'Kiệt Sức', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 120, power: 180, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.5 } },
    { id: 'phy_18', name: 'Sức Mạnh Rồng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 150, power: 200, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.4 } },
    { id: 'phy_19', name: 'Cuồng Bạo Tối Thượng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.MYTHIC, manaCost: 200, power: 300, effect: { type: 'debuff', target: 'self', stat: 'DEF', value: 0.3 } },
    { id: 'phy_20', name: 'Đạp', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 6, power: 22, effect: null },
    { id: 'phy_21', name: 'Thủ Thế', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 12, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.05 } },
    { id: 'phy_22', name: 'Hích', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 8, power: 28, effect: null },
    { id: 'phy_23', name: 'Phòng Ngự Nhẹ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 10, power: 0, effect: { type: 'buff', target: 'DEF', value: 0.05 } },
    { id: 'phy_24', name: 'Phản Đòn Yếu', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.COMMON, manaCost: 15, power: 35, effect: null },
    { id: 'phy_25', name: 'Cú Đấm Thép', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 20, power: 45, effect: null },
    { id: 'phy_26', name: 'Bổ Trợ Tấn Công', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 30, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.15 } },
    { id: 'phy_27', name: 'Tấn Công Chớp Nhoáng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 35, power: 65, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.1 } },
    { id: 'phy_28', name: 'Nghiền Nát Nhẹ', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 40, power: 70, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.1 } },
    { id: 'phy_29', name: 'Tự Chữa Trị', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 45, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.1 } },
    { id: 'phy_30', name: 'Luyện Kháng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.UNCOMMON, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'RES', value: 0.1 } },
    { id: 'phy_31', name: 'Đấm Trọng Lực', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 55, power: 90, effect: null },
    { id: 'phy_32', name: 'Bổ Trợ Phòng Ngự', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 60, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.25 } },
    { id: 'phy_33', name: 'Phá Lớp Giáp', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 65, power: 100, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.15 } },
    { id: 'phy_34', name: 'Hút Máu Cơ Bản', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 70, power: 110, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.2 } },
    { id: 'phy_35', name: 'Knockback', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 75, power: 120, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.25 } },
    { id: 'phy_36', name: 'Tăng Kháng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.RARE, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'RES', value: 0.2 } },
    { id: 'phy_37', name: 'Nghiền Nát Trung', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 95, power: 135, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.2 } },
    { id: 'phy_38', name: 'Phục Hồi Chiến Đấu', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 100, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.4 } },
    { id: 'phy_39', name: 'Sức Mạnh Vô Song', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 110, power: 150, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.3 } },
    { id: 'phy_40', name: 'Xé Toạc', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 120, power: 170, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.4 } },
    { id: 'phy_41', name: 'Phá Hủy', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.EPIC, manaCost: 130, power: 190, effect: null },
    { id: 'phy_42', name: 'Hút Máu Siêu Cấp', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 160, power: 220, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.5 } },
    { id: 'phy_43', name: 'Tái Tạo', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 180, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } },
    { id: 'phy_44', name: 'Bổ Trợ Kháng Tuyệt Đối', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 200, power: 0, effect: { type: 'buff', target: 'self', stat: 'RES', value: 0.4 } },
    { id: 'phy_45', name: 'Tuyệt Kỹ Vật Lý', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.LEGENDARY, manaCost: 220, power: 280, effect: null },
    { id: 'phy_46', name: 'Nghiền Nát Tối Thượng', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.MYTHIC, manaCost: 250, power: 350, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.4 } },
    { id: 'phy_47', name: 'Chiến Ý Thần Thánh', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.MYTHIC, manaCost: 300, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.8 } },
    { id: 'phy_48', name: 'Vũ Điệu Tử Thần', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.MYTHIC, manaCost: 320, power: 400, effect: { type: 'stunlock', target: 'enemy', value: 1 } },
    { id: 'phy_49', name: 'Cú Đấm Hư Không', type: 'Physical', element: ELEMENTS.PHYSICAL, rarity: RARITY.MYTHIC, manaCost: 350, power: 450, effect: null },

    
    // =============================================================
    // --- 2. FIRE (LỬA) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Fireball (Damage, Tiered Power)
    { id: 'fir_ball_1', name: 'Cầu Lửa I', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.COMMON, manaCost: 10, power: 30, weatherBonus: { element: ELEMENTS.FIRE, power: 0.15 } },
    { id: 'fir_ball_2', name: 'Cầu Lửa II', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.UNCOMMON, manaCost: 25, power: 60, weatherBonus: { element: ELEMENTS.FIRE, power: 0.18 } },
    { id: 'fir_ball_3', name: 'Cầu Lửa III', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.RARE, manaCost: 50, power: 100, weatherBonus: { element: ELEMENTS.FIRE, power: 0.2 } },
    { id: 'fir_ball_4', name: 'Cầu Lửa IV', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.EPIC, manaCost: 90, power: 160, weatherBonus: { element: ELEMENTS.FIRE, power: 0.22 } },
    { id: 'fir_ball_5', name: 'Cầu Lửa V', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.LEGENDARY, manaCost: 140, power: 240, weatherBonus: { element: ELEMENTS.FIRE, power: 0.25 } },

    // Concept 2: Burn Debuff (Damage over Time, Tiered DOT)
    { id: 'fir_dot_1', name: 'Thiêu Đốt I', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.COMMON, manaCost: 15, power: 40, effect: { type: 'dot', target: 'enemy', stat: 'HP', value: 0.03 } },
    { id: 'fir_dot_2', name: 'Thiêu Đốt II', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.UNCOMMON, manaCost: 30, power: 70, effect: { type: 'dot', target: 'enemy', stat: 'HP', value: 0.05 } },
    { id: 'fir_dot_3', name: 'Thiêu Đốt III', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.RARE, manaCost: 60, power: 110, effect: { type: 'dot', target: 'enemy', stat: 'HP', value: 0.08 } },
    { id: 'fir_dot_4', name: 'Thiêu Đốt IV', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.EPIC, manaCost: 110, power: 170, effect: { type: 'dot', target: 'enemy', stat: 'HP', value: 0.1 } },
    { id: 'fir_dot_5', name: 'Thiêu Đốt V', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.LEGENDARY, manaCost: 180, power: 250, effect: { type: 'dot', target: 'enemy', stat: 'HP', value: 0.15 } },

    // Concept 3: Fire Buff (Self-Buff SATK, Tiered Buff Power)
    { id: 'fir_buff_1', name: 'Hỏa Lực I', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.1 } },
    { id: 'fir_buff_2', name: 'Hỏa Lực II', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.UNCOMMON, manaCost: 35, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.15 } },
    { id: 'fir_buff_3', name: 'Hỏa Lực III', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.RARE, manaCost: 55, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.25 } },
    { id: 'fir_buff_4', name: 'Hỏa Lực IV', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.4 } },
    { id: 'fir_buff_5', name: 'Hỏa Lực V', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.LEGENDARY, manaCost: 120, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.6 } },

    // Concept 4: Defense Debuff (Enemy DEF Debuff, Tiered Debuff Power)
    { id: 'fir_debuff_1', name: 'Khử Nhiệt I', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.05 } },
    { id: 'fir_debuff_2', name: 'Khử Nhiệt II', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.UNCOMMON, manaCost: 45, power: 80, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.1 } },
    { id: 'fir_debuff_3', name: 'Khử Nhiệt III', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.RARE, manaCost: 70, power: 120, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.15 } },
    { id: 'fir_debuff_4', name: 'Khử Nhiệt IV', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.EPIC, manaCost: 100, power: 180, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.2 } },
    { id: 'fir_debuff_5', name: 'Khử Nhiệt V', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.LEGENDARY, manaCost: 150, power: 250, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.3 } },
    
    // Skill Độc Nhất (MYTHIC)
    { id: 'fir_ulti', name: 'PHỤNG HOÀNG LỬA', type: 'Magic', element: ELEMENTS.FIRE, rarity: RARITY.MYTHIC, manaCost: 300, power: 450, effect: { type: 'aoe', target: 'enemy', value: 1.0 } },


    // =============================================================
    // --- 3. WATER (NƯỚC) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Water Blast (Damage)
    { id: 'wat_blast_1', name: 'Bắn Nước I', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.COMMON, manaCost: 10, power: 30, weatherBonus: { element: ELEMENTS.WATER, power: 0.15 } },
    { id: 'wat_blast_2', name: 'Bắn Nước II', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.UNCOMMON, manaCost: 25, power: 60, weatherBonus: { element: ELEMENTS.WATER, power: 0.18 } },
    { id: 'wat_blast_3', name: 'Bắn Nước III', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.RARE, manaCost: 50, power: 100, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.05 } },
    { id: 'wat_blast_4', name: 'Bắn Nước IV', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.EPIC, manaCost: 90, power: 160, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.1 } },
    { id: 'wat_blast_5', name: 'Bắn Nước V', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.LEGENDARY, manaCost: 140, power: 240, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.15 } },

    // Concept 2: Heal (Tiered Heal Power)
    { id: 'wat_heal_1', name: 'Hồi Phục I', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.1 } },
    { id: 'wat_heal_2', name: 'Hồi Phục II', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.UNCOMMON, manaCost: 40, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.15 } },
    { id: 'wat_heal_3', name: 'Hồi Phục III', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.RARE, manaCost: 60, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.3 } },
    { id: 'wat_heal_4', name: 'Hồi Phục IV', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.EPIC, manaCost: 90, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.45 } },
    { id: 'wat_heal_5', name: 'Hồi Phục V', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.LEGENDARY, manaCost: 150, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } },

    // Concept 3: Defense Buff
    { id: 'wat_def_1', name: 'Khiên Nước I', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.COMMON, manaCost: 15, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.1 } },
    { id: 'wat_def_2', name: 'Khiên Nước II', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.UNCOMMON, manaCost: 30, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.15 } },
    { id: 'wat_def_3', name: 'Khiên Nước III', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.RARE, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.25 } },
    { id: 'wat_def_4', name: 'Khiên Nước IV', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.4 } },
    { id: 'wat_def_5', name: 'Khiên Nước V', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.LEGENDARY, manaCost: 120, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.6 } },

    // Concept 4: SATK Debuff
    { id: 'wat_debuff_1', name: 'Làm Ẩm I', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.COMMON, manaCost: 20, power: 45, effect: { type: 'debuff', target: 'enemy', stat: 'SATK', value: 0.05 } },
    { id: 'wat_debuff_2', name: 'Làm Ẩm II', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.UNCOMMON, manaCost: 40, power: 75, effect: { type: 'debuff', target: 'enemy', stat: 'SATK', value: 0.1 } },
    { id: 'wat_debuff_3', name: 'Làm Ẩm III', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.RARE, manaCost: 60, power: 110, effect: { type: 'debuff', target: 'enemy', stat: 'SATK', value: 0.15 } },
    { id: 'wat_debuff_4', name: 'Làm Ẩm IV', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.EPIC, manaCost: 100, power: 170, effect: { type: 'debuff', target: 'enemy', stat: 'SATK', value: 0.25 } },
    { id: 'wat_debuff_5', name: 'Làm Ẩm V', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.LEGENDARY, manaCost: 160, power: 230, effect: { type: 'debuff', target: 'enemy', stat: 'SATK', value: 0.4 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'wat_ulti', name: 'CƠN THỊNH NỘ ĐẠI DƯƠNG', type: 'Magic', element: ELEMENTS.WATER, rarity: RARITY.MYTHIC, manaCost: 300, power: 450, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } },


    // =============================================================
    // --- 4. GRASS (CỎ) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Vine Attack (Lifesteal)
    { id: 'gra_vine_1', name: 'Dây Leo I', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.COMMON, manaCost: 15, power: 40, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.1 } },
    { id: 'gra_vine_2', name: 'Dây Leo II', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.UNCOMMON, manaCost: 30, power: 70, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.15 } },
    { id: 'gra_vine_3', name: 'Dây Leo III', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.RARE, manaCost: 55, power: 110, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.25 } },
    { id: 'gra_vine_4', name: 'Dây Leo IV', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.EPIC, manaCost: 90, power: 170, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.35 } },
    { id: 'gra_vine_5', name: 'Dây Leo V', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.LEGENDARY, manaCost: 140, power: 240, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.5 } },
    
    // Concept 2: Defense Buff
    { id: 'gra_shield_1', name: 'Lá Chắn I', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.1 } },
    { id: 'gra_shield_2', name: 'Lá Chắn II', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.UNCOMMON, manaCost: 35, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.15 } },
    { id: 'gra_shield_3', name: 'Lá Chắn III', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.RARE, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.25 } },
    { id: 'gra_shield_4', name: 'Lá Chắn IV', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.4 } },
    { id: 'gra_shield_5', name: 'Lá Chắn V', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.LEGENDARY, manaCost: 120, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.6 } },

    // Concept 3: Poison Debuff
    { id: 'gra_poison_1', name: 'Phóng Độc I', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.05 } },
    { id: 'gra_poison_2', name: 'Phóng Độc II', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.UNCOMMON, manaCost: 45, power: 80, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.1 } },
    { id: 'gra_poison_3', name: 'Phóng Độc III', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.RARE, manaCost: 70, power: 120, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.15 } },
    { id: 'gra_poison_4', name: 'Phóng Độc IV', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.EPIC, manaCost: 100, power: 180, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.2 } },
    { id: 'gra_poison_5', name: 'Phóng Độc V', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.LEGENDARY, manaCost: 150, power: 250, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.3 } },

    // Concept 4: Speed Debuff
    { id: 'gra_slow_1', name: 'Trói Chân I', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.COMMON, manaCost: 15, power: 30, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.1 } },
    { id: 'gra_slow_2', name: 'Trói Chân II', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.UNCOMMON, manaCost: 30, power: 60, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.15 } },
    { id: 'gra_slow_3', name: 'Trói Chân III', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.RARE, manaCost: 50, power: 90, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.25 } },
    { id: 'gra_slow_4', name: 'Trói Chân IV', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.EPIC, manaCost: 80, power: 140, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.4 } },
    { id: 'gra_slow_5', name: 'Trói Chân V', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.LEGENDARY, manaCost: 120, power: 200, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.5 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'gra_ulti', name: 'CÂY TRƯỜNG SINH THỨC TỈNH', type: 'Magic', element: ELEMENTS.GRASS, rarity: RARITY.MYTHIC, manaCost: 350, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 1.0 } },


    // =============================================================
    // --- 5. ELECTRIC (ĐIỆN) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Damage
    { id: 'ele_zap_1', name: 'Giật Điện I', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.COMMON, manaCost: 12, power: 35, weatherBonus: { element: ELEMENTS.ELECTRIC, power: 0.15 } },
    { id: 'ele_zap_2', name: 'Giật Điện II', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.UNCOMMON, manaCost: 28, power: 65, weatherBonus: { element: ELEMENTS.ELECTRIC, power: 0.18 } },
    { id: 'ele_zap_3', name: 'Giật Điện III', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.RARE, manaCost: 55, power: 110, weatherBonus: { element: ELEMENTS.ELECTRIC, power: 0.2 } },
    { id: 'ele_zap_4', name: 'Giật Điện IV', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.EPIC, manaCost: 95, power: 180, weatherBonus: { element: ELEMENTS.ELECTRIC, power: 0.22 } },
    { id: 'ele_zap_5', name: 'Giật Điện V', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.LEGENDARY, manaCost: 145, power: 260, weatherBonus: { element: ELEMENTS.ELECTRIC, power: 0.25 } },

    // Concept 2: Speed Buff
    { id: 'ele_spd_1', name: 'Tăng Tốc I', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.COMMON, manaCost: 10, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.1 } },
    { id: 'ele_spd_2', name: 'Tăng Tốc II', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.UNCOMMON, manaCost: 25, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.2 } },
    { id: 'ele_spd_3', name: 'Tăng Tốc III', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.RARE, manaCost: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.3 } },
    { id: 'ele_spd_4', name: 'Tăng Tốc IV', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.EPIC, manaCost: 70, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.5 } },
    { id: 'ele_spd_5', name: 'Tăng Tốc V', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.LEGENDARY, manaCost: 100, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.8 } },

    // Concept 3: Stun Debuff (Chance to Stun/Disable)
    { id: 'ele_stun_1', name: 'Tê Liệt I', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.COMMON, manaCost: 20, power: 40, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.1 } },
    { id: 'ele_stun_2', name: 'Tê Liệt II', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.UNCOMMON, manaCost: 35, power: 70, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.25 } },
    { id: 'ele_stun_3', name: 'Tê Liệt III', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.RARE, manaCost: 65, power: 110, effect: { type: 'stunlock', target: 'enemy', value: 1 } },
    { id: 'ele_stun_4', name: 'Tê Liệt IV', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.EPIC, manaCost: 95, power: 170, effect: { type: 'stunlock', target: 'enemy', value: 1 } },
    { id: 'ele_stun_5', name: 'Tê Liệt V', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.LEGENDARY, manaCost: 140, power: 250, effect: { type: 'stunlock', target: 'enemy', value: 1 } },

    // Concept 4: SATK Buff
    { id: 'ele_satk_1', name: 'Điện Lực I', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.COMMON, manaCost: 15, power: 30, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.1 } },
    { id: 'ele_satk_2', name: 'Điện Lực II', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.UNCOMMON, manaCost: 30, power: 60, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.15 } },
    { id: 'ele_satk_3', name: 'Điện Lực III', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.RARE, manaCost: 50, power: 90, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.25 } },
    { id: 'ele_satk_4', name: 'Điện Lực IV', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.EPIC, manaCost: 80, power: 140, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.4 } },
    { id: 'ele_satk_5', name: 'Điện Lực V', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.LEGENDARY, manaCost: 120, power: 200, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.6 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'ele_ulti', name: 'THẦN SẤM VÔ HẠN', type: 'Magic', element: ELEMENTS.ELECTRIC, rarity: RARITY.MYTHIC, manaCost: 350, power: 500, effect: null },


    // =============================================================
    // --- 6. ICE (BĂNG) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Damage
    { id: 'ice_blast_1', name: 'Cục Băng I', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.COMMON, manaCost: 10, power: 30, weatherBonus: { element: ELEMENTS.ICE, power: 0.15 } },
    { id: 'ice_blast_2', name: 'Cục Băng II', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.UNCOMMON, manaCost: 25, power: 60, weatherBonus: { element: ELEMENTS.ICE, power: 0.18 } },
    { id: 'ice_blast_3', name: 'Cục Băng III', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.RARE, manaCost: 50, power: 100, weatherBonus: { element: ELEMENTS.ICE, power: 0.2 } },
    { id: 'ice_blast_4', name: 'Cục Băng IV', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.EPIC, manaCost: 90, power: 160, weatherBonus: { element: ELEMENTS.ICE, power: 0.22 } },
    { id: 'ice_blast_5', name: 'Cục Băng V', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.LEGENDARY, manaCost: 140, power: 240, weatherBonus: { element: ELEMENTS.ICE, power: 0.25 } },

    // Concept 2: Defense Buff
    { id: 'ice_def_1', name: 'Lá Chắn Băng I', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.1 } },
    { id: 'ice_def_2', name: 'Lá Chắn Băng II', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.UNCOMMON, manaCost: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.15 } },
    { id: 'ice_def_3', name: 'Lá Chắn Băng III', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.RARE, manaCost: 60, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.25 } },
    { id: 'ice_def_4', name: 'Lá Chắn Băng IV', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.EPIC, manaCost: 90, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.4 } },
    { id: 'ice_def_5', name: 'Lá Chắn Băng V', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.LEGENDARY, manaCost: 130, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.6 } },

    // Concept 3: ATK Debuff
    { id: 'ice_debuff_1', name: 'Sương Giá I', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.05 } },
    { id: 'ice_debuff_2', name: 'Sương Giá II', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.UNCOMMON, manaCost: 45, power: 80, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.1 } },
    { id: 'ice_debuff_3', name: 'Sương Giá III', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.RARE, manaCost: 70, power: 120, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.15 } },
    { id: 'ice_debuff_4', name: 'Sương Giá IV', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.EPIC, manaCost: 100, power: 180, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.2 } },
    { id: 'ice_debuff_5', name: 'Sương Giá V', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.LEGENDARY, manaCost: 150, power: 250, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.3 } },

    // Concept 4: Stun/Freeze
    { id: 'ice_stun_1', name: 'Tê Cóng I', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.COMMON, manaCost: 30, power: 60, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.1 } },
    { id: 'ice_stun_2', name: 'Tê Cóng II', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.UNCOMMON, manaCost: 50, power: 90, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.2 } },
    { id: 'ice_stun_3', name: 'Tê Cóng III', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.RARE, manaCost: 80, power: 130, effect: { type: 'stunlock', target: 'enemy', value: 1 } },
    { id: 'ice_stun_4', name: 'Tê Cóng IV', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.EPIC, manaCost: 120, power: 190, effect: { type: 'stunlock', target: 'enemy', value: 1 } },
    { id: 'ice_stun_5', name: 'Tê Cóng V', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.LEGENDARY, manaCost: 170, power: 270, effect: { type: 'stunlock', target: 'enemy', value: 1 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'ice_ulti', name: 'KỶ BĂNG HÀ HUỶ DIỆT', type: 'Magic', element: ELEMENTS.ICE, rarity: RARITY.MYTHIC, manaCost: 400, power: 550, effect: null },


    // =============================================================
    // --- 7. EARTH (ĐẤT) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Damage
    { id: 'ear_blast_1', name: 'Ném Đá I', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.COMMON, manaCost: 10, power: 30, weatherBonus: { element: ELEMENTS.EARTH, power: 0.15 } },
    { id: 'ear_blast_2', name: 'Ném Đá II', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.UNCOMMON, manaCost: 25, power: 60, weatherBonus: { element: ELEMENTS.EARTH, power: 0.18 } },
    { id: 'ear_blast_3', name: 'Ném Đá III', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.RARE, manaCost: 50, power: 100, weatherBonus: { element: ELEMENTS.EARTH, power: 0.2 } },
    { id: 'ear_blast_4', name: 'Ném Đá IV', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.EPIC, manaCost: 90, power: 160, weatherBonus: { element: ELEMENTS.EARTH, power: 0.22 } },
    { id: 'ear_blast_5', name: 'Ném Đá V', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.LEGENDARY, manaCost: 140, power: 240, weatherBonus: { element: ELEMENTS.EARTH, power: 0.25 } },

    // Concept 2: Defense Buff
    { id: 'ear_def_1', name: 'Giáp Đất I', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.1 } },
    { id: 'ear_def_2', name: 'Giáp Đất II', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.UNCOMMON, manaCost: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.2 } },
    { id: 'ear_def_3', name: 'Giáp Đất III', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.RARE, manaCost: 60, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.3 } },
    { id: 'ear_def_4', name: 'Giáp Đất IV', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.EPIC, manaCost: 90, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.5 } },
    { id: 'ear_def_5', name: 'Giáp Đất V', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.LEGENDARY, manaCost: 150, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.8 } },
    
    // Concept 3: Nuke/AOE (Speed Debuff Effect)
    { id: 'ear_nuke_1', name: 'Động Đất I', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.COMMON, manaCost: 30, power: 60, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.05 } },
    { id: 'ear_nuke_2', name: 'Động Đất II', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.UNCOMMON, manaCost: 55, power: 110, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.1 } },
    { id: 'ear_nuke_3', name: 'Động Đất III', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.RARE, manaCost: 90, power: 170, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.15 } },
    { id: 'ear_nuke_4', name: 'Động Đất IV', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.EPIC, manaCost: 140, power: 250, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.2 } },
    { id: 'ear_nuke_5', name: 'Động Đất V', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.LEGENDARY, manaCost: 200, power: 350, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 0.25 } },

    // Concept 4: HP Buff (High Tier Healing)
    { id: 'ear_heal_1', name: 'Sống Bền I', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.COMMON, manaCost: 15, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.15 } },
    { id: 'ear_heal_2', name: 'Sống Bền II', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.UNCOMMON, manaCost: 35, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.25 } },
    { id: 'ear_heal_3', name: 'Sống Bền III', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.RARE, manaCost: 55, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.4 } },
    { id: 'ear_heal_4', name: 'Sống Bền IV', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } },
    { id: 'ear_heal_5', name: 'Sống Bền V', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.LEGENDARY, manaCost: 100, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.6 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'ear_ulti', name: 'ĐỊA CHẤN THẦN LỰC', type: 'Magic', element: ELEMENTS.EARTH, rarity: RARITY.MYTHIC, manaCost: 400, power: 600, effect: null },


    // =============================================================
    // --- 8. WIND (GIÓ) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Speed Buff
    { id: 'win_spd_1', name: 'Gió Lốc I', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.COMMON, manaCost: 15, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.1 } },
    { id: 'win_spd_2', name: 'Gió Lốc II', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.UNCOMMON, manaCost: 30, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.2 } },
    { id: 'win_spd_3', name: 'Gió Lốc III', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.RARE, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.35 } },
    { id: 'win_spd_4', name: 'Gió Lốc IV', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.EPIC, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.5 } },
    { id: 'win_spd_5', name: 'Gió Lốc V', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.LEGENDARY, manaCost: 120, power: 0, effect: { type: 'buff', target: 'self', stat: 'SPD', value: 0.8 } },
    
    // Concept 2: Damage
    { id: 'win_nuke_1', name: 'Cơn Bão I', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.COMMON, manaCost: 20, power: 45, weatherBonus: { element: ELEMENTS.WIND, power: 0.15 } },
    { id: 'win_nuke_2', name: 'Cơn Bão II', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.UNCOMMON, manaCost: 40, power: 80, weatherBonus: { element: ELEMENTS.WIND, power: 0.18 } },
    { id: 'win_nuke_3', name: 'Cơn Bão III', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.RARE, manaCost: 70, power: 130, weatherBonus: { element: ELEMENTS.WIND, power: 0.2 } },
    { id: 'win_nuke_4', name: 'Cơn Bão IV', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.EPIC, manaCost: 120, power: 210, weatherBonus: { element: ELEMENTS.WIND, power: 0.22 } },
    { id: 'win_nuke_5', name: 'Cơn Bão V', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.LEGENDARY, manaCost: 200, power: 300, weatherBonus: { element: ELEMENTS.WIND, power: 0.25 } },

    // Concept 3: ATK Debuff
    { id: 'win_debuff_1', name: 'Hãm Gió I', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.05 } },
    { id: 'win_debuff_2', name: 'Hãm Gió II', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.UNCOMMON, manaCost: 45, power: 85, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.1 } },
    { id: 'win_debuff_3', name: 'Hãm Gió III', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.RARE, manaCost: 75, power: 140, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.15 } },
    { id: 'win_debuff_4', name: 'Hãm Gió IV', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.EPIC, manaCost: 110, power: 200, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.25 } },
    { id: 'win_debuff_5', name: 'Hãm Gió V', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.LEGENDARY, manaCost: 180, power: 280, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.4 } },

    // Concept 4: DEF Buff
    { id: 'win_def_1', name: 'Lá Chắn Gió I', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.COMMON, manaCost: 10, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.05 } },
    { id: 'win_def_2', name: 'Lá Chắn Gió II', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.UNCOMMON, manaCost: 25, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.1 } },
    { id: 'win_def_3', name: 'Lá Chắn Gió III', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.RARE, manaCost: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.2 } },
    { id: 'win_def_4', name: 'Lá Chắn Gió IV', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.EPIC, manaCost: 60, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.3 } },
    { id: 'win_def_5', name: 'Lá Chắn Gió V', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.LEGENDARY, manaCost: 100, power: 0, effect: { type: 'buff', target: 'self', stat: 'DEF', value: 0.4 } },
    
    // Skill Độc Nhất (MYTHIC)
    { id: 'win_ulti', name: 'PHONG ẤN HUỶ DIỆT', type: 'Magic', element: ELEMENTS.WIND, rarity: RARITY.MYTHIC, manaCost: 350, power: 450, effect: { type: 'debuff', target: 'enemy', stat: 'SPD', value: 1.0 } },


    // =============================================================
    // --- 9. LIGHT (ÁNH SÁNG) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Healing
    { id: 'lig_heal_1', name: 'Phục Hồi I', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.1 } },
    { id: 'lig_heal_2', name: 'Phục Hồi II', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.UNCOMMON, manaCost: 40, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.2 } },
    { id: 'lig_heal_3', name: 'Phục Hồi III', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.RARE, manaCost: 60, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.35 } },
    { id: 'lig_heal_4', name: 'Phục Hồi IV', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.EPIC, manaCost: 90, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.5 } },
    { id: 'lig_heal_5', name: 'Phục Hồi V', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.LEGENDARY, manaCost: 150, power: 0, effect: { type: 'heal', target: 'self', stat: 'HP', value: 0.6 } },

    // Concept 2: SATK Buff
    { id: 'lig_buff_1', name: 'Thánh Lực I', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.COMMON, manaCost: 30, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.1 } },
    { id: 'lig_buff_2', name: 'Thánh Lực II', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.UNCOMMON, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.15 } },
    { id: 'lig_buff_3', name: 'Thánh Lực III', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.RARE, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.25 } },
    { id: 'lig_buff_4', name: 'Thánh Lực IV', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.EPIC, manaCost: 120, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.4 } },
    { id: 'lig_buff_5', name: 'Thánh Lực V', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.LEGENDARY, manaCost: 180, power: 0, effect: { type: 'buff', target: 'self', stat: 'SATK', value: 0.5 } },

    // Concept 3: Damage
    { id: 'lig_damage_1', name: 'Thánh Quang I', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.COMMON, manaCost: 15, power: 40, weatherBonus: { element: ELEMENTS.LIGHT, power: 0.15 } },
    { id: 'lig_damage_2', name: 'Thánh Quang II', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.UNCOMMON, manaCost: 35, power: 75, weatherBonus: { element: ELEMENTS.LIGHT, power: 0.18 } },
    { id: 'lig_damage_3', name: 'Thánh Quang III', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.RARE, manaCost: 65, power: 125, weatherBonus: { element: ELEMENTS.LIGHT, power: 0.2 } },
    { id: 'lig_damage_4', name: 'Thánh Quang IV', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.EPIC, manaCost: 110, power: 200, weatherBonus: { element: ELEMENTS.LIGHT, power: 0.22 } },
    { id: 'lig_damage_5', name: 'Thánh Quang V', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.LEGENDARY, manaCost: 170, power: 300, weatherBonus: { element: ELEMENTS.LIGHT, power: 0.25 } },

    // Concept 4: Enemy Debuff (DEF)
    { id: 'lig_debuff_1', name: 'Tước Đoạt I', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.05 } },
    { id: 'lig_debuff_2', name: 'Tước Đoạt II', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.UNCOMMON, manaCost: 45, power: 85, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.1 } },
    { id: 'lig_debuff_3', name: 'Tước Đoạt III', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.RARE, manaCost: 75, power: 130, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.15 } },
    { id: 'lig_debuff_4', name: 'Tước Đoạt IV', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.EPIC, manaCost: 115, power: 210, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.25 } },
    { id: 'lig_debuff_5', name: 'Tước Đoạt V', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.LEGENDARY, manaCost: 160, power: 280, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.4 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'lig_ulti', name: 'THÁNH PHẠT VÔ SONG', type: 'Magic', element: ELEMENTS.LIGHT, rarity: RARITY.MYTHIC, manaCost: 450, power: 650, effect: null },


    // =============================================================
    // --- 10. DARK (BÓNG TỐI) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Lifesteal/DOT
    { id: 'dar_life_1', name: 'Hút Hồn I', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.COMMON, manaCost: 25, power: 40, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.1 } },
    { id: 'dar_life_2', name: 'Hút Hồn II', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.UNCOMMON, manaCost: 45, power: 75, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.15 } },
    { id: 'dar_life_3', name: 'Hút Hồn III', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.RARE, manaCost: 70, power: 120, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.25 } },
    { id: 'dar_life_4', name: 'Hút Hồn IV', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.EPIC, manaCost: 110, power: 190, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.35 } },
    { id: 'dar_life_5', name: 'Hút Hồn V', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.LEGENDARY, manaCost: 180, power: 280, effect: { type: 'lifesteal', target: 'self', stat: 'HP', value: 0.5 } },

    // Concept 2: Damage
    { id: 'dar_damage_1', name: 'Bóng Đêm I', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.COMMON, manaCost: 15, power: 35, weatherBonus: { element: ELEMENTS.DARK, power: 0.15 } },
    { id: 'dar_damage_2', name: 'Bóng Đêm II', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.UNCOMMON, manaCost: 35, power: 70, weatherBonus: { element: ELEMENTS.DARK, power: 0.18 } },
    { id: 'dar_damage_3', name: 'Bóng Đêm III', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.RARE, manaCost: 60, power: 115, weatherBonus: { element: ELEMENTS.DARK, power: 0.2 } },
    { id: 'dar_damage_4', name: 'Bóng Đêm IV', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.EPIC, manaCost: 100, power: 185, weatherBonus: { element: ELEMENTS.DARK, power: 0.22 } },
    { id: 'dar_damage_5', name: 'Bóng Đêm V', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.LEGENDARY, manaCost: 170, power: 270, weatherBonus: { element: ELEMENTS.DARK, power: 0.25 } },

    // Concept 3: ATK Debuff
    { id: 'dar_debuff_1', name: 'Ám Ảnh I', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.COMMON, manaCost: 30, power: 55, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.1 } },
    { id: 'dar_debuff_2', name: 'Ám Ảnh II', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.UNCOMMON, manaCost: 50, power: 90, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.15 } },
    { id: 'dar_debuff_3', name: 'Ám Ảnh III', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.RARE, manaCost: 80, power: 140, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.2 } },
    { id: 'dar_debuff_4', name: 'Ám Ảnh IV', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.EPIC, manaCost: 120, power: 200, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.3 } },
    { id: 'dar_debuff_5', name: 'Ám Ảnh V', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.LEGENDARY, manaCost: 170, power: 270, effect: { type: 'debuff', target: 'enemy', stat: 'ATK', value: 0.4 } },

    // Concept 4: Self Buff (Lifesteal Focus)
    { id: 'dar_buff_1', name: 'Máu Quỷ I', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.COMMON, manaCost: 20, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.1 } },
    { id: 'dar_buff_2', name: 'Máu Quỷ II', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.UNCOMMON, manaCost: 40, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.15 } },
    { id: 'dar_buff_3', name: 'Máu Quỷ III', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.RARE, manaCost: 65, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.25 } },
    { id: 'dar_buff_4', name: 'Máu Quỷ IV', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.EPIC, manaCost: 95, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.3 } },
    { id: 'dar_buff_5', name: 'Máu Quỷ V', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.LEGENDARY, manaCost: 150, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.4 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'dar_ulti', name: 'CHÚC PHÚC THẦN CHẾT', type: 'Magic', element: ELEMENTS.DARK, rarity: RARITY.MYTHIC, manaCost: 500, power: 700, effect: null },


    // =============================================================
    // --- 11. DRAGON (RỒNG) (21 SKILL RANKED) ---
    // =============================================================
    // Concept 1: Damage (Physical)
    { id: 'dra_phy_1', name: 'Long Trảo I', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.COMMON, manaCost: 15, power: 40, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.15 } },
    { id: 'dra_phy_2', name: 'Long Trảo II', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.UNCOMMON, manaCost: 30, power: 75, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.18 } },
    { id: 'dra_phy_3', name: 'Long Trảo III', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.RARE, manaCost: 60, power: 120, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.2 } },
    { id: 'dra_phy_4', name: 'Long Trảo IV', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.EPIC, manaCost: 100, power: 200, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.22 } },
    { id: 'dra_phy_5', name: 'Long Trảo V', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.LEGENDARY, manaCost: 160, power: 300, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.25 } },

    // Concept 2: Damage (Magic - Hơi Thở)
    { id: 'dra_mag_1', name: 'Hơi Thở Rồng I', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.COMMON, manaCost: 20, power: 45, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.15 } },
    { id: 'dra_mag_2', name: 'Hơi Thở Rồng II', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.UNCOMMON, manaCost: 40, power: 80, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.18 } },
    { id: 'dra_mag_3', name: 'Hơi Thở Rồng III', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.RARE, manaCost: 70, power: 130, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.2 } },
    { id: 'dra_mag_4', name: 'Hơi Thở Rồng IV', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.EPIC, manaCost: 120, power: 220, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.22 } },
    { id: 'dra_mag_5', name: 'Hơi Thở Rồng V', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.LEGENDARY, manaCost: 190, power: 340, weatherBonus: { element: ELEMENTS.DRAGON, power: 0.25 } },

    // Concept 3: Buff ATK/SATK
    { id: 'dra_buff_1', name: 'Long Lực I', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.COMMON, manaCost: 30, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.1 } },
    { id: 'dra_buff_2', name: 'Long Lực II', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.UNCOMMON, manaCost: 50, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.15 } },
    { id: 'dra_buff_3', name: 'Long Lực III', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.RARE, manaCost: 80, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.25 } },
    { id: 'dra_buff_4', name: 'Long Lực IV', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.EPIC, manaCost: 130, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.4 } },
    { id: 'dra_buff_5', name: 'Long Lực V', type: 'Physical', element: ELEMENTS.DRAGON, rarity: RARITY.LEGENDARY, manaCost: 190, power: 0, effect: { type: 'buff', target: 'self', stat: 'ATK', value: 0.5 } },

    // Concept 4: Defense Debuff
    { id: 'dra_debuff_1', name: 'Áp Lực Rồng I', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.COMMON, manaCost: 25, power: 50, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.05 } },
    { id: 'dra_debuff_2', name: 'Áp Lực Rồng II', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.UNCOMMON, manaCost: 45, power: 85, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.1 } },
    { id: 'dra_debuff_3', name: 'Áp Lực Rồng III', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.RARE, manaCost: 75, power: 140, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.15 } },
    { id: 'dra_debuff_4', name: 'Áp Lực Rồng IV', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.EPIC, manaCost: 115, power: 210, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.25 } },
    { id: 'dra_debuff_5', name: 'Áp Lực Rồng V', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.LEGENDARY, manaCost: 170, power: 280, effect: { type: 'debuff', target: 'enemy', stat: 'DEF', value: 0.3 } },

    // Skill Độc Nhất (MYTHIC)
    { id: 'dra_ulti', name: 'HOẢ LONG HUỶ DIỆT', type: 'Magic', element: ELEMENTS.DRAGON, rarity: RARITY.MYTHIC, manaCost: 550, power: 750, effect: null },
];

export function getSkillById(id) {
    return SKILL_DATABASE.find(s => s.id === id);
}

export function getRandomSkills(rarity) {
    const rarityOrder = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY, RARITY.MYTHIC];
    const petRarityIndex = rarityOrder.indexOf(rarity);

    const availableSkills = SKILL_DATABASE.filter(skill => {
        const skillRarityIndex = rarityOrder.indexOf(skill.rarity);
        // Pet chỉ được học skill có Rank bằng hoặc thấp hơn Rank của mình
        return skillRarityIndex <= petRarityIndex;
    });

    const defaultSkillId = 'S1';
    const potentialSkills = availableSkills.filter(s => s.id !== defaultSkillId); 
    
    const skillsToPick = 3;
    const shuffled = potentialSkills.sort(() => 0.5 - Math.random());
    
    const selectedSkills = shuffled.slice(0, Math.min(skillsToPick, shuffled.length));

    const finalSkills = [defaultSkillId].concat(selectedSkills.map(s => s.id));
    
    return finalSkills;
}