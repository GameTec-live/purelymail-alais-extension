# mail

To ins# Purelymail Alias Manager

A Chrome extension for managing email aliases with Purelymail accounts.

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

## Setup

1. Get your Purelymail API token from the control panel
2. Install the extension
3. Configure your settings on first run
4. Start managing your email aliases!

## Development

### Prerequisites

- [Bun](https://bun.sh/) package manager
- Node.js and npm (for some build tools)

### Installation

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

### Project Structure

```
├── src/
│   ├── api.ts          # Purelymail API client
│   ├── background.ts   # Service worker for extension lifecycle
│   ├── popup.ts        # Popup interface logic
│   ├── settings.ts     # Settings page logic
│   ├── storage.ts      # Chrome storage management
│   ├── styles.css      # TailwindCSS styles
│   └── types.ts        # TypeScript type definitions
├── icons/              # Extension icons
├── popup.html          # Popup interface HTML
├── settings.html       # Settings page HTML
├── manifest.json       # Chrome extension manifest
└── webpack.config.js   # Build configuration
```

## API Integration

This extension integrates with the [Purelymail API](https://purelymail.com/docs/api) to:

- List domains and users
- Create and delete routing rules (aliases)
- Manage email forwarding

## Security

- API tokens are stored securely using Chrome's sync storage
- All API communication uses HTTPS
- No sensitive data is logged or transmitted to third parties

## License

MIT Licensell dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.12. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
