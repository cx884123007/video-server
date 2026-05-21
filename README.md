# 🎬 本地视频播放器

一个基于 Express.js 的局域网视频播放器服务，专为本地和家庭网络观影优化。

## ✨ 功能特性

- 📂 **文件夹导航** - 支持逐级点选浏览子文件夹，面包屑快速跳转
- 🎞️ **视频缩略图** - 自动使用 ffmpeg 生成视频缩略图
- ⏱️ **播放进度记忆** - 自动保存每个视频的观看位置，下次打开继续
- ⚡ **倍速播放** - 支持 1x / 1.25x / 1.5x / 2x 倍速
- ⌨️ **全键盘控制** - 空格/方向键/f/m/n/p/Esc 快捷键
- 📱 **局域网访问** - 同一网络下手机/平板/电视均可访问
- 🔄 **连续播放** - 播放完毕自动提示播放下一个
- 📊 **观看进度标记** - 视频卡片显示观看进度条

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 配置

编辑 `config.json`：
```json
{
  "videoPath": "./videos",      // 视频存放目录
  "port": 3000,                 // 服务端口
  "allowCors": true             // 是否允许跨域
}
```

### 启动服务

```bash
npm start
```

访问：`http://localhost:3000`

### 可选：安装 ffmpeg（用于生成缩略图）

**Windows:**
```bash
# 使用 scoop
scoop install ffmpeg

# 或使用 winget
winget install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `空格` | 播放/暂停 |
| `←` / `→` | 后退/快进 10 秒 |
| `↑` / `↓` | 音量增减 |
| `f` | 全屏切换 |
| `m` | 静音切换 |
| `n` | 下一集 |
| `p` | 上一集 |
| `Esc` | 关闭播放器 |

## 📁 项目结构

```
video-server/
├── server.js          # Express 服务器
├── config.json        # 配置文件
├── package.json       # 项目依赖
├── public/            # 前端静态资源
│   ├── index.html     # 主页面
│   ├── app.js         # 前端逻辑
│   └── style.css      # 样式文件
└── videos/            # 视频存放目录（自动创建）
    └── .thumbnails/   # 缩略图缓存（自动创建）
```

## 🌐 局域网访问

启动服务后，同一局域网内的设备可通过本机 IP 访问，例如：
`http://192.168.1.25:3000`

支持手机、平板、智能电视浏览器直接播放。

## 📝 说明

- 播放进度保存在浏览器 localStorage 中
- 缩略图自动生成并缓存到 `.thumbnails` 目录
- 无 ffmpeg 时自动降级为图标模式，不影响使用

## 📄 许可证

MIT
