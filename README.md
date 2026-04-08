# SonicCore BGM 版权检测 MVP

## 快速启动

双击运行 `start.bat` 即可启动服务，浏览器自动打开。

## 功能

- 手动输入歌曲名称 → 版权风险判断（LOW / MEDIUM / HIGH）
- 一键生成检测报告（HTML 可直接打印为 PDF）
- 历史报告记录

## 目录结构

```
soniccore-mvp/
├── server.js       # 后端服务
├── public/
│   └── index.html  # 前端界面
├── reports/        # 生成的报告（HTML）
└── start.bat      # 启动脚本
```

## 升级路线

1. 设置 `AUDD_API_TOKEN` 环境变量 → 启用真实音乐识别
2. 接入腾讯文档 → 自动建客户档案
3. 接入支付接口 → 在线收款

## 技术栈

- 前端：原生 HTML/CSS/JS（无框架）
- 后端：Node.js 原生 HTTP（无依赖）
- 报告：HTML（浏览器 Ctrl+P 可打印为 PDF）
