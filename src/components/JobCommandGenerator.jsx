import { useMemo, useState } from 'react'

const commandOptions = [
  { key: 'etl', label: 'ETL', script: 'bgp_etl.sh', suffix: '' },
  { key: 'exp', label: 'EXP', script: 'bgp_exp.sh', suffix: '_EXP' },
  { key: 'cd', label: 'CD', script: 'bgp_cd.sh', suffix: '_CD' },
  { key: 'syn', label: 'SYN', script: 'bgp_syn.sh', suffix: '_SYN' },
  { key: 'synRmml', label: 'SYN_RMML', script: 'bgp_syn_rmml.sh', suffix: '_RMML_SYN' },
  { key: 'odm', label: 'ODM', type: 'odm' },
  { key: 'adm', label: 'ADM', type: 'adm' },
]

const getTodayText = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const parseJobNames = (value) => (
  value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
)

const formatLowerJobName = (job) => job.toLowerCase().replace(/^[a-z]{3}_[a-z]{3}_/, '')

const buildCommand = (option, job, dateText) => {
  const date = dateText.trim()

  if (option.type === 'odm') {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl.sh ${date} odm.o_maps_${lowerJob}_load trf odm`
  }

  if (option.type === 'adm') {
    const lowerJob = formatLowerJobName(job)
    return `sh ~/etl/bin/etl.sh ${date} admbrctrl.a_rctrl_${lowerJob}_etl trf admbrctrl`
  }

  return `${option.script} ${job}${option.suffix} ${date}`
}

const JobCommandGenerator = () => {
  const [dateText, setDateText] = useState(getTodayText())
  const [jobNames, setJobNames] = useState('')
  const [selected, setSelected] = useState({
    etl: false,
    exp: true,
    cd: true,
    syn: false,
    synRmml: false,
    odm: false,
    adm: false,
  })
  const [copySuccess, setCopySuccess] = useState(false)

  const outputText = useMemo(() => {
    const enabledOptions = commandOptions.filter((option) => selected[option.key])
    const jobs = parseJobNames(jobNames)

    if (!dateText.trim() || enabledOptions.length === 0 || jobs.length === 0) {
      return ''
    }

    return jobs
      .map((job) => (
        enabledOptions
          .map((option) => buildCommand(option, job, dateText))
          .join('\n')
      ))
      .join('\n\n') + '\n\n'
  }, [dateText, jobNames, selected])

  const handleOptionChange = (key) => {
    setSelected((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleCopy = async () => {
    if (!outputText) return

    try {
      await navigator.clipboard.writeText(outputText)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = outputText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleClear = () => {
    setJobNames('')
  }

  return (
    <div className="container job-command-generator">
      <div className="input-section">
        <label htmlFor="job-date">日期</label>
        <input
          id="job-date"
          value={dateText}
          onChange={(e) => setDateText(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="例如：20260509"
        />

        <label htmlFor="job-names" className="job-name-label">作业名</label>
        <textarea
          id="job-names"
          value={jobNames}
          onChange={(e) => setJobNames(e.target.value)}
          placeholder="可输入多个作业名，支持换行、空格、逗号或分号分隔"
          rows={6}
        />

        <div className="job-option-list" aria-label="命令类型">
          {commandOptions.map((option) => (
            <label key={option.key} className="job-option">
              <input
                type="checkbox"
                checked={selected[option.key]}
                onChange={() => handleOptionChange(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <div className="input-controls job-input-controls">
          <button className="clear-btn" onClick={handleClear} disabled={!jobNames.trim()}>
            清空作业名
          </button>
        </div>
      </div>

      <div className="job-output-section">
        <div className="job-output-header">
          <h3>生成结果</h3>
          <button className="copy-btn" onClick={handleCopy} disabled={!outputText}>
            {copySuccess ? '已复制' : '一键复制'}
          </button>
        </div>

        <pre className="job-output">{outputText || '输入日期和作业名后将在这里生成命令'}</pre>
      </div>
    </div>
  )
}

export default JobCommandGenerator
