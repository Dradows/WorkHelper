import React from 'react';

const toolCards = [
  {
    name: '文本格式化器',
    description: '支持多种文本格式化操作',
    tab: 'text',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"/>
        <line x1="9" y1="20" x2="15" y2="20"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
    ),
  },
  {
    name: '时间提取器',
    description: '从文本中智能提取时间信息并汇总',
    tab: 'time',
    color: '#ef4444',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    name: '正则测试器',
    description: '在线测试和调试正则表达式，实时显示匹配结果',
    tab: 'regex',
    color: '#a855f7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8"/>
        <line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/>
        <line x1="15" y1="15" x2="21" y2="21"/>
        <line x1="4" y1="4" x2="9" y2="9"/>
      </svg>
    ),
  },
  {
    name: '字符串替换',
    description: '按多条映射规则批量替换字符串',
    tab: 'replace',
    color: '#0891b2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="14 15 9 20 4 15"/>
        <path d="M20 4h-7a4 4 0 0 0-4 4v12"/>
      </svg>
    ),
  },
  {
    name: '二维码生成器',
    description: '快速生成二维码，可用于会议号扫码',
    tab: 'qr',
    color: '#667eea',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <line x1="14" y1="14" x2="14" y2="14.01"/>
        <line x1="18" y1="14" x2="18" y2="14.01"/>
        <line x1="14" y1="18" x2="14" y2="18.01"/>
        <line x1="18" y1="18" x2="18" y2="18.01"/>
        <line x1="21" y1="14" x2="21" y2="18"/>
        <line x1="14" y1="21" x2="18" y2="21"/>
      </svg>
    ),
  },
  {
    name: 'SQL 初始化',
    description: '从 Excel 定义生成 DDL 与 INIT 脚本',
    tab: 'excel',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    name: 'PTEMP 处理器',
    description: '导入 SQL 文件并根据规则分类、替换输出',
    tab: 'sqlproc',
    color: '#6366f1',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    name: '作业命令生成器',
    description: '按日期、作业名和勾选类型生成批处理命令',
    tab: 'jobcmd',
    color: '#0d9488',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
  },
  {
    name: '依赖查询',
    description: '根据作业依赖数据生成有向无环图，支持逐层展开',
    tab: 'depgraph',
    color: '#2563eb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/>
        <circle cx="5" cy="19" r="2"/>
        <circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="7.5" y2="15"/>
        <line x1="12" y1="7" x2="16.5" y2="15"/>
        <line x1="7" y1="17" x2="17" y2="17"/>
      </svg>
    ),
  },
  {
    name: '接口比对',
    description: '上传 Excel 文件，自动匹配并比对各 sheet 差异',
    tab: 'apicmp',
    color: '#4f8ef7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5"/>
        <path d="M8 3H3v5"/>
        <path d="M3 16v5h5"/>
        <path d="M16 21h5v-5"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
];

const Home = ({ setActiveTab }) => (
  <div className="home-container">
    <div className="home-header">
      <h1>WorkHelper</h1>
      <p>一站式开发工具箱，提升日常工作效率</p>
    </div>
    <div className="home-grid">
      {toolCards.map((tool) => (
        <button
          key={tool.tab}
          className="home-card"
          style={{ '--card-color': tool.color }}
          onClick={() => setActiveTab && setActiveTab(tool.tab)}
        >
          <span className="home-card-icon">{tool.icon}</span>
          <span className="home-card-title">{tool.name}</span>
          <span className="home-card-desc">{tool.description}</span>
        </button>
      ))}
    </div>
  </div>
);

export default Home;
