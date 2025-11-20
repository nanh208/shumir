// Pet.mjs
import { BASE_CAPS, RARITY_CONFIG, RACE_BUFFS, EMOJIS, RARITY_COLORS } from './Constants.mjs';
import { SKILL_DATABASE } from './SkillList.mjs';

// Cần thêm currentHP vào constructor để theo dõi trong trận đấu
export class Pet {
    constructor(data) {
        this.id = data.id;
        this.ownerId = data.ownerId;
        this.name = data.name || "Wild Pet";
        this.icon = data.icon || EMOJIS.PET_ICONS[Math.floor(Math.random() * EMOJIS.PET_ICONS.length)];
        
        this.rarity = data.rarity; // Common...Mythic
        this.race = data.race; // Human...
        this.element = data.element; // Fire...
        
        this.gen = data.gen || 1; // 1 - 100
        this.level = data.level || 1;
        this.exp = data.exp || 0;
        
        this.allocatedStats = data.allocatedStats || { HP: 0, MP: 0, ATK: 0, SATK: 0, SPD: 0, DEF: 0 };
        
        this.baseStats = data.baseStats || { HP: 100, MP: 50, ATK: 10, SATK: 10, SPD: 10, DEF: 5 };
        
        // TRẠNG THÁI HIỆN TẠI (Quan trọng cho Battle)
        const finalHP = this.getStats().HP;
        this.currentHP = data.currentHP !== undefined ? data.currentHP : finalHP;
        this.currentMP = data.currentMP !== undefined ? data.currentMP : this.getStats().MP;
        
        // Skill Logic
        if (data.skills && data.skills.length > 0) {
            this.skills = data.skills;
        } else {
            this.skills = this.generateRandomSkills();
        }
    }

    generateRandomSkills() {
        const count = Math.floor(Math.random() * 3) + 2;
        const shuffled = SKILL_DATABASE.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(s => s.id);
    }

    learnSkill(newSkillId, slotIndex) {
        if (slotIndex < 0 || slotIndex > 3) return false;
        this.skills[slotIndex] = newSkillId;
        return true;
    }

    // Sửa lỗi: Đã import RARITY_COLORS
    getColor() {
        return RARITY_COLORS[this.rarity] || 0xFFFFFF;
    }
    

    // Tính toán chỉ số cuối cùng (Final Stats) - Giữ nguyên logic
    getStats() {
        const raceBuff = RACE_BUFFS[this.race] || {};
        const rarityBonus = RARITY_CONFIG[this.rarity]?.statCapBonus || 0;
        
        const genMultiplier = 1 + (this.gen / 100) * 0.1;

        let finalStats = {};

        for (let key in this.baseStats) { // Lặp qua các key trong baseStats
            let val = this.baseStats[key] + (this.allocatedStats[key] || 0);
            
            if (raceBuff[key]) val *= (1 + raceBuff[key]);
            
            val *= genMultiplier;
            
            // Đảm bảo BASE_CAPS[key] tồn tại
            let cap = (BASE_CAPS[key] || 0) + rarityBonus;
            
            finalStats[key] = Math.min(Math.floor(val), cap);
        }
        return finalStats;
    }

    // Lấy OPS - Giữ nguyên
    getOPS() {
        const s = this.getStats();
        return Math.floor((s.HP / 10) + (s.MP / 3) + s.ATK + s.SATK + (s.DEF * 2) + s.SPD);
    }

    // Logic lên cấp - Giữ nguyên
    addExp(amount) {
        const maxLv = RARITY_CONFIG[this.rarity]?.maxLv || 100;
        if (this.level >= maxLv) return "Max Level";

        this.exp += amount;
        let leveledUp = false;
        
        while (true) {
            let reqExp = Math.floor(1000 * Math.pow(1.15, this.level - 1));
            if (this.exp >= reqExp && this.level < maxLv) {
                this.exp -= reqExp;
                this.level++;
                leveledUp = true;
            } else {
                break;
            }
        }
        return leveledUp;
    }
    
    getDataForSave() {
        return {
            id: this.id,
            ownerId: this.ownerId,
            name: this.name,
            icon: this.icon,
            rarity: this.rarity,
            race: this.race,
            element: this.element,
            gen: this.gen,
            level: this.level,
            exp: this.exp,
            allocatedStats: this.allocatedStats,
            skills: this.skills,
            baseStats: this.baseStats,
            currentHP: this.currentHP, // Lưu HP và MP hiện tại
            currentMP: this.currentMP,
        };
    }
}