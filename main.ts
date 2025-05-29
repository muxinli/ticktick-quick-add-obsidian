import { arrayBufferToBase64 } from 'obsidian';
import { App, Editor, MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';
import { TickTickSettingTab, TickTickSettings, DEFAULT_SETTINGS } from './settings';

// Helper function to generate a random alphanumeric string (for block anchors and state)
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Helper function to retrieve the paragraph (consecutive lines) where the cursor is located
function getParagraph(editor: Editor, currentLine: number): { text: string, start: number, end: number } {
    let start = currentLine;
    let end = currentLine;
    const totalLines = editor.lineCount();
    while (start > 0) {
        if (editor.getLine(start - 1).trim() === "") break;
        start--;
    }
    while (end < totalLines - 1) {
        if (editor.getLine(end + 1).trim() === "") break;
        end++;
    }
    let paragraphText = "";
    for (let i = start; i <= end; i++) {
        paragraphText += editor.getLine(i) + "\n";
    }
    return { text: paragraphText.trim(), start, end };
}

// Helper function to base64url-encode an ArrayBuffer
function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Helper function to generate PKCE codes: codeVerifier and corresponding codeChallenge
async function generatePKCECodes(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = generateRandomString(64); // between 43 and 128 characters
    // Compute SHA-256 hash of the verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = arrayBufferToBase64(hashBuffer)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return { codeVerifier, codeChallenge };
}

// Structured logging helper
function log(plugin: TickTickPlugin, action: string, metadata?: Record<string, unknown>) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        plugin: 'ticktick-integration',
        action,
        ...metadata,
        // Redact sensitive info
        clientId: plugin.settings.clientId ? '***' : undefined,
        accessToken: plugin.settings.accessToken ? '***' : undefined
    }));
}

export default class TickTickPlugin extends Plugin {
    settings: TickTickSettings;

    async onload() {
        console.log('Loading TickTick Plugin');
        await this.loadSettings();
        this.addSettingTab(new TickTickSettingTab(this.app, this));

        // Command: Create TickTick task from a paragraph
        this.addCommand({
            id: 'create-ticktick-task',
            name: 'Create TickTick task from paragraph',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const cursor = editor.getCursor();
                if (!view.file) {
                    new Notice("No file found for the current view!");
                    return;
                }
                const { text: paragraphText, start, end } = getParagraph(editor, cursor.line);
                if (!paragraphText) {
                    new Notice("No paragraph text found!");
                    return;
                }

                // Generate unique block anchor
                const blockId = generateRandomString(8);
                // Prepend "#ticktick" to the paragraph and append the block anchor
                const updatedParagraph = `#ticktick ${paragraphText} ^${blockId}`;
                editor.replaceRange(updatedParagraph, { line: start, ch: 0 }, { line: end, ch: editor.getLine(end).length });

                // Construct Advanced URI for the block
                const vaultName = this.app.vault.getName();
                const filePath = view.file.path;
                const advancedUri = `obsidian://advanced-uri?vault=${encodeURIComponent(vaultName)}&filepath=${encodeURIComponent(filePath)}&block=${encodeURIComponent(blockId)}`;
                const taskDescription = `${paragraphText}\n\n[Open in Obsidian](${advancedUri})`;
                const taskTitle = paragraphText.length > 50 ? paragraphText.substring(0, 50) + "..." : paragraphText;

                await this.ensureFreshToken();

                try {
                    const result = await this.createTicktickTask(taskTitle, taskDescription);
                    if (result.success) {
                        new Notice("TickTick task created successfully!");
                    } else {
                        new Notice("Failed to create TickTick task.");
                    }
                } catch (error) {
                    log(this, 'task_creation_failed', { error: error.message });
                    new Notice(`Failed to create task: ${error.message}\nCheck console for details.`);
                }
            }
        });
    }

    onunload() {
        console.log('Unloading TickTick Plugin');
    }

    /**
     * Initiates the OAuth flow by generating PKCE codes and opening the authorization URL.
     * Uses the redirect URI from settings (default is OOB).
     */
    async startAuthFlow(): Promise<void> {
        const clientId = this.settings.clientId;
        if (!clientId) {
            new Notice('Please enter your Client ID in the settings.');
            return;
        }
        const redirectUri = this.settings.redirectUri || 'https://ticktick-quick-add-obsidian-6yawfmvnj-mooshs-projects-0635287d.vercel.app';
        const scope = encodeURIComponent('tasks:read tasks:write');
        const { codeVerifier, codeChallenge } = await generatePKCECodes();
        const state = generateRandomString(32);
        this.settings.tempCodeVerifier = codeVerifier;
        this.settings.tempState = state;
        await this.saveSettings();
        const authUrl = `https://ticktick.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;
        window.open(authUrl, '_blank');
        new Notice('OAuth flow initiated. Please complete it in your browser.');
    }

    /**
     * Exchanges an authorization code for an access token.
     * Stores access token, refresh token, and token expiry.
     */
    async exchangeAuthCodeForToken(code: string): Promise<void> {
        const tokenEndpoint = 'https://ticktick.com/oauth/token';
        const redirectUri = this.settings.redirectUri || 'https://ticktick-quick-add-obsidian-6yawfmvnj-mooshs-projects-0635287d.vercel.app';
        const clientId = this.settings.clientId;
        const clientSecret = this.settings.clientSecret;
        const codeVerifier = this.settings.tempCodeVerifier;
        if (!codeVerifier || !clientId || !clientSecret) {
            new Notice('Missing required credentials. Please update your settings.');
            return;
        }
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
            code_verifier: codeVerifier
        });
        try {
            const response = await requestUrl({
                url: tokenEndpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // ADDED USER AGENT
                },
                body: params.toString()
            });
            if (response.status === 200) {
                const data = response.json;

                // MODIFICATION 2: CHECK FOR AND STORE REFRESH TOKEN
                if (data.refresh_token) {
                    this.settings.refreshToken = data.refresh_token;
                } else {
                    console.warn("Refresh token not received during token exchange.");
                    new Notice("Refresh token not received. Re-authentication may be required more often.");
                }

                this.settings.accessToken = data.access_token;
                this.settings.tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.85);
                await this.saveSettings();
                new Notice('TickTick access token obtained successfully!');
            } else {
                console.error("Token exchange error (status):", response.status);
                console.log("response.json:", response.json);
                console.log("response.text:", response.text);
                new Notice('Failed to obtain access token.');
            }
        } catch (error) {
            console.error('Error during token exchange:', error);
            new Notice('Error during token exchange.');
        }
    }

    /**
     * Refreshes the access token using the stored refresh token.
     */
    async refreshAccessToken(): Promise<void> {
        if (!this.settings.refreshToken) {
            throw new Error('No refresh token available. Please reconnect.');
        }
        const tokenEndpoint = 'https://ticktick.com/oauth/token';
        const clientId = this.settings.clientId;
        const clientSecret = this.settings.clientSecret;
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.settings.refreshToken,
            client_id: clientId,
            client_secret: clientSecret
        });
        try {
            const response = await requestUrl({
                url: tokenEndpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // ADDED USER AGENT
                },
                body: params.toString()
            });
            if (response.status === 200) {
                const data = response.json;

                // MODIFICATION 3: UPDATE REFRESH TOKEN IF A NEW ONE IS RETURNED (RARE BUT POSSIBLE)
                if (data.refresh_token) {
                    this.settings.refreshToken = data.refresh_token;
                }

                this.settings.accessToken = data.access_token;
                this.settings.tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.85);
                await this.saveSettings();
                new Notice('Access token refreshed successfully!');
            } else {
                console.error('Refresh token error:', response.text);
                throw new Error('Failed to refresh token');
            }
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error;
        }
    }

    /**
     * Ensures that the access token is fresh. If expired, refreshes it automatically.
     */
    async ensureFreshToken(): Promise<void> {
        if (this.settings.tokenExpiry && Date.now() > this.settings.tokenExpiry) {
            log(this, 'token_expired', { tokenExpiry: this.settings.tokenExpiry });
            try {
                await this.refreshAccessToken();
            } catch (error) {
                new Notice('Reauthentication required. Please reconnect to TickTick.');
                throw error;
            }
        }
    }

    /**
     * Creates a task in TickTick by sending a POST request to the open/v1 endpoint.
     */
    async createTicktickTask(title: string, description: string): Promise<{ success: boolean }> {
        const accessToken = this.settings.accessToken;
        if (!accessToken) {
            new Notice('No access token found. Please connect to TickTick in the settings.');
            return { success: false };
        }
        const endpoint = 'https://api.ticktick.com/open/v1/task';
        const payload = { title, content: description };
        try {
            log(this, 'task_creation_request', { endpoint, title });
            const response = await requestUrl({
                url: endpoint,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // ADDED USER AGENT
                },
                body: JSON.stringify(payload)
            });
            if (response.status === 200) {
                return { success: true };
            } else {
                console.error("TickTick API error (status):", response.status);
                console.log("response.json:", response.json);
                console.log("response.text:", response.text);
                return { success: false };
            }
        } catch (error) {
            console.error("TickTick API error:", error);
            return { success: false };
        }
    }

    // Methods to load and save settings for persistence
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
