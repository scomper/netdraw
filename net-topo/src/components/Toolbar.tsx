import React from 'react';
import { Button, Space, Divider, message } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTopoStore } from '../stores/topoStore';
import { getGraphInstance } from '../graphInstance';

const Toolbar: React.FC = () => {
  const { exportData, importData } = useTopoStore();

  const getGraph = () => getGraphInstance();

  const handleZoomIn = () => getGraph()?.zoom(0.2);
  const handleZoomOut = () => getGraph()?.zoom(-0.2);
  const handleFitView = () => getGraph()?.centerContent();
  const handleUndo = () => getGraph()?.undo();
  const handleRedo = () => getGraph()?.redo();

  const handleExport = () => {
    const data = exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `net-topo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          importData(data);
          message.success('导入成功');
        } catch {
          message.error('文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSave = () => {
    const data = exportData();
    localStorage.setItem('net-topo-storage', JSON.stringify({ state: data, version: 0 }));
    message.success('已保存到本地');
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="app-title">🔌 NetTopo</span>
        <Divider orientation="vertical" />
        <Space size={4}>
          <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} title="放大" />
          <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} title="缩小" />
          <Button size="small" icon={<CompressOutlined />} onClick={handleFitView} title="适应视图" />
        </Space>
        <Divider orientation="vertical" />
        <Space size={4}>
          <Button size="small" icon={<UndoOutlined />} onClick={handleUndo} title="撤销 (Ctrl+Z)" />
          <Button size="small" icon={<RedoOutlined />} onClick={handleRedo} title="重做 (Ctrl+Shift+Z)" />
        </Space>
      </div>
      <div className="toolbar-right">
        <Space size={4}>
          <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
          <Button size="small" icon={<UploadOutlined />} onClick={handleImport}>导入</Button>
        </Space>
      </div>
    </div>
  );
};

export default Toolbar;
