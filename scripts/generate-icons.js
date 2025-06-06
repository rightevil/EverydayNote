import fs from 'fs';
import path from 'path';

// 确保 public 目录存在
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// 生成 SVG 图标的函数
function generateSvgIcon(size, filename) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1677ff"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size/4}px" fill="white" text-anchor="middle" dominant-baseline="middle">每日一句</text>
</svg>`;

  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`${filename} generated`);
}

// 生成所有图标
generateSvgIcon(192, 'pwa-192x192.svg');
generateSvgIcon(512, 'pwa-512x512.svg');

// 生成简单的截图 SVG
const screenshot = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="768" viewBox="0 0 1024 768" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="768" fill="white"/>
  <text x="50%" y="50%" font-family="Arial" font-size="48px" fill="#1677ff" text-anchor="middle" dominant-baseline="middle">每日一句</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'screenshot-wide.svg'), screenshot);
console.log('screenshot-wide.svg generated'); 