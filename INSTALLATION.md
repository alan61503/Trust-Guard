# TrustGuard Installation Guide

## Quick Setup

### Step 1: Icons Ready
✅ PNG icons are already generated and ready to use:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels) 
- `icons/icon128.png` (128x128 pixels)

The extension should load immediately without any icon setup required.

### Step 2: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the TrustGuard folder
5. The extension should now appear in your extensions list

### Step 3: Pin Extension
1. Click the puzzle piece icon in Chrome's toolbar
2. Find "TrustGuard" and click the pin icon
3. The extension icon will now appear in your toolbar

## Testing the Extension

1. Navigate to any webpage
2. Click the TrustGuard icon in your toolbar
3. Click "Scan Page" to analyze the content
4. Review the trust score and any suspicious keywords found

## Troubleshooting

### Icons Not Loading
- PNG icons are already generated and should work immediately
- If issues persist, verify the filenames are exactly: `icon16.png`, `icon48.png`, `icon128.png`

### Extension Not Working
- Check the browser console for errors
- Make sure you're on a regular webpage (not chrome:// pages)
- Try reloading the extension in `chrome://extensions/`

### Scan Not Working
- Ensure the webpage has fully loaded
- Try refreshing the page and scanning again
- Check that the extension has permission to access the current tab

## File Structure
```
TrustGuard/
├── manifest.json          # Extension configuration
├── popup.html            # Popup UI
├── popup.js              # Popup functionality
├── content.js            # Content script
├── background.js         # Background service worker
├── icons/                # Extension icons (PNG files)
├── generate-icons.html   # Icon generator
├── README.md            # Full documentation
└── INSTALLATION.md      # This file
```

## Support
If you encounter issues, check the main README.md file for detailed documentation and troubleshooting steps. 