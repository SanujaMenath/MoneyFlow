<div align="center">

<img src="desktop/public/MoneyFLow_Logo.png" alt="MoneyFlow Logo" width="80" />

# MoneyFlow

**A cross-platform financial ecosystem with seamless cloud synchronization.**

Manage your finances on Windows, macOS, Linux, Android, and iOS — perfectly synced, totally secure.

[![Version](https://img.shields.io/badge/version-1.6.0-blue?style=flat-square)](https://github.com/SanujaMenath/moneyflow/releases)
[![Status](https://img.shields.io/badge/status-release-green?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![CI](https://github.com/SanujaMenath/moneyflow/actions/workflows/ci.yml/badge.svg)](https://github.com/SanujaMenath/moneyflow/actions/workflows/ci.yml)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)

</div>

---

## Overview

MoneyFlow is a full-stack financial ecosystem built on a monorepo architecture. It provides a unified experience across desktop and mobile devices with real-time synchronization powered by Supabase.

All data is secured via **Supabase Auth** with Row Level Security and synchronized in real-time across all platforms using a centralized PostgreSQL database. Whether you are at your desk or on the move, your financial single source of truth is always with you.

---

## Features

- **Cloud Sync** — Seamless real-time synchronization between Desktop and Mobile apps.
- **Cross-Platform** — Native Windows, macOS, Linux via Tauri; Android and iOS via Expo.
- **Secure Authentication** — Personal accounts managed by Supabase Auth with Row Level Security (RLS).
- **Real-time Dashboard** — Instant visual updates of your balance and spending trends.
- **Local Migration** — Built-in bridge to migrate legacy local SQLite data to your cloud account.
- **Recurring Transactions** — Automate your weekly, monthly, or yearly entries.
- **Analytics & Insights** — Detailed category breakdowns and seasonal spending charts.
- **Savings Goals** — Track and manage your savings targets.

---

## Screenshots

### Desktop Client
![Desktop Dashboard](assets/desktop-dashboard.png)

### Mobile Client
Screenshots coming soon.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend / Database** | [Supabase](https://supabase.com) (PostgreSQL + Realtime) |
| **Authentication** | Supabase Auth with Row Level Security |
| **Desktop Framework** | [Tauri](https://tauri.app) 2.x (Rust + WebView) |
| **Desktop UI** | React 19 + TypeScript |
| **Desktop Bundler** | Vite 7 |
| **Desktop Styling** | Tailwind CSS 4 |
| **Desktop Charts** | Recharts |
| **Mobile Framework** | [Expo](https://expo.dev) SDK 54 (React Native 0.81) |
| **Mobile Navigation** | Expo Router (file-based) |
| **Mobile Charts** | react-native-svg |
| **Mobile Icons** | @expo/vector-icons (Ionicons) |
| **Shared** | TypeScript (monorepo workspaces) |

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Rust](https://rustup.rs) (stable toolchain) — required for Desktop
- [Tauri CLI prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) — required for Desktop
- [Android Studio](https://developer.android.com/studio) — required for Android builds
- [Xcode](https://developer.apple.com/xcode/) (macOS only) — required for iOS builds
- [Expo Go](https://expo.dev/client) — for mobile development on physical devices

### Desktop (Windows, macOS, Linux)

```bash
# Clone the repository
git clone https://github.com/SanujaMenath/moneyflow.git
cd moneyflow/desktop

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The compiled installer will be output to `src-tauri/target/release/bundle/`.

**Download pre-built installers** from the [Releases](https://github.com/SanujaMenath/moneyflow/releases) page:
- `MoneyFlow_x64-setup.exe` (Windows, NSIS installer)
- `MoneyFlow_x64_en-US.msi` (Windows, MSI installer)

### Android

```bash
cd moneyflow/mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Prebuild native project
npx expo prebuild --platform android

# Build release APK (arm64-v8a)
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a

# Or build release AAB for Play Store
./gradlew :app:bundleRelease -PreactNativeArchitectures=arm64-v8a
```

**Download pre-built APK/AAB** from the [Releases](https://github.com/SanujaMenath/moneyflow/releases) page.

### iOS (macOS only)

```bash
cd moneyflow/mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Prebuild native project
npx expo prebuild --platform ios

# Open in Xcode and archive for App Store
npx expo run:ios

# Or build for release
cd ios
xcodebuild -workspace MoneyFlowMobile.xcworkspace -scheme MoneyFlowMobile -configuration Release
```

**Note:** iOS builds require a macOS development environment with Xcode 16+ and an Apple Developer account.

---

## Build Instructions

### Project Structure

```
moneyflow/
├── desktop/                # Tauri + React app (Windows, macOS, Linux)
│   ├── src/                # Frontend UI (React, TypeScript)
│   ├── src-tauri/          # Rust backend, Tauri config
│   ├── .env.example        # Environment template
│   └── package.json
├── mobile/                 # Expo / React Native app (Android, iOS)
│   ├── app/                # Expo Router pages (file-based routing)
│   ├── components/         # Shared UI components
│   ├── context/            # React context providers
│   ├── lib/                # Supabase client, storage, platform utils
│   ├── services/           # Business logic & API calls
│   ├── .env.example        # Environment template
│   └── package.json
├── shared/                 # Shared TypeScript types (placeholder)
├── assets/                 # Screenshots and media
├── .github/workflows/      # CI/CD pipeline
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

### Desktop Build

```bash
cd desktop
npm install
npm run tauri build
```

The build produces:
- `MoneyFlow_x64-setup.exe` (NSIS installer)
- `MoneyFlow_x64_en-US.msi` (MSI installer)
- `moneyflow.exe` (standalone executable)

### Android Build

```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The build produces:
- `app-release.apk` (APK)
- `app-release.aab` (Android App Bundle)

### iOS Build

```bash
cd mobile
npm install
npx expo prebuild --platform ios
npx expo run:ios --configuration Release
```

The build produces an `.xcarchive` which can be exported as an IPA for App Store distribution.

---

## CI/CD

The project uses GitHub Actions for continuous integration. The CI pipeline:

1. **Lint & Typecheck** — Runs `tsc --noEmit` and `vite build` for Desktop
2. **Build Desktop** — Builds Tauri app on Ubuntu, Windows, and macOS
3. **Build Mobile Android** — Builds Android APK using `expo run:android --variant release`

---

## Roadmap

- [x] Initial Desktop Release (v1.0)
- [x] Supabase Cloud Integration
- [x] Real-time Sync Engine
- [x] Android Mobile Client
- [x] Local-to-Cloud Data Migration Bridge
- [ ] iOS Deployment (App Store)
- [ ] Shared Service Layer for business logic
- [ ] PDF Financial Report Generation
- [ ] AI-Powered Spending Predictions

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT &copy; 2026 [Sanuja Menath](https://github.com/SanujaMenath)

---

<div align="center">
  <sub>MoneyFlow &middot; Built with care by Sanuja Menath</sub>
</div>
