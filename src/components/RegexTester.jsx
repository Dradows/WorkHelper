import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Trash2, Sparkles, Copy, Check, Search } from 'lucide-react'

const sampleRegexPattern = '\\b\\d{2}:\\d{2}:\\d{2}\\b'
const sampleTestString = 'JOB_A finished at 06:01:00\nJOB_B finished at 05:00:00'

const RegexTester = () => {
  const [regexPattern, setRegexPattern] = useState('')
  const [testString, setTestString] = useState('')
  const [flags, setFlags] = useState('g')
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [copyMatchSuccess, setCopyMatchSuccess] = useState(false)
  const [copyRegexSuccess, setCopyRegexSuccess] = useState(false)

  useEffect(() => {
    if (!regexPattern.trim() || !testString.trim()) { setMatches([]); setError(''); setIsValid(true); return }
    try {
      new RegExp(regexPattern, flags); setIsValid(true); setError('')
      const regex = new RegExp(regexPattern, flags); const results = []; let match
      if (flags.includes('g')) {
        while ((match = regex.exec(testString)) !== null) {
          results.push({ fullMatch: match[0], groups: match.slice(1), index: match.index })
        }
      } else {
        match = regex.exec(testString)
        if (match) results.push({ fullMatch: match[0], groups: match.slice(1), index: match.index })
      }
      setMatches(results)
    } catch (err) { setIsValid(false); setError(`正则表达式错误: ${err.message}`); setMatches([]) }
  }, [regexPattern, testString, flags])

  const doCopy = async (text, setSuccess) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setSuccess(true); setTimeout(() => setSuccess(false), 2000)
  }

  const handleClear = () => { setRegexPattern(''); setTestString(''); setFlags('g'); setMatches([]); setError(''); setIsValid(true) }
  const handleUseSample = () => { setRegexPattern(sampleRegexPattern); setTestString(sampleTestString); setFlags('g') }

  const highlightMatches = (text, pattern) => {
    if (!pattern.trim()) return text
    try { return text.replace(new RegExp(`(${pattern})`, flags), '<mark class="bg-amber-200 rounded px-0.5">$1</mark>') }
    catch { return text }
  }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="regex-pattern">正则表达式</Label>
          <div className="flex items-center gap-0">
            <span className="px-2 py-2 bg-muted border border-r-0 rounded-l-md text-muted-foreground font-mono text-sm">/</span>
            <Input id="regex-pattern" value={regexPattern} onChange={e => setRegexPattern(e.target.value)}
              placeholder="输入正则表达式，如：\d+" className={`rounded-none border-x-0 font-mono ${!isValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
            <span className="px-2 py-2 bg-muted border border-l-0 rounded-r-md text-muted-foreground font-mono text-sm">/</span>
            <Input id="regex-flags" value={flags} onChange={e => setFlags(e.target.value)} placeholder="g" maxLength={10}
              className="w-20 ml-2 font-mono" />
          </div>
          {!isValid && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-string">测试字符串</Label>
          <Textarea id="test-string" value={testString} onChange={e => setTestString(e.target.value)}
            placeholder="输入要测试的字符串..." rows={6} className="font-mono" />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={!regexPattern.trim() && !testString.trim()}>
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
            <Search className="w-5 h-5 text-primary" />匹配结果
          </CardTitle>
          <div className="flex items-center gap-2">
            {matches.length > 0 && <span className="text-sm text-muted-foreground font-medium">找到 {matches.length} 个匹配</span>}
            <div className="flex gap-2">
              <Button size="sm" variant={copyMatchSuccess ? "secondary" : "default"} onClick={() => doCopy(matches.map(m => m.fullMatch).join('\n'), setCopyMatchSuccess)} disabled={!matches.length}>
                {copyMatchSuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}匹配结果
              </Button>
              <Button size="sm" variant="outline" onClick={() => doCopy(`/${regexPattern}/${flags}`, setCopyRegexSuccess)} disabled={!regexPattern.trim()}>
                {copyRegexSuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}正则
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {matches.length > 0 ? (
          <>
            <div className="space-y-2">
              {matches.map((match, i) => (
                <div key={i} className="p-3 rounded-md border bg-card text-sm space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-primary">#{i + 1}</span>
                    <span className="text-muted-foreground text-xs">位置: {match.index}</span>
                  </div>
                  <div><strong>完整匹配:</strong> <code className="px-1.5 py-0.5 bg-muted rounded font-mono">{match.fullMatch}</code></div>
                  {match.groups.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <strong>捕获组:</strong>
                      {match.groups.map((g, gi) => (
                        <code key={gi} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs">{gi + 1}: {g || '(空)'}</code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold">高亮显示</h4>
              <div className="p-4 rounded-md bg-muted/50 border font-mono text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightMatches(testString, regexPattern) }} />
            </div>
          </>
        ) : (
          <div className="min-h-[120px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
            {regexPattern.trim() && testString.trim() && isValid ? '未找到匹配项' : '输入正则表达式和测试字符串后将在此显示匹配结果'}
          </div>
        )}
      </CardContent>

      <Separator />

      <CardContent className="py-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">使用说明</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>输入正则表达式模式（不需要包含分隔符 /）</li>
            <li>在标志输入框中输入标志（如：g, i, m, s, u, y）</li>
            <li>在测试字符串中输入要匹配的文本</li>
            <li>实时查看匹配结果和捕获组</li>
            <li>支持复制匹配结果和正则表达式</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">常用正则表达式</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: '邮箱', code: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
              { label: '手机号', code: '1[3-9]\\d{9}' },
              { label: '身份证', code: '\\d{17}[\\dXx]' },
              { label: '时间格式', code: '\\d{1,2}小时' },
            ].map(item => (
              <div key={item.label} className="p-2 rounded bg-muted/50 border">
                <strong>{item.label}:</strong> <code className="text-xs">{item.code}</code>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RegexTester
