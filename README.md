# MS Teams Custom Linux Client

A custom, lightweight Electron-based wrapper for the official Microsoft Teams web application, specifically tailored for Linux users. This client bridges the gap between the web version and a native desktop experience by adding missing system integration features.

## Why this client?
Since Microsoft discontinued the official native Teams client for Linux, users have been forced to use browser tabs. This project restores the native feel with crucial desktop enhancements.

## Key Features
* **System Tray Integration** – Seamlessly minimize and restore the app to/from the system tray to keep your workspace clean.
* **Notification Badges** – Dynamic badge counters on the tray icon and taskbar for unread messages and incoming calls.
* **Lightweight Electron Wrapper** – Isolates Teams from your main browser, reducing memory overhead and tab clutter.

## Download & Installation

You can download the latest pre-compiled binaries from the [Releases](https://github.com) page.

| Format | Architecture | Download Link |
| :--- | :--- | :--- |
| **Debian / Ubuntu** (`.deb`) | amd64 | [Download .deb](https://github.com/latest/download/teams-client-0.2.2.amd64.deb) |
| **Fedora / RHEL** (`.rpm`) | x86_64 | [Download .rpm](https://github.com/latest/download/teams-client-0.2.2.x86_64.rpm) |
| **Universal Linux** (`.AppImage`) | x86_64 | [Download .AppImage](https://github.com/latest/download/teams-client-0.2.2.x86_64.AppImage) |

### Quick Start with AppImage
If you prefer not to install the package system-wide, use the AppImage:
```bash
chmod +x teams-client-0.2.2.x86_64.AppImage
./teams-client-0.2.2.x86_64.AppImage
```

## How to Build From Source

If you want to modify the code or build the project yourself, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18+ recommended) and `npm` installed.

### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd teams-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application in development mode:**
   ```bash
   npm start
   ```

4. **Build packages for Linux:**
   ```bash
   npm run dist
   ```
   *(Note: Adjust this command based on your actual `package.json` build scripts, e.g., `electron-builder`)*

## License
This project is open-source and available under the [MIT License](LICENSE).

---
*Disclaimer: This is an unofficial, community-driven project. Microsoft and Microsoft Teams are trademarks of Microsoft Corporation.*
