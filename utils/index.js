// utils/index.js
const fs = require('fs');
const path = require('path');

// Hàm đọc file JSON an toàn
function readJSON(filePath) {
    try {
        // Đảm bảo đường dẫn tuyệt đối nếu cần
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
            const data = fs.readFileSync(absolutePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(`[Utils] Lỗi đọc file ${filePath}:`, e.message);
    }
    return {}; // Trả về object rỗng nếu lỗi hoặc không tìm thấy
}

// Hàm ghi file JSON an toàn
function writeJSON(filePath, data) {
    try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        const dir = path.dirname(absolutePath);
        
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`[Utils] Lỗi ghi file ${filePath}:`, e.message);
    }
}

module.exports = {
    readJSON,
    writeJSON
};