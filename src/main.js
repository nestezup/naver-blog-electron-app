const { app, BrowserWindow, session, ipcMain } = require('electron')
const { join } = require('path')

const isDev = process.env.NODE_ENV === 'development'

class MainWindow {
  constructor() {
    this.window = null
    this.createWindow()
  }

  createWindow() {
    // Create the browser window
    this.window = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: join(__dirname, 'preload.js'),
        webviewTag: true, // Enable webview tag
        allowRunningInsecureContent: false,
      },
      titleBarStyle: 'default',
      show: false, // Don't show until ready
    })

    // Load the appropriate renderer based on authentication status
    this.loadAppropriateRenderer()

    if (isDev) {
      this.window.webContents.openDevTools()
    }

    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    // Handle window closed
    this.window.on('closed', () => {
      this.window = null
    })

    // Configure session for webview
    this.configureSession()
  }

  configureSession() {
    const ses = session.defaultSession

    // Set CSP to allow CDN scripts
    ses.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      // Remove X-Frame-Options to allow webview
      delete responseHeaders['x-frame-options']
      delete responseHeaders['X-Frame-Options']

      // Add CSP header for local resources
      if (details.url.startsWith('file:')) {
        const csp = [
          "default-src 'self' blob: data: https://* http://*",
          "script-src 'self' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data: https://* http://*",
          "font-src 'self' data:",
          "connect-src 'self' blob: data: https://* http://*",
          "frame-src 'self' https://* http://*"
        ].join('; ')

        responseHeaders['content-security-policy'] = [csp]
      }

      callback({ responseHeaders })
    })

    ses.webRequest.onErrorOccurred((details) => {
      console.error('Network request error:', {
        url: details.url,
        error: details.error,
        method: details.method,
        resourceType: details.resourceType,
        ip: details.ip,
        fromCache: details.fromCache,
        netError: details.errorCode,
      })
    })

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      if (details.url.includes('identitytoolkit.googleapis.com')) {
        console.log('Firebase request headers:', {
          url: details.url,
          method: details.method,
          headers: details.requestHeaders,
        })
      }
      callback({ requestHeaders: details.requestHeaders })
    })

    // Handle certificate errors for HTTPS
    ses.setCertificateVerifyProc((request, callback) => {
      const allowList = [
        'naver.com',
        'googleapis.com',
        'gstatic.com',
        'firebaseapp.com',
        'firebaseio.com',
        'googleusercontent.com',
      ]

      const isAllowed = allowList.some((domain) =>
        request.hostname === domain || request.hostname.endsWith(`.${domain}`),
      )

      if (isAllowed) {
        callback(0) // Explicitly trust allow-listed domains
        return
      }

      callback(-2) // Fallback to Chromium's default verification
    })
  }

  loadAppropriateRenderer() {
    // For now, always load the auth screen first
    // The auth screen will handle redirecting to main app if user is authenticated
    console.log('Loading authentication screen...');
    this.window.loadFile(join(__dirname, '../app/renderer/auth.html'));
  }

  getWindow() {
    return this.window
  }
}

// IPC handlers
function setupIPC() {
  // Authentication management
  ipcMain.handle('logout', async (event) => {
    try {
      // Clear session data
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localStorage', 'sessionStorage', 'indexedDB']
      });

      console.log('User logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('check-auth', async (event) => {
    try {
      // For now, always return false - auth screen will handle the actual authentication
      return { authenticated: false };
    } catch (error) {
      console.error('Auth check error:', error);
      return { authenticated: false, error: error.message };
    }
  });

  // Cookie management
  ipcMain.handle('get-cookies', async (event, url) => {
    try {
      const cookies = await session.defaultSession.cookies.get({ url })
      return cookies
    } catch (error) {
      console.error('Failed to get cookies:', error)
      return []
    }
  })

  ipcMain.handle('set-cookie', async (event, url, cookie) => {
    try {
      await session.defaultSession.cookies.set({ url, ...cookie })
      return true
    } catch (error) {
      console.error('Failed to set cookie:', error)
      return false
    }
  })

  ipcMain.handle('clear-cookies', async (event, url) => {
    try {
      await session.defaultSession.clearStorageData({
        origin: url,
        storages: ['cookies']
      })
      return true
    } catch (error) {
      console.error('Failed to clear cookies:', error)
      return false
    }
  })

  // Blog API proxy
  ipcMain.handle('call-blog-api', async (event, endpoint, data, cookies) => {
    // This would be implemented to make HTTP requests to Naver Blog API
    // using the provided cookies for authentication
    console.log('Blog API call:', { endpoint, data, cookies })
    return { success: true, data: 'API call placeholder' }
  })

  // App management
  ipcMain.on('close-app', () => {
    app.quit()
  })

  ipcMain.on('minimize-app', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  ipcMain.on('maximize-app', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
  })

  ipcMain.on('open-dev-tools', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.webContents.openDevTools()
  })
}

// App event handlers
app.whenReady().then(() => {
  setupIPC()
  new MainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      new MainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.log('Prevented new window navigation to:', url)
    return { action: 'deny' }
  })
})

// Handle app certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.includes('naver.com')) {
    // Ignore certificate errors for naver.com
    event.preventDefault()
    callback(true)
  } else {
    callback(false)
  }
})
