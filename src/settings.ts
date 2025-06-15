import { PurelymailAPI } from './api';
import { StorageManager } from './storage';
import type { ExtensionSettings, Domain, RoutingRule } from './types';

class SettingsManager {
    private api: PurelymailAPI | null = null;
    private settings: ExtensionSettings;
    private domains: Domain[] = [];
    private users: string[] = [];
    private aliases: RoutingRule[] = [];

    constructor() {
        this.settings = StorageManager.getDefaultSettings();
    }

    async init() {
        try {
            this.settings = await StorageManager.getSettings();
            this.populateUI();
            this.setupEventListeners();

            if (this.settings.apiToken) {
                await this.testConnection();
            }
        } catch (error) {
            this.showStatus('Failed to load settings', 'error');
        }
    }
    private populateUI() {
        const apiTokenInput = document.getElementById('apiToken') as HTMLInputElement;
        const spamEmailTypeSelect = document.getElementById('spamEmailType') as HTMLSelectElement;
        const customSpamEmailInput = document.getElementById('customSpamEmail') as HTMLInputElement;

        // Populate form fields
        if (this.settings.apiToken) {
            apiTokenInput.value = this.settings.apiToken;
        }

        if (this.settings.customSpamEmail) {
            spamEmailTypeSelect.value = 'custom';
            customSpamEmailInput.value = this.settings.customSpamEmail;
            this.showCustomSpamInput(true);
        } else {
            spamEmailTypeSelect.value = 'account';
            this.showCustomSpamInput(false);
        }
    }

    private setupEventListeners() {
        // Test connection button
        document.getElementById('testConnectionButton')?.addEventListener('click', () => this.testConnection());

        // Spam email type change
        document.getElementById('spamEmailType')?.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.showCustomSpamInput(target.value === 'custom');
        });

        // Save button
        document.getElementById('saveButton')?.addEventListener('click', () => this.saveSettings());

        // Cancel button
        document.getElementById('cancelButton')?.addEventListener('click', () => window.close());

        // Reset button
        document.getElementById('resetButton')?.addEventListener('click', () => this.resetSettings());
    }

    private async testConnection() {
        const apiTokenInput = document.getElementById('apiToken') as HTMLInputElement;
        const token = apiTokenInput.value.trim();

        if (!token) {
            this.showConnectionStatus('Please enter an API token', 'error');
            return;
        }

        this.showConnectionStatus('Testing connection...', 'loading');

        try {
            this.api = new PurelymailAPI({
                apiToken: token,
                baseUrl: 'https://purelymail.com'
            });      // Test the connection by fetching domains, users, and aliases
            const [domainsResponse, usersResponse, aliasesResponse] = await Promise.all([
                this.api.listDomains(false),
                this.api.listUsers(),
                this.api.listRoutingRules()
            ]);

            // Add safety checks for API responses
            this.domains = (domainsResponse?.domains || []).filter(d => !d.isShared);
            this.users = usersResponse?.users || [];
            this.aliases = aliasesResponse?.rules || [];

            console.log('API Test successful:', {
                domains: this.domains.length,
                users: this.users.length,
                aliases: this.aliases.length
            });

            this.showConnectionStatus('Connection successful!', 'success');
            this.populateAccountSettings();

            // Show additional settings sections
            this.showSection('accountSettings');
            this.showSection('spamSettings');
            this.showSection('hiddenSettings');

        } catch (error) {
            this.showConnectionStatus(
                `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
            this.hideAdditionalSections();
        }
    } private populateAccountSettings() {
        this.populateDefaultAccount();
        this.populateDefaultDomain();
        this.populateSpamEmail();
        this.populateHiddenUsers();
        this.populateHiddenDomains();
        this.populateHiddenAliases();
    }
    private populateDefaultAccount() {
        const defaultAccountSelect = document.getElementById('defaultAccount') as HTMLSelectElement;
        defaultAccountSelect.innerHTML = '<option value="">Select default account...</option>';

        if (this.users.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No accounts available';
            option.disabled = true;
            defaultAccountSelect.appendChild(option);
            return;
        } this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            if (user === this.settings.defaultAccount) {
                option.selected = true;
            }
            defaultAccountSelect.appendChild(option);
        });
    } private populateDefaultDomain() {
        const defaultDomainSelect = document.getElementById('defaultDomain') as HTMLSelectElement;
        defaultDomainSelect.innerHTML = '<option value="">Select default domain...</option>';        // Filter out hidden domains
        const visibleDomains = this.domains.filter(domain =>
            !(this.settings.hiddenDomains || []).includes(domain.name)
        );

        if (visibleDomains.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No domains available';
            option.disabled = true;
            defaultDomainSelect.appendChild(option);
            return;
        }

        visibleDomains.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain.name;
            option.textContent = domain.name;
            if (domain.name === this.settings.defaultDomain) {
                option.selected = true;
            }
            defaultDomainSelect.appendChild(option);
        });
    }

    private populateSpamEmail() {
        const spamEmailSelect = document.getElementById('spamEmail') as HTMLSelectElement;
        spamEmailSelect.innerHTML = '<option value="">Select spam account...</option>';

        if (this.users.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No accounts available';
            option.disabled = true;
            spamEmailSelect.appendChild(option);
            return;
        } this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            if (user === this.settings.spamEmail) {
                option.selected = true;
            }
            spamEmailSelect.appendChild(option);
        });
    }
    private populateHiddenUsers() {
        const container = document.getElementById('hiddenUsersList')!;
        container.innerHTML = '';

        if (this.users.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-500">No users available</div>';
            return;
        } this.users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'flex items-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `hidden-${user}`;
            checkbox.value = user;
            checkbox.checked = this.settings.hiddenUsers.includes(user);
            checkbox.className = 'rounded border-gray-300 text-primary-600 mr-2';

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = user;
            label.className = 'text-sm text-gray-700 cursor-pointer';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    private populateHiddenDomains() {
        const container = document.getElementById('hiddenDomainsList')!;
        container.innerHTML = '';

        if (this.domains.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-500">No domains available</div>';
            return;
        }

        this.domains.forEach(domain => {
            const div = document.createElement('div');
            div.className = 'flex items-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `hidden-domain-${domain.name}`;
            checkbox.value = domain.name;
            checkbox.checked = (this.settings.hiddenDomains || []).includes(domain.name);
            checkbox.className = 'rounded border-gray-300 text-primary-600 mr-2';

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = domain.name;
            label.className = 'text-sm text-gray-700 cursor-pointer';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    private populateHiddenAliases() {
        const container = document.getElementById('hiddenAliasesList')!;
        container.innerHTML = '';

        if (this.aliases.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-500">No aliases available</div>';
            return;
        }

        // Get unique alias names from routing rules
        const uniqueAliases = [...new Set(this.aliases.map(rule => rule.matchUser))].sort();

        uniqueAliases.forEach(aliasName => {
            const div = document.createElement('div');
            div.className = 'flex items-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `hidden-alias-${aliasName}`;
            checkbox.value = aliasName;
            checkbox.checked = this.settings.systemAliases.includes(aliasName);
            checkbox.className = 'rounded border-gray-300 text-primary-600 mr-2';

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = aliasName;
            label.className = 'text-sm text-gray-700 cursor-pointer';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    private showCustomSpamInput(show: boolean) {
        const customInput = document.getElementById('customSpamInput')!;
        const accountSelect = document.getElementById('spamAccountSelect')!;

        if (show) {
            customInput.classList.remove('hidden');
            accountSelect.classList.add('hidden');
        } else {
            customInput.classList.add('hidden');
            accountSelect.classList.remove('hidden');
        }
    }

    private showSection(sectionId: string) {
        document.getElementById(sectionId)?.classList.remove('hidden');
    }

    private hideAdditionalSections() {
        ['accountSettings', 'spamSettings', 'hiddenSettings'].forEach(sectionId => {
            document.getElementById(sectionId)?.classList.add('hidden');
        });
    }
    private async saveSettings() {
        try {
            // Collect form data
            const apiToken = (document.getElementById('apiToken') as HTMLInputElement).value.trim();
            const defaultAccount = (document.getElementById('defaultAccount') as HTMLSelectElement).value;
            const defaultDomain = (document.getElementById('defaultDomain') as HTMLSelectElement).value;

            const spamEmailType = (document.getElementById('spamEmailType') as HTMLSelectElement).value;
            let spamEmail = '';
            let customSpamEmail = undefined;

            if (spamEmailType === 'custom') {
                customSpamEmail = (document.getElementById('customSpamEmail') as HTMLInputElement).value.trim();
                spamEmail = customSpamEmail;
            } else {
                spamEmail = (document.getElementById('spamEmail') as HTMLSelectElement).value;
            }

            // Collect hidden users
            const hiddenUsers: string[] = [];
            const userCheckboxes = document.querySelectorAll('#hiddenUsersList input[type="checkbox"]:checked');
            userCheckboxes.forEach(checkbox => {
                hiddenUsers.push((checkbox as HTMLInputElement).value);
            });

            // Collect hidden aliases (system aliases)
            const systemAliases: string[] = [];
            const aliasCheckboxes = document.querySelectorAll('#hiddenAliasesList input[type="checkbox"]:checked');
            aliasCheckboxes.forEach(checkbox => {
                systemAliases.push((checkbox as HTMLInputElement).value);
            });

            // Collect hidden domains
            const hiddenDomains: string[] = [];
            const domainCheckboxes = document.querySelectorAll('#hiddenDomainsList input[type="checkbox"]:checked');
            domainCheckboxes.forEach(checkbox => {
                hiddenDomains.push((checkbox as HTMLInputElement).value);
            });

            // Create settings object
            const newSettings: Partial<ExtensionSettings> = {
                apiToken,
                defaultAccount,
                defaultDomain,
                systemAliases,
                spamEmail,
                customSpamEmail,
                hiddenUsers,
                hiddenDomains,
                isFirstRun: false
            };

            // Validate required fields
            if (!apiToken) {
                this.showStatus('API token is required', 'error');
                return;
            }

            // Save settings
            await StorageManager.saveSettings(newSettings);
            this.showStatus('Settings saved successfully!', 'success');

            // Close settings page after a short delay
            setTimeout(() => window.close(), 1500);

        } catch (error) {
            this.showStatus(
                `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    }

    private async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }

        try {
            const defaultSettings = StorageManager.getDefaultSettings();
            await StorageManager.saveSettings(defaultSettings);
            this.showStatus('Settings reset to defaults', 'success');

            // Reload the page after a short delay
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            this.showStatus('Failed to reset settings', 'error');
        }
    }

    private showConnectionStatus(message: string, type: 'loading' | 'success' | 'error') {
        const container = document.getElementById('connectionStatus')!;
        container.classList.remove('hidden');

        let className = 'p-3 rounded border text-sm ';
        switch (type) {
            case 'loading':
                className += 'bg-blue-50 border-blue-200 text-blue-700';
                break;
            case 'success':
                className += 'bg-green-50 border-green-200 text-green-700';
                break;
            case 'error':
                className += 'bg-red-50 border-red-200 text-red-700';
                break;
        }

        container.className = className;
        container.textContent = message;
    }

    private showStatus(message: string, type: 'success' | 'error') {
        const container = document.getElementById('statusMessage')!;
        container.classList.remove('hidden');

        let className = 'p-3 rounded border text-sm ';
        switch (type) {
            case 'success':
                className += 'bg-green-50 border-green-200 text-green-700';
                break;
            case 'error':
                className += 'bg-red-50 border-red-200 text-red-700';
                break;
        }

        container.className = className;
        container.textContent = message;

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                container.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const settings = new SettingsManager();
    settings.init();
});
