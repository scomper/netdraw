import React, { useState } from 'react';
import { Button, Input, Select, Switch, DatePicker, InputNumber, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTopoStore } from '../stores/topoStore';
import type { FieldData, FieldType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { label: '文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '日期', value: 'date' },
  { label: '开关', value: 'boolean' },
  { label: '链接', value: 'url' },
];

const PropertyPanel: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    updateNodeLabel,
    updateNodeFields,
    addFieldToNode,
    removeFieldFromNode,
    updateEdge,
    deleteNode,
    deleteEdge,
  } = useTopoStore();

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // 获取选中的节点
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  // 获取选中的连线
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  // 添加自定义字段
  const handleAddField = () => {
    if (!selectedNode || !newFieldLabel.trim()) return;
    const field: FieldData = {
      key: `custom_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      value: newFieldType === 'boolean' ? false : '',
      required: false,
      options: newFieldType === 'select' ? ['选项1', '选项2'] : undefined,
      sortOrder: selectedNode.fields.length,
    };
    addFieldToNode(selectedNode.id, field);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  // 更新字段值
  const handleFieldChange = (fieldKey: string, value: any) => {
    if (!selectedNode) return;
    const newFields = selectedNode.fields.map((f) =>
      f.key === fieldKey ? { ...f, value } : f
    );
    updateNodeFields(selectedNode.id, newFields);
  };

  // 更新字段标签
  const handleFieldLabelChange = (fieldKey: string, label: string) => {
    if (!selectedNode) return;
    const newFields = selectedNode.fields.map((f) =>
      f.key === fieldKey ? { ...f, label } : f
    );
    updateNodeFields(selectedNode.id, newFields);
  };

  // 渲染字段值编辑控件
  const renderFieldEditor = (field: FieldData) => {
    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <Input
            size="small"
            value={field.value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.type === 'url' ? 'https://' : '输入值'}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            size="small"
            value={field.value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            rows={2}
            placeholder="输入值"
          />
        );
      case 'number':
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            value={field.value}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder="输入数字"
          />
        );
      case 'select':
        return (
          <Select
            size="small"
            style={{ width: '100%' }}
            value={field.value || undefined}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder="选择选项"
            options={(field.options || []).map((opt) => ({ label: opt, value: opt }))}
          />
        );
      case 'date':
        return (
          <DatePicker
            size="small"
            style={{ width: '100%' }}
            value={field.value ? new Date(field.value) : null}
            onChange={(_date, dateString) => handleFieldChange(field.key, dateString)}
          />
        );
      case 'boolean':
        return (
          <Switch
            size="small"
            checked={!!field.value}
            onChange={(checked) => handleFieldChange(field.key, checked)}
          />
        );
      default:
        return (
          <Input
            size="small"
            value={field.value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        );
    }
  };

  // 空状态
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="property-panel">
        <div className="panel-title">属性面板</div>
        <div className="empty-hint">选择节点或连线查看属性</div>
      </div>
    );
  }

  // 连线属性面板
  if (selectedEdge) {
    return (
      <div className="property-panel">
        <div className="panel-title">连线属性</div>
        <div className="field-group">
          <label>连线标签</label>
          <Input
            size="small"
            value={selectedEdge.label || ''}
            onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value })}
            placeholder="如 10Gbps"
          />
        </div>
        <div className="field-group">
          <label>源端点标签</label>
          <Input
            size="small"
            value={selectedEdge.sourceEndpoint || ''}
            onChange={(e) => updateEdge(selectedEdge.id, { sourceEndpoint: e.target.value })}
            placeholder="如 GE0/0/1"
          />
        </div>
        <div className="field-group">
          <label>目标端点标签</label>
          <Input
            size="small"
            value={selectedEdge.targetEndpoint || ''}
            onChange={(e) => updateEdge(selectedEdge.id, { targetEndpoint: e.target.value })}
            placeholder="如 GE0/0/2"
          />
        </div>
        <div className="field-group">
          <label>类型</label>
          <Select
            size="small"
            style={{ width: '100%' }}
            value={selectedEdge.type}
            onChange={(val) => updateEdge(selectedEdge.id, { type: val })}
            options={[
              { label: '折线', value: 'polyline' },
              { label: '直线', value: 'line' },
            ]}
          />
        </div>
        <div className="field-group">
          <label>
            <Space>
              有向
              <Switch
                size="small"
                checked={selectedEdge.directed}
                onChange={(checked) => updateEdge(selectedEdge.id, { directed: checked })}
              />
            </Space>
          </label>
        </div>
        <div className="panel-actions">
          <Popconfirm title="确定删除此连线？" onConfirm={() => deleteEdge(selectedEdge.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除连线
            </Button>
          </Popconfirm>
        </div>
      </div>
    );
  }

  // 节点属性面板
  return (
    <div className="property-panel">
      <div className="panel-title">节点属性</div>

      {/* 名称 */}
      <div className="field-group">
        <label>名称</label>
        <Input
          size="small"
          value={selectedNode.label}
          onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
        />
      </div>

      {/* 类型标签 */}
      <div className="field-group">
        <label>设备类型</label>
        <div className="type-badge">{selectedNode.type}</div>
      </div>

      {/* 字段列表 */}
      <div className="fields-section">
        <div className="section-title">字段信息</div>
        {selectedNode.fields.map((field) => (
          <div key={field.key} className="field-item">
            <div className="field-header">
              <Input
                size="small"
                value={field.label}
                onChange={(e) => handleFieldLabelChange(field.key, e.target.value)}
                className="field-label-input"
              />
              {!field.required && (
                <Popconfirm title="删除此字段？" onConfirm={() => removeFieldFromNode(selectedNode.id, field.key)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
            {renderFieldEditor(field)}
          </div>
        ))}
      </div>

      {/* 添加自定义字段 */}
      <div className="add-field-section">
        <div className="section-title">添加字段</div>
        <Space.Compact style={{ width: '100%' }}>
          <Select
            size="small"
            style={{ width: 100 }}
            value={newFieldType}
            onChange={(val) => setNewFieldType(val)}
            options={FIELD_TYPE_OPTIONS}
          />
          <Input
            size="small"
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            placeholder="字段名称"
            onPressEnter={handleAddField}
          />
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddField}
            disabled={!newFieldLabel.trim()}
          />
        </Space.Compact>
      </div>

      {/* 删除节点 */}
      <div className="panel-actions">
        <Popconfirm title="确定删除此节点及所有连线？" onConfirm={() => deleteNode(selectedNode.id)}>
          <Button danger size="small" icon={<DeleteOutlined />}>
            删除节点
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

export default PropertyPanel;
