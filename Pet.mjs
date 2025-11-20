// Pet.mjs
// Class Pet và logic tính chỉ số đã được chuyển sang GameLogic.mjs 
// để đồng bộ hóa với hệ thống Level và Khắc hệ mới (V2).
// File này đóng vai trò export lại để các file cũ (như index.js) hoạt động bình thường.

export { Pet } from './GameLogic.mjs';