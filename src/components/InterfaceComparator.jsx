import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Upload, Play, Loader2, GitCompare, FileText, Check, X } from 'lucide-react'

const InterfaceComparator = () => {
  const [files, setFiles] = useState([])
  const [pairText, setPairText] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files || [])
    if (!fileList.length) return
    setFiles(fileList)
    setResults([])
  }

  // Find the shortest filename that starts with the given prefix (case-insensitive)
  const findFileByPrefix = (prefix, fileList) => {
    const lower = prefix.trim().toLowerCase()
    if (!lower) return null
    const matches = fileList.filter(f => f.name.toLowerCase().startsWith(lower))
    if (matches.length === 0) return null
    // Pick the shortest matching filename
    matches.sort((a, b) => a.name.length - b.name.length)
    return matches[0]
  }

  // Levenshtein distance between two strings
  const levenshteinDistance = (a, b) => {
    const lenA = a.length
    const lenB = b.length
    const dp = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0))
    for (let i = 0; i <= lenA; i++) dp[i][0] = i
    for (let j = 0; j <= lenB; j++) dp[0][j] = j
    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
    return dp[lenA][lenB]
  }

  // Get filename without extension for comparison
  const getNameCore = (name) => {
    const lastDot = name.lastIndexOf('.')
    return lastDot > 0 ? name.substring(0, lastDot) : name
  }

  // Similarity score between two filenames (0-1, higher = more similar)
  const fileNameSimilarity = (fileA, fileB) => {
    const a = getNameCore(fileA.name).toLowerCase()
    const b = getNameCore(fileB.name).toLowerCase()
    const dist = levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1
    return 1 - dist / maxLen
  }

  // Greedy matching: pair files by highest similarity
  const autoMatchFiles = (fileList) => {
    const n = fileList.length
    // Build all pairwise similarities
    const candidates = []
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        candidates.push({
          i, j,
          score: fileNameSimilarity(fileList[i], fileList[j])
        })
      }
    }
    // Sort by similarity descending
    candidates.sort((a, b) => b.score - a.score)

    const used = new Set()
    const pairs = []
    for (const { i, j } of candidates) {
      if (!used.has(i) && !used.has(j)) {
        used.add(i)
        used.add(j)
        pairs.push({ left: fileList[i], right: fileList[j] })
      }
    }
    return pairs
  }

  // Auto-matched pairs computed from files (memoized)
  const autoPairs = useMemo(() => {
    if (files.length <= 2) return []
    return autoMatchFiles(files)
  }, [files])

  // Read a sheet from an Excel file, return rows (array of arrays)
  const readSheet = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          // Get the 2nd sheet (index 1)
          const sheetName = workbook.SheetNames[1]
          if (!sheetName) {
            reject(new Error(`文件 ${file.name} 没有第2个sheet页`))
            return
          }
          const worksheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          resolve({ fileName: file.name, sheetName, rows })
        } catch (err) {
          reject(new Error(`读取文件 ${file.name} 失败: ${err.message}`))
        }
      }
      reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`))
      reader.readAsArrayBuffer(file)
    })
  }

  // Compare two sheets: compare first 3 columns of each row
  const compareSheets = (dataA, dataB) => {
    const maxRows = Math.max(dataA.rows.length, dataB.rows.length)
    const diffs = []

    for (let i = 0; i < maxRows; i++) {
      const rowA = dataA.rows[i] || []
      const rowB = dataB.rows[i] || []

      const colDiffs = []
      for (let col = 0; col < 3; col++) {
        const valA = (rowA[col] !== undefined && rowA[col] !== null) ? String(rowA[col]).trim() : ''
        const valB = (rowB[col] !== undefined && rowB[col] !== null) ? String(rowB[col]).trim() : ''
        if (valA !== valB) {
          colDiffs.push({ col: col + 1, valA, valB })
        }
      }

      if (colDiffs.length > 0) {
        diffs.push({ row: i + 1, colDiffs })
      }
    }

    return diffs
  }

  const handleCompare = async () => {
    setResults([])
    setLoading(true)

    try {
      const pairs = []
      if (files.length === 2) {
        // Direct comparison of the two files
        pairs.push({ left: files[0], right: files[1] })
      } else if (files.length > 2) {
        // Parse pair text: each line = two file prefixes
        const lines = pairText.split(/\r?\n/).filter(l => l.trim())
        if (lines.length === 0) {
          // Auto-match by filename similarity
          const matched = autoMatchFiles(files)
          if (matched.length === 0) {
            alert('无法自动匹配文件，请手动填写比对配对')
            setLoading(false)
            return
          }
          pairs.push(...matched)
        } else {
          for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(/\s+/).filter(p => p.trim())
            if (parts.length < 2) {
              alert(`第 ${i + 1} 行格式不正确，需要两个文件名/前缀，用空格分隔`)
              setLoading(false)
              return
            }
            const leftFile = findFileByPrefix(parts[0], files)
            const rightFile = findFileByPrefix(parts[1], files)
            if (!leftFile) {
              alert(`第 ${i + 1} 行: 找不到匹配 "${parts[0]}" 的文件`)
              setLoading(false)
              return
            }
            if (!rightFile) {
              alert(`第 ${i + 1} 行: 找不到匹配 "${parts[1]}" 的文件`)
              setLoading(false)
              return
            }
            pairs.push({ left: leftFile, right: rightFile })
          }
        }
      } else {
        alert('请至少上传2个文件')
        setLoading(false)
        return
      }

      const allResults = []

      for (const pair of pairs) {
        try {
          const [dataA, dataB] = await Promise.all([
            readSheet(pair.left),
            readSheet(pair.right)
          ])

          const diffs = compareSheets(dataA, dataB)

          allResults.push({
            leftFile: dataA.fileName,
            rightFile: dataB.fileName,
            leftSheet: dataA.sheetName,
            rightSheet: dataB.sheetName,
            diffs,
            totalRows: Math.max(dataA.rows.length, dataB.rows.length)
          })
        } catch (err) {
          allResults.push({
            leftFile: pair.left.name,
            rightFile: pair.right.name,
            error: err.message
          })
        }
      }

      setResults(allResults)
    } catch (err) {
      alert('比对过程出错: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getColLabel = (colNum) => {
    return ['A', 'B', 'C'][colNum - 1] || colNum
  }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        {/* 文件选择 */}
        <div className="space-y-2">
          <Label htmlFor="ic-files">选择 Excel 文件（至少2个）</Label>
          <input id="ic-files" type="file" accept=".xlsx,.xls" multiple onChange={handleFileChange}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:px-3 file:py-1 file:mr-3 file:rounded hover:file:bg-primary/90" />
          {files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground font-medium mb-1">已选择 {files.length} 个文件：</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                {files.map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* 比对配对（多文件时） */}
        {files.length > 2 && (
          <div className="space-y-2">
            <Label htmlFor="ic-pairs">比对配对（每行两个文件名/前缀，空格分隔）</Label>
            <Textarea id="ic-pairs" rows={6} value={pairText} onChange={e => setPairText(e.target.value)}
              placeholder="留空则按文件名相似度自动匹配&#10;&#10;手动指定示例:&#10;文件A 文件B&#10;前缀C 前缀D" className="font-mono" />
            {!pairText.trim() && autoPairs.length > 0 && (
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm">
                <p className="font-medium text-blue-800 mb-1">将按文件名相似度自动匹配以下 {autoPairs.length} 对：</p>
                <ul className="space-y-0.5 text-blue-700">
                  {autoPairs.map((p, i) => (
                    <li key={i} className="font-mono text-xs">{p.left.name}  ↔  {p.right.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleCompare} disabled={loading || files.length < 2}>
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            {loading ? '比对中...' : '开始比对'}
          </Button>
        </div>
      </CardContent>

      {/* 比对结果 */}
      {results.length > 0 && (
        <>
          <Separator />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />比对结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.map((result, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/50 border-b">
                  <h3 className="text-sm font-semibold">
                    比对 {idx + 1}：<span className="font-mono text-primary">{result.leftFile}</span>
                    {' ↔ '}
                    <span className="font-mono text-primary">{result.rightFile}</span>
                  </h3>
                </div>
                <div className="p-4">
                  {result.error ? (
                    <p className="text-sm text-red-600">错误: {result.error}</p>
                  ) : result.diffs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <Check className="w-4 h-4" />
                      两个文件在第2个Sheet页（"{result.leftSheet}"）的前三列完全一致，共 {result.totalRows} 行。
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sheet: "{result.leftSheet}" / "{result.rightSheet}"，共 {result.totalRows} 行，发现 {result.diffs.length} 行差异：
                      </p>
                      <div className="overflow-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-left border font-medium">行号</th>
                              <th className="px-3 py-2 text-left border font-medium">列</th>
                              <th className="px-3 py-2 text-left border font-medium">{result.leftFile}</th>
                              <th className="px-3 py-2 text-left border font-medium">{result.rightFile}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.diffs.map((diff, di) =>
                              diff.colDiffs.map((cd, ci) => (
                                <tr key={`${di}-${ci}`} className="hover:bg-muted/30">
                                  <td className="px-3 py-1.5 border text-muted-foreground">{diff.row}</td>
                                  <td className="px-3 py-1.5 border font-mono text-xs">列 {['A','B','C'][cd.col-1]}</td>
                                  <td className="px-3 py-1.5 border font-mono text-xs text-amber-700">{cd.valA || '(空)'}</td>
                                  <td className="px-3 py-1.5 border font-mono text-xs text-blue-700">{cd.valB || '(空)'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default InterfaceComparator
