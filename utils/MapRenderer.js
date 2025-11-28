// utils/MapRenderer.js
import { createCanvas } from 'canvas';

export async function renderWorldMap(players, viewerId) {
    // Cấu hình Map
    const MAP_SIZE = 20;
    const CELL_SIZE = 40;
    const PADDING = 20; // Lề
    const WIDTH = MAP_SIZE * CELL_SIZE + (PADDING * 2);
    const HEIGHT = MAP_SIZE * CELL_SIZE + (PADDING * 2);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. Vẽ nền (Đất)
    ctx.fillStyle = '#2c3e50'; // Màu xanh đen đậm
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 2. Vẽ Grid (Lưới)
    ctx.strokeStyle = '#34495e'; // Màu kẻ ô
    ctx.lineWidth = 1;

    for (let i = 0; i <= MAP_SIZE; i++) {
        // Kẻ dọc
        ctx.beginPath();
        ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
        ctx.lineTo(PADDING + i * CELL_SIZE, HEIGHT - PADDING);
        ctx.stroke();

        // Kẻ ngang
        ctx.beginPath();
        ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
        ctx.lineTo(WIDTH - PADDING, PADDING + i * CELL_SIZE);
        ctx.stroke();
    }

    // 3. Vẽ Tọa độ (Số bên lề)
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < MAP_SIZE; i++) {
        // Số hàng dọc (Y)
        ctx.fillText(i, PADDING / 2, PADDING + i * CELL_SIZE + CELL_SIZE / 2);
        // Số hàng ngang (X)
        ctx.fillText(i, PADDING + i * CELL_SIZE + CELL_SIZE / 2, PADDING / 2);
    }

    // 4. Vẽ Người chơi
    for (const p of Object.values(players)) {
        if (!p.position) continue;
        
        const x = PADDING + p.position.x * CELL_SIZE;
        const y = PADDING + p.position.y * CELL_SIZE;

        // Màu sắc: Mình là Xanh lá, Địch là Đỏ
        const isMe = (p.id === viewerId);
        
        ctx.fillStyle = isMe ? '#2ecc71' : '#e74c3c';
        
        // Vẽ ô vuông đại diện cho thành trì
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Vẽ tên người chơi (Viết tắt 3 ký tự đầu)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        const shortName = p.username.substring(0, 3).toUpperCase();
        ctx.fillText(shortName, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
    }

    // 5. Thêm chú thích
    ctx.fillStyle = '#f1c40f';
    ctx.font = '14px sans-serif';
    ctx.fillText("WORLD MAP - EMPIRE AGE", WIDTH / 2, HEIGHT - 5);

    return canvas.toBuffer();
}