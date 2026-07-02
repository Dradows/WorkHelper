import { useMemo, useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { Checkbox } from "./ui/checkbox"
import { Trash2, Copy, Check } from "lucide-react"

const commandOptions = [
  { key: "etl", label: "ETL", script: "bgp_etl.sh", suffix: "" },
  { key: "exp", label: "EXP", script: "bgp_exp.sh", suffix: "_EXP" },
  { key: "cd", label: "CD", script: "bgp_cd.sh", suffix: "_CD" },
  { key: "syn", label: "SYN", script: "bgp_syn.sh", suffix: "_SYN" },
  { key: "synRmml", label: "SYN_RMML", script: "bgp_syn_rmml.sh", suffix: "_RMML_SYN" },
  { key: "createOdm", label: "CREATE_ODM", type: "createOdm" },
  { key: "createAdm", label: "CREATE_ADM", type: "createAdm" },
  { key: "odm", label: "ODM", type: "odm" },
  { key: "adm", label: "ADM", type: "adm" },
]

const getTodayText = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

const parseJobNames = (value) => (
  value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
)

const formatLowerJobName = (job) => job.toLowerCase().replace(/^[a-z]{3}_[a-z]{3}_/, "")

const buildCommand = (option, job, dateText) => {
  const date = dateText.trim()
  if (option.type === "createOdm") {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl_a.sh ${date} create_table_odm.o_maps_${lowerJob} ddl odm`
  }
  if (option.type === "createAdm") {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl_a.sh ${date} create_table_admbrctrl.a_rctrl_${lowerJob} ddl admbrctrl`
  }
  if (option.type === "odm") {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl.sh ${date} odm.o_maps_${lowerJob}_load trf odm`
  }
  if (option.type === "adm") {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl.sh ${date} admbrctrl.a_rctrl_${lowerJob}_etl trf admbrctrl`
  }
  return `${option.script} ${job}${option.suffix} ${date}`
}

const JobCommandGenerator = () => {
  const [dateText, setDateText] = useState(getTodayText())
  const [jobNames, setJobNames] = useState("")
  const [selected, setSelected] = useState({ etl: false, exp: true, cd: true, syn: false, synRmml: false, createOdm: false, createAdm: false, odm: false, adm: false })
  const [copySuccess, setCopySuccess] = useState(false)

  const outputText = useMemo(() => {
    const enabledOptions = commandOptions.filter((option) => selected[option.key])
    const jobs = parseJobNames(jobNames)
    if (!dateText.trim() || enabledOptions.length === 0 || jobs.length === 0) return ""
    return jobs.map((job) => enabledOptions.map((option) => buildCommand(option, job, dateText)).join("\n")).join("\n\n") + "\n\n"
  }, [dateText, jobNames, selected])

  const handleOptionChange = (key) => { setSelected((prev) => ({ ...prev, [key]: !prev[key] })) }

  const handleCopy = async () => {
    if (!outputText) return
    try { await navigator.clipboard.writeText(outputText) } catch (err) {
      const textArea = document.createElement("textarea"); textArea.value = outputText
      document.body.appendChild(textArea); textArea.select(); document.execCommand("copy"); document.body.removeChild(textArea)
    }
    setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleClear = () => { setJobNames("") }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="job-date">日期</Label>
          <Input id="job-date" value={dateText} onChange={(e) => setDateText(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="例如：20260509" />
        </div>
        <div className="space-y-2">
          <Label>命令类型</Label>
          <div className="flex flex-wrap gap-3">
            {commandOptions.map((option) => (
              <label key={option.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox checked={selected[option.key]} onCheckedChange={() => handleOptionChange(option.key)} />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-names">作业名</Label>
          <Textarea id="job-names" value={jobNames} onChange={(e) => setJobNames(e.target.value)} placeholder="可输入多个作业名，支持换行、空格、逗号或分号分隔" rows={6} className="font-mono" />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={!jobNames.trim()}>
            <Trash2 className="w-4 h-4 mr-1.5" />清空作业名
          </Button>
        </div>
      </CardContent>
      <Separator />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">生成结果</CardTitle>
          <Button size="sm" variant={copySuccess ? "secondary" : "default"} onClick={handleCopy} disabled={!outputText}>
            {copySuccess ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copySuccess ? "已复制" : "一键复制"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="p-4 rounded-md bg-muted/50 border font-mono text-sm whitespace-pre-wrap min-h-[60px]">
          {outputText || "输入日期和作业名后将在这里生成命令"}
        </pre>
      </CardContent>
    </Card>
  )
}

export default JobCommandGenerator