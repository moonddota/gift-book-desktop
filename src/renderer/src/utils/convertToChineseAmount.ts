export function convertToChineseAmount(amount: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']

  if (amount === 0) return '零元整'
  if (amount < 0) return '负' + convertToChineseAmount(-amount) // 处理负数

  // 分离整数和小数部分
  const [integerPart, decimalPart] = amount.toString().split('.')
  let result = ''

  // --- 核心：分节处理整数部分 ---
  const processSection = (section: string): string => {
    if (section === '0000') return ''
    let sectionResult = ''
    let hasNonZero = false // 标记本节是否有非零数字

    for (let i = 0; i < section.length; i++) {
      const digit = parseInt(section[i])
      const unitIndex = section.length - 1 - i

      if (digit !== 0) {
        hasNonZero = true
        sectionResult += digits[digit] + (unitIndex > 0 ? units[unitIndex] : '')
      } else if (hasNonZero && i < section.length - 1) {
        // 只有在已经遇到非零数字后，且不是最后一位时，才加“零”
        sectionResult += '零'
      }
    }

    return sectionResult
  }

  // 将整数部分从右到左每4位分一节
  const sections: string[] = []
  let tempInteger = integerPart
  while (tempInteger.length > 0) {
    sections.unshift(tempInteger.slice(-4))
    tempInteger = tempInteger.slice(0, -4)
  }

  // 处理每一节，并加上“万”、“亿”等大单位
  for (let i = 0; i < sections.length; i++) {
    const sectionValue = sections[i]
    const sectionNumber = parseInt(sectionValue, 10)

    if (sectionNumber !== 0) {
      // 处理本节内部的数字
      let sectionText = processSection(sectionValue.padStart(4, '0'))

      // 添加大单位（亿、万）
      const bigUnitIndex = sections.length - 1 - i
      if (bigUnitIndex > 0) {
        sectionText += bigUnits[bigUnitIndex]
      }

      result += sectionText
    } else if (result && i < sections.length - 1) {
      // 如果前面已经有内容，且当前不是最后一节（个级），则可能需要加“零”
      // 但要避免在“亿”或“万”后面直接加“零”，例如“一亿零万”是错的
      // 这里简化处理：只有当下一节不全为0时才加“零”
      let hasNextNonZero = false
      for (let j = i + 1; j < sections.length; j++) {
        if (parseInt(sections[j], 10) !== 0) {
          hasNextNonZero = true
          break
        }
      }
      if (hasNextNonZero) {
        result += '零'
      }
    }
  }

  // 清理多余的“零”
  result = result.replace(/零+/g, '零') // 合并连续的零
  result = result.replace(/零+ $ /, '') // 移除末尾的零

  // 添加“元”字
  if (result === '') {
    result = '零'
  }
  result += '元'

  // --- 处理小数部分 ---
  if (decimalPart) {
    const jiao = parseInt(decimalPart[0] || '0')
    const fen = parseInt(decimalPart[1] || '0')

    if (jiao > 0) {
      result += digits[jiao] + '角'
    }
    if (fen > 0) {
      result += digits[fen] + '分'
    }
    if (jiao === 0 && fen === 0) {
      result += '整'
    }
  } else {
    result += '整'
  }

  return result
}

export const playVoice = (
  canPlay: boolean,
  voiceName: string,
  amount: number,
  name: string
): void => {
  if (canPlay) {
    // 检查浏览器是否支持语音合成
    if (typeof speechSynthesis === 'undefined') {
      return
    }

    // 取消任何正在进行的语音
    speechSynthesis.cancel()

    // 创建语音内容："{姓名}随礼{金额}元整"
    const amountText =
      convertToChineseAmount(Math.floor(amount)) + (amount % 1 === 0 ? '元整' : '元')
    const utteranceText = `${name}随礼${amountText}`

    const utterance = new SpeechSynthesisUtterance(utteranceText)

    // 如果 eventData.voiceName 存在，尝试使用指定音色
    if (voiceName) {
      const availableVoices = speechSynthesis.getVoices()
      const matchedVoice = availableVoices.find((voice) => voice.name === voiceName)
      if (matchedVoice) {
        utterance.voice = matchedVoice
      }
      // 如果找不到匹配的音色，会自动使用默认音色
    }

    // 设置语音参数（可选）
    utterance.rate = 1.0 // 正常语速
    utterance.pitch = 1.0 // 正常音调

    // 播放语音
    speechSynthesis.speak(utterance)
  }
}

export const expectedOrder = ['礼品', '关系', '电话', '住址']
