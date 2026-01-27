import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import 'reflect-metadata'
import { AppDataSource } from './database/dataSource'
import { registerEventHandlers } from './handlers/eventHandler.js'
import './windowManager'
import { closeSecondaryDisplay } from './windowManager'
// 保持原有关闭行为
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 675,
    minWidth: 960,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  //  核心：强制窗口按 16:10 比例缩放（Windows/macOS 原生支持）
  mainWindow.setAspectRatio(16 / 10)

  //  Linux 兜底方案（因 setAspectRatio 在 Linux 无效）
  if (process.platform === 'linux') {
    mainWindow.on('resize', () => {
      const [width, height] = mainWindow.getSize()
      const expectedHeight = Math.round(width / (16 / 10))
      if (height !== expectedHeight) {
        mainWindow.setSize(width, expectedHeight)
      }
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    closeSecondaryDisplay() // 确保主窗关时副屏也关
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载页面（开发/生产）
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用生命周期（完全保留原有逻辑）
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
    console.log('TypeORM 初始化成功')
    console.log(
      '扫描到的实体:',
      AppDataSource.entityMetadatas.map((m) => m.name)
    )
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  registerEventHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
