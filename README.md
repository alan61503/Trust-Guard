# TrustGuard Chrome Extension

A Chrome extension that scans webpages for potential misinformation and calculates a trust score based on suspicious keywords and phrases.

## Features

- **Page Scanning**: Extracts all visible text from the current webpage
- **Misinformation Detection**: Searches for suspicious keywords and phrases commonly associated with misinformation
- **Trust Score Calculation**: Provides a percentage-based trust score (100% - 10% per suspicious keyword found)
- **Clean UI**: Modern, intuitive popup interface with visual feedback
- **Real-time Analysis**: Instant results with loading indicators

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download or Clone** this repository to your local machine
2. **Generate Icons** (if needed):
   - Open `generate-icons.html` in your browser
   - Click the download buttons to save icons to the `icons/` folder
   - Make sure you have `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png` in the `icons/` folder
3. **Open Chrome** and navigate to `chrome://extensions/`
4. **Enable Developer Mode** by toggling the switch in the top right
5. **Click "Load unpacked"** and select the TrustGuard folder
6. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store (Future)

The extension will be available on the Chrome Web Store once published.

## Usage

1. **Navigate** to any webpage you want to scan
2. **Click** the TrustGuard extension icon in your toolbar
3. **Click "Scan Page"** to analyze the current webpage
4. **Review** the trust score and any suspicious keywords found
5. **Use the results** to make informed decisions about the content

## How It Works

### Text Extraction
The extension uses a sophisticated text extraction algorithm that:
- Traverses the DOM using TreeWalker
- Filters out hidden elements (display: none, visibility: hidden, etc.)
- Excludes script tags, style tags, and other non-content elements
- Extracts only visible, meaningful text content

### Keyword Detection
TrustGuard searches for suspicious keywords and phrases such as:
- "miracle cure", "you won't believe", "shocking"
- "secret revealed", "doctors hate this", "one weird trick"
- "lose weight fast", "cure cancer", "government conspiracy"
- "clickbait", "viral", "breaking news", "exclusive"
- And many more...

### Trust Score Calculation
- **Starting Score**: 100%
- **Deduction**: 10% per suspicious keyword found
- **Minimum Score**: 0%
- **Color Coding**:
  - 🟢 Green (70-100%): High trust
  - 🟡 Yellow (40-69%): Medium trust
  - 🔴 Red (0-39%): Low trust

## File Structure

```
TrustGuard/
├── manifest.json          # Extension configuration
├── popup.html            # Popup UI
├── popup.js              # Popup functionality
├── content.js            # Content script for text extraction
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── generate-icons.html   # Icon generator tool
└── README.md            # This file
```

## Technical Details

### Permissions
- `activeTab`: Access to the current tab for text extraction
- `scripting`: Execute scripts in tabs for content analysis
- `host_permissions`: Access to all URLs for content script injection

### Manifest V3 Configuration
The extension uses Manifest V3 with the following key features:
- **Service Worker**: Background script for extension lifecycle management
- **Content Scripts**: Automatically injected into all web pages
- **Host Permissions**: Required for content script execution on all sites
- **Web Accessible Resources**: Icons accessible to web pages if needed

### Architecture
- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Service Worker**: Background script for extension lifecycle management
- **Content Script**: Injected into web pages for text extraction
- **Popup**: User interface for interaction and results display

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## Development

### Prerequisites
- Chrome browser with developer mode enabled
- Basic knowledge of HTML, CSS, and JavaScript

### Making Changes
1. **Edit** the source files as needed
2. **Reload** the extension in `chrome://extensions/`
3. **Test** your changes on various websites

### Adding New Keywords
To add new suspicious keywords, edit the `suspiciousKeywords` array in `popup.js`:

```javascript
this.suspiciousKeywords = [
    // ... existing keywords ...
    'your new keyword here',
    'another suspicious phrase'
];
```

## Future Enhancements

### Phase 2 Features (Planned)
- **Machine Learning Integration**: More sophisticated content analysis
- **Fact-Checking API**: Integration with fact-checking services
- **User Reports**: Allow users to report false positives/negatives
- **Scan History**: View previous scan results
- **Custom Keywords**: User-defined suspicious keyword lists
- **Domain Reputation**: Track and display website reputation scores

### Phase 3 Features (Future)
- **Real-time Monitoring**: Automatic scanning of new content
- **Social Media Integration**: Analyze social media posts
- **Browser Notifications**: Alert users to potential misinformation
- **Export Results**: Save scan results for later reference

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

TrustGuard is designed to assist users in identifying potential misinformation but should not be considered infallible. Always use critical thinking and verify information from multiple reliable sources. The extension is provided "as is" without any warranties.

## Support

For issues, questions, or feature requests:
1. Check the existing issues in the repository
2. Create a new issue with detailed information
3. Include browser version, extension version, and steps to reproduce

---

**TrustGuard** - Your digital shield against misinformation 🛡️