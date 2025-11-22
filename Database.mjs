import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data'); // Đảm bảo đường dẫn tuyệt đối cho ổn định
const USER_FILE = path.join(DATA_DIR, 'users.json');
const MARKET_FILE = path.join(DATA_DIR, 'market.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json'); // [MỚI] File lưu cấu hình Server

// Cấu trúc dữ liệu mặc định
const DEFAULT_USER_DATA = {
    pets: [],
    inventory: {
        candies: { normal: 0, high: 0, super: 0, ultra: 0 }, // ĐÃ CẬP NHẬT: Thêm ULTRA
        potions: 0, 
        crates: { common: 0, mythic: 0 },
        skillBooks: []
    },
    gold: 1000,
    codesRedeemed: [],
    hasClaimedStarter: false,
    activePetIndex: 0, // ĐÃ CẬP NHẬT: Vị trí Pet đồng hành
    createdAt: 0
};

// [CẬP NHẬT CHO ARENA]
const DEFAULT_SERVER_CONFIG = {
    spawnChannelId: null,
    arenaChannelId: null, // [MỚI] ID kênh đấu trường
    difficulty: 'dễ' // Mặc định độ khó cho Server
};

// --- HÀM HỖ TRỢ ĐỌC/GHI (SỬ DỤNG LẠI TỪ CODE TRƯỚC) ---

const ensureDbFile = (filePath, defaultData = {}) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

const readJson = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Lỗi đọc file ${path.basename(filePath)}:`, e.message);
        return {};
    }
};

const writeJson = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Lỗi ghi file ${path.basename(filePath)}:`, e.message);
    }
};

// Đảm bảo thư mục và file tồn tại khi khởi động
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
ensureDbFile(USER_FILE, {});
ensureDbFile(MARKET_FILE, []);
ensureDbFile(CONFIG_FILE, { spawnChannelId: null });
ensureDbFile(SERVERS_FILE, {}); // Khởi tạo file Server

// ==========================================
// Bắt đầu Class Database
// ==========================================

export class Database {
    
    // --- USER DATA ---
    static getAllUserData() {
        return readJson(USER_FILE);
    }

    static saveAllUserData(data) {
        writeJson(USER_FILE, data);
    }

    static getUser(userId) {
        const allData = this.getAllUserData();
        let needsSave = false;
        
        if (!allData[userId]) {
            allData[userId] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
            allData[userId].createdAt = Date.now();
            needsSave = true;
        }
        
        // --- Migration & Cleanup ---
        const user = allData[userId];

        // Đảm bảo các fields quan trọng từ cấu trúc mới tồn tại (Migration)
        if (!user.inventory.candies.ultra) { user.inventory.candies.ultra = 0; needsSave = true; }
        if (user.activePetIndex === undefined) { user.activePetIndex = 0; needsSave = true; } 
        // ... (Giữ lại các migration logic khác nếu cần) ...
        
        if (needsSave) this.saveAllUserData(allData);
        
        return allData[userId];
    }

    static updateUser(userId, newData) {
        const allData = this.getAllUserData();
        allData[userId] = newData;
        this.saveAllUserData(allData);
    }

    static addPetToUser(userId, petData) {
        const user = this.getUser(userId);
        const petToSave = (petData.getDataForSave && typeof petData.getDataForSave === 'function') 
            ? petData.getDataForSave() 
            : petData;
        user.pets.push(petToSave);
        this.updateUser(userId, user);
    }

    // --- MARKET SYSTEM ---
    static getMarket() {
        return readJson(MARKET_FILE);
    }

    static saveMarket(data) {
        writeJson(MARKET_FILE, data);
    }

    static addListing(listing) {
        const market = this.getMarket();
        market.push(listing);
        this.saveMarket(market);
    }

    static removeListing(listingId) {
        let market = this.getMarket();
        market = market.filter(item => item.id !== listingId);
        this.saveMarket(market);
    }

    // --- [CẬP NHẬT] SERVER CONFIGURATION ---

    /**
     * Lấy cấu hình của Server theo ID.
     * Tự động gộp với DEFAULT để đảm bảo có field arenaChannelId
     */
    static getServerConfig(serverId) {
        const servers = readJson(SERVERS_FILE);
        const serverData = servers[serverId] || {};
        
        // [QUAN TRỌNG] Spread operator giúp gộp cấu hình hiện có với mặc định
        // Nếu server cũ chưa có 'arenaChannelId', nó sẽ lấy từ DEFAULT
        return { ...DEFAULT_SERVER_CONFIG, ...serverData };
    }

    /**
     * Cập nhật cấu hình của Server.
     */
    static updateServerConfig(serverId, serverData) {
        const servers = readJson(SERVERS_FILE);
        servers[serverId] = serverData;
        writeJson(SERVERS_FILE, servers);
    }

    // --- [MỚI] CÁC HÀM CHO ARENA ---

    /**
     * Thiết lập kênh đấu trường cho server
     * @param {string} serverId 
     * @param {string} channelId 
     */
    static setArenaChannel(serverId, channelId) {
        const config = this.getServerConfig(serverId);
        config.arenaChannelId = channelId;
        this.updateServerConfig(serverId, config);
    }

    /**
     * Lấy ID kênh đấu trường hiện tại
     * @param {string} serverId 
     * @returns {string|null}
     */
    static getArenaChannel(serverId) {
        const config = this.getServerConfig(serverId);
        return config.arenaChannelId;
    }

    // --- CONFIG FUNCTIONS (Global/Deprecated) ---
    static getConfig() {
        return readJson(CONFIG_FILE); 
    }

    static setSpawnChannel(channelId) {
        const config = this.getConfig();
        // [Lưu ý]: Nếu bạn muốn lưu spawnChannelId vào ServerConfig, bạn cần sửa hàm này.
        // Hiện tại: Vẫn lưu vào CONFIG_FILE (Global)
        config.spawnChannelId = channelId;
        writeJson(CONFIG_FILE, config);
    }
}