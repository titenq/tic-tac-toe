# Tic Tac Toe - WebRTC

![](https://img.shields.io/github/stars/titenq/tic-tac-toe-webrtc.svg) ![](https://img.shields.io/github/forks/titenq/tic-tac-toe-webrtc.svg) ![](https://img.shields.io/github/issues/titenq/tic-tac-toe-webrtc.svg)

A classic Tic Tac Toe multiplayer game built with React, TypeScript, and real-time peer-to-peer communication using WebRTC. Play against an opponent anywhere in the world!

## 🌐 Connectivity
- **WebRTC P2P**: Direct communication between players using PeerJS
- **Server-less**: Decentralized peer-to-peer connection
- **Automatic opponent matching**: Matching system based on room numbers

## 💬 Integrated Chat
- **Real-time chat**: Exchange text messages with your opponent during the game

## 🌍 Multilingual
- **Automatic language detection**: Detects your browser's language
- **Multiple language support**: i18n integration with i18next
- **English fallback**: Ensures experience in any locale

## ⚙️ Technologies
- **TypeScript**
- **ReactJS**
- **WebRTC**
- **PeerJS**

## 🚀 Getting Started

## Prerequisites
- Git
- Node.js

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/titenq/tic-tac-toe-webrtc.git
```

2. **Navigate to the project directory**
```bash
cd tic-tac-toe-webrtc
```

3. **Install dependencies**
```bash
npm install
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build and run for production
```bash
npm run build
npm run preview
```

## 📝 Notes

- The game requires two browsers/tabs or two devices to function
- WebRTC connection is P2P and does not store data on a server
- The score persists only during your browser session

## 🤝 Contributing

Feel free to open issues and pull requests for improvements!

---

## 📜 License

This project is licensed under the GPL3.0 License - see the [LICENSE](LICENSE.txt) file for details.
