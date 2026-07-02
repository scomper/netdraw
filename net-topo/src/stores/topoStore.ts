import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { NodeData, EdgeData, FieldData, TemplateData, DeviceType } from '../types';
import { createPresetFields } from '../schemas';

interface TopoState {
  nodes: NodeData[];
  edges: EdgeData[];
  templates: TemplateData[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // 节点操作
  addNode: (type: DeviceType, position: { x: number; y: number }, label?: string) => string;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeFields: (id: string, fields: FieldData[]) => void;
  addFieldToNode: (nodeId: string, field: FieldData) => void;
  removeFieldFromNode: (nodeId: string, fieldKey: string) => void;
  deleteNode: (id: string) => void;

  // 连线操作
  addEdge: (source: string, target: string) => string;
  updateEdge: (id: string, data: Partial<EdgeData>) => void;
  deleteEdge: (id: string) => void;

  // 选中
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  // 模板
  saveTemplate: (name: string, nodeData: NodeData) => void;
  deleteTemplate: (id: string) => void;

  // 导入导出
  exportData: () => any;
  importData: (data: any) => void;
}

export const useTopoStore = create<TopoState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      templates: [],
      selectedNodeId: null,
      selectedEdgeId: null,

      addNode: (type, position, label) => {
        const id = uuidv4();
        const nodeLabel = label || `${type}_${id.slice(0, 6)}`;
        const fields = createPresetFields(type);
        const newNode: NodeData = { id, type, position, label: nodeLabel, fields };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
        return id;
      },

      updateNodeLabel: (id, label) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
        }));
      },

      updateNodeFields: (id, fields) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, fields } : n)),
        }));
      },

      addFieldToNode: (nodeId, field) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, fields: [...n.fields, field] } : n
          ),
        }));
      },

      removeFieldFromNode: (nodeId, fieldKey) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, fields: n.fields.filter((f) => f.key !== fieldKey) } : n
          ),
        }));
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
      },

      addEdge: (source, target) => {
        const id = uuidv4();
        const newEdge: EdgeData = {
          id,
          source,
          target,
          type: 'polyline',
          directed: true,
        };
        set((state) => ({ edges: [...state.edges, newEdge] }));
        return id;
      },

      updateEdge: (id, data) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
      },

      deleteEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        }));
      },

      selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

      saveTemplate: (name, nodeData) => {
        const template: TemplateData = {
          id: uuidv4(),
          name,
          deviceType: nodeData.type,
          fields: JSON.parse(JSON.stringify(nodeData.fields)),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [...state.templates, template] }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      exportData: () => {
        const { nodes, edges, templates } = get();
        return { nodes, edges, templates, exportedAt: new Date().toISOString() };
      },

      importData: (data) => {
        if (data && data.nodes && data.edges) {
          set({
            nodes: data.nodes || [],
            edges: data.edges || [],
            templates: data.templates || [],
          });
        }
      },
    }),
    {
      name: 'net-topo-storage',
    }
  )
);
