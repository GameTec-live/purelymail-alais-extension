import type { ExtensionSettings, CreatedAlias } from './types';

export class StorageManager {
    private static readonly SETTINGS_KEY = 'purelymailSettings';
    private static readonly CREATED_ALIASES_KEY = 'purelymailCreatedAliases';

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

    static async getCreatedAliases(): Promise<CreatedAlias[]> {
        const result = await chrome.storage.sync.get(this.CREATED_ALIASES_KEY);
        return result[this.CREATED_ALIASES_KEY] || [];
    }

    static async addCreatedAlias(alias: CreatedAlias): Promise<void> {
        const currentAliases = await this.getCreatedAliases();
        currentAliases.push(alias);
        await chrome.storage.sync.set({ [this.CREATED_ALIASES_KEY]: currentAliases });
    } static async removeCreatedAlias(aliasEmail: string): Promise<void> {
        try {
            const currentAliases = await this.getCreatedAliases();
            const filteredAliases = currentAliases.filter(alias => alias.alias !== aliasEmail);
            await chrome.storage.sync.set({ [this.CREATED_ALIASES_KEY]: filteredAliases });
        } catch (error) {
            console.warn('Failed to remove created alias from storage:', error);
            // Don't throw error as this is not critical for the delete operation
        }
    }
}
