import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import TickTickPlugin from './main';

export interface TickTickSettings {
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: number; // timestamp in ms when the token expires
    clientId: string;
    clientSecret: string;
    tempCodeVerifier?: string;
    tempState?: string;
}

export const DEFAULT_SETTINGS: TickTickSettings = {
    accessToken: '',
    clientId: '',
    clientSecret: ''
};

export class TickTickSettingTab extends PluginSettingTab {
    plugin: TickTickPlugin;

    constructor(app: App, plugin: TickTickPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'TickTick API Settings' });

        new Setting(containerEl)
            .setName('Client ID')
            .setDesc('Enter your TickTick Client ID from the Developer Console.')
            .addText(text =>
                text
                    .setPlaceholder('Your Client ID')
                    .setValue(this.plugin.settings.clientId || '')
                    .onChange(async (value) => {
                        this.plugin.settings.clientId = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Client Secret')
            .setDesc('Enter your TickTick Client Secret (input is masked).')
            .addText(text => {
                text.inputEl.type = 'password';
                text.setPlaceholder('••••••••••')
                    .setValue(this.plugin.settings.clientSecret || '')
                    .onChange(async (value) => {
                        this.plugin.settings.clientSecret = value.trim();
                        await this.plugin.saveSettings();
                    });
                return text;
            });

        // Display current access token (read-only) for user info
        new Setting(containerEl)
            .setName('Access Token')
            .setDesc('Your current access token. (Reauthenticate if expired.)')
            .addText(text =>
                text
                    .setPlaceholder('Access token will appear here')
                    .setValue(this.plugin.settings.accessToken || '')
                    .onChange(async (value) => {
                        // For production, this field is normally not edited manually.
                        this.plugin.settings.accessToken = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        // Optionally display refresh token and expiry (for debugging; you may hide these in production)
        new Setting(containerEl)
            .setName('Refresh Token')
            .setDesc('Stored refresh token (for debugging).')
            .addText(text =>
                text
                    .setPlaceholder('Refresh token')
                    .setValue(this.plugin.settings.refreshToken || '')
                    .onChange(async (value) => {
                        this.plugin.settings.refreshToken = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        // Add the Connect button and Authorization Code input as before
        new Setting(containerEl)
            .setName('Connect to TickTick')
            .setDesc('Click to open the OAuth authorization URL in your browser.')
            .addButton(async (button) => {
                button.setButtonText('Connect').onClick(async () => {
                    // (PKCE generation is handled in the plugin code; see main.ts for details.) 
                    // This Connect button will open the auth URL.
                    const clientId = this.plugin.settings.clientId;
                    if (!clientId) {
                        new Notice('Please enter your Client ID first.');
                        return;
                    }
                    // For simplicity, we assume PKCE and state generation are done in main.ts settings tab code.
                    // Here, we simply call the plugin's startAuthFlow() method.
                    await this.plugin.startAuthFlow();
                });
            });

        new Setting(containerEl)
            .setName('Authorization Code')
            .setDesc('Paste the authorization code from TickTick here to obtain an access token.')
            .addText(text =>
                text
                    .setPlaceholder('Enter authorization code')
                    .onChange(async (code) => {
                        if (code.trim()) {
                            await this.plugin.exchangeAuthCodeForToken(code.trim());
                            text.setValue(''); // Clear the field after exchange
                            this.display(); // Refresh the settings UI
                        }
                    })
            );
    }
}