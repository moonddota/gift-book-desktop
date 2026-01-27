// VoiceSelector.tsx
import { SoundOutlined } from '@ant-design/icons'
import { Button, Col, Row, Select, Typography } from 'antd'
import React, { useEffect, useState } from 'react'

const { Text } = Typography

interface VoiceOption {
  value: string
  label: string
}

const VoiceSelector = ({
  selectedVoice,
  onVoiceChange
}: {
  selectedVoice: string | null
  onVoiceChange: (voiceName: string | null) => void
}): React.JSX.Element => {
  const [voices, setVoices] = useState<VoiceOption[]>([])

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return

    const loadVoices = (): void => {
      const synthVoices = speechSynthesis.getVoices()
      if (synthVoices.length === 0) return

      const available = synthVoices.map((voice) => ({
        value: voice.name,
        label: `${voice.name} (${voice.lang})`
      }))

      setVoices((prev) => {
        const isSame =
          prev.length === available.length && prev.every((v, i) => v.value === available[i].value)
        return isSame ? prev : available
      })
    }

    loadVoices() // 初始加载
    speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  const handlePreview = (): void => {
    const utterance = new SpeechSynthesisUtterance('张三随礼五百元整')
    if (selectedVoice) {
      const matchedVoice = speechSynthesis.getVoices().find((v) => v.name === selectedVoice)
      if (matchedVoice) {
        utterance.voice = matchedVoice
      }
    }
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  return (
    <Row className="mt-3!">
      <Col span={20}>
        <Select
          className="w-full dark:bg-gray-200! dark:text-gray-800!"
          placeholder={<Text type="secondary">请选择语音音色</Text>}
          value={selectedVoice}
          onChange={(value: string | null) => {
            onVoiceChange(value)
          }}
          size="large"
          options={[{ value: null, label: '默认音色' }, ...voices]}
          showSearch={{
            filterOption: (input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }}
        />
      </Col>
      <Col offset={1} span={3}>
        <Button
          type="primary"
          className="w-full"
          size="large"
          onClick={handlePreview}
          icon={<SoundOutlined />}
        >
          预览
        </Button>
      </Col>
    </Row>
  )
}

export default VoiceSelector
