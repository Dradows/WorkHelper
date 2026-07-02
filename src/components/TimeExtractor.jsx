import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Trash2, Sparkles, Copy, Check, Clock } from 'lucide-react'

const sampleText = 'plan 1.5\u5c0f\u65f6, dev 2\u5c0f\u65f6, review 0.5\u5c0f\u65f6'

const TimeExtractor = () => {
  const [inputText, setInputText] = useState('')
  const [extractedTimes, setExtractedTimes] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [copyTotalSuccess, setCopyTotalSuccess] = useState(false)
  const [copyDetailSuccess, setCopyDetailSuccess] = useState(false)

  useEffect(() => {
    if (!inputText.trim()) { setExtractedTimes([]); setTotalHours(0); return }
    const timeRegex = /(\d+(?:\.\d+)?)\s*小时/g
    const matches = []; let match; let total = 0
    while ((match = timeRegex.exec(inputText)) !== null) {
      const hours = parseFloat(match[1])
      matches.push({ text: match[0], hours, index: match.index })
      total += hours
    }
    setExtractedTimes(matches); setTotalHours(total)
  }, [inputText])

  const doCopy = async (text, setSuccess) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setSuccess(true); setTimeout(() => setSuccess(false), 2000)
  }

  const handleClear = () => { setInputText(''); setExtractedTimes([]); setTotalHours(0) }
  const handleUseSample = () => setInputText(sampleText)

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="text-input">输入包含时间的文本</Label>
          <Textarea id="text-input" value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder="请输入包含时间的文本，例如：今天工作了3小时，明天计划2.5小时" rows={6} className="font-mono" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={!inputText.trim()}>
            <Trash2 className="w-4 h-4 mr-1.5" />清空
          </Button>
          <Button size="sm" onClick={handleUseSample}>
            <Sparkles className="w-4 h-4 mr-1.5" />示例
          </Button>
        </div>
      </CardContent>

      <Separator />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />总计
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{totalHours}</span>
            <span className="text-sm text-muted-foreground">小时</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant={copyTotalSuccess ? "secondary" : "default"} onClick={() => doCopy(totalHours.toString(), setCopyTotalSuccess)} disabled={totalHours === 0}>
            {copyTotalSuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copyTotalSuccess ? '已复制' : '复制总小时数'}
          </Button>
          {extractedTimes.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => doCopy(extractedTimes.map(i => i.text).join(', '), setCopyDetailSuccess)}>
              {copyDetailSuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copyDetailSuccess ? '已复制' : '复制详细结果'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {extractedTimes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_100px] gap-2 px-4 py-2.5 bg-muted/50 text-sm font-semibold border-b">
              <span>序号</span><span>时间文本</span><span>小时数</span>
            </div>
            {extractedTimes.map((item, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_100px] gap-2 px-4 py-2.5 text-sm border-b last:border-0 hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground">{i + 1}</span>
                <span className="font-mono">{item.text}</span>
                <span className="font-semibold">{item.hours} 小时</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
            {inputText.trim() ? '未找到时间格式，请检查输入' : '输入内容后将在此显示提取结果'}
          </div>
        )}
      </CardContent>

      <Separator />

      <CardContent className="py-4">
        <h4 className="text-sm font-semibold mb-2">使用说明</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-3">
          <li>支持格式：3小时、2.5小时、1.25小时等</li>
          <li>自动识别并提取所有时间信息</li>
          <li>实时计算总小时数</li>
          <li>支持小数时间（如2.5小时）</li>
        </ul>
        <div className="p-3 rounded-md bg-muted/50 border text-sm space-y-1">
          <p><strong>示例输入：</strong>今天工作了3小时，明天计划2.5小时</p>
          <p><strong>提取结果：</strong>3小时, 2.5小时</p>
          <p><strong>总计：</strong>5.5小时</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default TimeExtractor
