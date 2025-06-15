import { PurelymailAPI } from './api';
import { StorageManager } from './storage';
import type { ExtensionSettings, Domain, RoutingRule } from './types';

class PopupManager {
    private api: PurelymailAPI | null = null;
    private settings: ExtensionSettings | null = null;
    private domains: Domain[] = [];
    private users: string[] = [];
    private aliases: RoutingRule[] = [];

    async init() {
        try {
            this.settings = await StorageManager.getSettings();

            // Check if API token is configured
            if (!this.settings.apiToken) {
                this.showNoTokenState();
                return;
            }

            this.api = new PurelymailAPI({
                apiToken: this.settings.apiToken,
                baseUrl: 'https://purelymail.com'
            });

            await this.loadData();
            this.setupEventListeners();
            this.populateUI();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to initialize');
        }
    }
    private async loadData() {
        this.showLoading(true);

        try {
            const [domainsResponse, usersResponse, routingResponse] = await Promise.all([
                this.api!.listDomains(false),
                this.api!.listUsers(),
                this.api!.listRoutingRules()
            ]);

            // Add safety checks for API responses
            this.domains = (domainsResponse?.domains || []).filter(d => !d.isShared);
            this.users = usersResponse?.users || [];
            this.aliases = routingResponse?.rules || [];

            this.hideError();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to load data');
        } finally {
            this.showLoading(false);
        }
    }

    private populateUI() {
        this.populateDomainSelects();
        this.populateAccountSelect();
        this.updateAliasesList();
    }
    private populateDomainSelects() {
        const domainSelect = document.getElementById('domainSelect') as HTMLSelectElement;
        const domainFilter = document.getElementById('domainFilter') as HTMLSelectElement;

        // Clear existing options
        domainSelect.innerHTML = '<option value="">Select domain...</option>';
        domainFilter.innerHTML = '';

        if (this.domains.length === 0) {
            // Handle empty domains state
            const emptyOption1 = document.createElement('option');
            emptyOption1.value = '';
            emptyOption1.textContent = 'No domains available';
            emptyOption1.disabled = true;
            domainSelect.appendChild(emptyOption1);

            const emptyOption2 = document.createElement('option');
            emptyOption2.value = '';
            emptyOption2.textContent = 'No domains available';
            emptyOption2.disabled = true;
            domainFilter.appendChild(emptyOption2);
            return;
        }

        this.domains.forEach(domain => {
            // Main domain select for creating aliases
            const option1 = document.createElement('option');
            option1.value = domain.name;
            option1.textContent = domain.name;
            if (domain.name === this.settings!.defaultDomain) {
                option1.selected = true;
            }
            domainSelect.appendChild(option1);

            // Domain filter for viewing aliases
            const option2 = document.createElement('option');
            option2.value = domain.name;
            option2.textContent = domain.name;
            if (this.settings!.selectedDomains.includes(domain.name) ||
                (this.settings!.selectedDomains.length === 0 && domain.name === this.settings!.defaultDomain)) {
                option2.selected = true;
            }
            domainFilter.appendChild(option2);
        });
    }

    private populateAccountSelect() {
        const accountSelect = document.getElementById('accountSelect') as HTMLSelectElement;
        accountSelect.innerHTML = '<option value="">Select account...</option>'; const visibleUsers = this.users.filter(user =>
            !this.settings!.hiddenUsers.includes(user)
        );

        if (visibleUsers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No accounts available';
            option.disabled = true;
            accountSelect.appendChild(option);
            return;
        } visibleUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            if (user === this.settings!.defaultAccount) {
                option.selected = true;
            }
            accountSelect.appendChild(option);
        });
    }

    private updateAliasesList() {
        const container = document.getElementById('aliasesContainer')!;
        const noAliases = document.getElementById('noAliases')!;
        const domainFilter = document.getElementById('domainFilter') as HTMLSelectElement;

        // Get selected domains from filter
        const selectedDomains = Array.from(domainFilter.selectedOptions).map(option => option.value);
        const domainsToShow = selectedDomains.length > 0 ? selectedDomains : [this.settings!.defaultDomain];

        // Filter aliases by selected domains and hide system aliases
        const visibleAliases = this.aliases.filter(alias =>
            domainsToShow.includes(alias.domainName) &&
            !this.settings!.systemAliases.includes(alias.matchUser)
        );

        container.innerHTML = '';

        if (visibleAliases.length === 0) {
            noAliases.classList.remove('hidden');
        } else {
            noAliases.classList.add('hidden');

            visibleAliases.forEach(alias => {
                const aliasElement = this.createAliasElement(alias);
                container.appendChild(aliasElement);
            });
        }

        // Save selected domains for persistence
        this.saveSelectedDomains(domainsToShow);
    }

    private createAliasElement(alias: RoutingRule): HTMLElement {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-gray-50 rounded border';

        const targetEmails = alias.targetAddresses.join(', ');
        const isSpamAlias = alias.targetAddresses.includes(this.settings!.spamEmail) ||
            (this.settings!.customSpamEmail && alias.targetAddresses.includes(this.settings!.customSpamEmail));

        div.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-900 truncate">
          ${alias.matchUser}@${alias.domainName}
        </div>
        <div class="text-xs text-gray-500 truncate" title="${targetEmails}">
          → ${targetEmails}
        </div>
        ${isSpamAlias ? '<span class="text-xs text-orange-600 font-medium">SPAM</span>' : ''}
      </div>
      <div class="flex space-x-1 ml-2">
        <button class="btn-warning" data-action="spam" data-id="${alias.id}" ${isSpamAlias ? 'disabled' : ''}>
          Spam
        </button>
        <button class="btn-danger" data-action="delete" data-id="${alias.id}">
          Delete
        </button>
      </div>
    `;

        return div;
    }

    private setupEventListeners() {
        // Create alias button
        document.getElementById('createButton')?.addEventListener('click', () => this.createAlias());

        // Open settings button
        document.getElementById('openSettingsButton')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openSettings' });
        });

        // Retry button
        document.getElementById('retryButton')?.addEventListener('click', () => this.loadData());

        // Domain filter change
        document.getElementById('domainFilter')?.addEventListener('change', () => this.updateAliasesList());

        // Alias actions (spam/delete)
        document.getElementById('aliasesContainer')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON') {
                const action = target.dataset.action;
                const aliasId = parseInt(target.dataset.id || '0');

                if (action === 'spam') {
                    this.spamAlias(aliasId);
                } else if (action === 'delete') {
                    this.deleteAlias(aliasId);
                }
            }
        });

        // Enter key in alias name input
        document.getElementById('aliasName')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createAlias();
            }
        });
    }

    private async createAlias() {
        const aliasNameInput = document.getElementById('aliasName') as HTMLInputElement;
        const domainSelect = document.getElementById('domainSelect') as HTMLSelectElement;
        const accountSelect = document.getElementById('accountSelect') as HTMLSelectElement;

        const aliasName = aliasNameInput.value.trim();
        const domain = domainSelect.value;
        const account = accountSelect.value;

        if (!aliasName || !domain || !account) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            await this.api!.createRoutingRule({
                domainName: domain,
                prefix: false,
                matchUser: aliasName,
                targetAddresses: [account],
                catchall: false
            });

            // Clear the form
            aliasNameInput.value = '';

            // Reload aliases
            await this.loadData();
            this.updateAliasesList();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to create alias');
        }
    }

    private async spamAlias(aliasId: number) {
        const alias = this.aliases.find(a => a.id === aliasId);
        if (!alias) return;

        const spamEmail = this.settings!.customSpamEmail || this.settings!.spamEmail;
        if (!spamEmail) {
            this.showError('Spam email not configured');
            return;
        }

        try {
            // Delete the old rule
            await this.api!.deleteRoutingRule({ routingRuleId: aliasId });

            // Create new rule pointing to spam
            await this.api!.createRoutingRule({
                domainName: alias.domainName,
                prefix: alias.prefix,
                matchUser: alias.matchUser,
                targetAddresses: [spamEmail],
                catchall: alias.catchall
            });

            // Reload aliases
            await this.loadData();
            this.updateAliasesList();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to spam alias');
        }
    }

    private async deleteAlias(aliasId: number) {
        if (!confirm('Are you sure you want to delete this alias?')) {
            return;
        }

        try {
            await this.api!.deleteRoutingRule({ routingRuleId: aliasId });

            // Reload aliases
            await this.loadData();
            this.updateAliasesList();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to delete alias');
        }
    }

    private async saveSelectedDomains(domains: string[]) {
        await StorageManager.saveSettings({ selectedDomains: domains });
    }

    private showLoading(show: boolean) {
        const loadingState = document.getElementById('loadingState')!;
        const aliasesList = document.getElementById('aliasesList')!;

        if (show) {
            loadingState.classList.remove('hidden');
            aliasesList.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
            aliasesList.classList.remove('hidden');
        }
    }

    private showError(message: string) {
        const errorState = document.getElementById('errorState')!;
        const errorMessage = document.getElementById('errorMessage')!;

        errorMessage.textContent = message;
        errorState.classList.remove('hidden');
    }

    private hideError() {
        document.getElementById('errorState')?.classList.add('hidden');
    }

    private showNoTokenState() {
        document.getElementById('noTokenState')?.classList.remove('hidden');
        document.getElementById('aliasesList')?.classList.add('hidden');
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupManager();
    popup.init();
});
