# TickTick Quickadd Plugin for Obsidian

The **TickTick Quickadd Plugin** lets you quickly create tasks in TickTick directly from your Obsidian notes. Select a paragraph in any note, run a command or hotkey, and the plugin will:
- Prepend a `#ticktick` tag to your paragraph (to help you track which text has been sent as a task)
- Automatically append a unique block anchor so you can later jump directly back to that block
- Create a TickTick task with the paragraph text as the title and a clickable link that opens the note at that specific block using the Advanced URI plugin

## Features

- **Quick Task Creation:** Convert a selected paragraph into a TickTick task with one command.
- **Direct Linking:** Generate an Advanced URI link that takes you right back to the exact block in your note.
- **Secure OAuth Integration:** Uses TickTick’s OAuth with PKCE for secure authentication and supports token auto-refresh.
- **User-Friendly Settings:** Enter your TickTick API credentials securely and connect with just a few clicks.

## Installation

1. **Install Advanced URI Plugin:**
   - Go to **Settings → Community Plugins** in Obsidian.
   - Search for **Advanced URI**, install it, and then enable it.

2. **Install TickTick Quickadd Plugin:**
   - Download or clone the repository:  
     `git clone https://github.com/yourusername/ticktick-quickadd-plugin.git`
   - Open a terminal in the repository folder and run:
     ```bash
     npm install
     npm run build
     ```
   - Copy the generated files (e.g., `main.js`, `manifest.json`, and `settings.js`) into your vault’s plugins folder:
     ```
     YourVault/.obsidian/plugins/ticktick-quickadd-plugin/
     ```
   - In Obsidian, go to **Settings → Community Plugins**, disable Safe Mode if necessary, and enable the TickTick Quickadd Plugin.

## Setup

1. **Configure API Credentials:**
   - Open the plugin settings in Obsidian (Settings → Community Plugins → TickTick Quickadd Plugin → Settings).
   - Enter your **Client ID** and **Client Secret**.  
     (To get these, sign in to the [TickTick Developer Portal](https://developer.ticktick.com/) and follow their “Get Started” instructions.)
   - **Note:** Your Client Secret input is masked for security.

2. **Connect to TickTick:**
   - In the settings, click **Connect to TickTick**.
   - Your browser will open the OAuth authorization URL. Log in to TickTick and authorize the plugin.
   - After authorizing, you'll be directed to a page with an authorization code.
     - **Tip:** It might take more than one attempt to retrieve the code. (This can happen due to network timing or OAuth quirks.)
   - Copy the authorization code and paste it into the **Authorization Code** field in the plugin settings.
     - Again, you might need to try a couple of times before it works.
   - Once connected, you’ll receive a notice that the access token was obtained successfully.

3. **Configure Hotkeys:**
   - In Obsidian’s **Settings → Hotkeys**, scroll down to your TickTick Quickadd Plugin.
   - Assign a keyboard shortcut (e.g., Ctrl+Alt+T) to the command **"Create TickTick Task from Paragraph"**.

## Using the Plugin

1. In a note, select a paragraph or place your cursor within the paragraph you want to send as a task.
2. Run the **"Create TickTick Task from Paragraph"** command (via your assigned hotkey).
3. The plugin will:
   - Prepend `#ticktick` to the beginning of your paragraph.
   - Automatically append a unique block anchor to the end.
   - Create a TickTick task with the paragraph text as the task title and include a clickable link in the task description.
4. **Important:** Do not remove the block anchor (the part that starts with `^`); otherwise, the Advanced URI link in the TickTick task will break.

## Troubleshooting & Testing
  
- **Invalid Credential Handling:**  
  If you enter an invalid Client ID or Secret, the OAuth flow will fail. Make sure your credentials are correct and match those in the TickTick Developer Portal.

- **Network Failure Recovery:**  
  The plugin has try/catch blocks. If you experience a network failure, an error notice will appear. Reconnect when your connection is stable.

- **Special Character Handling:**  
  The plugin encodes task titles and descriptions in JSON. Test by including emojis or symbols to ensure they appear correctly in TickTick.

- **Rate Limit Simulation:**  
  Although there is no built-in rate limiter, avoid rapidly triggering the command repeatedly. Future updates might include a short delay between API calls.

- **Plugin Uninstall/Reinstall:**  
  **Note:** Currently, if you uninstall (delete the plugin folder) and then reinstall, your stored credentials are lost. You will need to re-enter your API credentials and reauthenticate.

## Known Issues

- **OAuth Flow Hiccups:**  
  It might take more than one attempt to successfully retrieve your authorization code and access token. Recommend retrying if you encounter an error.
  
- **Settings Persistence:**  
  Credentials (Client ID, Client Secret, tokens) are stored using Obsidian’s storage. If you uninstall and reinstall the plugin, these settings are cleared.

## Contributing & Code Quality

- This plugin is written in TypeScript with structured logging and robust error handling.
- All sensitive credentials are provided by the user through the settings UI—no hardcoded secrets are published.

## License

This project is licensed under the [MIT License](./LICENSE).

---

*Happy note-taking and tasking!*