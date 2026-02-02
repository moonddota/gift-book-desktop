export const loadOriginalPDFScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).GiftRegistryPDF) {
      resolve()
      return
    }

    //  动态计算 static 目录的正确路径（兼容 dev 和 prod）
    const getStaticPath = (filename: string): string => {
      if (import.meta.env.DEV) {
        // 开发环境：使用绝对路径（Vite dev server）
        return `/static/${filename}`
      } else {
        // 生产环境：基于当前 HTML 文件位置构建相对路径
        // 假设 index.html 在 app://./index.html 或 file:///.../index.html
        const baseUrl = new URL('./', import.meta.url).href
        // 如果是 file 协议，baseUrl 类似 file:///C:/app/resources/app.asar/dist/index.html
        // 我们要的是 ./static/xxx，所以直接拼接
        return `${baseUrl}static/${filename}`
      }
    }

    const loadScript = (filename: string): Promise<void> => {
      return new Promise((res, rej) => {
        const script = document.createElement('script')
        script.src = getStaticPath(filename)
        script.onload = () => res()
        script.onerror = () => rej(new Error(`Failed to load ${filename}`))
        document.head.appendChild(script)
      })
    }

    // 顺序加载
    loadScript('pdf-lib.min.js')
      .then(() => loadScript('fontkit.umd.min.js'))
      .then(() => loadScript('GiftListPDFGenerator.js'))
      .then(() => {
        if (!(window as any).GiftRegistryPDF) {
          reject(new Error('GiftRegistryPDF not exposed to window'))
        } else {
          resolve()
        }
      })
      .catch(reject)
  })
}
