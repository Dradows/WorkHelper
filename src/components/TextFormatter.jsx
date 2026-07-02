import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Trash2, Sparkles, Copy, Check } from 'lucide-react'

const sampleText = 'ACCOUNT_ID\nCUSTOMER_NO\nORDER_DATE'

const TextFormatter = () => {
  const [inputText, setInputText] = useState('')
  const [formattedText, setFormattedText] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [surround, setSurround] = useState("'")

  useEffect(() => {
    if (!inputText.trim()) { setFormattedText(''); return }
    const items = inputText.split(/[\n\s,，;；]+/).map(i => i.trim()).filter(i => i.length > 0)
    setFormattedText(items.map(i => `${surround}${i}${surround}`).join(','))
  }, [inputText, surround])

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(formattedText) } catch {
      const ta = document.createElement('textarea'); ta.value = formattedText
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleClear = () => { setInputText(''); setFormattedText('') }
  const handleUseSample = () => { setInputText(sampleText); setSurround("'") }
  const itemCount = inputText.trim() ? inputText.split(/[\n\s,，;；]+/).map(i => i.trim()).filter(i => i.length > 0).length : 0

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="text-input">输入文本（支持换行、空格、逗号等分隔符）</Label>
          <Textarea id="text-input" value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder="请输入要格式化的文本，例如：&#10;A&#10;B&#10;C&#10;或者：A B C&#10;或者：A,B,C" rows={6} className="font-mono" />
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label htmlFor="surround">每项两侧包围字符串</Label>
            <Input id="surround" value={surround} onChange={e => setSurround(e.target.value)}
              placeholder={"例如：' 或 ` 或空"} className="max-w-[200px]" />
          </div>
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
          <CardTitle className="text-lg">格式化结果</CardTitle>
          <div className="flex items-center gap-3">
            {formattedText && <span className="text-sm text-muted-foreground font-medium">共 {itemCount} 项</span>}
            <Button size="sm" variant={copySuccess ? "secondary" : "default"} onClick={handleCopy} disabled={!formattedText}>
              {copySuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copySuccess ? '已复制' : '复制结果'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {formattedText ? (
          <div className="p-4 rounded-md bg-muted/50 border font-mono text-sm break-all leading-relaxed">{formattedText}</div>
        ) : (
          <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
            输入内容后将在此显示格式化结果
          </div>
        )}
      </CardContent>

      <Separator />

      <CardContent className="py-4">
        <h4 className="text-sm font-semibold mb-2">使用说明</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>支持多种分隔符：换行、空格、逗号、分号等</li>
          <li>自动过滤空项和多余空格</li>
          <li>结果格式：'A','B','C'</li>
          <li>点击复制按钮可复制到剪贴板</li>
        </ul>
      </CardContent>
    </Card>
  )
}

export default TextFormatter
