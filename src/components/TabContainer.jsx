import React, { useState, useEffect } from 'react'
import {
  Home, Type, Clock, Regex, Replace, QrCode,
  FileSpreadsheet, Database, Terminal, GitBranch, GitCompare, ListChecks,
  PanelLeftClose, PanelLeft,
} from 'lucide-react'
import HomePage from './Home';
import QRCodeGenerator from './QRCodeGenerator';
import TextFormatter from './TextFormatter';
import TimeExtractor from './TimeExtractor';
import RegexTester from './RegexTester';
import ExcelImporter from './ExcelImporter';
import SqlProcessor from './SqlProcessor';
import JobCommandGenerator from './JobCommandGenerator';
import StringReplacer from './StringReplacer';
import DependencyGraph from './DependencyGraph';
import InterfaceComparator from './InterfaceComparator';
import ListComparator from './ListComparator';

const navItems = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'text', label: '文本格式', icon: Type },
  { key: 'time', label: '时间提取', icon: Clock },
  { key: 'regex', label: '正则测试', icon: Regex },
  { key: 'replace', label: '字符串替换', icon: Replace },
  { key: 'qr', label: '二维码', icon: QrCode },
  { key: 'excel', label: 'SQL 初始化', icon: FileSpreadsheet },
  { key: 'sqlproc', label: 'PTEMP', icon: Database },
  { key: 'jobcmd', label: '作业命令', icon: Terminal },
  { key: 'depgraph', label: '依赖查询', icon: GitBranch },
  { key: 'apicmp', label: '接口比对', icon: GitCompare },
  { key: 'listcmp', label: '清单比对', icon: ListChecks },
];

const TabContainer = () => {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = navItems.map(item => item.key);
    return validTabs.includes(hash) ? hash : 'home';
  };
  const [activeTab, setActiveTab] = useState(getTabFromHash());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomePage setActiveTab={handleTabChange} />;
      case 'text': return <TextFormatter />;
      case 'time': return <TimeExtractor />;
      case 'regex': return <RegexTester />;
      case 'replace': return <StringReplacer />;
      case 'qr': return <QRCodeGenerator />;
      case 'excel': return <ExcelImporter />;
      case 'sqlproc': return <SqlProcessor />;
      case 'jobcmd': return <JobCommandGenerator />;
      case 'depgraph': return <DependencyGraph />;
      case 'apicmp': return <InterfaceComparator />;
      case 'listcmp': return <ListComparator />;
      default: return <HomePage setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className="flex w-full h-screen bg-[#f5f6fa]">
      {/* 侧栏 */}
      <aside
        className={`
          flex flex-col bg-gradient-to-b from-[#1a1d2e] to-[#252840] text-[#c5c9d6]
          transition-all duration-300 overflow-hidden z-[100]
          ${sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'}
        `}
      >
        {/* 侧栏头部 */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06] min-h-[64px]">
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-white tracking-wide whitespace-nowrap overflow-hidden">
              WorkHelper
            </span>
          )}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.08] text-[#a0a5b8] hover:bg-white/[0.15] hover:text-white transition-colors shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                className={`
                  flex items-center gap-3 w-full px-3 py-[11px] rounded-[10px] text-sm font-medium
                  transition-all duration-200 text-left whitespace-nowrap mb-0.5
                  ${isActive
                    ? 'bg-primary/20 text-white font-semibold shadow-[inset_3px_0_0_#667eea]'
                    : 'text-[#a0a5b8] hover:bg-white/[0.06] hover:text-[#e0e3eb]'
                  }
                `}
                onClick={() => handleTabChange(item.key)}
                title={item.label}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!sidebarCollapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[#f5f6fa] flex justify-center items-start main-content-stable">
        {renderContent()}
      </main>
    </div>
  )
}

export default TabContainer
