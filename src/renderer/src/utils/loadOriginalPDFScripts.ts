export const loadOriginalPDFScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).GiftRegistryPDF) {
      resolve()
      return
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((res, rej) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = () => res()
        script.onerror = () => rej(new Error(`Failed to load ${src}`))
        document.head.appendChild(script)
      })
    }

    //  顺序加载（关键！）
    loadScript('/static/pdf-lib.min.js')
      .then(() => loadScript('/static/fontkit.umd.min.js'))
      .then(() => loadScript('/static/GiftListPDFGenerator.js'))
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
