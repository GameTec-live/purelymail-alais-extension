# Purelymail Alias Manager

Purelymail Alias Manager

A Chrome extension for managing email aliases with Purelymail accounts.

https://chromewebstore.google.com/detail/purelymail-alias-manager/loapkkkgcpphggjidfepfdljchkemoea

## Features

- **First-run setup**: Automatically opens settings page on first install
- **Extension settings**:
  - Configure API token for Purelymail access
  - Set default account for new aliases
  - Hide system/admin aliases from the UI
  - Set default domain for alias creation
  - Hide specific users from dropdowns
  - Configure spam email account (built-in accounts or custom)
- **Popup interface**:
  - Create new aliases with domain and account selection
  - View existing aliases by domain (multi-select)
  - Quick actions: Mark as spam or delete aliases
  - Persistent domain selection
- **Shortcut for quick creation (Ctrl+Shift+A)**

## Setup

1. Get your Purelymail API token from the control panel
2. Install the extension
3. Configure your settings on first run
4. Start managing your email aliases!

## Development

### Prerequisites

- [Bun](https://bun.sh/) package manager

### Installation

https://chromewebstore.google.com/detail/purelymail-alias-manager/loapkkkgcpphggjidfepfdljchkemoea


```bash
# Install dependencies
bun install

# Build for development with watch mode
bun run dev

# Build for production
bun run build

# Clean build directory
bun run clean
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder
4. The extension will appear in your Chrome toolbar

## API Integration

This extension integrates with the [Purelymail API](https://purelymail.com/docs/api) to:

- List domains and users
- Create and delete routing rules (aliases)
- Manage email forwarding
