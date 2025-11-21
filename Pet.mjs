import { STAT_LIMITS, RACES, RARITY_CONFIG } from './Constants.mjs';

// **********************************
// ⚡️ FIX LỖI: Lấy hàm randomUUID từ module 'node:crypto' bằng import
// **********************************
import { randomUUID } from 'node:crypto'; // Sử dụng import cho ES Module

export class Pet {
    constructor(data) {
        // --- Thuộc tính cơ bản ---
        // FIX: Sử dụng randomUUID()
        this.id = data.id || randomUUID(); 
        
        this.ownerId = data.ownerId || null;
        this.name = data.name || 'Wild Pet';
        this.icon = data.icon || '❓';
        this.rarity = data.rarity || 'Common';
        this.race = data.race || 'Unknown';
        this.element = data.element || 'Physical';
        
        // **********************************
        // ⚡️ THÊM: Lore (Từ Gemini AI)
        // **********************************
        this.lore = data.lore || null;
        
        // --- Cấp độ & EXP ---
        this.level = Number(data.level) || 1;
        this.currentExp = Number(data.currentExp || data.xp) || 0;
        this.statPoints = Number(data.statPoints) || 0; 
        
        // --- Gen (0-100) ---
        this.gen = Number(data.gen) || Math.floor(Math.random() * 100) + 1;

        // --- Stats Bonus ---
        this.statBonus = data.statBonus || { hp: 0, mp: 0, atk: 0, satk: 0, def: 0, spd: 0 };

        // ============================================================
        // 🛠️ XỬ LÝ DỮ LIỆU BASE STATS VÀ SANITIZE
        // ============================================================
        let bs = data.baseStats || {};
        
        if (!bs.HP_Base && bs.HP) { // Xử lý dữ liệu cũ không có _Base
            bs = {
                HP_Base: bs.HP, MP_Base: bs.MP,
                ATK_Base: bs.ATK, SATK_Base: bs.SATK || bs.ATK,
                DEF_Base: bs.DEF, SPD_Base: bs.SPD || 100
            };
        }

        if (!bs.HP_Base) {
            this.baseStats = this.calculateInitialBaseStats(); // Đổi tên hàm để tránh nhầm lẫn
        } else {
            // Sanitize: Đảm bảo tất cả giá trị là SỐ (Tránh NaN)
            this.baseStats = {
                HP_Base: Number(bs.HP_Base) || 1000,
                MP_Base: Number(bs.MP_Base) || 500,
                ATK_Base: Number(bs.ATK_Base) || 100,
                SATK_Base: Number(bs.SATK_Base) || 100,
                DEF_Base: Number(bs.DEF_Base) || 50,
                SPD_Base: Number(bs.SPD_Base) || 100
            };
        }
        // ============================================================

        // --- Combat State ---
        this.currentStats = this.calculateStats();
        
        // Đảm bảo HP/MP hiện tại không bị NaN và không vượt quá Max HP/MP mới
        this.currentHP = (data.currentHP !== undefined && !isNaN(data.currentHP)) 
            ? Math.min(Number(data.currentHP), this.currentStats.HP) 
            : this.currentStats.HP;
        this.currentMP = (data.currentMP !== undefined && !isNaN(data.currentMP)) 
            ? Math.min(Number(data.currentMP), this.currentStats.MP) 
            : this.currentStats.MP;
        
        this.skills = data.skills || ['S1']; 
        
        // **********************************
        // ⚡️ THÊM: Trạng thái Buff/Debuff (Đồng bộ với GameLogic)
        // **********************************
        this.buffs = data.buffs || []; 
        this.debuffs = data.debuffs || []; 
    }
    
    getExpToNextLevel() {
        // Fallback an toàn nếu Constants chưa load
        const BASE_XP = STAT_LIMITS?.XP_BASE || 100;
        const MULTIPLIER = STAT_LIMITS?.XP_MULTIPLIER || 1.15;
        const MAX_LV = RARITY_CONFIG[this.rarity]?.maxLevel || 100;

        if (this.level >= MAX_LV) return 0;
        return Math.floor(BASE_XP * Math.pow(MULTIPLIER, this.level - 1));
    }

    // Đổi tên hàm để phản ánh chức năng (tính Base Stats ban đầu)
    calculateInitialBaseStats() {
        const raceData = RACES[this.race] || RACES['HUMAN'] || {};
        const raceBuff = raceData.buff || {};
        
        // Fallback an toàn cho STAT_LIMITS
        const HP_START = STAT_LIMITS?.HP_START || 200;
        const MP_START = STAT_LIMITS?.MP_START || 50;

        const hpBase = HP_START * (1 + (raceBuff.hp || 0));
        const mpBase = MP_START * (1 + (raceBuff.mp || 0));
        const base = 10; 
        
        return {
            HP_Base: Math.floor(hpBase),
            MP_Base: Math.floor(mpBase),
            ATK_Base: Math.floor(base * (1 + (raceBuff.atk || 0))),
            SATK_Base: Math.floor(base * (1 + (raceBuff.satk || 0))),
            DEF_Base: Math.floor(base * (1 + (raceBuff.def || 0))),
            SPD_Base: Math.floor(base * (1 + (raceBuff.spd || 0)))
        };
    }
    
    calculateStats() {
        // Fallback config
        const rarityConfig = RARITY_CONFIG[this.rarity] || RARITY_CONFIG['Common'];
        const rarityMultiplier = rarityConfig.statMultiplier || 1.0;
        
        const genMultiplier = (this.gen / 100) * 0.10; 
        
        const calculateStat = (base, statKey) => {
            // Đảm bảo base là số
            base = Number(base) || 10;

            // Công thức tăng trưởng: Base + (Base * Level * Rarity Multiplier * Gen Factor) + Point Bonus
            const growth = base * this.level * rarityMultiplier * (1 + genMultiplier);
            
            let pointBonus = this.statBonus[statKey] || 0;
            // Trọng số điểm thưởng (cố định)
            if (statKey === 'hp') pointBonus *= 20;
            else if (statKey === 'mp') pointBonus *= 10;
            else pointBonus *= 5;

            return Math.floor(base + growth + pointBonus);
        };

        return {
            HP: calculateStat(this.baseStats.HP_Base, 'hp'),
            MP: calculateStat(this.baseStats.MP_Base, 'mp'),
            ATK: calculateStat(this.baseStats.ATK_Base, 'atk'),
            SATK: calculateStat(this.baseStats.SATK_Base, 'satk'),
            DEF: calculateStat(this.baseStats.DEF_Base, 'def'),
            SPD: calculateStat(this.baseStats.SPD_Base, 'spd')
        };
    }
    
    getStats() {
        return this.calculateStats();
    }

    addExp(amount, pointsPerLevel = 3) {
        const currentMaxLevel = RARITY_CONFIG[this.rarity]?.maxLevel || 100;
        if (this.level >= currentMaxLevel) return false;
        
        let leveledUp = false;
        this.currentExp += amount;

        let nextLvExp = this.getExpToNextLevel();
        // Kiểm tra nextLvExp > 0 để tránh lặp vô tận
        while (nextLvExp > 0 && this.currentExp >= nextLvExp && this.level < currentMaxLevel) {
            this.currentExp -= nextLvExp;
            this.level++;
            this.statPoints += pointsPerLevel; 
            
            // Hồi máu/mana khi lên cấp
            this.currentStats = this.calculateStats(); 
            this.currentHP = this.currentStats.HP;
            this.currentMP = this.currentStats.MP;
            
            leveledUp = true;
            nextLvExp = this.getExpToNextLevel();
        }
        
        if (this.level >= currentMaxLevel) {
            this.level = currentMaxLevel;
            this.currentExp = 0;
        }
        
        return leveledUp;
    }
    
    incrementStat(statKey) {
        this.statBonus[statKey] = (this.statBonus[statKey] || 0) + 1;
        this.currentStats = this.calculateStats(); 
    }

    resetStats() {
        const totalStatPointsUsed = Object.values(this.statBonus).reduce((sum, val) => sum + val, 0);
        this.statBonus = { hp: 0, mp: 0, atk: 0, satk: 0, def: 0, spd: 0 };
        this.currentStats = this.calculateStats();
        return totalStatPointsUsed; 
    }

    learnSkill(skillId, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.skills.length) {
            this.skills[slotIndex] = skillId; 
        } 
        else if (this.skills.length < 4) {
            this.skills.push(skillId); 
        }
    }
    
    processTurnEffects() { return { log: [] }; }

    getDataForSave() {
        return {
            id: this.id, 
            ownerId: this.ownerId, 
            name: this.name, 
            icon: this.icon,
            rarity: this.rarity, 
            race: this.race, 
            element: this.element,
            level: this.level, 
            currentExp: this.currentExp,
            statPoints: this.statPoints,
            
            // **********************************
            // ⚡️ THÊM: Lưu Lore Pet
            // **********************************
            lore: this.lore,
            
            baseStats: this.baseStats, 
            statBonus: this.statBonus,
            
            currentHP: this.currentHP, 
            currentMP: this.currentMP,
            skills: this.skills,
            
            // **********************************
            // ⚡️ THÊM: Lưu trạng thái Buff/Debuff
            // **********************************
            buffs: this.buffs,
            debuffs: this.debuffs
        };
    }
}