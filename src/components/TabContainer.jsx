import React, { useState, useEffect } from 'react'
import Home from './Home';
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

const navItems = [
  { key: 'home', label: '首页', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { key: 'text', label: '文本格式', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  )},
  { key: 'time', label: '时间提取', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
  { key: 'regex', label: '正则测试', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  )},
  { key: 'replace', label: '字符串替换', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14 15 9 20 4 15"/>
      <path d="M20 4h-7a4 4 0 0 0-4 4v12"/>
    </svg>
  )},
  { key: 'qr', label: '二维码', icon: (
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
  )},
  { key: 'excel', label: 'SQL 初始化', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
  { key: 'sqlproc', label: 'PTEMP', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  )},
  { key: 'jobcmd', label: '作业命令', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  )},
  { key: 'depgraph', label: '依赖查询', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/>
      <circle cx="5" cy="19" r="2"/>
      <circle cx="19" cy="19" r="2"/>
      <line x1="12" y1="7" x2="7.5" y2="15"/>
      <line x1="12" y1="7" x2="16.5" y2="15"/>
      <line x1="7" y1="17" x2="17" y2="17"/>
    </svg>
  )},
  { key: 'apicmp', label: '接口比对', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5"/>
      <path d="M8 3H3v5"/>
      <path d="M3 16v5h5"/>
      <path d="M16 21h5v-5"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )},
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
      case 'home': return <Home setActiveTab={handleTabChange} />;
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
      default: return <Home setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className="tab-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <span className="sidebar-title">WorkHelper</span>}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed
                ? <><polyline points="9 18 15 12 9 6"/></>
                : <><polyline points="15 18 9 12 15 6"/></>
              }
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => handleTabChange(item.key)}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default TabContainer
