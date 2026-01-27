// src/main/windowManager.ts
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let secondaryDisplayWindow: BrowserWindow | null = null

export const openSecondaryDisplay = (initialData?: any): void => {
  if (secondaryDisplayWindow && !secondaryDisplayWindow.isDestroyed()) {
    if (secondaryDisplayWindow.isMinimized()) secondaryDisplayWindow.restore()
    secondaryDisplayWindow.focus()
    if (initialData) {
      secondaryDisplayWindow.webContents.send('secondary-display:init-data', initialData)
    }
    return
  }

  const { workArea } = screen.getPrimaryDisplay()
  const preloadPath = join(__dirname, '../preload/index.js')

  secondaryDisplayWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    frame: true,
    resizable: false,
    movable: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath
    }
  })

  const baseUrl =
    process.env.ELECTRON_RENDERER_URL || `file://${join(__dirname, '../renderer/index.html')}`
  const url = `${baseUrl}#/app/secondary-display`
  secondaryDisplayWindow.loadURL(url)

  if (initialData) {
    secondaryDisplayWindow.webContents.once('did-finish-load', () => {
      secondaryDisplayWindow!.webContents.send('secondary-display:init-data', initialData)
      secondaryDisplayWindow!.show()
    })
  } else {
    secondaryDisplayWindow.once('ready-to-show', () => {
      secondaryDisplayWindow!.show()
    })
  }

  secondaryDisplayWindow.on('closed', () => {
    secondaryDisplayWindow = null
  })
}

export const closeSecondaryDisplay = (): void => {
  if (secondaryDisplayWindow && !secondaryDisplayWindow.isDestroyed()) {
    secondaryDisplayWindow.close()
  }
}

//   向副屏发送更新数据
export const sendSecondaryDisplayData = (data: any): void => {
  if (secondaryDisplayWindow && !secondaryDisplayWindow.isDestroyed()) {
    secondaryDisplayWindow.webContents.send('secondary-display:update-data', data)
  }
}

// IPC handlers
ipcMain.handle('secondary-display:open', (_, data) => {
  openSecondaryDisplay(data)
})

ipcMain.handle('secondary-display:close', () => {
  closeSecondaryDisplay()
})

// ：主页面调用此方法更新副屏
ipcMain.handle('secondary-display:update-data', (_, data) => {
  sendSecondaryDisplayData(data)
})

export const sendSecondaryDisplayTheme = (isSolemn: boolean): void => {
  if (secondaryDisplayWindow && !secondaryDisplayWindow.isDestroyed()) {
    secondaryDisplayWindow.webContents.send('secondary-display:theme-update', isSolemn)
  }
}

// 注册 IPC handler
ipcMain.handle('secondary-display:theme-update', (_, isSolemn: boolean) => {
  sendSecondaryDisplayTheme(isSolemn)
})
