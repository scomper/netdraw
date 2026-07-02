import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Toolbar from './components/Toolbar';
import DevicePanel from './components/DevicePanel';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import { useTopoStore } from './stores/topoStore';
import type { DeviceType } from './types';
import './App.css';

const App: React.FC = () => {
  const { addNode } = useTopoStore();

  const handleAddNodeFromPanel = (type: DeviceType) => {
    const x = 200 + Math.random() * 400;
    const y = 150 + Math.random() * 300;
    addNode(type, { x, y });
  };

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#0055ff", borderRadius: 8, fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif" } }}>
      <div className="app-container">
        <Toolbar />
        <div className="main-content">
          <DevicePanel onAddNode={handleAddNodeFromPanel} />
          <Canvas />
          <PropertyPanel />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
