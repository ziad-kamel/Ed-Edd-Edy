# WhatsApp PDF Secure Redactor 🛡️

A powerful, automated WhatsApp bot designed to receive PDFs, dynamically redact sensitive information based on document content, and "flatten" the files via rasterization to ensure data security. Built with **Node.js**, **Baileys**, and **pdf-lib**.

---

## 🌟 Key Features

### 1. **Dynamic PDF Redaction**

- **Smart Detection**: Uses `pdf2json` to parse document structure and find specific text markers (e.g., Arabic labels) regardless of layout shifts.
- **Precise Overlays**: Automatically calculates coordinates to place aesthetic redaction boxes (Greenish headers, Greyish details) over sensitive data.

### 2. **Bulletproof Security (Flattening)**

- **Rasterization Flow**: Unlike standard redaction which just hides text, this bot converts the entire PDF page into a high-resolution (**300 DPI**) PNG image using `pdftoppm`.
- **Non-Recoverable**: The image is then re-embedded into a fresh PDF. This ensures the original text is physically removed and cannot be "copy-pasted" or recovered by reversing the layers.

### 3. **Smart Automation**

- **Duplicate Prevention**: Uses **SHA-256 fingerprinting** to ignore identical files even if they have different names.
- **Revoke Monitoring**: Watches for "Delete for Everyone" actions. If a user deletes a file during the processing delay, the bot cancels the task immediately.
- **Original Filename Retention**: Replies to users with the same filename they sent, maintaining professional consistency.

### 4. **Management Dashboard**

- A companion **Next.js Dashboard** to monitor bot status, control connection cycles, and view processing logs in real-time.

---

## 📂 Project Structure

```text
├── index.js                # Core connection & lifecycle management
├── bot-dashboard/          # Next.js web interface for bot control
├── src/
│   ├── config/
│   │   └── config.js       # Centralized settings (JIDs, Delays, Paths)
│   ├── handlers/
│   │   └── messageHandler.js # Coordination of download -> redact -> reply
│   └── utils/
│       ├── redact.js       # Dynamic coordinate logic & Rasterization
│       ├── fileManager.js  # SHA-256 hashing & filesystem operations
│       └── state.js        # Tracks live session state (revokes, etc.)
├── recived/                # Secure storage for incoming original PDFs
└── sent/                   # Log of processed/redacted PDF versions
```

---

## 🛠️ System Requirements

- **Node.js**: v16+
- **System Tool**: `pdftoppm` (Required for flattening).
  - _Ubuntu/Debian:_ `sudo apt-get install poppler-utils`
  - _MacOS:_ `brew install poppler`

---

## 🚀 Setup & Installation

1.  **Clone & Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Configuration**:
    Edit `src/config/config.js`:
    - `recipientJid`: The WhatsApp ID of the user/group to monitor.
    - `timeDelay`: How many seconds to wait before processing (gives users time to revoke errors).

3.  **Start the Application**:

    **Windows (Automated One-Click):**
    Double-click `run_project.bat`. This script will check for Node.js, sync dependencies for both the bot and the dashboard, and launch the web server.

    **Manual Terminal (Multi-platform):**

    ```bash
    # To run the web dashboard (recommended)
    cd bot-dashboard && npm run dev

    # To run the bot directly (no UI)
    node index.js
    ```

4.  **Authentication**:
    Scan the generated QR code in your terminal or dashboard using WhatsApp Linked Devices.

---

## 🛡️ Security Mechanisms

- **Metadata Strip**: The output PDF is generated as a brand new document, stripping away original metadata.
- **Sandbox Processing**: Temporary images used during rasterization are automatically deleted after a successful reply.
- **Loop Protection**: The bot ignores messages sent by itself to prevent infinite automated loops.

---

## ⚖️ License

This project is for private automation work. Ensure compliance with WhatsApp Terms of Service when deploying.
