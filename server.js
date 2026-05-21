const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 读取配置
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// 检查ffmpeg是否可用
let ffmpegAvailable = false;
exec('ffmpeg -version', (error) => {
  ffmpegAvailable = !error;
  console.log(ffmpegAvailable ? '✅ ffmpeg已就绪，支持缩略图生成' : '⚠️ 未检测到ffmpeg，缩略图功能将禁用');
});

const app = express();

// 启用CORS
if (config.allowCors) {
  app.use(cors());
}

// 静态文件
app.use(express.static('public'));

// 视频文件服务
const videoDir = path.resolve(config.videoPath);
const thumbnailDir = path.join(videoDir, '.thumbnails');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
  console.log(`已创建视频目录: ${videoDir}`);
}

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// 获取本机IP
function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 递归扫描视频文件
function scanVideos(dir, baseDir = dir) {
  const results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === '.thumbnails') continue;
      results.push(...scanVideos(fullPath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'].includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath);
        results.push({
          name: relativePath,
          fileName: file,
          folder: path.dirname(relativePath) !== '.' ? path.dirname(relativePath) : '',
          size: formatFileSize(stat.size),
          mtime: stat.mtime.toISOString()
        });
      }
    }
  }

  return results;
}

// API: 获取视频列表
app.get('/api/videos', (req, res) => {
  try {
    const videos = scanVideos(videoDir);
    res.json({ success: true, videos, videoPath: videoDir });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 视频流服务
app.get('/video/:filename(*)', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filepath = path.join(videoDir, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('视频文件不存在');
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filepath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filepath).pipe(res);
  }
});

// API: 获取配置
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    videoPath: videoDir,
    port: config.port,
    ffmpegAvailable
  });
});

// 生成缩略图
function generateThumbnail(filename, callback) {
  const videoPath = path.join(videoDir, filename);
  const thumbnailPath = path.join(thumbnailDir, `${filename}.jpg`);

  if (fs.existsSync(thumbnailPath)) {
    return callback(null, thumbnailPath);
  }

  if (!ffmpegAvailable) {
    return callback(null, null);
  }

  const thumbnailDirPath = path.dirname(thumbnailPath);
  if (!fs.existsSync(thumbnailDirPath)) {
    fs.mkdirSync(thumbnailDirPath, { recursive: true });
  }

  const command = `ffmpeg -i "${videoPath}" -ss 00:00:03 -vframes 1 -q:v 2 -y "${thumbnailPath}"`;
  exec(command, (error) => {
    if (error) {
      callback(null, null);
    } else {
      callback(null, thumbnailPath);
    }
  });
}

// API: 获取视频缩略图
app.get('/thumbnail/:filename(*)', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const thumbnailPath = path.join(thumbnailDir, `${filename}.jpg`);

  if (fs.existsSync(thumbnailPath)) {
    res.sendFile(thumbnailPath);
  } else {
    generateThumbnail(filename, (err, generatedPath) => {
      if (generatedPath && fs.existsSync(generatedPath)) {
        res.sendFile(generatedPath);
      } else {
        res.status(404).send('暂无缩略图');
      }
    });
  }
});

// API: 打开视频文件夹
app.get('/api/open-folder', (req, res) => {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = `explorer "${videoDir}"`;
  } else if (platform === 'darwin') {
    command = `open "${videoDir}"`;
  } else {
    command = `xdg-open "${videoDir}"`;
  }

  exec(command, (error) => {
    res.json({ success: !error, platform });
  });
});

const PORT = config.port || 3000;
const localIP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🎬 视频网站已启动！');
  console.log('========================================');
  console.log(`\n📁 视频目录: ${videoDir}`);
  console.log(`\n🌐 访问地址:`);
  console.log(`   本机访问: http://localhost:${PORT}`);
  console.log(`   局域网访问: http://${localIP}:${PORT}`);
  console.log('\n📌 提示: 把视频文件放到上述目录即可观看');
  console.log('========================================\n');
});
