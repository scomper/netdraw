import type { DeviceTypeConfig } from './types';

export const DEVICE_TYPES: DeviceTypeConfig[] = [
  {
    type: 'server',
    label: '服务器',
    icon: '🖥️',
    color: '#0055ff',
    presetFields: [
      { label: 'IP 地址', type: 'text', value: '', required: false },
      { label: '型号', type: 'text', value: '', required: false },
      { label: '操作系统', type: 'text', value: '', required: false },
      { label: 'SN', type: 'text', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'switch',
    label: '交换机',
    icon: '🔀',
    color: '#0fc6c2',
    presetFields: [
      { label: 'IP 地址', type: 'text', value: '', required: false },
      { label: '型号', type: 'text', value: '', required: false },
      { label: '端口数量', type: 'number', value: '', required: false },
      { label: 'VLAN', type: 'text', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'router',
    label: '路由器',
    icon: '📡',
    color: '#00b42a',
    presetFields: [
      { label: 'IP 地址', type: 'text', value: '', required: false },
      { label: '型号', type: 'text', value: '', required: false },
      { label: '接口列表', type: 'textarea', value: '', required: false },
      { label: '路由协议', type: 'text', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'modem',
    label: '光猫',
    icon: '📶',
    color: '#ff7d00',
    presetFields: [
      { label: '光信号强度', type: 'text', value: '', required: false },
      { label: '型号', type: 'text', value: '', required: false },
      { label: '运营商', type: 'text', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'firewall',
    label: '防火墙',
    icon: '🛡️',
    color: '#f65159',
    presetFields: [
      { label: 'IP 地址', type: 'text', value: '', required: false },
      { label: '型号', type: 'text', value: '', required: false },
      { label: '安全策略数', type: 'number', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'pc',
    label: 'PC/终端',
    icon: '💻',
    color: '#8c8c8c',
    presetFields: [
      { label: 'IP 地址', type: 'text', value: '', required: false },
      { label: 'MAC 地址', type: 'text', value: '', required: false },
      { label: '使用者', type: 'text', value: '', required: false },
      { label: '位置', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'cloud',
    label: '云服务',
    icon: '☁️',
    color: '#7c3aed',
    presetFields: [
      { label: '服务商', type: 'text', value: '', required: false },
      { label: '账号 ID', type: 'text', value: '', required: false },
      { label: '区域', type: 'text', value: '', required: false },
      { label: '接入方式', type: 'text', value: '', required: false },
    ],
  },
  {
    type: 'custom',
    label: '自定义设备',
    icon: '📦',
    color: '#595959',
    presetFields: [],
  },
];

export function getDeviceConfig(type: string): DeviceTypeConfig | undefined {
  return DEVICE_TYPES.find((d) => d.type === type);
}

export function createPresetFields(deviceType: string) {
  const config = getDeviceConfig(deviceType);
  if (!config) return [];
  return config.presetFields.map((f, i) => ({
    ...f,
    key: `${deviceType}_${f.label}_${Date.now()}_${i}`,
    sortOrder: i,
  }));
}
