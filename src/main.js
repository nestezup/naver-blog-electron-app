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
        webSecurity: false, // Allow CDN access
        preload: join(__dirname, 'preload.js'),
        webviewTag: true, // Enable webview tag
        allowRunningInsecureContent: true,
      },
      titleBarStyle: 'default',
      show: false, // Don't show until ready
    })

    // Load the renderer
    this.window.loadFile(join(__dirname, '../app/renderer/index.html'))

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

    // Allow webview to access blog.naver.com
    ses.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      // Remove X-Frame-Options to allow webview
      delete responseHeaders['x-frame-options']
      delete responseHeaders['X-Frame-Options']

      callback({ responseHeaders })
    })

    // Handle certificate errors for HTTPS
    ses.setCertificateVerifyProc((request, callback) => {
      // For naver.com domains, allow certificates
      if (request.hostname.includes('naver.com')) {
        callback(0) // Allow
      } else {
        callback(-2) // Use default verification
      }
    })
  }

  getWindow() {
    return this.window
  }
}

// IPC handlers
function setupIPC() {
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