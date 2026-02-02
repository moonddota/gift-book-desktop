import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFFont, PDFImage, rgb, StandardFonts } from 'pdf-lib'

import MainFontUrl from '@renderer/assets/fonts/MaShanZheng-Regular.ttf?url'
import FormalFontUrl from '@renderer/assets/fonts/NotoSansSCMedium-mini.ttf?url'
import GiftLabelFontUrl from '@renderer/assets/fonts/SourceHanSerifCN-Heavy.ttf?url'
import BgImageUrl from '@renderer/assets/images/bg.jpg?url'
import CoverImageUrl from '@renderer/assets/images/cover1.jpg?url'

import { RecordItem } from 'src/sharedTypes'

// =============== 新增辅助函数 ===============
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

async function convertImageToGrayscale(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = img.width
      canvas.height = img.height
      ctx.filter = 'grayscale(100%)'
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      resolve(dataUrl)
    }
    img.onerror = reject
    img.src = url
  })
}
// ==========================================

interface ProcessedRecordItem extends RecordItem {
  positionIndex: string
}

interface GiftRegistryPDFOptions {
  title: string
  giftLabel: string
  itemsPerPage?: number
  printCover?: boolean
  printSummary?: boolean
  printAppendix?: boolean
  showCoverTitle?: boolean
  subtitle?: string
  recorder?: string
  partIndex?: number
  totalParts?: number
  isSolemn?: boolean // true = 白事（暗色），false = 红事（亮色）
}

export class GiftRegistryPDF {
  private readonly options: Required<GiftRegistryPDFOptions>
  private readonly pageSize: [number, number] = [841.89, 595.28] // A4 横向

  constructor(opts: GiftRegistryPDFOptions) {
    this.options = {
      title: opts.title,
      giftLabel: opts.giftLabel,
      itemsPerPage: opts.itemsPerPage ?? 12,
      printCover: opts.printCover ?? true,
      printSummary: opts.printSummary ?? true,
      printAppendix: opts.printAppendix ?? true,
      showCoverTitle: opts.showCoverTitle ?? true,
      subtitle: opts.subtitle ?? '',
      recorder: opts.recorder ?? '',
      partIndex: opts.partIndex ?? 1,
      totalParts: opts.totalParts ?? 1,
      isSolemn: opts.isSolemn ?? false
    }
  }

  private _numberToChinese(num: number): string {
    if (num === 0) return '零元整'
    const units = ['', '拾', '佰', '仟']
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
    let integerPart = Math.floor(Math.abs(num))
    let result = ''
    let zeroFlag = false

    for (let i = 0; integerPart > 0; i++) {
      const digit = integerPart % 10
      integerPart = Math.floor(integerPart / 10)
      if (digit === 0) {
        zeroFlag = true
      } else {
        if (zeroFlag) {
          result = '零' + result
          zeroFlag = false
        }
        result = digits[digit] + units[i % 4] + result
        if (i === 3 && integerPart > 0) result = '万' + result
      }
    }
    return result.replace(/(零)+/g, '零').replace(/零+$/, '') + '元整'
  }

  private _formatRMB(amount: number): string {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount || 0)
  }

  private _processRecords(records: RecordItem[]): ProcessedRecordItem[] {
    const validRecords = records.filter((r) => !r.voided)
    let currentPage = 1
    let currentRow = 0
    return validRecords.map((record) => {
      currentRow++
      if (currentRow > this.options.itemsPerPage) {
        currentPage++
        currentRow = 1
      }
      return {
        ...record,
        positionIndex: `第${currentPage}页第${currentRow}人`
      }
    })
  }

  private _wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): { lines: string[]; height: number } {
    const lines: string[] = []
    const paragraphs = (text || '').split(/\r?\n/)

    for (const paragraph of paragraphs) {
      if (paragraph === '') {
        lines.push('')
        continue
      }

      let currentLine = ''
      const chars = [...paragraph]
      for (const char of chars) {
        const testLine = currentLine ? `${currentLine}${char}` : char
        if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = char
        }
      }
      if (currentLine) lines.push(currentLine)
    }

    const lineHeight = fontSize + 4
    return { lines, height: lines.length * lineHeight }
  }

  private _drawText(
    page: any,
    text: string,
    font: PDFFont,
    options: {
      x: number
      y: number
      cellWidth: number
      cellHeight: number
      initialFontSize: number
      minFontSize: number
      color: ReturnType<typeof rgb>
      isVertical: boolean
    }
  ): void {
    if (!text) return

    const { x, y, cellWidth, cellHeight, initialFontSize, minFontSize, color, isVertical } = options

    if (!isVertical) {
      let fontSize = initialFontSize
      while (fontSize >= minFontSize && font.widthOfTextAtSize(text, fontSize) > cellWidth * 0.9) {
        fontSize -= 0.5
      }
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      const textHeight = font.heightAtSize(fontSize)
      page.drawText(text, {
        x: x + (cellWidth - textWidth) / 2,
        y: y + (cellHeight - textHeight) / 2 + textHeight / 10,
        size: fontSize,
        font,
        color
      })
      return
    }

    const letterSpacing = 4
    const chars = [...text]
    if (chars.length === 0) return

    const cellWidth90 = cellWidth * 0.9
    const cellHeight90 = cellHeight * 0.9

    const calcHeight = (numChars: number, fs: number): number =>
      numChars * (fs + letterSpacing) - (numChars > 0 ? letterSpacing : 0)

    const calcWidth = (numCols: number, fs: number): number =>
      numCols * fs + (numCols - 1) * letterSpacing

    const charHeight = initialFontSize + letterSpacing
    const adaptiveMaxCharsPerCol = Math.max(
      1,
      Math.floor((cellHeight90 + letterSpacing) / charHeight)
    )
    const neededCols = Math.ceil(chars.length / adaptiveMaxCharsPerCol)

    let finalColCount: number
    let finalFontSize = initialFontSize
    let finalCharsPerColForHeight: number

    if (neededCols === 1) {
      finalColCount = 1
      finalCharsPerColForHeight = chars.length
      while (finalFontSize >= minFontSize) {
        const height = calcHeight(finalCharsPerColForHeight, finalFontSize)
        const width = calcWidth(finalColCount, finalFontSize)
        if (height <= cellHeight90 && width <= cellWidth90) break
        finalFontSize -= 0.5
      }
    } else if (neededCols === 2) {
      finalColCount = 2
      finalCharsPerColForHeight = adaptiveMaxCharsPerCol
      const height = calcHeight(finalCharsPerColForHeight, initialFontSize)
      const width = calcWidth(finalColCount, initialFontSize)
      if (height <= cellHeight90 && width <= cellWidth90) {
        finalFontSize = initialFontSize
      } else {
        finalColCount = 3
        finalCharsPerColForHeight = adaptiveMaxCharsPerCol
        finalFontSize = initialFontSize
        while (finalFontSize >= minFontSize) {
          const height = calcHeight(finalCharsPerColForHeight, finalFontSize)
          const width = calcWidth(finalColCount, finalFontSize)
          if (height <= cellHeight90 && width <= cellWidth90) break
          finalFontSize -= 0.5
        }
      }
    } else {
      finalColCount = 3
      finalCharsPerColForHeight = adaptiveMaxCharsPerCol
      while (finalFontSize >= minFontSize) {
        const height = calcHeight(finalCharsPerColForHeight, finalFontSize)
        const width = calcWidth(finalColCount, finalFontSize)
        if (height <= cellHeight90 && width <= cellWidth90) break
        finalFontSize -= 0.5
      }
    }

    if (finalFontSize < minFontSize) finalFontSize = minFontSize

    const charsPerColForDrawing = adaptiveMaxCharsPerCol
    const blockHeight = calcHeight(finalCharsPerColForHeight, finalFontSize)
    const blockWidth = calcWidth(finalColCount, finalFontSize)
    const blockLeft = x + (cellWidth - blockWidth) / 2
    const blockBottom = y + (cellHeight - blockHeight) / 2

    for (let c = 0; c < finalColCount; c++) {
      const colChars = chars.slice(c * charsPerColForDrawing, (c + 1) * charsPerColForDrawing)
      if (colChars.length === 0) continue

      const colHeight = calcHeight(colChars.length, finalFontSize)
      const colStartY =
        blockBottom +
        (blockHeight - colHeight) / 2 +
        (colHeight - finalFontSize) +
        letterSpacing / 2

      colChars.forEach((char, r) => {
        const charWidth = font.widthOfTextAtSize(char, finalFontSize)
        page.drawText(char, {
          x: blockLeft + c * (finalFontSize + letterSpacing) + (finalFontSize - charWidth) / 2,
          y: colStartY - r * (finalFontSize + letterSpacing),
          size: finalFontSize,
          font,
          color
        })
      })
    }
  }

  private _drawFooter(page: any, font: PDFFont, left: string, center: string, right: string): void {
    const { width } = page.getSize()
    const y = 17
    const size = 10

    if (left) page.drawText(left, { x: 30, y, size, font, color: rgb(0.6, 0.6, 0.6) })
    if (center) {
      const w = font.widthOfTextAtSize(center, size)
      page.drawText(center, { x: (width - w) / 2, y, size, font, color: rgb(0.6, 0.6, 0.6) })
    }
    if (right) {
      const w = font.widthOfTextAtSize(right, size)
      page.drawText(right, { x: width - 30 - w, y, size, font, color: rgb(0.6, 0.6, 0.6) })
    }
  }

  // ✅ 主题色：白事统一使用 #353637
  private getThemeColor(key: 'text' | 'accent' | 'coverTitle'): ReturnType<typeof rgb> {
    const uiDarkColor = rgb(53 / 255, 54 / 255, 55 / 255) // #353637

    if (this.options.isSolemn) {
      return uiDarkColor
    } else {
      switch (key) {
        case 'text':
          return rgb(0.2, 0.2, 0.2)
        case 'accent':
          return rgb(0.8, 0, 0)
        case 'coverTitle':
          return rgb(0.96, 0.83, 0.67)
      }
    }
  }

  private async _addGiftAppendix(
    pdfDoc: PDFDocument,
    font: PDFFont,
    bgImage: PDFImage | null,
    giftRecords: ProcessedRecordItem[]
  ): Promise<void> {
    if (giftRecords.length === 0) return

    const [pageWidth, pageHeight] = this.pageSize
    const margin = { top: 70, bottom: 45, left: 60, right: 60 }
    const colWidths = [120, 160, pageWidth - margin.left - margin.right - 280]

    const pages: any[] = []
    const pageBottoms: Record<number, number> = {}

    let page = pdfDoc.addPage(this.pageSize)
    pages.push(page)
    // ✅ 仅红事才绘制背景图（白事已传入灰度图）
    if (bgImage && !this.options.isSolemn) {
      page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    }
    // ✅ 白事也绘制背景图（但已是灰度）
    if (bgImage && this.options.isSolemn) {
      page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    }

    let cursorY = pageHeight - margin.top
    const title = '附录：礼品清单'
    const titleWidth = font.widthOfTextAtSize(title, 28)
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: cursorY,
      size: 28,
      font,
      color: this.getThemeColor('accent')
    })
    cursorY -= 40
    const tableTopYOnFirstPage = cursorY

    const headers = ['姓名', '位置索引', '备注信息']
    const rowHeight = 28
    let x = 60
    headers.forEach((header, i) => {
      const textWidth = font.widthOfTextAtSize(header, 14)
      page.drawText(header, {
        x: x + (colWidths[i] - textWidth) / 2,
        y: cursorY - rowHeight + (rowHeight - 14) / 2,
        size: 14,
        font,
        color: this.getThemeColor('accent')
      })
      if (i < headers.length - 1) {
        page.drawLine({
          start: { x: x + colWidths[i], y: cursorY },
          end: { x: x + colWidths[i], y: cursorY - rowHeight },
          color: this.getThemeColor('accent'),
          thickness: 0.8
        })
      }
      x += colWidths[i]
    })
    page.drawLine({
      start: { x: 60, y: cursorY - rowHeight },
      end: { x: 60 + colWidths.reduce((a, b) => a + b, 0), y: cursorY - rowHeight },
      color: this.getThemeColor('accent'),
      thickness: 1.2
    })
    cursorY -= rowHeight

    for (const record of giftRecords) {
      const { lines, height } = this._wrapText(record.gift || '', font, 11, colWidths[2] - 12)
      const rowHeight = Math.max(30, height + 10)

      if (cursorY - rowHeight < margin.bottom) {
        pageBottoms[pages.length - 1] = cursorY
        page = pdfDoc.addPage(this.pageSize)
        pages.push(page)
        // ✅ 同样处理新页背景
        if (bgImage && !this.options.isSolemn) {
          page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
        }
        if (bgImage && this.options.isSolemn) {
          page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
        }
        cursorY = pageHeight - margin.top
        // Re-draw header
        x = 60
        headers.forEach((header, i) => {
          const textWidth = font.widthOfTextAtSize(header, 14)
          page.drawText(header, {
            x: x + (colWidths[i] - textWidth) / 2,
            y: cursorY - rowHeight + (rowHeight - 14) / 2,
            size: 14,
            font,
            color: this.getThemeColor('accent')
          })
          if (i < headers.length - 1) {
            page.drawLine({
              start: { x: x + colWidths[i], y: cursorY },
              end: { x: x + colWidths[i], y: cursorY - rowHeight },
              color: this.getThemeColor('accent'),
              thickness: 0.8
            })
          }
          x += colWidths[i]
        })
        page.drawLine({
          start: { x: 60, y: cursorY - rowHeight },
          end: { x: 60 + colWidths.reduce((a, b) => a + b, 0), y: cursorY - rowHeight },
          color: this.getThemeColor('accent'),
          thickness: 1.2
        })
        cursorY -= rowHeight
      }

      const rowData = { name: record.name, position: record.positionIndex, remark: lines }
      const cells = [rowData.name, rowData.position, rowData.remark]
      x = 60
      for (let i = 0; i < cells.length; i++) {
        const cellWidth = colWidths[i]
        const fontSize = 11
        if (i < 2) {
          const safeText = String(cells[i] ?? '')
          const textWidth = font.widthOfTextAtSize(safeText, fontSize)
          page.drawText(safeText, {
            x: x + (cellWidth - textWidth) / 2,
            y: cursorY - rowHeight + (rowHeight - fontSize) / 2,
            size: fontSize,
            font,
            color: this.getThemeColor('text')
          })
        } else {
          const lines = cells[i] as string[]
          const lineHeight = fontSize + 4
          const totalTextHeight = lines.length * lineHeight
          let offsetY =
            cursorY - rowHeight + (rowHeight - totalTextHeight) / 2 + totalTextHeight - fontSize
          for (const lineText of lines) {
            page.drawText(lineText.trim(), {
              x: x + 5,
              y: offsetY,
              size: fontSize,
              font,
              color: this.getThemeColor('text')
            })
            offsetY -= lineHeight
          }
        }
        if (i < colWidths.length - 1) {
          page.drawLine({
            start: { x: x + cellWidth, y: cursorY },
            end: { x: x + cellWidth, y: cursorY - rowHeight },
            color: this.getThemeColor('accent'),
            thickness: 0.8
          })
        }
        x += cellWidth
      }
      page.drawLine({
        start: { x: 60, y: cursorY - rowHeight },
        end: { x, y: cursorY - rowHeight },
        color: this.getThemeColor('accent'),
        thickness: 0.8
      })
      cursorY -= rowHeight
    }
    pageBottoms[pages.length - 1] = cursorY

    pages.forEach((p, idx) => {
      const appendixPageInfo = `礼品附录 第 ${idx + 1} / ${pages.length} 页`
      const rightText =
        this.options.partIndex && this.options.totalParts
          ? `P${this.options.partIndex}/P${this.options.totalParts}`
          : ''
      this._drawFooter(
        p,
        font,
        `生成日期: ${new Date().toLocaleString('sv-SE')}`,
        appendixPageInfo,
        rightText
      )

      const topY = idx === 0 ? tableTopYOnFirstPage : pageHeight - margin.top
      const bottomY = pageBottoms[idx]
      const xStart = margin.left
      const xEnd = xStart + colWidths.reduce((a, b) => a + b, 0)
      const borderColor = this.getThemeColor('accent')
      p.drawLine({
        start: { x: xStart, y: topY },
        end: { x: xEnd, y: topY },
        color: borderColor,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xStart, y: topY },
        end: { x: xStart, y: bottomY },
        color: borderColor,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xEnd, y: topY },
        end: { x: xEnd, y: bottomY },
        color: borderColor,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xStart, y: bottomY },
        end: { x: xEnd, y: bottomY },
        color: borderColor,
        thickness: 1.2
      })
    })
  }

  private async _addSummaryAppendix(
    pdfDoc: PDFDocument,
    font: PDFFont,
    bgImage: PDFImage | null,
    monetaryRecords: ProcessedRecordItem[],
    giftRecords: ProcessedRecordItem[]
  ): Promise<void> {
    const page = pdfDoc.addPage(this.pageSize)
    const [w, h] = this.pageSize
    // ✅ 统一绘制背景图（红事彩图，白事灰图）
    if (bgImage) {
      page.drawImage(bgImage, { x: 0, y: 0, width: w, height: h })
    }

    const title = '总计'
    const titleWidth = font.widthOfTextAtSize(title, 28)
    page.drawText(title, {
      x: (w - titleWidth) / 2,
      y: 520,
      size: 28,
      font,
      color: this.getThemeColor('accent')
    })

    const totalAmount = monetaryRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalCount = monetaryRecords.length
    const giftCount = giftRecords.length

    let y = 480
    page.drawText(`礼金总额：${this._formatRMB(totalAmount)}`, {
      x: 60,
      y,
      size: 16,
      font,
      color: this.getThemeColor('text')
    })
    y -= 30
    page.drawText(`礼金人数：${totalCount} 人`, {
      x: 60,
      y,
      size: 16,
      font,
      color: this.getThemeColor('text')
    })
    y -= 30
    page.drawText(`礼品份数：${giftCount} 份`, {
      x: 60,
      y,
      size: 16,
      font,
      color: this.getThemeColor('text')
    })

    this._drawFooter(
      page,
      font,
      `生成日期: ${new Date().toLocaleString('sv-SE')}`,
      `统计附录 第 1 / 1 页`,
      ''
    )
  }

  async generate(records: RecordItem[]): Promise<Uint8Array> {
    const processedRecords = this._processRecords(records)
    const validMonetaryRecords = processedRecords.filter((r) => r.amount > 0)
    const validGiftRecords = processedRecords.filter((r) => r.gift?.trim())

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    let mainFont: PDFFont
    let giftLabelFont: PDFFont
    let formalFont: PDFFont

    try {
      const [mainFontBytes, giftLabelFontBytes, formalFontBytes] = await Promise.all([
        fetch(MainFontUrl).then((r) => r.arrayBuffer()),
        fetch(GiftLabelFontUrl).then((r) => r.arrayBuffer()),
        fetch(FormalFontUrl).then((r) => r.arrayBuffer())
      ])
      mainFont = await pdfDoc.embedFont(mainFontBytes)
      giftLabelFont = await pdfDoc.embedFont(giftLabelFontBytes)
      formalFont = await pdfDoc.embedFont(formalFontBytes)
    } catch (e) {
      console.warn('自定义字体加载失败，使用默认字体')
      mainFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      giftLabelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      formalFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    }

    // ========== 动态加载背景图（关键修改）==========
    let coverImage: PDFImage | null = null
    let bgImage: PDFImage | null = null

    try {
      let coverBytes: ArrayBuffer
      if (this.options.isSolemn) {
        const grayCoverDataUrl = await convertImageToGrayscale(CoverImageUrl)
        coverBytes = dataUrlToArrayBuffer(grayCoverDataUrl)
      } else {
        coverBytes = await fetch(CoverImageUrl).then((r) => r.arrayBuffer())
      }
      coverImage = await pdfDoc.embedJpg(coverBytes)
    } catch (e) {
      console.warn('封面图加载失败', e)
    }

    try {
      let bgBytes: ArrayBuffer
      if (this.options.isSolemn) {
        const grayBgDataUrl = await convertImageToGrayscale(BgImageUrl)
        bgBytes = dataUrlToArrayBuffer(grayBgDataUrl)
      } else {
        bgBytes = await fetch(BgImageUrl).then((r) => r.arrayBuffer())
      }
      bgImage = await pdfDoc.embedJpg(bgBytes)
    } catch (e) {
      console.warn('背景图加载失败', e)
    }
    // ==============================================

    // ========== 封面页 ==========
    if (this.options.printCover) {
      const coverPage = pdfDoc.addPage(this.pageSize)
      const { width: pageWidth, height: pageHeight } = coverPage.getSize()

      // ✅ 统一绘制封面图（红事彩图，白事灰图）
      if (coverImage) {
        coverPage.drawImage(coverImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
      }

      if (this.options.showCoverTitle) {
        const coverFontSize = 30
        const titleWidth = mainFont.widthOfTextAtSize(this.options.title, coverFontSize)
        coverPage.drawText(this.options.title, {
          x: (pageWidth - titleWidth) / 2,
          y: 115,
          size: coverFontSize,
          font: mainFont,
          color: this.getThemeColor('coverTitle')
        })

        if (this.options.subtitle) {
          const subtitleWidth = mainFont.widthOfTextAtSize(this.options.subtitle, coverFontSize)
          coverPage.drawText(this.options.subtitle, {
            x: (pageWidth - subtitleWidth) / 2,
            y: 80,
            size: coverFontSize,
            font: mainFont,
            color: this.getThemeColor('coverTitle')
          })
        }

        if (this.options.partIndex) {
          const partText = 'P' + this.options.partIndex
          coverPage.drawText(partText, {
            x: 90,
            y: pageHeight - 120,
            size: coverFontSize + 20,
            font: mainFont,
            color: this.getThemeColor('coverTitle'),
            opacity: 0.9
          })
        }
      }
    }

    // ========== 礼金页 ==========
    const totalPages = Math.ceil(validMonetaryRecords.length / this.options.itemsPerPage)
    const margin = { top: 28, bottom: 35, left: 30, right: 30 }
    const [pageWidth, pageHeight] = this.pageSize
    const tableWidth = pageWidth - margin.left - margin.right
    const tableHeight = pageHeight - margin.top - margin.bottom
    const colWidth = tableWidth / this.options.itemsPerPage
    const giftTitleHeight = tableHeight * 0.15
    const nameHeight = (tableHeight - giftTitleHeight) / 2
    const amountContainerHeight = nameHeight
    const numericAmountHeight = 25
    const chineseAmountHeight = amountContainerHeight - numericAmountHeight

    for (let p = 0; p < totalPages; p++) {
      const page = pdfDoc.addPage(this.pageSize)
      // ✅ 统一绘制背景图
      if (bgImage) {
        page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
      }

      const borderColor = this.getThemeColor('accent')
      page.drawRectangle({
        x: margin.left,
        y: margin.bottom,
        width: tableWidth,
        height: tableHeight,
        borderColor,
        borderWidth: 2
      })

      const line1Y = margin.bottom + amountContainerHeight
      const line2Y = line1Y + giftTitleHeight
      const lineColor = this.getThemeColor('accent')
      page.drawLine({
        start: { x: margin.left, y: line1Y },
        end: { x: pageWidth - margin.right, y: line1Y },
        color: lineColor,
        thickness: 1
      })
      page.drawLine({
        start: { x: margin.left, y: line2Y },
        end: { x: pageWidth - margin.right, y: line2Y },
        color: lineColor,
        thickness: 1
      })

      for (let i = 1; i < this.options.itemsPerPage; i++) {
        const lineX = margin.left + i * colWidth
        page.drawLine({
          start: { x: lineX, y: margin.bottom },
          end: { x: lineX, y: pageHeight - margin.top },
          color: lineColor,
          thickness: 1
        })
      }

      const pageData: (ProcessedRecordItem | null)[] = validMonetaryRecords.slice(
        p * this.options.itemsPerPage,
        (p + 1) * this.options.itemsPerPage
      )

      while (pageData.length < this.options.itemsPerPage) {
        pageData.push(null)
      }

      pageData.forEach((item, i) => {
        if (!item) return

        const colX = margin.left + i * colWidth
        const displayName =
          item.name.length === 2 ? item.name[0] + '\u3000' + item.name[1] : item.name

        this._drawText(page, displayName, mainFont, {
          x: colX,
          y: line2Y,
          cellWidth: colWidth,
          cellHeight: nameHeight,
          initialFontSize: 20,
          minFontSize: 8,
          color: this.getThemeColor('text'),
          isVertical: true
        })

        this._drawText(page, this.options.giftLabel, giftLabelFont, {
          x: colX,
          y: line1Y,
          cellWidth: colWidth,
          cellHeight: giftTitleHeight,
          initialFontSize: 20,
          minFontSize: 8,
          color: this.getThemeColor('accent'),
          isVertical: true
        })

        const chineseAmount = this._numberToChinese(item.amount)
        this._drawText(page, chineseAmount, formalFont, {
          x: colX,
          y: margin.bottom + numericAmountHeight,
          cellWidth: colWidth,
          cellHeight: chineseAmountHeight,
          initialFontSize: 20,
          minFontSize: 8,
          color: this.getThemeColor('text'),
          isVertical: true
        })

        if (item.amount > 0) {
          const numericText = '¥' + item.amount
          this._drawText(page, numericText, formalFont, {
            x: colX,
            y: margin.bottom + 5,
            cellWidth: colWidth,
            cellHeight: numericAmountHeight,
            initialFontSize: 12,
            minFontSize: 6,
            color: this.getThemeColor('text'),
            isVertical: false
          })
        }
      })

      const pageInfo = `第 ${p + 1} 页 / 共 ${totalPages} 页`
      const footerText = `生成日期: ${new Date().toLocaleString('sv-SE')}`
      const rightText =
        this.options.partIndex && this.options.totalParts
          ? `P${this.options.partIndex}/P${this.options.totalParts}`
          : ''

      this._drawFooter(page, formalFont, footerText, pageInfo, rightText)
    }

    // ========== 礼品附录 ==========
    if (this.options.printAppendix && validGiftRecords.length > 0) {
      await this._addGiftAppendix(pdfDoc, formalFont, bgImage, validGiftRecords)
    }

    // ========== 统计附录 ==========
    if (this.options.printSummary) {
      await this._addSummaryAppendix(
        pdfDoc,
        formalFont,
        bgImage,
        validMonetaryRecords,
        validGiftRecords
      )
    }

    return await pdfDoc.save()
  }
}
