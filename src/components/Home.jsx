import React from 'react';
import {
  Type, Clock, Regex, Replace, QrCode,
  FileSpreadsheet, Database, Terminal, GitBranch, GitCompare, ListChecks,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';

const toolCards = [
  { name: '文本格式化器', description: '支持多种文本格式化操作', tab: 'text', color: '#10b981', icon: Type },
  { name: '时间提取器', description: '从文本中智能提取时间信息并汇总', tab: 'time', color: '#ef4444', icon: Clock },
  { name: '正则测试器', description: '在线测试和调试正则表达式，实时显示匹配结果', tab: 'regex', color: '#a855f7', icon: Regex },
  { name: '字符串替换', description: '按多条映射规则批量替换字符串', tab: 'replace', color: '#0891b2', icon: Replace },
  { name: '二维码生成器', description: '快速生成二维码，可用于会议号扫码', tab: 'qr', color: '#667eea', icon: QrCode },
  { name: 'SQL 初始化', description: '从 Excel 定义生成 DDL 与 INIT 脚本', tab: 'excel', color: '#f59e0b', icon: FileSpreadsheet },
  { name: 'PTEMP 处理器', description: '导入 SQL 文件并根据规则分类、替换输出', tab: 'sqlproc', color: '#6366f1', icon: Database },
  { name: '作业命令生成器', description: '按日期、作业名和勾选类型生成批处理命令', tab: 'jobcmd', color: '#0d9488', icon: Terminal },
  { name: '依赖查询', description: '根据作业依赖数据生成有向无环图，支持逐层展开', tab: 'depgraph', color: '#2563eb', icon: GitBranch },
  { name: '接口比对', description: '上传 Excel 文件，自动匹配并比对各 sheet 差异', tab: 'apicmp', color: '#4f8ef7', icon: GitCompare },
  { name: '清单比对', description: '两个清单去重排序后比对差异，按列展示', tab: 'listcmp', color: '#f97316', icon: ListChecks },
];

const Home = ({ setActiveTab }) => (
  <Card className="w-full max-w-[860px] mx-auto">
    <CardContent className="pt-8 pb-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[1.75rem] font-extrabold tracking-tight mb-2">WorkHelper</h1>
        <p className="text-muted-foreground text-[15px]">一站式开发工具箱，提升日常工作效率</p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-w-[860px] mx-auto">
        {toolCards.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.tab}
              className="flex flex-col items-start gap-3 p-5 bg-card border rounded-lg text-left
                transition-all duration-200 relative overflow-hidden
                hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: 'var(--border)', '--card-color': tool.color }}
              onClick={() => setActiveTab && setActiveTab(tool.tab)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '';
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-md relative z-[1]"
                style={{ backgroundColor: `${tool.color}1f`, color: tool.color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold relative z-[1]">{tool.name}</span>
              <span className="text-xs text-muted-foreground leading-relaxed relative z-[1]">{tool.description}</span>
            </button>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

export default Home;
