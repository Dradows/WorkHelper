import { useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'

const defaultRules = ''
const sampleSourceText = 'SRC_A001 待处理\nSRC_B002 待处理\nSRC_A003 已完成'
const sampleRuleText = 'SRC_A JOB_A\nSRC_B JOB_B\n待处理 TODO'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseRules = (ruleText) => {
  const errors = []
  const rules = ruleText
    .split(/\r?\n/)
    .map((line, index) => ({ raw: line.trim(), line: index + 1 }))
    .filter(({ raw }) => raw && !raw.startsWith('#'))
    .map(({ raw, line }) => {
      const match = raw.match(/^(\S+)(?:\s+([\s\S]*))?$/)
      if (!match) {
        errors.push(`第 ${line} 行规则无法解析`)
        return null
      }

      return {
        from: match[1],
        to: match[2] ?? '',
        line,
      }
    })
    .filter(Boolean)

  return { rules, errors }
}

const buildRegex = (from, useRegex) => {
  if (useRegex) {
    return new RegExp(from, 'g')
  }

  return new RegExp(escapeRegExp(from), 'g')
}

const replaceText = (value, rules, useRegex) => {
  let result = value
  let totalCount = 0

  for (const rule of rules) {
    const regex = buildRegex(rule.from, useRegex)
    let count = 0
    result = result.replace(regex, () => {
      count += 1
      return rule.to
    })
    totalCount += count
  }

  return { result, count: totalCount }
}

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (event) => resolve(String(event.target.result ?? ''))
  reader.onerror = () => reject(new Error(`${file.name} 读取失败`))
  reader.readAsText(file, 'utf-8')
})

const buildOutputName = (fileName) => {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return `${fileName}_replaced.txt`

  return `${fileName.slice(0, dotIndex)}_replaced${fileName.slice(dotIndex)}`
}

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const StringReplacer = () => {
  const fileInputRef = useRef(null)
  const [sourceText, setSourceText] = useState('')
  const [ruleText, setRuleText] = useState(defaultRules)
  const [useRegex, setUseRegex] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [processedFiles, setProcessedFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const parsedRules = useMemo(() => parseRules(ruleText), [ruleText])

  const preview = useMemo(() => {
    if (!sourceText || !parsedRules.rules.length || parsedRules.errors.length) {
      return { result: '', count: 0, error: '' }
    }

    try {
      return replaceText(sourceText, parsedRules.rules, useRegex)
    } catch (error) {
      return { result: '', count: 0, error: error.message }
    }
  }, [sourceText, parsedRules, useRegex])

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
    setProcessedFiles([])
    setProgress(0)
    setMessage(files.length ? `已选择 ${files.length} 个文件` : '')
  }

  const handleProcessFiles = async () => {
    if (!selectedFiles.length) {
      setMessage('请先选择文件')
      return
    }

    if (!parsedRules.rules.length) {
      setMessage('请先填写至少一条替换规则')
      return
    }

    if (parsedRules.errors.length) {
      setMessage(parsedRules.errors[0])
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessedFiles([])
    setMessage('正在处理文件...')

    try {
      const results = []
      let totalCount = 0

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index]
        const content = await readFileAsText(file)
        const { result, count } = replaceText(content, parsedRules.rules, useRegex)
        totalCount += count
        results.push({
          name: file.name,
          outputName: buildOutputName(file.name),
          content: result,
          count,
        })
        setProgress(Math.round(((index + 1) / selectedFiles.length) * 100))
      }

      setProcessedFiles(results)
      setMessage(`处理完成：${results.length} 个文件，共替换 ${totalCount} 处`)
    } catch (error) {
      setMessage(error.message || '文件处理失败')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadFiles = async () => {
    if (!processedFiles.length) return

    if (processedFiles.length === 1) {
      downloadBlob(
        new Blob([processedFiles[0].content], { type: 'text/plain;charset=utf-8' }),
        processedFiles[0].outputName,
      )
      return
    }

    const zip = new JSZip()
    processedFiles.forEach((file) => {
      zip.file(file.outputName, file.content)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'string_replaced_files.zip')
  }

  const handleCopy = async () => {
    if (!preview.result) return

    try {
      await navigator.clipboard.writeText(preview.result)
    } catch (error) {
      const textArea = document.createElement('textarea')
      textArea.value = preview.result
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }

    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleClearFiles = () => {
    setSelectedFiles([])
    setProcessedFiles([])
    setProgress(0)
    setMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUseSample = () => {
    setSourceText(sampleSourceText)
    setRuleText(sampleRuleText)
    setUseRegex(false)
  }

  const ruleError = parsedRules.errors[0] || preview.error
  const canProcessFiles = selectedFiles.length > 0 && parsedRules.rules.length > 0 && !isProcessing

  return (
    <div className="container string-replacer">
      <div className="string-replacer-grid">
        <section className="input-section string-replacer-panel">
          <label htmlFor="replace-source">直接输入文本</label>
          <textarea
            id="replace-source"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            rows={8}
            placeholder="在这里粘贴要处理的文本"
          />
        </section>

        <section className="input-section string-replacer-panel">
          <label htmlFor="replace-rules">替换规则</label>
          <textarea
            id="replace-rules"
            value={ruleText}
            onChange={(event) => setRuleText(event.target.value)}
            rows={8}
            placeholder="A A'\nB B'"
          />
          <div className="replace-options">
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(event) => setUseRegex(event.target.checked)}
              />
              <span>使用正则</span>
            </label>
            <span className="rule-count">已解析 {parsedRules.rules.length} 条规则</span>
          </div>
          <div className="replace-sample-row">
            <button className="process-btn replace-sample-btn" type="button" onClick={handleUseSample}>
              示例
            </button>
          </div>
          {ruleError && <div className="replace-error">{ruleError}</div>}
        </section>
      </div>

      <section className="output-section replace-output-section">
        <div className="replace-output-header">
          <h3>文本替换结果</h3>
          <div className="replace-actions">
            <span>{preview.count ? `替换 ${preview.count} 处` : '等待输入'}</span>
            <button className="copy-btn" onClick={handleCopy} disabled={!preview.result}>
              {copySuccess ? '已复制' : '复制结果'}
            </button>
          </div>
        </div>
        <pre className="replace-preview">{preview.result || '文本处理结果将在这里显示'}</pre>
      </section>

      <section className="input-section file-replace-section">
        <label htmlFor="replace-files">选择文件批量替换</label>
        <input
          id="replace-files"
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFilesChange}
        />

        <div className="replace-file-controls">
          <button className="process-btn" onClick={handleProcessFiles} disabled={!canProcessFiles}>
            {isProcessing ? '处理中...' : '处理文件'}
          </button>
          <button className="download-btn" onClick={handleDownloadFiles} disabled={!processedFiles.length}>
            下载结果
          </button>
          <button className="clear-btn" onClick={handleClearFiles} disabled={!selectedFiles.length && !processedFiles.length}>
            清空文件
          </button>
        </div>

        {(selectedFiles.length > 1 || isProcessing || progress > 0) && (
          <div className="replace-progress" aria-label="文件处理进度">
            <div className="replace-progress-track">
              <div className="replace-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        )}

        {message && <div className="replace-message">{message}</div>}

        {processedFiles.length > 0 && (
          <div className="replace-file-list">
            {processedFiles.map((file) => (
              <div key={file.outputName} className="replace-file-item">
                <span>{file.outputName}</span>
                <strong>{file.count} 处</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default StringReplacer
