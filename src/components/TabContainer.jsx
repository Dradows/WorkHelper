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

const TabContainer = () => {
  // 根据hash初始化tab
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['home', 'text', 'time', 'regex', 'replace', 'qr', 'excel', 'sqlproc', 'jobcmd', 'depgraph'];
    return validTabs.includes(hash) ? hash : 'home';
  };
  const [activeTab, setActiveTab] = useState(getTabFromHash());

  // 切换tab时同步hash
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // 监听hash变化
  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="tab-container">
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabChange('home')}
        >
          首页
        </button>
        <button
          className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => handleTabChange('text')}
        >
          文本格式
        </button>
        <button
          className={`tab-button ${activeTab === 'time' ? 'active' : ''}`}
          onClick={() => handleTabChange('time')}
        >
          时间提取
        </button>
        <button
          className={`tab-button ${activeTab === 'regex' ? 'active' : ''}`}
          onClick={() => handleTabChange('regex')}
        >
          正则测试
        </button>
        <button
          className={`tab-button ${activeTab === 'replace' ? 'active' : ''}`}
          onClick={() => handleTabChange('replace')}
        >
          字符串替换
        </button>
        <button
          className={`tab-button ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => handleTabChange('qr')}
        >
          二维码
        </button>
        <button
          className={`tab-button ${activeTab === 'excel' ? 'active' : ''}`}
          onClick={() => handleTabChange('excel')}
        >
          SQL 初始化
        </button>
        <button
          className={`tab-button ${activeTab === 'sqlproc' ? 'active' : ''}`}
          onClick={() => handleTabChange('sqlproc')}
        >
          PTEMP
        </button>
        <button
          className={`tab-button ${activeTab === 'jobcmd' ? 'active' : ''}`}
          onClick={() => handleTabChange('jobcmd')}
        >
          作业命令
        </button>
        <button
          className={`tab-button ${activeTab === 'depgraph' ? 'active' : ''}`}
          onClick={() => handleTabChange('depgraph')}
        >
          依赖查询
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'home' && <Home setActiveTab={handleTabChange} />}
        {activeTab === 'text' && <TextFormatter />}
        {activeTab === 'time' && <TimeExtractor />}
        {activeTab === 'regex' && <RegexTester />}
        {activeTab === 'replace' && <StringReplacer />}
        {activeTab === 'qr' && <QRCodeGenerator />}
        {activeTab === 'excel' && <ExcelImporter />}
        {activeTab === 'sqlproc' && <SqlProcessor />}
        {activeTab === 'jobcmd' && <JobCommandGenerator />}
        {activeTab === 'depgraph' && <DependencyGraph />}
      </div>
    </div>
  )
}

export default TabContainer
