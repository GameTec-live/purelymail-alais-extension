import type { ExtensionSettings } from './types';

export class StorageManager {
    private static readonly SETTINGS_KEY = 'purelymailSettings';

    static async getSettings(): Promise<ExtensionSettings> {
        const result = await chrome.storage.sync.get(this.SETTINGS_KEY);
        return result[this.SETTINGS_KEY] || this.getDefaultSettings();
    }

    static async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
        const currentSettings = await this.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        await chrome.storage.sync.set({ [this.SETTINGS_KEY]: updatedSettings });
    }

    static getDefaultSettings(): ExtensionSettings {
        return {
            defaultAccount: '',
            systemAliases: [],
            defaultDomain: '',
            hiddenUsers: [],
            spamEmail: '',
            selectedDomains: [],
            isFirstRun: true
        };
    }

    static async isFirstRun(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.isFirstRun;
    }

    static async setFirstRunComplete(): Promise<void> {
        await this.saveSettings({ isFirstRun: false });
    }
}
