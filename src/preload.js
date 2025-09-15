const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  // Cookie management
  getCookies: (url) => ipcRenderer.invoke('get-cookies', url),
  setCookie: (url, cookie) => ipcRenderer.invoke('set-cookie', url, cookie),
  clearCookies: (url) => ipcRenderer.invoke('clear-cookies', url),

  // WebView management
  onWebViewMessage: (callback) => {
    ipcRenderer.on('webview-message', (event, message) => callback(message))
  },
  sendToWebView: (message) => ipcRenderer.send('send-to-webview', message),

  // Blog API
  callBlogAPI: (endpoint, data, cookies) =>
    ipcRenderer.invoke('call-blog-api', endpoint, data, cookies),

  // App management
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  maximizeApp: () => ipcRenderer.send('maximize-app'),

  // Development
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
}

// WebView interface for cookie extraction
const webViewAPI = {
  // Extract cookies from webview
  extractCookies: () => {
    if (typeof window !== 'undefined' && window.webview) {
      return window.webview.executeJavaScript('document.cookie')
    }
    return Promise.resolve('')
  },

  // Inject scripts into webview
  injectScript: (script) => {
    if (typeof window !== 'undefined' && window.webview) {
      return window.webview.executeJavaScript(script)
    }
    return Promise.resolve(null)
  },

  // Get webview URL
  getCurrentURL: () => {
    if (typeof window !== 'undefined' && window.webview) {
      return window.webview.getURL()
    }
    return ''
  }
}

// Utility functions
const utils = {
  // Parse cookie string to object
  parseCookies: (cookieString) => {
    const cookies = {}
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })
    return cookies
  },

  // Format cookies for API requests
  formatCookiesForAPI: (cookies) => {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join('; ')
  },

  // Validate Naver login status
  isLoggedIn: (cookies) => {
    // Check for essential authentication cookies
    const hasAuthCookies = cookies.NID_AUT && cookies.NID_SES;
    const hasUserCookies = cookies.NID_JKL || cookies.NID_SLT;

    // Additional check for login-specific cookies that exist when logged in
    return hasAuthCookies && hasUserCookies;
  }
}

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('webViewAPI', webViewAPI)
contextBridge.exposeInMainWorld('utils', utils)