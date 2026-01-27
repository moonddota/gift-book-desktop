import { join } from 'path'

export const MAIN_WINDOW_WEBPACK_ENTRY =
  process.env.ELECTRON_RENDERER_URL || `file://${join(__dirname, '../renderer/index.html')}`
