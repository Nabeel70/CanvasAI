# CanvasAI: Open-Source AI-Powered Design Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Nabeel70/CanvasAI.svg)](https://github.com/Nabeel70/CanvasAI/stargazers)
[![CI/CD](https://github.com/Nabeel70/CanvasAI/workflows/CI/badge.svg)](https://github.com/Nabeel70/CanvasAI/actions)

CanvasAI is a fully self-hostable, MIT-licensed alternative to proprietary design platforms. It combines real-time collaborative editing, vector graphics, stock-asset management, and generative AI features into one seamless web application.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Nabeel70/CanvasAI.git
cd CanvasAI

# Install CanvasAI CLI
npm install -g @canvasai/cli

# Initialize and start development environment
canvasai init
canvasai start
```

## ✨ Features

- **Vector & Raster Editing**: Professional design tools with Fabric.js
- **AI-Powered Creation**: Smart templates, color harmony, vector tracing
- **Real-Time Collaboration**: CRDT-based sync with Yjs and WebRTC
- **Plugin Ecosystem**: Extensible architecture with community plugins
- **Export Flexibility**: SVG, PDF, PNG, JPEG, PSD support
- **Self-Hostable**: Complete ownership of your data and infrastructure

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + TailwindCSS + Fabric.js
- **Backend**: Go services with Encore framework
- **AI Services**: Python FastAPI with ONNX Runtime
- **Database**: PostgreSQL + MinIO + Redis
- **Collaboration**: Yjs CRDT + WebRTC/WebSocket

## 📖 Documentation

- [User Guide](./docs/user-guide.md)
- [Developer Documentation](./docs/developer-guide.md)
- [API Reference](./docs/api-reference.md)
- [Plugin Development](./docs/plugin-sdk.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

MIT License - see the [LICENSE](./LICENSE) file for details.

## 🎯 Roadmap

| Quarter | Features |
|---------|----------|
| Q4 '25  | Mobile React Native app, SVG animation tool |
| Q1 '26  | Offline PWA mode, team roles & permissions |
| Q2 '26  | Plugin marketplace UI, AI-driven tutorials |

## 💬 Community

- [Discord Server](https://discord.gg/canvasai)
- [GitHub Discussions](https://github.com/Nabeel70/CanvasAI/discussions)
- [Documentation](https://docs.canvasai.org)
