import { useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Trash2, Sparkles, Copy, Check, ListChecks, Plus, Minus } from 'lucide-react'

const sampleListA = '张三\n李四\n王五\n赵六\n张三'
const sampleListB = '李四\n王五\n孙七\n周八\n李四'

const ListComparator = () => {
  const [listA, setListA] = useState('')
  const [listB, setListB] = useState('')
  const [delimiter, setDelimiter] = useState('\\n')
  const [copySuccess, setCopySuccess] = useState('')

  const parseList = (text, delim) => {
    if (!text.trim()) return []
    let parts
    if (delim === '\\n') {
      parts = text.split(/\r?\n/)
    } else if (delim === '\\t') {
      parts = text.split(/\t/)
    } else {
      parts = text.split(delim)
    }
    return [...new Set(parts.map(s => s.trim()).filter(Boolean))]
  }

  const itemsA = useMemo(() => parseList(listA, delimiter).sort(), [listA, delimiter])
  const itemsB = useMemo(() => parseList(listB, delimiter).sort(), [listB, delimiter])

  const diff = useMemo(() => {
    const setA = new Set(itemsA)
    const setB = new Set(itemsB)
    const onlyA = itemsA.filter(x => !setB.has(x))
    const onlyB = itemsB.filter(x => !setA.has(x))
    const both = itemsA.filter(x => setB.has(x))
    return { onlyA, onlyB, both }
  }, [itemsA, itemsB])

  const handleCopy = async (items, label) => {
    const text = items.join('\n')
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopySuccess(label); setTimeout(() => setCopySuccess(''), 2000)
  }

  const handleClearA = () => setListA('')
  const handleClearB = () => setListB('')
  const handleUseSample = () => { setListA(sampleListA); setListB(sampleListB); setDelimiter('\\n') }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        {/* 输入区 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-a">清单 A</Label>
              <Button variant="ghost" size="sm" onClick={handleClearA} disabled={!listA.trim()} className="h-7 px-2 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />清空
              </Button>
            </div>
            <Textarea id="list-a" value={listA} onChange={e => setListA(e.target.value)}
              placeholder="粘贴清单 A 的内容..." rows={8} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-b">清单 B</Label>
              <Button variant="ghost" size="sm" onClick={handleClearB} disabled={!listB.trim()} className="h-7 px-2 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />清空
              </Button>
            </div>
            <Textarea id="list-b" value={listB} onChange={e => setListB(e.target.value)}
              placeholder="粘贴清单 B 的内容..." rows={8} className="font-mono text-sm" />
          </div>
        </div>

        {/* 分隔符 + 操作按钮 */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="delimiter">分隔符</Label>
            <Input id="delimiter" value={delimiter} onChange={e => setDelimiter(e.target.value)}
              placeholder="\\n 表示换行" className="w-[180px]" />
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setDelimiter('\\n')}>换行</Button>
            <Button variant="outline" size="sm" onClick={() => setDelimiter(',')}>逗号</Button>
            <Button variant="outline" size="sm" onClick={() => setDelimiter('\\t')}>Tab</Button>
          </div>
          <Button size="sm" onClick={handleUseSample} className="ml-auto">
            <Sparkles className="w-4 h-4 mr-1.5" />示例
          </Button>
        </div>
      </CardContent>

      <Separator />

      {/* 统计概览 */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />比对结果
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <span>A: {itemsA.length} 项</span>
            <span>B: {itemsB.length} 项</span>
            <span className="text-emerald-600">共有: {diff.both.length} 项</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {(!itemsA.length && !itemsB.length) ? (
          <div className="min-h-[150px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
            输入两个清单后自动显示比对结果
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* 仅在 A */}
            <ResultBlock
              icon={<Minus className="w-4 h-4" />}
              title="仅在 A"
              items={diff.onlyA}
              color="text-amber-600"
              bg="bg-amber-50"
              border="border-amber-200"
              onCopy={() => handleCopy(diff.onlyA, 'onlyA')}
              copySuccess={copySuccess === 'onlyA'}
            />
            {/* 共有 */}
            <ResultBlock
              icon={<Check className="w-4 h-4" />}
              title="共有"
              items={diff.both}
              color="text-emerald-600"
              bg="bg-emerald-50"
              border="border-emerald-200"
              onCopy={() => handleCopy(diff.both, 'both')}
              copySuccess={copySuccess === 'both'}
            />
            {/* 仅在 B */}
            <ResultBlock
              icon={<Plus className="w-4 h-4" />}
              title="仅在 B"
              items={diff.onlyB}
              color="text-blue-600"
              bg="bg-blue-50"
              border="border-blue-200"
              onCopy={() => handleCopy(diff.onlyB, 'onlyB')}
              copySuccess={copySuccess === 'onlyB'}
            />
          </div>
        )}
      </CardContent>

      <Separator />

      <CardContent className="py-4">
        <h4 className="text-sm font-semibold mb-2">使用说明</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>分别在清单 A、B 输入框中粘贴要比对的内容</li>
          <li>选择或输入分隔符（默认按换行分割，支持逗号、Tab 等自定义分隔符）</li>
          <li>自动去重、排序后比对，按"仅在A / 共有 / 仅在B"三列展示</li>
          <li>每列支持一键复制结果</li>
        </ul>
      </CardContent>
    </Card>
  )
}

const ResultBlock = ({ icon, title, items, color, bg, border, onCopy, copySuccess }) => (
  <div className={`rounded-lg border ${border} ${bg} overflow-hidden flex flex-col`}>
    <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
      <span className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
        {icon}{title}
      </span>
      <span className="text-xs text-muted-foreground font-medium">{items.length} 项</span>
    </div>
    <div className="flex-1 p-3 min-h-[120px] max-h-[400px] overflow-auto">
      {items.length > 0 ? (
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm font-mono px-2 py-0.5 rounded hover:bg-white/50">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground text-center pt-8">无</p>
      )}
    </div>
    <div className={`px-3 py-2 border-t ${border}`}>
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={onCopy} disabled={!items.length}>
        {copySuccess ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
        {copySuccess ? '已复制' : '复制'}
      </Button>
    </div>
  </div>
)

export default ListComparator
