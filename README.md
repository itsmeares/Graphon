This project is still in development; any feedbacks, suggestions and contributions will be appreciated.

# Graphon

> A modern desktop application developed with TypeScript, featuring Apple-inspired aesthetics.

![Electron](https://img.shields.io/badge/Electron-v33-47848F?logo=electron)
![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)

## ✨ Features

- 🎨 **Modern Design Language**: SystemGray and SystemBackground color palettes.
- 🌓 **Dark/Light Mode**: Automatic synchronization with your system theme.
- ✍️ **Rich Text Editor**: Notion-style editor powered by Tiptap.
- 🕸️ **Interactive Graph View**: Visualize connections between your notes.
- 🔍 **Full-Text Search**: Instant search across all your content with FTS5.
- ✅ **Task Engine**: Integrated task management system.
- 📋 **Smart Templates**: Reusable templates with dynamic variables.
- 💡 **Callout Blocks**: Highlight important information with styled blocks.
- ⚡ **Slash Commands**: Quick access to editor features via `/`.
- 📝 **Floating Toolbar**: Dynamic toolbar that appears upon text selection.
- 📅 **Calendar**: Weekly/Monthly, hour-based calendar view.
- ✨ **Enhanced Glassmorphism**: High-quality blur effects for a premium feel.
- 🎭 **Compact Sidebar**: Compact menu that expands on hover.
- 💾 **Auto-Save**: Automatic data persistence using LocalStorage & SQLite.
- 🚀 **Smooth Animations**: Smooth modern transitions.
- 📐 **Notes Layout**: Centered content with the ability to edit.
- 🔷 **TypeScript**: Enhanced code quality with full type safety.
- 🔄 **Auto-Updates**: Automatically checks for and installs updates from GitHub.

## 🚀 Installation

### Prerequisites

- Node.js 18+
- npm

### Steps

```bash
# Clone the repository
git clone https://github.com/itsmeares/Graphon.git

# Navigate to the project directory
cd Graphon

# Install dependencies
npm install

# Start in development mode
npm run dev
```

## 📦 Build

### Production Build

```bash
npm run build
```

### Platform-Specific Build

```bash
npm run build:win      # Windows (.exe installer)
npm run build:mac      # macOS
npm run build:linux    # Linux
```

## 🎯 Usage

### Notes

1. Select **📄 Notes** from the left sidebar.
2. Start typing in the centered 800px editor area.
3. Select text to reveal the dynamic floating toolbar.
4. Add **Bold**, _Italic_, `Code`, Headings, and Lists.
5. Notes are automatically saved to your local storage.

**Toolbar Shortcuts:**

- **Bold**: `Ctrl+B`
- **Italic**: `Ctrl+I`
- **Headings**: Use H1, H2 buttons
- **Lists**: Bullet and Task list buttons

### Calendar

1. Select **📅 Calendar** from the left sidebar.
2. View your 7-day weekly schedule.
3. The current day is highlighted with a blue circle.
4. Time slots are displayed from 00:00 to 23:00.

### Dark Mode

- Click the **☀️/🌙** icon at the bottom of the sidebar.
- Alternatively, the app follows your system theme automatically.

## 🏗️ Project Structure

```
Graphon/
├── src/
│   ├── main/
│   │   └── index.ts              # Electron main process
│   ├── preload/
│   │   └── index.ts              # IPC bridge
│   └── renderer/
│       ├── index.html            # HTML entry point
│       └── src/
│           ├── types/
│           │   └── index.ts      # TypeScript type definitions
│           ├── components/
│           │   ├── Sidebar.tsx
│           │   ├── NotesView.tsx
│           │   └── CalendarView.tsx
│           ├── App.tsx            # Main application
│           ├── main.tsx           # React entry point
│           └── assets/
│               └── main.css       # Tailwind styles
├── .github/workflows/             # CI/CD (Auto-release)
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js
├── package.json
└── electron-builder.yml           # Build configuration
```

## 🛠️ Technology Stack

### Core

- **Framework**: Electron.js v33
- **UI Library**: React v19
- **Language**: TypeScript v5
- **Database**: SQLite (via better-sqlite3) & FTS5
- **ORM**: Drizzle ORM
- **Build Tool**: Electron Vite

### Styling

- **CSS Framework**: Tailwind CSS v4
- **Typography Plugin**: @tailwindcss/typography
- **Icons**: Heroicons & Lucide React
- **Font**: Inter (SF Pro alternative)

### Editor

- **Rich Text Editor**: Tiptap v2
- **Extensions**: StarterKit, Placeholder, Typography, TaskList, Image, Callout

## 🎨 Design System

### Colors

- **Light Mode**: SystemGray (1-6), SystemBackground
- **Dark Mode**: SystemGrayDark (1-6), SystemBackgroundDark
- **Accent**: SystemBlue (#007AFF light, #0A84FF dark)

### Typography

- **Font Family**: Inter, -apple-system, SF Pro Display
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Animations

- **Duration**: 400ms
- **Easing**: cubic-bezier(0.4, 0.0, 0.2, 1)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Graphon v0.1.9** - Modern, Minimalist, Masterful. 🚀
