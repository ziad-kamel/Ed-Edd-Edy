# WhatsApp PDF Automation Bot

A robust, modular WhatsApp bot built using Baileys and Node.js. This bot is designed to automate the receiving, downloading, and replying of PDF documents with advanced safety and duplication checks.

## 🚀 Key Features

- **Modular Architecture**: Clean separation of concerns across config, handlers, and utilities.
- **PDF Automation**:
  - **Auto-Download**: Automatically detects and saves incoming PDF files to a dedicated `recived` folder.
  - **Auto-Reply**: Instantly sends a predefined local PDF file back to the sender.
- **Advanced Processing Logic**:
  - **Delayed Action**: Configurable wait time (currently 9s) before processing to allow for user corrections.
  - **Deletion Safety**: Detects if a sender revokes/deletes their file during the delay and cancels the task.
  - **Content Hash Check**: Uses **SHA-256 fingerprinting** to prevent downloading duplicate files, even if they have different filenames.
- **Infrastructure**:
  - **Persistent Auth**: Multi-file authentication state to avoid re-scanning the QR code.
  - **Stability**: Automatic reconnection logic and version spoofing to ensure 24/7 uptime.

## 📂 Project Structure

```text
├── index.js                # Entry point & connection lifecycle
├── src/
│   ├── config/
│   │   └── config.js       # Centralized settings (Paths, Delays, JIDs)
│   ├── handlers/
│   │   └── messageHandler.js # Logic for incoming messages & routing
│   ├── utils/
│   │   ├── fileManager.js  # File operations (Hashing, Saving, Reading)
│   │   └── state.js        # Tracks live state (e.g., deleted messages)
├── auth_info_baileys/      # Persistent session data
└── recived/                # Storage for incoming PDF files
```

## 🛠️ Installation & Usage

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Configuration**:
    Update `src/config/config.js` with your preferred paths and recipient information.

3.  **Run the Bot**:
    ```bash
    node index.js
    ```

## 🛡️ Safety Mechanisms

- **Loop Protection**: The bot is programmed to ignore its own messages, preventing infinite response loops.
- **Duplicate Detection**: Before saving any file, the bot compares the binary content hash against existing files in the `./recived` folder.
- **Deletion Hook**: Listens for `protocolMessage` updates to catch "Delete for everyone" actions in real-time.
