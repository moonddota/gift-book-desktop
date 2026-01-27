/**
 * GiftRegistryPDF - 样式配置优化版
 * 仅优化了配置解析和样式管理，核心绘图和布局逻辑保持原样，确保 PDF 输出完全一致。
 */
class GiftRegistryPDF {
  /**
   * 创建一个 PDF 生成器实例。
   */
  constructor(options) {
    // 1. 默认配置合并 (更简洁的写法)
    const defaults = {
      letterSpacing: 4,
      title: '礼金簿',
      giftLabel: '贺礼',
      mainFontUrl: './static/MaShanZheng-Regular.ttf',
      giftLabelFontUrl: './static/SourceHanSerifCN-Heavy.ttf',
      formalFontUrl: './static/NotoSansSCMedium-mini.ttf',
      itemsPerPage: 12
    }

    this.options = { ...defaults, ...options }

    // 确保后续使用的字体URL存在默认值
    this.options.amountFontUrl = this.options.amountFontUrl || this.options.formalFontUrl
    this.options.coverFontUrl = this.options.coverFontUrl || this.options.formalFontUrl

    this.pdfLib = PDFLib
    this.pageSize = [841.89, 595.28] // A4 横向

    // 边距定义
    this.mainPageMargins = { top: 28, bottom: 35, left: 30, right: 30 }
    this.appendixMargins = { top: 70, bottom: 45, left: 60, right: 60 }
    this.footerMargins = { left: 30, right: 30 }

    // 资源状态
    this.resources = {
      fontBytes: null,
      amountFontBytes: null,
      formalFontBytes: null,
      giftLabelFontBytes: null,
      coverFontBytes: null,
      bgImageBytes: null,
      coverImageBytes: null,
      backCoverImageBytes: null,
      loaded: false
    }

    this._applyStyleConfig()
  }

  // 添加 payment_type 映射
  _getPaymentTypeLabel(type) {
    const typeMap = {
      1: '现金',
      2: '微信',
      3: '支付宝',
      4: '其他'
    }
    return typeMap[type] || '其他'
  }

  async _embedFonts(pdfDoc) {
    const fonts = {}

    try {
      // 优先使用传入的字体字节
      if (this.options.mainFontBytes) {
        fonts.mainFont = await pdfDoc.embedFont(this.options.mainFontBytes)
      } else if (this.options.mainFontUrl) {
        const fontBytes = await fetch(this.options.mainFontUrl).then((r) => r.arrayBuffer())
        fonts.mainFont = await pdfDoc.embedFont(new Uint8Array(fontBytes))
      } else {
        fonts.mainFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      }

      if (this.options.giftLabelFontBytes) {
        fonts.giftLabelFont = await pdfDoc.embedFont(this.options.giftLabelFontBytes)
      } else if (this.options.giftLabelFontUrl) {
        const fontBytes = await fetch(this.options.giftLabelFontUrl).then((r) => r.arrayBuffer())
        fonts.giftLabelFont = await pdfDoc.embedFont(new Uint8Array(fontBytes))
      } else {
        fonts.giftLabelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      }

      if (this.options.formalFontBytes) {
        fonts.formalFont = await pdfDoc.embedFont(this.options.formalFontBytes)
      } else if (this.options.formalFontUrl) {
        const fontBytes = await fetch(this.options.formalFontUrl).then((r) => r.arrayBuffer())
        fonts.formalFont = await pdfDoc.embedFont(new Uint8Array(fontBytes))
      } else {
        fonts.formalFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      }
    } catch (err) {
      console.error('字体加载失败，使用默认字体:', err)
      fonts.mainFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      fonts.giftLabelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      fonts.formalFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    }

    return fonts
  }

  _applyStyleConfig() {
    const overrides = this.options.giftBookStyles || {}

    // 辅助函数：解析数字，无效则返回默认值
    const getNum = (val, def) =>
      Number.isFinite(Number(val)) && Number(val) > 0 ? Number(val) : def

    // 辅助函数：解析颜色，支持 Hex/RGB，失败则返回默认值
    const getCol = (val, def) => this._parseColor(val || def)

    // 辅助函数：快速生成标准样式对象 { fontSize, color }
    const resolveStyle = (key, defaultSize, defaultColor) => ({
      fontSize: getNum(overrides[key]?.fontSize, defaultSize),
      color: getCol(overrides[key]?.color, defaultColor)
    })

    // 1. 生成各部分样式
    this.styles = {
      name: resolveStyle('name', 20, '#333333'),
      label: resolveStyle('label', 20, '#cc0000'),
      amount: resolveStyle('amount', 20, '#333333'),
      coverText: resolveStyle('coverText', 30, '#f5d4ab'),
      pageInfo: {
        fontSize: getNum(overrides.pageInfo?.fontSize, 12),
        themeColor: getCol(overrides.pageInfo?.themeColor, '#ec403c'),
        baseColor: getCol(overrides.pageInfo?.baseColor, '#1f2937')
      }
    }

    // 2. 定义常用颜色画笔
    // 直接复用 rgb 对象，避免重复实例化
    this.colors = {
      red: this.styles.pageInfo.themeColor,
      black: this.styles.pageInfo.baseColor,
      lightPink: this.pdfLib.rgb(1, 0.94, 0.94),
      borderColor: this.pdfLib.rgb(0.99, 0.82, 0.82),
      lightOrange: this.styles.coverText.color
    }
  }

  /**
   * 优化点：使用正则简化逻辑，支持 #RGB, #RRGGBB, rgb() 格式
   */
  _parseColor(input) {
    // 如果已经是颜色对象则直接返回
    if (typeof input === 'object' && input !== null) return input

    const str = String(input || '').trim()
    const { rgb } = this.pdfLib
    const black = rgb(0, 0, 0)

    if (!str) return black

    // 处理 Hex: #abc 或 #aabbcc
    if (str.startsWith('#')) {
      const hex = str.replace('#', '')
      if (!/^[0-9a-fA-F]{3,6}$/.test(hex)) return black

      const val =
        hex.length === 3
          ? hex
              .split('')
              .map((c) => c + c)
              .join('')
          : hex
      if (val.length !== 6) return black

      const n = parseInt(val, 16)
      return rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
    }

    // 处理 rgb(r, g, b)
    if (str.toLowerCase().startsWith('rgb')) {
      const match = str.match(/[\d\.]+/g)
      if (match && match.length >= 3) {
        const [r, g, b] = match.map(Number)
        if ([r, g, b].every((n) => Number.isFinite(n))) {
          return rgb(r / 255, g / 255, b / 255)
        }
      }
    }

    return black
  }

  async _loadResources() {
    this.resources.loaded = true
    return
  }

  _processData(data) {
    // 1. 过滤作废记录 - 使用正确的字段名
    const validRecords = data.filter((r) => !r.voided)

    // 2. 生成带位置索引的完整记录
    let currentPage = 1
    let currentRow = 0
    const itemsPerPage = this.options.itemsPerPage || 12

    const processedRecords = validRecords.map((record) => {
      currentRow++
      if (currentRow > itemsPerPage) {
        currentPage++
        currentRow = 1
      }
      return {
        ...record,
        positionIndex: `第${currentPage}页第${currentRow}人`
      }
    })

    // 3. 从 processedRecords 中分离子集（确保继承 positionIndex）
    const validGiftRecords = processedRecords.filter((r) => r.gift && r.gift.trim() !== '')
    const validMonetaryRecords = processedRecords.filter((r) => r.amount > 0)
    const remarks = processedRecords.filter((r) => r.note && r.note.trim() !== '')

    // 4. 按支付方式统计 - 使用映射后的标签
    const summary = {}
    for (const record of validMonetaryRecords) {
      const type = this._getPaymentTypeLabel(record.payment_type || 4) // 默认为"其他"
      if (!summary[type]) {
        summary[type] = { count: 0, total: 0 }
      }
      summary[type].count++
      summary[type].total += record.amount
    }

    return {
      validRecords: processedRecords,
      validGiftRecords,
      validMonetaryRecords,
      remarks,
      summary,
      giftCount: validGiftRecords.length,
      grandTotalAmount: validMonetaryRecords.reduce((sum, r) => sum + r.amount, 0)
    }
  }

  // 添加到类中（任意位置，建议放在 _formatRMB 附近）
  _numberToChinese(num) {
    if (num === 0) return '零元整'
    const units = ['', '拾', '佰', '仟']
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
    const bigUnits = ['', '万', '亿']

    let integerPart = Math.floor(Math.abs(num))
    if (integerPart === 0) return '零元整'

    let result = ''
    let bigUnitIndex = 0

    while (integerPart > 0) {
      let chunk = integerPart % 10000
      integerPart = Math.floor(integerPart / 10000)

      if (chunk !== 0) {
        let chunkStr = ''
        for (let i = 0; i < 4 && chunk > 0; i++) {
          const digit = chunk % 10
          chunk = Math.floor(chunk / 10)
          if (digit !== 0) {
            chunkStr = digits[digit] + units[i] + chunkStr
          } else if (chunkStr !== '' && !chunkStr.startsWith('零')) {
            chunkStr = '零' + chunkStr
          }
        }
        result = chunkStr + bigUnits[bigUnitIndex] + result
      } else if (result !== '') {
        result = '零' + result
      }
      bigUnitIndex++
    }

    // 清理多余的"零"
    result = result.replace(/零+/g, '零').replace(/零+$/, '')
    result += '元整'
    return result
  }

  // 礼品附录
  async _addGiftAppendix(pdfDoc, fonts, processedData) {
    const giftRecords = processedData.validGiftRecords
    if (giftRecords.length === 0) return

    const mainFont = fonts.formalFont
    const [pageWidth, pageHeight] = this.pageSize
    const margin = this.appendixMargins // 必须用 appendixMargins

    // 完全复用宾客备注的三列结构（第二列留空）
    const colWidths = [
      120, // 姓名列
      160, // 位置索引列（礼品不需要，但保留占位）
      pageWidth - margin.left - margin.right - 280 // 礼品描述列（= 总宽 - 120 - 160）
    ]
    const tableWidth = colWidths.reduce((a, b) => a + b, 0)

    let page = pdfDoc.addPage(this.pageSize)
    let cursorY = pageHeight - margin.top
    const pages = [page]
    const pageBottoms = {}

    await this._drawImageOnPage(pdfDoc, page, this.resources.bgImageBytes)

    // 标题：完全一致
    const title = '附录：礼品清单'
    const titleWidth = mainFont.widthOfTextAtSize(title, 28)
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: cursorY,
      size: 28,
      font: mainFont,
      color: this.colors.red
    })
    cursorY -= 40
    const tableTopYOnFirstPage = cursorY

    //  关键：使用和宾客备注完全相同的表头绘制方法
    cursorY -= this._drawRemarkAppendixHeader(page, mainFont, cursorY, colWidths)

    for (const record of giftRecords) {
      const { lines, height } = this._wrapText(record.gift, mainFont, 11, colWidths[2] - 12)
      const rowHeight = Math.max(30, height + 10)

      if (cursorY - rowHeight < margin.bottom) {
        pageBottoms[pages.length - 1] = cursorY
        page = pdfDoc.addPage(this.pageSize)
        pages.push(page)
        await this._drawImageOnPage(pdfDoc, page, this.resources.bgImageBytes)
        cursorY = pageHeight - margin.top
        //   分页后也用相同的表头
        cursorY -= this._drawRemarkAppendixHeader(page, mainFont, cursorY, colWidths)
      }

      //   复用完全相同的行绘制逻辑（第二列传空字符串）
      this._drawAppendixRow(
        page,
        mainFont,
        {
          name: record.name,
          position: record.positionIndex, // ← 关键修复
          remark: lines
        },
        cursorY,
        rowHeight,
        colWidths,
        lines
      )

      cursorY -= rowHeight
    }

    pageBottoms[pages.length - 1] = cursorY

    // 页脚和边框：完全一致
    pages.forEach((p, idx) => {
      const appendixPageInfo = `礼品附录 第 ${idx + 1} / ${pages.length} 页`
      this._drawPageFooter(p, fonts.formalFont, {
        left: `生成日期: ${new Date().toLocaleString('sv-SE')}`,
        center: appendixPageInfo,
        right:
          this.options.partIndex && this.options.totalParts
            ? `P${this.options.partIndex}/P${this.options.totalParts}`
            : null
      })

      const topY = idx === 0 ? tableTopYOnFirstPage : pageHeight - margin.top
      const bottomY = pageBottoms[idx]
      const xStart = margin.left
      const xEnd = xStart + tableWidth

      // 边框：完全一致
      p.drawLine({
        start: { x: xStart, y: topY },
        end: { x: xEnd, y: topY },
        color: this.colors.red,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xStart, y: topY },
        end: { x: xStart, y: bottomY },
        color: this.colors.red,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xEnd, y: topY },
        end: { x: xEnd, y: bottomY },
        color: this.colors.red,
        thickness: 1.2
      })
      p.drawLine({
        start: { x: xStart, y: bottomY },
        end: { x: xEnd, y: bottomY },
        color: this.colors.red,
        thickness: 1.2
      })
    })
  }

  // 辅助方法：绘制自定义表头
  _drawAppendixHeader(page, font, y, headers, colWidths) {
    const rowHeight = 28
    let x = this.mainPageMargins.left

    headers.forEach((header, i) => {
      if (i >= colWidths.length || typeof colWidths[i] !== 'number' || isNaN(colWidths[i])) {
        console.warn('Invalid colWidths at index', i, colWidths)
        return
      }
      const textWidth = font.widthOfTextAtSize(header, 14) || 0
      const safeX = isNaN(x + (colWidths[i] - textWidth) / 2)
        ? margin.left
        : x + (colWidths[i] - textWidth) / 2
      page.drawText(header, {
        x: isNaN(safeX) ? x : safeX, // 防 NaN
        y: y - rowHeight + (rowHeight - 14) / 2,
        size: 14,
        font,
        color: this.colors.red
      })
      x += colWidths[i]
    })
    const tableWidth = colWidths.reduce((a, b) => a + b)
    page.drawLine({
      start: { x: this.appendixMargins.left, y: y - rowHeight },
      end: { x: this.appendixMargins.left + tableWidth, y: y - rowHeight },
      color: this.colors.red,
      thickness: 1.2
    })
    return rowHeight
  }

  async _addGiftsPages(pdfDoc, fonts, processedData) {
    const [pageWidth, pageHeight] = this.pageSize
    const margin = this.mainPageMargins
    const tableWidth = pageWidth - margin.left - margin.right
    const tableHeight = pageHeight - margin.top - margin.bottom
    const colWidth = tableWidth / this.options.itemsPerPage
    const giftTitleHeight = tableHeight * 0.15
    const nameHeight = (tableHeight - giftTitleHeight) / 2
    const amountContainerHeight = nameHeight
    const numericAmountHeight = 25
    const chineseAmountHeight = amountContainerHeight - numericAmountHeight

    const nameStyle = this.styles.name
    const labelStyle = this.styles.label
    const amountStyle = this.styles.amount
    const numericColor = this.styles.pageInfo.baseColor

    // 关键：只使用礼金记录（已过滤作废）
    const { validMonetaryRecords } = processedData
    const totalPages = Math.ceil(validMonetaryRecords.length / this.options.itemsPerPage)

    if (totalPages === 0) return // 如果没有礼金，不生成页面

    for (let p = 0; p < totalPages; p++) {
      const page = pdfDoc.addPage(this.pageSize)
      await this._drawImageOnPage(pdfDoc, page, this.resources.bgImageBytes)

      page.drawRectangle({
        x: margin.left,
        y: margin.bottom,
        width: tableWidth,
        height: tableHeight,
        borderColor: this.colors.red,
        borderWidth: 2
      })

      const line1Y = margin.bottom + amountContainerHeight
      const line2Y = line1Y + giftTitleHeight

      page.drawLine({
        start: { x: margin.left, y: line1Y },
        end: { x: pageWidth - margin.right, y: line1Y },
        color: this.colors.red,
        thickness: 1
      })
      page.drawLine({
        start: { x: margin.left, y: line2Y },
        end: { x: pageWidth - margin.right, y: line2Y },
        color: this.colors.red,
        thickness: 1
      })

      for (let i = 1; i < this.options.itemsPerPage; i++) {
        const lineX = margin.left + i * colWidth
        page.drawLine({
          start: { x: lineX, y: margin.bottom },
          end: { x: lineX, y: pageHeight - margin.top },
          color: this.colors.red,
          thickness: 1
        })
      }

      const pageData = validMonetaryRecords.slice(
        p * this.options.itemsPerPage,
        (p + 1) * this.options.itemsPerPage
      )

      while (pageData.length < this.options.itemsPerPage) {
        pageData.push(null)
      }

      pageData.forEach((item, i) => {
        const colX = margin.left + i * colWidth
        if (item) {
          // 渲染名字
          const displayName =
            item.name.length === 2
              ? item.name[0] + String.fromCharCode(0x3000) + item.name[1]
              : item.name
          this._drawText(page, displayName, fonts.mainFont, {
            x: colX,
            y: line2Y,
            cellWidth: colWidth,
            cellHeight: nameHeight,
            initialFontSize: nameStyle.fontSize,
            minFontSize: 8,
            color: nameStyle.color,
            isVertical: true
          })

          // 渲染"贺礼"标签
          this._drawText(page, this.options.giftLabel, fonts.giftLabelFont, {
            x: colX,
            y: line1Y,
            cellWidth: colWidth,
            cellHeight: giftTitleHeight,
            initialFontSize: labelStyle.fontSize,
            minFontSize: 8,
            color: labelStyle.color,
            isVertical: true
          })

          // 只渲染金额（不再显示礼品）
          this._drawText(page, item.amountText, fonts.amountFont, {
            x: colX,
            y: margin.bottom + numericAmountHeight,
            cellWidth: colWidth,
            cellHeight: chineseAmountHeight,
            initialFontSize: amountStyle.fontSize,
            minFontSize: 8,
            color: amountStyle.color,
            isVertical: true
          })

          // 数字金额
          if (item.amount > 0) {
            this._drawText(page, String.fromCharCode(0x00a5) + item.amount, fonts.formalFont, {
              x: colX,
              y: margin.bottom + 5,
              cellWidth: colWidth,
              cellHeight: numericAmountHeight,
              initialFontSize: 12,
              minFontSize: 6,
              color: numericColor,
              isVertical: false
            })
          }
        }
      })

      const pageSubtotal = pageData
        .filter(Boolean)
        .reduce((sum, item) => sum + (item.amount || 0), 0)

      let pageInfo = `第 ${p + 1} 页 / 共 ${totalPages} 页`
      if (this.options.partIndex && this.options.totalParts) {
        pageInfo += `( P${this.options.partIndex}/P${this.options.totalParts} )`
      }

      this._drawPageFooter(page, fonts.formalFont, {
        left: `生成日期: ${new Date().toLocaleString('sv-SE')}`,
        center: pageInfo,
        right: `本页小计: ${this._formatRMB(pageSubtotal)}`
      })
    }
  }

  async _addSummaryAppendix(pdfDoc, fonts, processedData) {
    if (!processedData || !this.options.printAppendix) return

    const page = pdfDoc.addPage(this.pageSize)
    await this._drawImageOnPage(pdfDoc, page, this.resources.bgImageBytes)

    const mainFont = fonts.formalFont
    const [pageWidth, pageHeight] = this.pageSize
    const margin = this.appendixMargins
    const tableTopY = pageHeight - margin.top - 60 // 增加标题上方空间

    // 标题：总计
    const title = '总计'
    const titleWidth = mainFont.widthOfTextAtSize(title, 28)
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: pageHeight - margin.top,
      size: 28,
      font: mainFont,
      color: this.colors.red
    })

    // 构建统计表格数据
    const summaryRows = []

    // 1. 礼金统计（按方式） - 使用已映射的标签
    for (const [method, stats] of Object.entries(processedData.summary)) {
      // 只统计有金额的记录
      if (stats.total > 0) {
        const chineseAmount =
          this._convertToChineseAmount(Math.floor(stats.total)) +
          (stats.total % 1 === 0 ? '元整' : '元')
        summaryRows.push({
          label: method, // 现在是文字标签（如"现金"、"微信"）
          count: `${stats.count} 人`,
          amount: `${this._formatRMB(stats.total)}\n${chineseAmount}`
        })
      }
    }

    // 2. 礼品统计
    if (processedData.giftCount > 0) {
      summaryRows.push({
        label: '礼物',
        count: `${processedData.giftCount} 份`,
        amount: '-'
      })
    }

    // 3. 分开总计
    const monetaryTotal = processedData.validMonetaryRecords.reduce(
      (sum, item) => sum + item.amount,
      0
    )
    const giftTotalCount = processedData.validGiftRecords.length

    const monetaryChinese =
      this._convertToChineseAmount(Math.floor(monetaryTotal)) +
      (monetaryTotal % 1 === 0 ? '元整' : '元')
    summaryRows.push({
      label: '礼金小计',
      count: `${processedData.validMonetaryRecords.length} 人`,
      amount: `${this._formatRMB(monetaryTotal)}\n${monetaryChinese}`
    })

    if (giftTotalCount > 0) {
      summaryRows.push({
        label: '礼品小计',
        count: `${giftTotalCount} 份`,
        amount: '-'
      })
    }

    // 4. 全局总计（如果提供）
    if (
      this.options.grandTotalAmount !== undefined &&
      this.options.grandTotalGivers !== undefined
    ) {
      const grandChinese =
        this._convertToChineseAmount(Math.floor(this.options.grandTotalAmount)) +
        (this.options.grandTotalAmount % 1 === 0 ? '元整' : '元')
      summaryRows.push({
        label: '事项总金额',
        count: `${this.options.grandTotalGivers} 人`,
        amount: `${this._formatRMB(this.options.grandTotalAmount)}\n${grandChinese}`
      })
    }

    // 表格列宽 - 增加各列宽度
    const labelColWidth = 120
    const countColWidth = 180
    const amountColWidth = 280 // 增加金额列宽度以容纳两行文本
    const totalTableWidth = labelColWidth + countColWidth + amountColWidth
    const startX = (pageWidth - totalTableWidth) / 2
    let currentY = tableTopY

    // 表头
    const headers = ['类别', '人数/份数', '金额']
    const headerXs = [startX, startX + labelColWidth, startX + labelColWidth + countColWidth]
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: headerXs[i],
        y: currentY,
        size: 16,
        font: mainFont,
        color: this.colors.red
      })
    })
    currentY -= 50 // 增加表头下方空间

    // 分隔线
    page.drawLine({
      start: { x: startX, y: currentY + 5 },
      end: { x: startX + totalTableWidth, y: currentY + 5 },
      thickness: 1,
      color: this.colors.red
    })
    currentY -= 40 // 增加分隔线下方空间

    // 数据行
    summaryRows.forEach((row) => {
      // 类别列
      page.drawText(row.label, {
        x: startX,
        y: currentY,
        size: 14,
        font: mainFont
      })

      // 人数/份数列
      page.drawText(row.count, {
        x: startX + labelColWidth,
        y: currentY,
        size: 14,
        font: mainFont
      })

      // 金额列 - 可能包含两行
      if (row.amount.includes('\n')) {
        const [amountLine1, amountLine2] = row.amount.split('\n')
        page.drawText(amountLine1, {
          x: startX + labelColWidth + countColWidth,
          y: currentY,
          size: 14,
          font: mainFont
        })
        page.drawText(amountLine2, {
          x: startX + labelColWidth + countColWidth,
          y: currentY - 22, // 增加第二行与第一行的垂直间距
          size: 12,
          font: mainFont,
          color: this.colors.black
        })
      } else {
        page.drawText(row.amount, {
          x: startX + labelColWidth + countColWidth,
          y: currentY,
          size: 14,
          font: mainFont
        })
      }
      currentY -= 50 // 增加行间距，让元素间距离更大
    })

    // 页脚说明
    const footerY = margin.bottom + 50 // 增加底部空间
    const note = '注：作废记录不计入统计'
    page.drawText(note, {
      x: margin.left,
      y: footerY,
      size: 12,
      font: mainFont,
      color: this.pdfLib.rgb(0.5, 0.5, 0.5)
    })
  }
  _convertToChineseAmount(amount) {
    const units = ['元', '拾', '佰', '仟', '万', '拾万', '佰万', '仟万', '亿']
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

    if (amount === 0) return '零'

    const numStr = amount.toString()
    const integerPart = numStr.split('.')[0]
    let result = ''

    for (let i = 0; i < integerPart.length; i++) {
      const digit = parseInt(integerPart[i])
      const unitIndex = integerPart.length - 1 - i
      const unit = units[unitIndex]

      // 处理0的情况
      if (digit === 0) {
        if (result && result[result.length - 1] !== '零') {
          result += '零'
        }
      } else {
        result += digits[digit]
        // 添加单位（除了'元'）
        if (unit !== '元' && unitIndex !== 0) {
          result += unit
        }
      }
    }

    // 清理连续的'零'
    result = result.replace(/零+/g, '零')

    // 移除结尾的'零'
    if (result.endsWith('零')) {
      result = result.slice(0, -1)
    }

    return result
  }

  _wrapText(text, font, fontSize, maxWidth) {
    const lines = []
    const paragraphs = String(text || '').split(/\r?\n/)
    for (const paragraph of paragraphs) {
      if (paragraph === '') {
        lines.push('')
        continue
      }
      let currentLine = ''
      const words = paragraph.match(/[\w']+|[^\s\w]/g) || []
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
          currentLine = testLine
        } else {
          lines.push(currentLine)
          currentLine = word
        }
      }
      lines.push(currentLine)
    }
    const lineHeight = fontSize + 4
    return { lines, height: lines.length * lineHeight }
  }

  async _drawImageOnPage(pdfDoc, page, imageBytes) {
    // 如果没传图片，直接跳过
    if (!imageBytes || imageBytes.length === 0) {
      return
    }

    try {
      let image
      // 判断是 JPG 还是 PNG
      if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
        // JPG
        image = await pdfDoc.embedJpg(imageBytes)
      } else if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
        // PNG
        image = await pdfDoc.embedPng(imageBytes)
      } else {
        // 不支持的格式（比如 WebP），跳过
        console.warn('图片格式不支持（仅支持 JPG/PNG），已跳过')
        return
      }

      const [pageWidth, pageHeight] = this.pageSize
      const imgDims = this._calculateScaledDimensions(
        image.width,
        image.height,
        pageWidth,
        pageHeight
      )
      page.drawImage(image, {
        x: (pageWidth - imgDims.width) / 2,
        y: (pageHeight - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height
      })
    } catch (err) {
      console.error('图片绘制失败:', err.message)
      // 不抛错，继续生成 PDF
    }
  }

  // 添加这个缺失的方法
  _calculateScaledDimensions(imgWidth, imgHeight, containerWidth, containerHeight) {
    const widthRatio = containerWidth / imgWidth
    const heightRatio = containerHeight / imgHeight
    const scale = Math.min(widthRatio, heightRatio)
    return {
      width: imgWidth * scale,
      height: imgHeight * scale
    }
  }

  _drawPageFooter(page, font, texts) {
    const { width } = page.getSize()
    const { left, right } = this.footerMargins
    const y = 17
    const size = this.styles?.pageInfo?.fontSize || 10
    if (texts.left) page.drawText(texts.left, { x: left, y, size, font, color: this.colors.black })
    if (texts.center) {
      const centerWidth = font.widthOfTextAtSize(texts.center, size)
      page.drawText(texts.center, {
        x: (width - centerWidth) / 2,
        y,
        size,
        font,
        color: this.colors.black
      })
    }
    if (texts.right) {
      const rightWidth = font.widthOfTextAtSize(texts.right, size)
      page.drawText(texts.right, {
        x: width - right - rightWidth,
        y,
        size,
        font,
        color: this.colors.black
      })
    }
  }

  _drawText(page, text, font, options) {
    // ✅ 防御性检查：如果 text 为 undefined/null，直接返回
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

    const MAX_COLS = 3
    const { letterSpacing } = this.options
    const chars = [...text] // ← 现在这里不会出错，因为 text 已被检查
    if (chars.length === 0) return

    const cellWidth90 = cellWidth * 0.9
    const cellHeight90 = cellHeight * 0.9

    const calcHeight = (numChars, fs) =>
      numChars * (fs + letterSpacing) - (numChars > 0 ? letterSpacing : 0)
    const calcWidth = (numCols, fs) => numCols * fs + (numCols - 1) * letterSpacing

    const charHeight = initialFontSize + letterSpacing
    const adaptiveMaxCharsPerCol = Math.max(
      1,
      Math.floor((cellHeight90 + letterSpacing) / charHeight)
    )
    const neededCols = Math.ceil(chars.length / adaptiveMaxCharsPerCol)

    let finalColCount
    let finalFontSize = initialFontSize
    let finalCharsPerColForHeight

    if (neededCols === 1) {
      finalColCount = 1
      finalCharsPerColForHeight = chars.length
      while (finalFontSize >= minFontSize) {
        let height = calcHeight(finalCharsPerColForHeight, finalFontSize)
        let width = calcWidth(finalColCount, finalFontSize)
        if (height <= cellHeight90 && width <= cellWidth90) break
        finalFontSize -= 0.5
      }
    } else if (neededCols === 2) {
      finalColCount = 2
      finalCharsPerColForHeight = adaptiveMaxCharsPerCol
      let height = calcHeight(finalCharsPerColForHeight, initialFontSize)
      let width = calcWidth(finalColCount, initialFontSize)
      if (height <= cellHeight90 && width <= cellWidth90) {
        finalFontSize = initialFontSize
      } else {
        finalColCount = 3
        finalCharsPerColForHeight = adaptiveMaxCharsPerCol
        finalFontSize = initialFontSize
        while (finalFontSize >= minFontSize) {
          let height = calcHeight(finalCharsPerColForHeight, finalFontSize)
          let width = calcWidth(finalColCount, finalFontSize)
          if (height <= cellHeight90 && width <= cellWidth90) break
          finalFontSize -= 0.5
        }
      }
    } else {
      finalColCount = 3
      finalCharsPerColForHeight = adaptiveMaxCharsPerCol
      while (finalFontSize >= minFontSize) {
        let height = calcHeight(finalCharsPerColForHeight, finalFontSize)
        let width = calcWidth(finalColCount, finalFontSize)
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

  _drawRemarkAppendixHeader(page, font, y, colWidths) {
    const headers = ['姓名', '位置索引', '备注信息']
    const rowHeight = 28
    let x = this.appendixMargins.left
    headers.forEach((header, i) => {
      const textWidth = font.widthOfTextAtSize(header, 14)
      page.drawText(header, {
        x: x + (colWidths[i] - textWidth) / 2,
        y: y - rowHeight + (rowHeight - 14) / 2,
        size: 14,
        font,
        color: this.colors.red
      })
      if (i < headers.length - 1) {
        page.drawLine({
          start: { x: x + colWidths[i], y },
          end: { x: x + colWidths[i], y: y - rowHeight },
          color: this.colors.red,
          thickness: 0.8
        })
      }
      x += colWidths[i]
    })
    const tableWidth = colWidths.reduce((a, b) => a + b)
    page.drawLine({
      start: { x: this.appendixMargins.left, y: y - rowHeight },
      end: { x: this.appendixMargins.left + tableWidth, y: y - rowHeight },
      color: this.colors.red,
      thickness: 1.2
    })
    return rowHeight
  }

  _drawAppendixRow(page, font, rowData, y, rowHeight, colWidths, wrappedLines) {
    const { name, position } = rowData
    const cells = [name, position, wrappedLines]
    let x = this.appendixMargins.left
    for (let i = 0; i < cells.length; i++) {
      const cellWidth = colWidths[i]
      const fontSize = 11
      if (i < 2) {
        const safeText = String(cells[i] ?? '')
        const textWidth = font.widthOfTextAtSize(safeText, fontSize)
        page.drawText(safeText, {
          x: x + (cellWidth - textWidth) / 2,
          y: y - rowHeight + (rowHeight - fontSize) / 2,
          size: fontSize,
          font,
          color: this.colors.black
        })
      } else {
        const lines = cells[i]
        const lineHeight = fontSize + 4
        const totalTextHeight = lines.length * lineHeight
        let offsetY = y - rowHeight + (rowHeight - totalTextHeight) / 2 + totalTextHeight - fontSize
        lines.forEach((lineText) => {
          page.drawText(lineText.trim(), {
            x: x + 5,
            y: offsetY,
            size: fontSize,
            font,
            color: this.colors.black
          })
          offsetY -= lineHeight
        })
      }
      if (i < colWidths.length - 1) {
        page.drawLine({
          start: { x: x + cellWidth, y },
          end: { x: x + cellWidth, y: y - rowHeight },
          color: this.colors.red,
          thickness: 0.8
        })
      }
      x += cellWidth
    }
    page.drawLine({
      start: { x: this.appendixMargins.left, y: y - rowHeight },
      end: { x: x, y: y - rowHeight },
      color: this.colors.red,
      thickness: 0.8
    })
  }

  _formatRMB(amount) {
    const num = parseFloat(amount)
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(num || 0)
  }

  async generate(data, newOptions = null, eventName = '礼金簿') {
    if (!this.resources) this.resources = {}
    Object.assign(this.resources, {
      fontBytes: this.options.mainFontBytes,
      giftLabelFontBytes: this.options.giftLabelFontBytes,
      formalFontBytes: this.options.formalFontBytes,
      coverImageBytes: this.options.coverImageBytes,
      backCoverImageBytes: this.options.backCoverImageBytes,
      bgImageBytes: this.options.bgImageBytes,
      loaded: true
    })

    if (this.resourcesOverride) {
      Object.assign(this.resources, this.resourcesOverride)
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是一个非空数组。')
    }

    // 动态设置标题
    this.options.title = eventName

    if (newOptions) {
      Object.assign(this.options, newOptions)
      this.resources.loaded = false
      this._applyStyleConfig()
    }

    await this._loadResources()

    const { PDFDocument } = this.pdfLib
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    const fonts = {
      mainFont: await pdfDoc.embedFont(this.resources.fontBytes, { subset: true }),
      giftLabelFont: this.resources.giftLabelFontBytes
        ? await pdfDoc.embedFont(this.resources.giftLabelFontBytes, { subset: true })
        : null,
      formalFont: this.resources.formalFontBytes
        ? await pdfDoc.embedFont(this.resources.formalFontBytes, { subset: true })
        : null,
      amountFont: this.resources.amountFontBytes
        ? await pdfDoc.embedFont(this.resources.amountFontBytes, { subset: true })
        : null,
      coverFont: this.resources.coverFontBytes
        ? await pdfDoc.embedFont(this.resources.coverFontBytes, { subset: true })
        : null
    }
    fonts.giftLabelFont = fonts.giftLabelFont || fonts.mainFont
    fonts.formalFont = fonts.formalFont || fonts.mainFont
    fonts.amountFont = fonts.amountFont || fonts.mainFont
    fonts.coverFont = fonts.coverFont || fonts.formalFont

    const processedData = this._processData(data)

    if (this.options.printCover && this.resources.coverImageBytes) {
      const coverPage = pdfDoc.addPage(this.pageSize)
      await this._drawImageOnPage(pdfDoc, coverPage, this.resources.coverImageBytes)
      const coverFont = fonts.coverFont || fonts.formalFont
      const coverStyle = this.styles?.coverText || {}
      const coverColor = coverStyle.color || this.colors.lightOrange
      const coverFontSize = coverStyle.fontSize || 26
      if (this.options.showCoverTitle && this.options.title) {
        const titleWidth = coverFont.widthOfTextAtSize(this.options.title, coverFontSize)
        coverPage.drawText(this.options.title, {
          x: (this.pageSize[0] - titleWidth) / 2,
          y: 115,
          size: coverFontSize,
          font: coverFont,
          color: coverColor
        })
      }
      if (this.options.showCoverTitle && this.options.subtitle) {
        const subtitleWidth = coverFont.widthOfTextAtSize(this.options.subtitle, coverFontSize)
        coverPage.drawText(this.options.subtitle, {
          x: (this.pageSize[0] - subtitleWidth) / 2,
          y: 80,
          size: coverFontSize,
          font: coverFont,
          color: coverColor
        })
      }
      if (this.options.partIndex && this.options.showCoverTitle) {
        const partText = 'P' + this.options.partIndex
        coverPage.drawText(partText, {
          x: 90,
          y: this.pageSize[1] - 120,
          font: coverFont,
          size: coverFontSize + 20,
          color: coverColor,
          opacity: 0.9
        })
      }
    }

    await this._addGiftsPages(pdfDoc, fonts, processedData)

    if (this.options.printAppendix !== false) {
      // 移除宾客备注附录
      await this._addGiftAppendix(pdfDoc, fonts, processedData) // ← 新增礼品附录
    }
    if (this.options.printSummary !== false) {
      await this._addSummaryAppendix(pdfDoc, fonts, processedData) // 统计附录
    }

    return pdfDoc.save()
  }
}

window.GiftRegistryPDF = GiftRegistryPDF
