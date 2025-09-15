# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Naver Blog Electron application that provides a webview interface for blog.naver.com with cookie authentication support. The app enables users to log in directly through the webview and uses same-origin credentials for API requests.

## Project Requirements

### Core Functionality
- Electron app with webview displaying blog.naver.com
- Direct login through webview interface
- Cookie authentication with same-origin credentials
- Integration with Naver Blog API for post management

### Technology Stack
- **Desktop Framework**: Electron
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Frontend Styling**: Tailwind CSS v4 + DaisyUI (CDN)
- **Authentication**: WebView cookies with same-origin policy
- **API Requests**: WebView executeJavaScript method

## API Integration

The application integrates with Naver Blog's RabbitUpdate API using **WebView executeJavaScript method** to avoid CORS issues.

### Implementation Method
**WebView executeJavaScript approach**: API requests are executed inside the WebView context using `webview.executeJavaScript()`. This ensures:
- Same-origin policy compliance (WebView is already on blog.naver.com)
- Automatic cookie inclusion from WebView session
- No CORS restrictions
- Direct access to Naver Blog APIs

### API Request Structure
```javascript
// Executed inside WebView via executeJavaScript
const response = await fetch('https://blog.naver.com/RabbitUpdate.naver', {
    method: 'POST',
    headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://blog.naver.com',
        'referer': window.location.href,
        'sec-fetch-site': 'same-origin',
    },
    body: formData.toString(),
    credentials: 'same-origin'
});
```

### Complete curl example:
```bash
curl 'https://blog.naver.com/RabbitUpdate.naver' \
-H 'accept: application/json, text/plain, */*' \
-H 'accept-language: ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' \
-H 'cache-control: no-cache' \
-H 'content-type: application/x-www-form-urlencoded' \
-H 'origin: https://blog.naver.com' \
-H 'pragma: no-cache' \
-H 'priority: u=1, i' \
-H 'referer: https://blog.naver.com/nest4000/postupdate?logNo=224007934456' \
-H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
-H 'sec-ch-ua-mobile: ?0' \
-H 'sec-ch-ua-platform: "macOS"' \
-H 'sec-fetch-dest: empty' \
-H 'sec-fetch-mode: cors' \
-H 'sec-fetch-site: same-origin' \
-H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' \
-H 'Cookie: [cookies automatically included via same-origin]' \
-d 'blogId=nest4000' \
-d 'documentModel={COMPLEX_DOCUMENT_JSON}' \
-d 'mediaResources={"image":[],"video":[],"file":[]}' \
-d 'populationParams={POPULATION_PARAMS_JSON}' \
-d 'productApiVersion=v1'
```

Key requirements:
- `content-type: application/x-www-form-urlencoded`
- `origin: https://blog.naver.com`
- `credentials: 'same-origin'`
- Execute from WebView context (not renderer process)

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Commands
```bash
# Start development environment (both main and renderer)
npm run dev

# Build the application
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run Electron app (after build)
npm run electron

# Package the application
npm run pack

# Build and create distributable
npm run dist
```

### Project Structure
```
src/
├── main.js         # Electron main process (vanilla JS)
├── preload.js      # Preload scripts (security bridge)
└── app/renderer/   # Frontend (vanilla JS)
    ├── index.html  # Main HTML with CDN imports
    └── js/
        └── app.js  # Main application logic
```

## Architecture Notes

### WebView Integration
- Use Electron's webview tag to embed blog.naver.com
- Extract cookies from webview using `executeJavaScript('document.cookie')`
- Execute API requests inside WebView context for same-origin compliance

### Frontend Implementation
- **Vanilla HTML/CSS/JavaScript** (no React, Vue, or other frameworks)
- **CDN imports**: Tailwind CSS v4 + DaisyUI loaded via CDN links
- **Simple structure**: Left sidebar + right webview layout
- **DaisyUI components**: Use DaisyUI classes for consistent UI styling

### API Request Flow
1. User logs into blog.naver.com through WebView
2. Extract cookies using `webview.executeJavaScript('document.cookie')`
3. Parse and validate cookies (NID_AUT, NID_SES required)
4. Execute API requests inside WebView using `webview.executeJavaScript()`
5. WebView automatically includes session cookies with same-origin requests

### Cookie Management
- **Cookie extraction**: Execute JavaScript in WebView using `executeJavaScript('document.cookie')`
- **Cookie usage**: Utilize same-origin policy for automatic cookie inclusion in API requests
- **Login validation**: Check NID_AUT and NID_SES cookies for authentication status
- **Manual refresh**: Debug button available for cookie extraction testing
- **Automatic handling**: WebView manages cookies automatically with same-origin requests