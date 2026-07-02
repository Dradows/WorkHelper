import React, { useState, useEffect, useCallback } from 'react'
import { generateQRCode } from '../utils/qrCodeUtils'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Download, QrCode, Loader2 } from 'lucide-react'

const QRCodeGenerator = () => {
  const [inputText, setInputText] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [size, setSize] = useState(300)
  const [debouncedText, setDebouncedText] = useState('')

  useEffect(() => { const t = setTimeout(() => setDebouncedText(inputText), 300); return () => clearTimeout(t) }, [inputText])

  useEffect(() => {
    if (!debouncedText.trim()) { setQrCodeData(''); setError(''); return }
    setIsLoading(true); setError('')
    generateQRCode(debouncedText, size).then(data => { setQrCodeData(data) }).catch(err => { setError('生成二维码时出错，请重试'); console.error(err) }).finally(() => setIsLoading(false))
  }, [debouncedText, size])

  const handleDownload = useCallback(() => {
    if (!qrCodeData) return
    try { const a = document.createElement('a'); a.download = 'qrcode.png'; a.href = qrCodeData; document.body.appendChild(a); a.click(); a.remove() } catch { alert('下载失败') }
  }, [qrCodeData])

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="text-input">输入文本或链接</Label>
          <Textarea id="text-input" value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder="请输入要转换为二维码的文本、链接或内容..." rows={4} className="font-mono" />
        </div>
      </CardContent>

      <Separator />

      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" />生成的二维码</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-[300px] h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
          {isLoading && <div className="flex flex-col items-center gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" />正在生成...</div>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!isLoading && !error && !qrCodeData && <p className="text-muted-foreground text-sm">输入内容后将在此显示二维码</p>}
          {!isLoading && !error && qrCodeData && <img src={qrCodeData} alt="二维码" className="max-w-full max-h-full" />}
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={handleDownload} disabled={!qrCodeData || isLoading}>
            <Download className="w-4 h-4 mr-1.5" />下载二维码
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="size-select" className="whitespace-nowrap">大小：</Label>
            <Select value={String(size)} onValueChange={v => setSize(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="200">200×200</SelectItem>
                <SelectItem value="300">300×300</SelectItem>
                <SelectItem value="400">400×400</SelectItem>
                <SelectItem value="500">500×500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default QRCodeGenerator
