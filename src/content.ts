import { StorageManager } from './storage';

interface EmailFieldInfo {
    element: HTMLInputElement;
    rect: DOMRect;
}

class EmailFieldDetector {
    private detectedFields: Set<HTMLInputElement> = new Set();
    private observer: MutationObserver;
    private isEnabled: boolean = true;

    constructor() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanForEmailFields(node as Element);
                        }
                    });
                }
            });
        });

        this.init();
    } private async init() {
        // Check if the extension is enabled
        const settings = await StorageManager.getSettings();
        this.isEnabled = !settings?.isFirstRun; // Only enable if setup is complete

        if (!this.isEnabled) {
            return;
        }

        // Skip on certain sites where email fields are likely not for registration/signup
        if (this.shouldSkipSite()) {
            return;
        }

        // Scan existing fields
        this.scanForEmailFields(document.body);

        // Start observing for new fields
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });        // Listen for focus events on email fields

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    private handleKeyDown(event: KeyboardEvent) {
        // Ctrl/Cmd + Shift + A to create alias for focused email field
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
            const activeElement = document.activeElement as HTMLInputElement;
            if (activeElement && this.detectedFields.has(activeElement)) {
                event.preventDefault();
                this.showAliasCreationModal(activeElement);
            }
        }
    }

    private shouldSkipSite(): boolean {
        const hostname = window.location.hostname.toLowerCase();

        // Skip common email providers and admin sites
        const skipDomains = [
            'gmail.com',
            'outlook.com',
            'hotmail.com',
            'yahoo.com',
            'purelymail.com',
            'login.microsoftonline.com',
            'accounts.google.com',
            'id.atlassian.com',
            'auth0.com',
            'okta.com'
        ];

        // Skip if current site is an email provider or auth service
        if (skipDomains.some(domain => hostname.includes(domain))) {
            return true;
        }

        return false;
    }

    private scanForEmailFields(element: Element) {
        if (!this.isEnabled) return;

        // Find email input fields
        const emailFields = element.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]');

        emailFields.forEach((field) => {
            const emailField = field as HTMLInputElement;
            if (!this.detectedFields.has(emailField) && this.isValidEmailField(emailField)) {
                this.detectedFields.add(emailField);
            }
        });
    }

    private isValidEmailField(field: HTMLInputElement): boolean {
        // Skip if field is hidden or disabled
        if (field.offsetParent === null || field.disabled || field.readOnly) {
            return false;
        }

        // Skip if field already has a value (likely pre-filled)
        if (field.value.trim().length > 0) {
            return false;
        }

        // Skip if field is very small (likely not a main email field)
        const rect = field.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 20) {
            return false;
        }

        return true;
    }



    private removeAliasIndicator(field: HTMLInputElement) {
        const existing = document.querySelector('.purelymail-alias-indicator');
        if (existing) {
            existing.remove();
        }
    }

    private async showAliasCreationModal(field: HTMLInputElement, suggestedDomain?: string) {
        // Remove any existing modal
        this.removeAliasModal();

        const settings = await StorageManager.getSettings();
        if (!settings || !settings.selectedDomains || settings.selectedDomains.length === 0) {
            alert('Please configure your Purelymail settings first.');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'purelymail-alias-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">                    <h3 style="margin: 0 0 16px 0; color: #111; font-size: 18px; font-weight: 600;">
                        Create New Email Alias
                    </h3>
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                        Create a new alias for this website to protect your privacy.<br>
                        <span style="font-size: 12px; color: #888;">Tip: Use Ctrl+Shift+A to quickly open this dialog</span>
                    </p>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">
                            Alias Name
                        </label>
                        <input 
                            type="text" 
                            id="purelymail-alias-name"
                            placeholder="e.g., ${this.generateSuggestion()}"
                            style="
                                width: 100%;
                                padding: 8px 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                                font-size: 14px;
                                box-sizing: border-box;
                            "
                        />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">
                            Domain
                        </label>
                        <select 
                            id="purelymail-alias-domain"
                            style="
                                width: 100%;
                                padding: 8px 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                                font-size: 14px;
                                box-sizing: border-box;
                            "
                        >
                            ${settings.selectedDomains.map(domain =>
            `<option value="${domain}" ${domain === settings.defaultDomain ? 'selected' : ''}>${domain}</option>`
        ).join('')}
                        </select>
                    </div>

                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button 
                            id="purelymail-cancel"
                            style="
                                padding: 8px 16px;
                                border: 1px solid #d1d5db;
                                background: white;
                                border-radius: 6px;
                                font-size: 14px;
                                cursor: pointer;
                                color: #374151;
                            "
                        >
                            Cancel
                        </button>
                        <button 
                            id="purelymail-create"
                            style="
                                padding: 8px 16px;
                                border: none;
                                background: #3b82f6;
                                color: white;
                                border-radius: 6px;
                                font-size: 14px;
                                cursor: pointer;
                                font-weight: 500;
                            "
                        >
                            Create Alias
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle modal interactions
        const aliasNameInput = modal.querySelector('#purelymail-alias-name') as HTMLInputElement;
        const aliasDomainSelect = modal.querySelector('#purelymail-alias-domain') as HTMLSelectElement;
        const cancelBtn = modal.querySelector('#purelymail-cancel') as HTMLButtonElement;
        const createBtn = modal.querySelector('#purelymail-create') as HTMLButtonElement;

        // Auto-focus the name input
        aliasNameInput.focus();

        // Set suggested name
        aliasNameInput.value = this.generateSuggestion();

        cancelBtn.addEventListener('click', () => {
            this.removeAliasModal();
        });

        createBtn.addEventListener('click', async () => {
            const aliasName = aliasNameInput.value.trim();
            const domain = aliasDomainSelect.value;

            if (!aliasName) {
                alert('Please enter an alias name.');
                return;
            }

            await this.createAlias(aliasName, domain, field);
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.removeAliasModal();
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeAliasModal();
            }
        });
    }

    private removeAliasModal() {
        const existing = document.querySelector('.purelymail-alias-modal');
        if (existing) {
            existing.remove();
        }
    } private generateSuggestion(): string {
        const hostname = window.location.hostname.replace(/^www\./, '');
        const cleanHostname = hostname.replace(/[^a-zA-Z0-9]/g, '');

        // Shorten very long domain names
        const shortHostname = cleanHostname.length > 10
            ? cleanHostname.substring(0, 10)
            : cleanHostname;

        const timestamp = Date.now().toString().slice(-3); // Use last 3 digits for shorter suffix
        return `${shortHostname}${timestamp}`;
    }

    private async createAlias(aliasName: string, domain: string, field: HTMLInputElement) {
        try {
            const createBtn = document.querySelector('#purelymail-create') as HTMLButtonElement;
            if (createBtn) {
                createBtn.textContent = 'Creating...';
                createBtn.disabled = true;
            }

            // Send message to background script to create the alias
            const response = await chrome.runtime.sendMessage({
                action: 'createAlias',
                aliasName,
                domain,
                currentUrl: window.location.href
            });

            if (response.success) {
                // Fill the field with the new alias
                const fullAlias = `${aliasName}@${domain}`;
                field.value = fullAlias;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));

                this.removeAliasModal();
                this.showSuccessMessage(fullAlias);
            } else {
                alert(`Error creating alias: ${response.error}`);
                if (createBtn) {
                    createBtn.textContent = 'Create Alias';
                    createBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error creating alias:', error);
            alert('Failed to create alias. Please try again.');
            const createBtn = document.querySelector('#purelymail-create') as HTMLButtonElement;
            if (createBtn) {
                createBtn.textContent = 'Create Alias';
                createBtn.disabled = false;
            }
        }
    }

    private showSuccessMessage(alias: string) {
        const success = document.createElement('div');
        success.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10002;
            max-width: 300px;
        `;
        success.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>✅</span>
                <div>
                    <div style="font-weight: 500;">Alias Created!</div>
                    <div style="font-size: 12px; opacity: 0.9;">${alias}</div>
                </div>
            </div>
        `;

        document.body.appendChild(success);

        setTimeout(() => {
            success.remove();
        }, 4000);
    }

    public destroy() {
        this.observer.disconnect();
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        this.removeAliasIndicator(null as any);
        this.removeAliasModal();
    }
}

// Initialize the email field detector
let detector: EmailFieldDetector | null = null;

// Only run on main frames (not iframes)
if (window === window.top) {
    detector = new EmailFieldDetector();
}

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (detector) {
        detector.destroy();
    }
});
