import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Upload, Download, FileSpreadsheet, FileText, Eye, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

const ExcelImporter = () => {
  const [fileName, setFileName] = useState('')
  // store sheet infos parsed from the uploaded workbook: { sheet, tableName }
  const [sheetInfos, setSheetInfos] = useState([])
  const [name, setName] = useState('')
  // default date to today in YYYY-MM-DD for the date input
  const defaultDate = new Date().toISOString().slice(0, 10)
  const [createDate, setCreateDate] = useState(defaultDate) // YYYY-MM-DD
  const [orderNo, setOrderNo] = useState('')
  const [messages, setMessages] = useState([])

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      // try to get header-based JSON first
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      const names = workbook.SheetNames || []
      // build sheetInfos by reading specific cells per sheet:
      // B1 = table name, B2 = platform, B3 = schema, B4 = table comment, B5 = remark.
      // Fields start from row 6 (index 5): B = field name, C = field type, D = field description.
      const infos = names.map((s) => {
        const w = workbook.Sheets[s]
        const rows = XLSX.utils.sheet_to_json(w, { header: 1, defval: '' })
        const firstRow = rows[0] || []
        const tableRaw = firstRow[1]
        const tableName = tableRaw ? String(tableRaw).trim().replace(/[^A-Za-z0-9_]/g, '_') : null
        const platform = (rows[1] && rows[1][1]) ? String(rows[1][1]).trim() : '' // B2
        const schema = (rows[2] && rows[2][1]) ? String(rows[2][1]).trim() : '' // B3
        const tableComment = (rows[3] && rows[3][1]) ? String(rows[3][1]).trim() : '' // B4
        const remark = (rows[4] && rows[4][1]) ? String(rows[4][1]).trim() : '' // B5
        const columns = []
        for (let i = 6; i < rows.length; i++) {
          const r = rows[i]
          if (!r) continue
          const fname = r[1] ? String(r[1]).trim() : ''
          if (!fname) break
          const ftype = r[2] ? String(r[2]).trim() : ''
          const fcomment = r[3] ? String(r[3]).trim() : ''
          columns.push({ name: fname, type: ftype, comment: fcomment })
        }
        return { sheet: s, tableName, platform, schema, tableComment, remark, columns }
      })
      setSheetInfos(infos)
      setMessages(prev => [...prev, `解析到 ${json.length} 行（不含表头），共 ${infos.length} 个 sheet`])
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFileName(f.name)
    parseFile(f)
  }

  const formatDateForHeader = (input) => {
    if (!input) return ''
    // input is expected as YYYY-MM-DD (date input). Convert to YYYYMMDD
    try {
      // simple replace of '-' for predictable result
      return input.replace(/-/g, '')
    } catch (e) {
      return ''
    }
  }

  // templates are no longer used; DDLs built directly from Excel

  const inferColumnType = (colName) => {
    const n = String(colName).toLowerCase()
    if (/id$|^id$/.test(n)) return 'INTEGER'
    if (/(score|amount|money|amt)/.test(n)) return 'DECIMAL(21,2)'
    if (/(ts|time|date|dt|timestamp)/.test(n)) return 'TIMESTAMP(0) WITHOUT TIME ZONE'
    return 'VARCHAR(300)'
  }

  const buildDDLForTable = (template, schemaName, newTableName, colNames) => {
    // Build DDL from scratch (ignore previous template structure)
    // newTableName: target table name string
    // colNames: array of {name,type,comment}
    // build column definitions
    // Build column lines where commas are at the start of the next line
    const schema = schemaName && schemaName.length > 0 ? schemaName : 'chn_rskdata'
    let colsArr = []
    if (colNames && colNames.length > 0) {
      colNames.forEach((c, idx) => {
        const t = c.type && c.type.length > 0 ? c.type : inferColumnType(c.name)
        if (idx === 0) {
          colsArr.push(`     ${c.name} ${t}`)
        } else {
          // comma at the beginning of the line, no space between comma and field name
          colsArr.push(`    ,${c.name} ${t}`)
        }
      })
    } else {
      colsArr = [ '     id INTEGER', '    ,name VARCHAR(300)' ]
    }

    const createBlock = `CREATE TABLE ${schema}.${newTableName} (\n${colsArr.join('\n')}\n)\nWITH (ORIENTATION = COLUMN, COMPRESSION = MIDDLE) \nDISTRIBUTE BY ROUNDROBIN;\n\n`
    return createBlock
  }

  const buildDDLFromInfo = (info) => {
    const rawTable = info.tableName || info.sheet
    const table = String(rawTable).toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const progName = `RSK_CHN_${String(table).toUpperCase()}`
    const chineseName = info.tableComment || ''
    const creator = name || '姓名'
    const formatted = formatDateForHeader(createDate) || formatDateForHeader(new Date().toISOString())
    const header = `--#####################################################################################################\n` +
      `--# 程序名: ${progName}\n` +
      `--# 程序中文名: ${chineseName}\n` +
      `--# 创建者: ${creator}\n` +
      `--# 创建日期: ${formatted}\n` +
      `--# 修改历史: 修改时间*****修改者*****修改CQ**********修改内容\n` +
      `--# 说明: ${formatted}*****${creator}*****${orderNo}*****创建脚本\n` +
      `--#####################################################################################################\n\n`

    const rawSchema = info.schema || ''
    const schema = rawSchema ? String(rawSchema).toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'chn_rskdata'
    const createBlock = buildDDLForTable('', schema, table, info.columns)

    // Align the IS keyword: compute max prefix length, then pad with a small gap
    const tablePrefix = `COMMENT ON TABLE  ${schema}.${table}`
    const colPrefixes = info.columns.map((c) => `COMMENT ON COLUMN ${schema}.${table}.${c.name}`)
    const allPrefixes = [tablePrefix, ...colPrefixes]
    const maxLen = Math.max(...allPrefixes.map((p) => p.length))
    const padIs = (prefix) => prefix.padEnd(maxLen + 2, ' ')
    let comments = `${padIs(tablePrefix)} IS '${chineseName}';\n`
    info.columns.forEach((c) => {
      const colComment = c.comment || ''
      const colPrefix = `COMMENT ON COLUMN ${schema}.${table}.${c.name}`
      comments += `${padIs(colPrefix)} IS '${colComment}';\n`
    })

    // For ddl.sql we DO NOT include a DROP TABLE. The init.sql will add the DROP for the _dt table later.
    return header + createBlock + `\n` + comments
  }

  // NOTE: Insert generation removed per request — DDL templates will be generated without data inserts.

  const downloadFile = (content, filename) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const makeSheet = (tableName, platform, schema, tableComment, remark, fields) => {
      // Build rows matching test.xlsx format (no empty rows).
      // Row 0: A1="表名", B1=table name
      // Row 1: A2="平台", B2=platform
      // Row 2: A3="表空间", B3=schema
      // Row 3: A4="表描述", B4=table comment
      // Row 4: A5="备注", B5=remark
      // Row 5: A6="序号", B6="字段名", C6="字段类型", D6="字段描述"
      // Row 6+: fields
      const rows = []
      rows.push(['表名', tableName || ''])                                         // row 0
      rows.push(['平台', platform || ''])                                          // row 1
      rows.push(['表空间', schema || ''])                                          // row 2
      rows.push(['表描述', tableComment || ''])                                    // row 3
      rows.push(['备注', remark || ''])                                            // row 4
      rows.push(['序号', '字段名', '字段类型', '字段描述'])                           // row 5
      if (fields && fields.length > 0) {
        fields.forEach((f, i) => {
          rows.push([i + 1, f.name || '', f.type || '', f.comment || ''])
        })
      }
      return XLSX.utils.aoa_to_sheet(rows)
    }

    const handleDownloadTemplate = () => {
      // Empty template: 2 sheets
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeSheet('', '', '', '', '', []), 'Sheet1')
      XLSX.utils.book_append_sheet(wb, makeSheet('', '', '', '', '', []), 'Sheet2')
      XLSX.writeFile(wb, 'template.xlsx')
      setMessages(prev => [...prev, '已下载模板文件 template.xlsx（2 个 Sheet）。'])
    }

    const handleDownloadExample = () => {
      // Filled example: 2 sheets with sample data, matching test.xlsx
      const wb = XLSX.utils.book_new()

      const fields1 = [
        { name: 'id', type: 'INTEGER', comment: '主键ID' },
        { name: 'corp_name', type: 'VARCHAR(300)', comment: '企业名称' },
        { name: 'risk_score', type: 'DECIMAL(21,2)', comment: '风险评分' },
        { name: 'risk_level', type: 'VARCHAR(50)', comment: '风险等级' },
        { name: 'create_time', type: 'TIMESTAMP(0) WITHOUT TIME ZONE', comment: '创建时间' },
        { name: 'update_time', type: 'TIMESTAMP(0) WITHOUT TIME ZONE', comment: '更新时间' },
      ]
      const fields2 = [
        { name: 'id', type: 'INTEGER', comment: '主键ID' },
        { name: 'detail_type', type: 'VARCHAR(100)', comment: '明细类型' },
        { name: 'detail_amount', type: 'DECIMAL(21,2)', comment: '明细金额' },
        { name: 'detail_desc', type: 'VARCHAR(500)', comment: '明细描述' },
      ]

      const ws1 = makeSheet('risk_corp_test', 'RSK', 'chn_rskdata', '风险企业测试表', '', fields1)
      const ws2 = makeSheet('risk_corp_detail', 'RSK', 'chn_rskdata', '风险企业明细表', '', fields2)

      XLSX.utils.book_append_sheet(wb, ws1, 'risk_corp_test')
      XLSX.utils.book_append_sheet(wb, ws2, 'risk_corp_detail')

      XLSX.writeFile(wb, 'test.xlsx')
      setMessages(prev => [...prev, '已下载示例文件 test.xlsx，包含 2 个 sheet。'])
    }

  // Preview: build DDL content per sheet (array of { sheet, ddl, init, table })
  const previewSheets = useMemo(() => {
    if (!sheetInfos.length || !name || !createDate || !orderNo) return []
    return sheetInfos.map((info) => {
      const rawTable = info.tableName || info.sheet
      const table = String(rawTable).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const ddlContent = buildDDLFromInfo(info)
      const rawSchema = info.schema || ''
      const schema = rawSchema ? String(rawSchema).toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'chn_rskdata'
      const initBody = ddlContent.replace(/(CREATE TABLE\s)/, `DROP TABLE IF EXISTS ${schema}.${table};\n\n$1`)
      const initContent = initBody + `\nDROP TABLE IF EXISTS ${schema}.${table}_dt;\nCREATE TABLE ${schema}.${table}_dt like ${schema}.${table};\n`
      return { sheet: info.sheet, table: `rsk_chn_${table}`, ddl: ddlContent, init: initContent }
    })
  }, [sheetInfos, name, createDate, orderNo])

  const handleGenerate = () => {
    if (!name || !createDate || !orderNo) {
      setMessages(prev => [...prev, '请填写 姓名、创建日期 和 单号。'])
      return
    }
    // Create a zip containing DDL and init files per sheet, then download it
    const zip = new JSZip()

    // generate DDL and init files for each sheet based on Excel content
      if (sheetInfos && sheetInfos.length > 0) {
        sheetInfos.forEach((info) => {
          const sheet = info.sheet
          const rawTable = info.tableName || String(sheet)
          const table = String(rawTable).toLowerCase().replace(/[^a-z0-9_]/g, '_')
          const ddlContent = buildDDLFromInfo(info)
          const rawSchema = info.schema || ''
          const schema = rawSchema ? String(rawSchema).toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'chn_rskdata'
          // For init file, before creating the _dt table, add DROP IF EXISTS for the _dt
          const initBody = ddlContent.replace(/(CREATE TABLE\s)/, `DROP TABLE IF EXISTS ${schema}.${table};\n\n$1`)
          const initContent = initBody + `\nDROP TABLE IF EXISTS ${schema}.${table}_dt;\nCREATE TABLE ${schema}.${table}_dt like ${schema}.${table};\n`
          const ddlName = `rsk_chn_${table}_ddl.sql`
          const initName = `rsk_chn_${table}_init.sql`
          zip.file(ddlName, ddlContent)
          zip.file(initName, initContent)
          setMessages(prev => [...prev, `为 sheet "${sheet}" 生成 ${ddlName} 和 ${initName}`])
        })
      }

    // Sanitize filename parts: remove only characters invalid for Windows filenames (preserve CJK etc.)
    const sanitize = (s) => String(s).trim().replace(/[\\/:*?"<>|]/g, '_')
    const zipFileName = (() => {
      const on = orderNo ? sanitize(orderNo) : 'no_order'
      const nm = name ? sanitize(name) : 'no_name'
      const d = createDate ? formatDateForHeader(createDate) : formatDateForHeader(new Date().toISOString())
      return `${on}_${nm}_${d}.zip`
    })()

    zip.generateAsync({ type: 'blob' }).then((blob) => {
      downloadFile(blob, zipFileName)
      setMessages(prev => [...prev, `已生成并开始下载 ${zipFileName}。`])
    }).catch((err) => {
      setMessages(prev => [...prev, `打包失败: ${err.message || err}`])
    })
  }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        {/* Excel 文件上传 */}
        <div className="space-y-2">
          <Label htmlFor="excel-file">Excel 文件</Label>
          <input id="excel-file" type="file" accept=".xls,.xlsx" onChange={handleFile}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:px-3 file:py-1 file:mr-3 file:rounded hover:file:bg-primary/90" />
          {fileName && <p className="text-sm text-muted-foreground">已选: {fileName}</p>}
        </div>

        {/* 表单行 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="creator-name">创建者（姓名）</Label>
            <Input id="creator-name" value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-date">创建日期</Label>
            <Input id="create-date" type="date" value={createDate} onChange={e => setCreateDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-no">单号</Label>
            <Input id="order-no" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="请输入单号" />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleGenerate} disabled={!sheetInfos.length}>
            <Download className="w-4 h-4 mr-1.5" />生成并下载 SQL 文件
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />下载模板
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadExample}>
            <Sparkles className="w-4 h-4 mr-1.5" />下载示例
          </Button>
        </div>

        {/* 消息列表 */}
        {messages.length > 0 && (
          <div className="space-y-1">
            {messages.map((m, i) => (
              <p key={i} className="text-sm text-muted-foreground font-medium">{m}</p>
            ))}
          </div>
        )}
      </CardContent>

      <Separator />

      {/* 预览区域 */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />SQL 预览
          </CardTitle>
          {previewSheets.length > 0 && (
            <span className="text-sm text-muted-foreground font-medium">{previewSheets.length} 个 Sheet</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {previewSheets.length > 0 ? (
          <Tabs defaultValue={previewSheets[0].sheet} className="w-full">
            <TabsList className="mb-3 flex-wrap h-auto gap-1">
              {previewSheets.map((ps) => (
                <TabsTrigger key={ps.sheet} value={ps.sheet} className="text-xs">
                  {ps.sheet}
                </TabsTrigger>
              ))}
            </TabsList>
            {previewSheets.map((ps) => (
              <TabsContent key={ps.sheet} value={ps.sheet} className="mt-0">
                <Tabs defaultValue={`${ps.sheet}-ddl`} className="w-full">
                  <TabsList className="mb-2 h-auto gap-1 bg-muted/50">
                    <TabsTrigger value={`${ps.sheet}-ddl`} className="text-xs py-1">DDL</TabsTrigger>
                    <TabsTrigger value={`${ps.sheet}-init`} className="text-xs py-1">INIT</TabsTrigger>
                  </TabsList>
                  <TabsContent value={`${ps.sheet}-ddl`} className="mt-0">
                    <pre className="p-4 rounded-md bg-muted/50 border font-mono text-xs whitespace-pre-wrap max-h-[500px] overflow-auto leading-relaxed">
                      {`-- ${ps.table}_ddl.sql\n${ps.ddl}`}
                    </pre>
                  </TabsContent>
                  <TabsContent value={`${ps.sheet}-init`} className="mt-0">
                    <pre className="p-4 rounded-md bg-muted/50 border font-mono text-xs whitespace-pre-wrap max-h-[500px] overflow-auto leading-relaxed">
                      {`-- ${ps.table}_init.sql\n${ps.init}`}
                    </pre>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="min-h-[150px] flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
            <FileText className="w-8 h-8 opacity-40" />
            <p>{!sheetInfos.length ? '请先上传 Excel 文件' : '请填写 姓名、创建日期 和 单号 以生成预览'}</p>
          </div>
        )}
      </CardContent>

      <Separator />

      {/* 使用说明 */}
      <CardContent className="py-4">
        <h4 className="text-sm font-semibold mb-2">使用说明</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>基于 Excel 中每个 sheet 的定义生成 DDL 与 INIT 文件</li>
          <li>B1 表名，B2 平台，B3 表空间，B4 表描述，B5 备注</li>
          <li>B6 起为字段定义：B=字段名 C=字段类型 D=字段描述</li>
        </ul>
      </CardContent>
    </Card>
  )
}

export default ExcelImporter
