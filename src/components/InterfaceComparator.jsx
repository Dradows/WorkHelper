import { useState } from 'react'
import * as XLSX from 'xlsx'
import './InterfaceComparator.css'

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
          alert('文件超过2个时，请填写比对配对的文本框')
          setLoading(false)
          return
        }

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
    <div className="interface-comparator">
      <div className="input-section">
        <div className="form-group">
          <label>选择 Excel 文件（至少2个）:</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileChange}
          />
          {files.length > 0 && (
            <div className="file-list">
              <p>已选择 {files.length} 个文件:</p>
              <ul>
                {files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {files.length > 2 && (
          <div className="form-group">
            <label>比对配对（每行两个文件名/前缀，空格分隔）:</label>
            <textarea
              className="pair-textarea"
              rows={6}
              placeholder={"例如:\n文件A 文件B\n前缀C 前缀D"}
              value={pairText}
              onChange={(e) => setPairText(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <button
            className="btn-primary"
            onClick={handleCompare}
            disabled={loading || files.length < 2}
          >
            {loading ? '比对中...' : '开始比对'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="result-section">
          {results.map((result, idx) => (
            <div key={idx} className="compare-result">
              <h3>
                比对 {idx + 1}: <span className="file-a">{result.leftFile}</span>
                {' ↔ '}
                <span className="file-b">{result.rightFile}</span>
              </h3>

              {result.error ? (
                <p className="error-msg">错误: {result.error}</p>
              ) : result.diffs.length === 0 ? (
                <p className="success-msg">
                  ✅ 两个文件在第2个sheet页（"{result.leftSheet}"）的前三列完全一致，共 {result.totalRows} 行。
                </p>
              ) : (
                <div>
                  <p className="diff-summary">
                    Sheet: "{result.leftSheet}" / "{result.rightSheet}"，
                    共 {result.totalRows} 行，发现 {result.diffs.length} 行差异：
                  </p>
                  <div className="diff-table-wrapper">
                    <table className="diff-table">
                      <thead>
                        <tr>
                          <th>行号</th>
                          <th>列</th>
                          <th>{result.leftFile}</th>
                          <th>{result.rightFile}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.diffs.map((diff, di) => (
                          diff.colDiffs.map((cd, ci) => (
                            <tr key={`${di}-${ci}`}>
                              <td>{diff.row}</td>
                              <td>列 {getColLabel(cd.col)}</td>
                              <td className="cell-a">{cd.valA || '(空)'}</td>
                              <td className="cell-b">{cd.valB || '(空)'}</td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InterfaceComparator
