import { useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Checkbox } from './ui/checkbox'
import { Trash2, Sparkles, Copy, Check, Upload, Download, FileText } from 'lucide-react'

const sampleSourceText = 'SRC_A001 待处理\nSRC_B002 待处理\nSRC_A003 已完成'
const sampleRuleText = 'SRC_A JOB_A\nSRC_B JOB_B\n待处理 TODO'
const escapeRegExp = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const parseRules = (ruleText) => {
  const errors = []; const rules = ruleText.split(/\r?\n/)
    .map((line, i) => ({ raw: line.trim(), line: i + 1 }))
    .filter(({ raw }) => raw && !raw.startsWith('#'))
    .map(({ raw, line }) => { const m = raw.match(/^(\S+)(?:\s+([\s\S]*))?$/); return m ? { from: m[1], to: m[2] ?? '', line } : (errors.push(`第 ${line} 行规则无法解析`), null) })
    .filter(Boolean)
  return { rules, errors }
}
const buildRegex = (from, useRegex) => useRegex ? new RegExp(from, 'g') : new RegExp(escapeRegExp(from), 'g')
const replaceText = (value, rules, useRegex) => { let r = value, c = 0; for (const rule of rules) { const re = buildRegex(rule.from, useRegex); let cc = 0; r = r.replace(re, () => { cc++; return rule.to }); c += cc } return { result: r, count: c } }
const readFileAsText = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = e => resolve(String(e.target.result ?? '')); reader.onerror = () => reject(new Error(`${file.name} 读取失败`)); reader.readAsText(file, 'utf-8') })
const buildOutputName = name => { const i = name.lastIndexOf('.'); return i <= 0 ? `${name}_replaced.txt` : `${name.slice(0, i)}_replaced${name.slice(i)}` }
const downloadBlob = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) }

const StringReplacer = () => {
  const fileInputRef = useRef(null)
  const [sourceText, setSourceText] = useState('')
  const [ruleText, setRuleText] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [processedFiles, setProcessedFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const parsedRules = useMemo(() => parseRules(ruleText), [ruleText])
  const preview = useMemo(() => {
    if (!sourceText || !parsedRules.rules.length || parsedRules.errors.length) return { result: '', count: 0, error: '' }
    try { return replaceText(sourceText, parsedRules.rules, useRegex) } catch (e) { return { result: '', count: 0, error: e.message } }
  }, [sourceText, parsedRules, useRegex])

  const handleFilesChange = e => { const files = Array.from(e.target.files || []); setSelectedFiles(files); setProcessedFiles([]); setProgress(0); setMessage(files.length ? `已选择 ${files.length} 个文件` : '') }
  const handleProcessFiles = async () => {
    if (!selectedFiles.length) return setMessage('请先选择文件')
    if (!parsedRules.rules.length) return setMessage('请先填写至少一条替换规则')
    if (parsedRules.errors.length) return setMessage(parsedRules.errors[0])
    setIsProcessing(true); setProgress(0); setProcessedFiles([]); setMessage('正在处理文件...')
    try {
      const results = []; let tc = 0
      for (let i = 0; i < selectedFiles.length; i++) { const { result, count } = replaceText(await readFileAsText(selectedFiles[i]), parsedRules.rules, useRegex); tc += count; results.push({ name: selectedFiles[i].name, outputName: buildOutputName(selectedFiles[i].name), content: result, count }); setProgress(Math.round(((i + 1) / selectedFiles.length) * 100)) }
      setProcessedFiles(results); setMessage(`处理完成：${results.length} 个文件，共替换 ${tc} 处`)
    } catch (e) { setMessage(e.message || '文件处理失败') } finally { setIsProcessing(false) }
  }
  const handleDownloadFiles = async () => {
    if (!processedFiles.length) return
    if (processedFiles.length === 1) { downloadBlob(new Blob([processedFiles[0].content], { type: 'text/plain;charset=utf-8' }), processedFiles[0].outputName); return }
    const zip = new JSZip(); processedFiles.forEach(f => zip.file(f.outputName, f.content)); downloadBlob(await zip.generateAsync({ type: 'blob' }), 'string_replaced_files.zip')
  }
  const handleCopy = async () => { if (!preview.result) return; try { await navigator.clipboard.writeText(preview.result) } catch { const ta = document.createElement('textarea'); ta.value = preview.result; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove() }; setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000) }
  const handleClearFiles = () => { setSelectedFiles([]); setProcessedFiles([]); setProgress(0); setMessage(''); if (fileInputRef.current) fileInputRef.current.value = '' }
  const handleUseSample = () => { setSourceText(sampleSourceText); setRuleText(sampleRuleText); setUseRegex(false) }
  const ruleError = parsedRules.errors[0] || preview.error
  const canProcessFiles = selectedFiles.length > 0 && parsedRules.rules.length > 0 && !isProcessing

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="replace-source">直接输入文本</Label>
            <Textarea id="replace-source" value={sourceText} onChange={e => setSourceText(e.target.value)} rows={8}
              placeholder="在这里粘贴要处理的文本" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="replace-rules">替换规则</Label>
            <Textarea id="replace-rules" value={ruleText} onChange={e => setRuleText(e.target.value)} rows={8}
              placeholder={"A A'\nB B'"} className="font-mono" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={useRegex} onCheckedChange={c => setUseRegex(!!c)} />
                <span className="text-sm">使用正则</span>
              </label>
              <span className="text-xs text-muted-foreground">已解析 {parsedRules.rules.length} 条规则</span>
            </div>
            <Button size="sm" onClick={handleUseSample}><Sparkles className="w-4 h-4 mr-1.5" />示例</Button>
            {ruleError && <p className="text-sm text-red-600">{ruleError}</p>}
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />文本替换结果</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">{preview.count ? `替换 ${preview.count} 处` : '等待输入'}</span>
            <Button size="sm" variant={copySuccess ? "secondary" : "default"} onClick={handleCopy} disabled={!preview.result}>
              {copySuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}{copySuccess ? '已复制' : '复制结果'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="p-4 rounded-md bg-muted/50 border font-mono text-sm whitespace-pre-wrap break-all min-h-[60px]">{preview.result || '文本处理结果将在这里显示'}</pre>
      </CardContent>

      <Separator />

      <CardContent className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="replace-files">选择文件批量替换</Label>
          <Input id="replace-files" ref={fileInputRef} type="file" multiple onChange={handleFilesChange} />
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleProcessFiles} disabled={!canProcessFiles}>
              <Upload className="w-4 h-4 mr-1.5" />{isProcessing ? '处理中...' : '处理文件'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadFiles} disabled={!processedFiles.length}>
              <Download className="w-4 h-4 mr-1.5" />下载结果
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearFiles} disabled={!selectedFiles.length && !processedFiles.length}>
              <Trash2 className="w-4 h-4 mr-1.5" />清空文件
            </Button>
          </div>
        </div>

        {(selectedFiles.length > 1 || isProcessing || progress > 0) && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground font-medium">{message}</p>}
        {processedFiles.length > 0 && (
          <div className="space-y-1">
            {processedFiles.map(f => (
              <div key={f.outputName} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border text-sm">
                <span className="font-mono">{f.outputName}</span>
                <strong className="text-primary">{f.count} 处</strong>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StringReplacer
