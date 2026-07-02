import React from 'react';
import { DEVICE_TYPES } from '../schemas';
import type { DeviceType } from '../types';

interface DevicePanelProps {
  onAddNode: (type: DeviceType) => void;
}

const DevicePanel: React.FC<DevicePanelProps> = ({ onAddNode }) => {
  return (
    <div className="device-panel">
      <div className="panel-title">设备面板</div>
      <div className="device-list">
        {DEVICE_TYPES.map((device) => (
          <div
            key={device.type}
            className="device-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('deviceType', device.type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onAddNode(device.type)}
            title={`点击或拖拽到画布创建 ${device.label}`}
          >
            <span className="device-icon" style={{ backgroundColor: device.color }}>
              {device.icon}
            </span>
            <span className="device-label">{device.label}</span>
          </div>
        ))}
      </div>
      <div className="panel-hint">
        点击添加到画布中心
        <br />
        或拖拽到画布指定位置
      </div>
    </div>
  );
};

export default DevicePanel;
