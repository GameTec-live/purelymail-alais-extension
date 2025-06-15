import { PurelymailAPI } from './api';
import { StorageManager } from './storage';
import type { ExtensionSettings, Domain, RoutingRule } from './types';

class PopupManager {
    private api: PurelymailAPI | null = null;
    private settings: ExtensionSettings | null = null;
    private domains: Domain[] = [];
    private users: string[] = [];
    private aliases: RoutingRule[] = [];
    private currentTabUrl: string = '';

    async init() {
        try {
            this.settings = await StorageManager.getSettings();

            // Get current tab URL for prioritizing aliases
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                this.currentTabUrl = tab?.url || '';
            } catch (error) {
                console.log('Unable to get current tab URL:', error);
            }

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
    } private populateUI() {
        this.populateDomainSelects();
        this.populateAccountSelect();
        this.updateRecentAliases();
        this.updateAliasesList();
    } private populateDomainSelects() {
        const domainSelect = document.getElementById('domainSelect') as HTMLSelectElement;
        const domainFilter = document.getElementById('domainFilter') as HTMLSelectElement;

        // Clear existing options
        domainSelect.innerHTML = '<option value="">Select domain...</option>';
        domainFilter.innerHTML = '';        // Filter out hidden domains
        const visibleDomains = this.domains.filter(domain =>
            !(this.settings!.hiddenDomains || []).includes(domain.name)
        );

        if (visibleDomains.length === 0) {
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

        visibleDomains.forEach(domain => {
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
        const domainsToShow = selectedDomains.length > 0 ? selectedDomains : [this.settings!.defaultDomain];        // Filter aliases by selected domains and hide system aliases and aliases from hidden domains
        const visibleAliases = this.aliases.filter(alias =>
            domainsToShow.includes(alias.domainName) &&
            !this.settings!.systemAliases.includes(alias.matchUser) &&
            !(this.settings!.hiddenDomains || []).includes(alias.domainName)
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
    } private setupEventListeners() {
        // Create alias button
        document.getElementById('createButton')?.addEventListener('click', () => this.createAlias());

        // Settings gear button
        document.getElementById('settingsGearButton')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openSettings' });
        });

        // Open settings button
        document.getElementById('openSettingsButton')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openSettings' });
        });

        // Retry button
        document.getElementById('retryButton')?.addEventListener('click', () => this.loadData());

        // Domain filter change
        document.getElementById('domainFilter')?.addEventListener('change', () => this.updateAliasesList());

        // List all aliases button
        document.getElementById('listAllAliasesButton')?.addEventListener('click', () => this.showAllAliasesModal());

        // Close all aliases modal
        document.getElementById('closeAllAliasesModal')?.addEventListener('click', () => this.hideAllAliasesModal());

        // Close modal when clicking outside
        document.getElementById('allAliasesModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideAllAliasesModal();
            }
        });

        // Alias actions (spam/delete) for main list
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

        // Alias actions for all aliases modal
        document.getElementById('allAliasesContainer')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON') {
                const action = target.dataset.action;

                if (action === 'delete') {
                    const aliasId = parseInt(target.dataset.id || '0');
                    this.deleteAlias(aliasId, true); // true indicates it's from the modal
                } else if (action === 'deleteRecent') {
                    const aliasEmail = target.dataset.alias || '';
                    this.deleteRecentAlias(aliasEmail);
                }
            }
        });

        // Alias actions for recent aliases (including delete)
        document.getElementById('recentAliasesContainer')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON') {
                const action = target.dataset.action;

                if (action === 'deleteRecent') {
                    const aliasEmail = target.dataset.alias || '';
                    this.deleteRecentAlias(aliasEmail);
                }
            }
        });

        // Enter key in alias name input
        document.getElementById('aliasName')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createAlias();
            }
        });
    } private async createAlias() {
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

            // Reload aliases and recent aliases
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
    } private async deleteAlias(aliasId: number, fromModal: boolean = false) {
        if (!confirm('Are you sure you want to delete this alias?')) {
            return;
        }

        // Remove from recent aliases if it was created recently
        const aliasEmail = this.aliases.find(a => a.id === aliasId);
        if (aliasEmail) {
            try {
                const fullAliasEmail = `${aliasEmail.matchUser}@${aliasEmail.domainName}`;
                await StorageManager.removeCreatedAlias(fullAliasEmail);
                this.updateRecentAliases();
            } catch (error) {
                console.log('Failed to remove recent alias:', error);
            }
        }

        try {
            await this.api!.deleteRoutingRule({ routingRuleId: aliasId });

            // Reload aliases
            await this.loadData();
            this.updateAliasesList();

            // If deleted from modal, refresh modal content
            if (fromModal) {
                this.populateAllAliasesModal();
            }

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
    } private showNoTokenState() {
        document.getElementById('noTokenState')?.classList.remove('hidden');
        document.getElementById('aliasesList')?.classList.add('hidden');
    }

    private showAllAliasesModal() {
        const modal = document.getElementById('allAliasesModal')!;
        modal.classList.remove('hidden');
        this.populateAllAliasesModal();
    }

    private hideAllAliasesModal() {
        const modal = document.getElementById('allAliasesModal')!;
        modal.classList.add('hidden');
    }

    private populateAllAliasesModal() {
        const container = document.getElementById('allAliasesContainer')!;
        container.innerHTML = '';

        if (this.aliases.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-4">No aliases found</p>';
            return;
        }

        // Filter out system aliases
        const visibleAliases = this.aliases.filter(alias =>
            !this.settings!.systemAliases.includes(alias.matchUser)
        );

        visibleAliases.forEach(alias => {
            const aliasElement = this.createAliasElementWithDelete(alias);
            container.appendChild(aliasElement);
        });
    }

    private createAliasElementWithDelete(alias: RoutingRule): HTMLElement {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100';

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
            <button class="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded" 
                    data-action="delete" 
                    data-id="${alias.id}"
                    title="Delete alias">
                ✕
            </button>
        `;

        return div;
    }

    private async deleteRecentAlias(aliasEmail: string) {
        if (!confirm(`Are you sure you want to delete the alias ${aliasEmail}?`)) {
            return;
        }

        try {
            // Remove from stored created aliases
            await StorageManager.removeCreatedAlias(aliasEmail);
            this.updateRecentAliases();

            // Find the alias in the API data
            const alias = this.aliases.find(a => `${a.matchUser}@${a.domainName}` === aliasEmail);
            if (!alias) {
                this.showError('Alias not found');
                return;
            }

            // Delete from API
            await this.api!.deleteRoutingRule({ routingRuleId: alias.id });

            // Reload data and refresh UI
            await this.loadData();
            this.updateAliasesList();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to delete alias');
        }
    }

    private getCurrentWebsiteDomain(): string {
        try {
            if (this.currentTabUrl) {
                const url = new URL(this.currentTabUrl);
                return url.hostname.replace(/^www\./, '');
            }
        } catch (error) {
            console.log('Error extracting domain from current URL:', error);
        }
        return '';
    } private async updateRecentAliases() {
        const recentAliasesSection = document.getElementById('recentAliasesSection')!;
        const recentAliasesContainer = document.getElementById('recentAliasesContainer')!;

        try {
            const recentAliases = await StorageManager.getCreatedAliases();

            // Only show recent aliases from the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentlyCreated = recentAliases
                .filter(alias => new Date(alias.createdAt) > sevenDaysAgo);

            // Get current website domain for prioritization
            const currentDomain = this.getCurrentWebsiteDomain();

            // Sort aliases: current website first, then by creation date
            const sortedAliases = recentlyCreated.sort((a, b) => {
                const aDomain = this.extractDomainFromUrl(a.createdFor);
                const bDomain = this.extractDomainFromUrl(b.createdFor);

                // If one alias is from current website and other isn't, prioritize current website
                if (currentDomain && aDomain === currentDomain && bDomain !== currentDomain) {
                    return -1;
                }
                if (currentDomain && bDomain === currentDomain && aDomain !== currentDomain) {
                    return 1;
                }

                // Otherwise sort by creation date (newest first)
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }).slice(0, 5); // Show max 5 recent aliases

            recentAliasesContainer.innerHTML = '';

            if (sortedAliases.length === 0) {
                recentAliasesSection.classList.add('hidden');
                return;
            }

            recentAliasesSection.classList.remove('hidden');

            sortedAliases.forEach(alias => {
                const aliasElement = this.createRecentAliasElement(alias);
                recentAliasesContainer.appendChild(aliasElement);
            });
        } catch (error) {
            console.error('Error loading recent aliases:', error);
            recentAliasesSection.classList.add('hidden');
        }
    } private createRecentAliasElement(alias: any): HTMLElement {
        const div = document.createElement('div');
        const currentDomain = this.getCurrentWebsiteDomain();
        const aliasDomain = this.extractDomainFromUrl(alias.createdFor);

        // Highlight if it's from current website
        const isCurrentSite = currentDomain && aliasDomain === currentDomain;
        const bgColor = isCurrentSite ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
        const textColor = isCurrentSite ? 'text-green-600' : 'text-blue-600';

        div.className = `flex items-center justify-between p-2 rounded border ${bgColor}`;

        const createdDate = new Date(alias.createdAt);
        const relativeTime = this.getRelativeTime(createdDate);
        const domain = this.extractDomainFromUrl(alias.createdFor);

        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                    ${alias.alias}
                    ${isCurrentSite ? '<span class="text-xs bg-green-100 text-green-800 px-1 rounded ml-1">Current Site</span>' : ''}
                </div>
                <div class="text-xs ${textColor} truncate" title="${alias.createdFor}">
                    Created for ${domain} • ${relativeTime}
                </div>
                <div class="text-xs text-gray-500 truncate" title="${alias.targetAddress}">
                    → ${alias.targetAddress}
                </div>
            </div>
            <div class="flex space-x-1 ml-2">
                <button class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" 
                        onclick="navigator.clipboard.writeText('${alias.alias}')" 
                        title="Copy to clipboard">
                    Copy
                </button>
                <button class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200" 
                        data-action="deleteRecent" 
                        data-alias="${alias.alias}"
                        title="Delete alias">
                    ✕
                </button>
            </div>
        `;

        return div;
    }

    private getRelativeTime(date: Date): string {
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays}d ago`;
        }
    }

    private extractDomainFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '');
        } catch {
            return 'Unknown website';
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupManager();
    popup.init();
});
