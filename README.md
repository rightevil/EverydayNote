# EverydayNote

## 项目描述
一个基于 PWA 技术的跨平台应用，可以在安卓和 iOS 上运行。

### 主要功能
1. **每日记录**
   - 记录每天的一句话
   - 支持文字、emoji、照片和视频
   - 离线可用

2. **数据同步**
   - 向远程服务端同步最近一周的数据
   - 可配置同步时间范围
   - 可设置服务端地址

3. **搭档功能**
   - 与指定 ID 的搭档绑定
   - 双向数据同步
   - 时间轴展示
   - 显示搭档信息和绑定天数

4. **个人中心**
   - 显示用户头像和 ID
   - 个人信息管理

### 技术栈
- PWA (Progressive Web App)
- React
- TypeScript
- Vite
- Antd Mobile
- IndexedDB (离线存储)

### 开发环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装和运行
```bash
# 安装依赖
npm install

# 开发环境运行
npm run dev

# 构建生产版本
npm run build
```

### 离线功能
- 应用支持完全离线使用
- 仅在同步时需要网络连接
- 使用 IndexedDB 进行本地数据存储

### 服务端要求
- 支持 Linux 或 Windows 系统
- 负责数据同步和分发
- 处理搭档绑定请求
