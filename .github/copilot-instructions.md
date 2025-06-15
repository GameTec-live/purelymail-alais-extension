<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Purelymail Alias Manager Chrome Extension

This is a Chrome extension project for managing email aliases through the Purelymail API.

## Technology Stack
- **TypeScript**: Primary language for type safety and modern JavaScript features
- **Bun**: Package manager for fast dependency management
- **TailwindCSS**: Utility-first CSS framework for styling
- **Webpack**: Module bundler for building the extension
- **Chrome Extensions Manifest V3**: Latest Chrome extension platform

## Architecture Guidelines
- Use Chrome's Manifest V3 service workers instead of background pages
- Store settings using Chrome's sync storage API
- Follow Chrome extension security best practices
- Use TypeScript interfaces for API responses and data structures

## Code Style
- Use modern ES6+ features and async/await for promises
- Implement proper error handling for API calls and user interactions
- Use semantic HTML and accessible UI components
- Follow TailwindCSS utility patterns for consistent styling

## API Integration
- All API calls should go through the PurelymailAPI class
- Handle rate limiting and network errors gracefully
- Cache API responses when appropriate to reduce unnecessary calls
- Use proper TypeScript types for all API request/response objects

## Extension Patterns
- Use message passing between background script and popup/settings
- Implement proper cleanup for event listeners
- Store user preferences persistently using Chrome storage
- Provide clear user feedback for all actions (loading, success, error states)
