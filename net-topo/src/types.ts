export type DeviceType = 'server' | 'switch' | 'router' | 'modem' | 'firewall' | 'pc' | 'cloud' | 'custom';
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean' | 'url';

export interface FieldData {
  key: string;
  label: string;
  type: FieldType;
  value: any;
  required: boolean;
  options?: string[];
  sortOrder: number;
}

export interface NodeData {
  id: string;
  type: DeviceType;
  position: { x: number; y: number };
  label: string;
  fields: FieldData[];
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: 'line' | 'polyline';
  directed: boolean;
  label?: string;
  sourceEndpoint?: string;
  targetEndpoint?: string;
}

export interface TemplateData {
  id: string;
  name: string;
  deviceType: DeviceType;
  fields: FieldData[];
  createdAt: string;
}

export interface TopoData {
  id: string;
  name: string;
  nodes: NodeData[];
  edges: EdgeData[];
  templates: TemplateData[];
}

// 设备类型配置
export interface DeviceTypeConfig {
  type: DeviceType;
  label: string;
  icon: string;
  color: string;
  presetFields: Omit<FieldData, 'key' | 'sortOrder'>[];
}
