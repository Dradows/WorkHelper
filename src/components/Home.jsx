import React from 'react';

const tabFeatures = [
  {
    name: '文本格式化器',
    icon: '📝',
    description: '支持多种文本格式化操作。',
    tab: 'text',
  },
  {
    name: '时间提取器',
    icon: '⏰',
    description: '从文本中智能提取时间信息并汇总。',
    tab: 'time',
  },
  {
    name: '正则测试器',
    icon: '🔍',
    description: '在线测试和调试正则表达式，实时显示匹配结果。',
    tab: 'regex',
  },
  {
    name: '字符串替换',
    icon: '↔',
    description: '输入文本或多个文件，按多条映射规则批量替换字符串。',
    tab: 'replace',
  },
  {
    name: '二维码生成器',
    icon: '📱',
    description: '快速生成二维码，可用于会议号扫码。',
    tab: 'qr',
  },
  {
    name: '导入并生成 DDL',
    icon: '📥',
    description: '从 Excel 定义生成 DDL 与 INIT 脚本。',
    tab: 'excel',
  },
  {
    name: 'SQL 处理器',
    icon: '🛠️',
    description: '导入 SQL 文件并根据规则分类、替换和输出处理后的 SQL。',
    tab: 'sqlproc',
  },
  {
    name: '作业命令生成器',
    icon: 'CMD',
    description: '按日期、作业名和勾选类型生成批处理命令。',
    tab: 'jobcmd',
  },
  {
    name: '依赖查询',
    icon: 'DAG',
    description: '根据作业依赖数据生成有向无环图，支持大图逐层展开。',
    tab: 'depgraph',
  },
];

const Home = ({ setActiveTab }) => (
  <div className="home-container">
    <p>欢迎使用 WorkHelper 工具箱！以下是各标签页的功能简介：</p>
    <ul className="feature-list">
      {tabFeatures.map((tab) => (
        <li
          key={tab.name}
          className="feature-item home-feature-link"
          tabIndex={0}
          role="button"
          onClick={() => setActiveTab && setActiveTab(tab.tab)}
          onKeyPress={e => (e.key === 'Enter' || e.key === ' ') && setActiveTab && setActiveTab(tab.tab)}
        >
          <span className="feature-icon">{tab.icon}</span>
          <span className="feature-title">{tab.name}</span>
          <span className="feature-desc">{tab.description}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Home;
