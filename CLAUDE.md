# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供操作本代码库的指导。

## 项目概述

这是一个使用 Express.js 构建的本地视频播放器服务，专为局域网视频播放优化。支持自动生成视频缩略图、播放进度记忆、全键盘控制等高级功能。

## 常用命令

- `npm start` 或 `npm dev`：启动视频服务器
- 服务器默认地址：`http://localhost:3000`
- 本项目未配置构建、代码检查或测试命令

## 架构说明

### 后端 ([server.js](server.js))
- 单文件 Express.js 服务器，核心接口：
  - `GET /api/videos` - 返回视频文件列表及元数据
  - `GET /video/:filename` - 流式传输视频文件，支持 HTTP Range 进度条拖拽
  - `GET /api/config` - 返回服务器配置和 ffmpeg 可用性
  - `GET /thumbnail/:filename` - 自动生成并返回视频缩略图（需 ffmpeg）
  - `GET /api/open-folder` - 在系统资源管理器中打开视频文件夹

- 自动创建视频目录和缩略图缓存目录
- 自动检测本机 IP 用于局域网访问
- 支持视频格式：mp4, mkv, avi, mov, wmv, flv, webm, m4v
- 缩略图生成依赖 ffmpeg（无 ffmpeg 时自动降级为图标模式）

### 前端 ([public/](public/))
- `index.html` - 响应式页面布局，包含播放器控制面板
- `app.js` - 客户端核心逻辑：
  - 播放进度自动保存到 localStorage
  - 继续上次播放位置
  - 全键盘快捷键支持
  - 播放速度调节（0.5x - 2x）
  - 上一集/下一集导航
  - URL hash 路由支持
- `style.css` - 深色主题现代化界面

### 配置文件 ([config.json](config.json))
- `videoPath`: 视频文件存储目录路径（默认：`./videos`）
- `port`: 服务器端口（默认：3000）
- `allowCors`: 启用/禁用 CORS 中间件

## 键盘快捷键

- `空格` - 播放/暂停
- `←` / `→` - 后退/快进 10 秒
- `↑` / `↓` - 音量增减
- `f` - 全屏切换
- `m` - 静音切换
- `n` - 下一集
- `p` - 上一集
- `Esc` - 关闭播放器

## 关键文件位置

- 服务器入口：[server.js](server.js)
- 配置文件：[config.json](config.json)
- 前端资源：[public/](public/)
- 视频目录：在 config.json 中配置（如缺失会自动创建）
- 缩略图缓存：视频目录下的 `.thumbnails` 文件夹

## 依赖要求

- Node.js 运行环境
- 可选：ffmpeg（用于生成视频缩略图）
