import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import TickTickPlugin from './main';

export interface TickTickSettings {
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: number;
    clientId: string;
    clientSecret: string;
    redirectUri?: string; // New field for redirect URI
    tempCodeVerifier?: string;
    tempState?: string;
}

export const DEFAULT_SETTINGS: TickTickSettings = {
    accessToken: '',
    clientId: '',
    clientSecret: '',
    redirectUri: 'https://ticktick-quick-add-obsidian-6yawfmvnj-mooshs-projects-0635287d.vercel.app'
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

        new Setting(containerEl)
            .setName('Client id')
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
            .setName('Client secret')
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

        new Setting(containerEl)
            .setName('Redirect URI')
            .setDesc('Enter the Redirect URI registered in your TickTick Developer Portal. (Default: https://ticktick-quick-add-obsidian-6yawfmvnj-mooshs-projects-0635287d.vercel.app)')
            .addText(text =>
                text
                    .setPlaceholder('https://ticktick-quick-add-obsidian-6yawfmvnj-mooshs-projects-0635287d.vercel.app')
                    .setValue(this.plugin.settings.redirectUri || '')
                    .onChange(async (value) => {
                        this.plugin.settings.redirectUri = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Access token')
            .setDesc('Your current access token (read-only).')
            .addText(text =>
                text
                    .setPlaceholder('Access token will appear here')
                    .setValue(this.plugin.settings.accessToken || '')
                    .onChange(async (value) => {
                        this.plugin.settings.accessToken = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Refresh token')
            .setDesc('Stored refresh token (for debugging purposes).')
            .addText(text =>
                text
                    .setPlaceholder('Refresh token')
                    .setValue(this.plugin.settings.refreshToken || '')
                    .onChange(async (value) => {
                        this.plugin.settings.refreshToken = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Connect to TickTick')
            .setDesc('Click to open the OAuth authorization URL in your browser.')
            .addButton(async (button) => {
                button.setButtonText('Connect').onClick(async () => {
                    await this.plugin.startAuthFlow();
                });
            });

        new Setting(containerEl)
            .setName('Authorization code')
            .setDesc('Paste the authorization code from TickTick here to obtain an access token.')
            .addText(text =>
                text
                    .setPlaceholder('Enter authorization code')
                    .onChange(async (code) => {
                        if (code.trim()) {
                            await this.plugin.exchangeAuthCodeForToken(code.trim());
                            text.setValue('');
                            this.display();
                        }
                    })
            );
    }
}