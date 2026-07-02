import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Graph } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';
import { useTopoStore } from '../stores/topoStore';
import { getDeviceConfig } from '../schemas';
import type { DeviceType } from '../types';
import { setGraphInstance } from '../graphInstance';

interface CanvasProps {
  onCanvasClick?: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ onCanvasClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'pane' | 'node';
    cellId?: string;
  } | null>(null);

  const store = useTopoStore();
  const { nodes, edges, selectedNodeId, selectedEdgeId } = store;
  const { selectNode, selectEdge, addNode, addEdge, updateNodeLabel, deleteNode, deleteEdge } = store;

  // 初始化 Graph
  useEffect(() => {
    if (!containerRef.current || graphRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      background: { color: '#fcfdfe' },
      grid: {
        visible: true,
        type: 'dot',
        size: 20,
        args: { color: '#dde2e9', thickness: 1 },
      },
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        minZoom: 0.25,
        maxZoom: 4,
      },
      panning: {
        enabled: true,
        modifiers: ['space'],
      },
      connecting: {
        enabled: true,
        allowBlank: false,
        allowMulti: true,
        highlight: true,
        connector: 'rounded',
        router: 'manhattan',
        connectionPoint: 'anchor',
      },
    });

    graph.use(new Selection({ enabled: true, rubberband: true, showNodeSelectionBox: true }));

    graphRef.current = graph;
    setGraphInstance(graph);

    // 事件绑定
    graph.on('blank:click', () => {
      selectNode(null);
      selectEdge(null);
      onCanvasClick?.();
    });

    graph.on('node:click', ({ node }) => {
      selectNode(node.id);
    });

    graph.on('edge:click', ({ edge }) => {
      selectEdge(edge.id);
    });

    graph.on('node:dblclick', ({ node }) => {
      const nodeData = useTopoStore.getState().nodes.find((n) => n.id === node.id);
      if (nodeData) {
        const newLabel = prompt('编辑节点名称:', nodeData.label);
        if (newLabel !== null && newLabel.trim()) {
          updateNodeLabel(node.id, newLabel.trim());
        }
      }
    });

    graph.on('node:contextmenu', ({ e, node }) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', cellId: node.id });
    });

    graph.on('blank:contextmenu', ({ e }) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'pane' });
    });

    graph.on('edge:contextmenu', ({ e, edge }) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', cellId: edge.id });
    });

    graph.on('edge:connected', ({ edge }) => {
      const source = edge.getSourceNode();
      const target = edge.getTargetNode();
      if (source && target) {
        const st = useTopoStore.getState();
        const exists = st.edges.some(
          (e) =>
            (e.source === source.id && e.target === target.id) ||
            (e.source === target.id && e.target === source.id)
        );
        if (exists) {
          edge.remove();
          return;
        }
        st.addEdge(source.id, target.id);
      }
    });

    // 键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // 跳过输入框中的按键
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedCells = graph.getSelectedCells();
        if (selectedCells.length > 0) {
          selectedCells.forEach((cell) => {
            if (cell.isNode()) deleteNode(cell.id);
            else if (cell.isEdge()) deleteEdge(cell.id);
          });
          graph.removeCells(selectedCells);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? graph.redo() : graph.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        graph.selectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      graph.dispose();
      graphRef.current = null;
      setGraphInstance(null as any);
    };
  }, []);

  // 创建节点到画布
  const createGraphNode = useCallback(
    (graph: Graph, nodeData: { id: string; type: DeviceType; position: { x: number; y: number }; label: string }) => {
      const config = getDeviceConfig(nodeData.type);
      const color = config?.color || '#999';
      const icon = config?.icon || '📦';

      return graph.addNode({
        id: nodeData.id,
        x: nodeData.position.x,
        y: nodeData.position.y,
        width: 140,
        height: 70,
        label: `${icon} ${nodeData.label}`,
        attrs: {
          body: {
            rx: 8,
            ry: 8,
            fill: '#fff',
            stroke: color,
            strokeWidth: 2,
          },
          label: {
            text: `${icon} ${nodeData.label}`,
            fill: '#1d2129',
            fontSize: 12,
          },
        },
        ports: {
          groups: {
            top: { position: 'top', attrs: { circle: { r: 4, magnet: true, stroke: color, strokeWidth: 1, fill: '#fff' } } },
            bottom: { position: 'bottom', attrs: { circle: { r: 4, magnet: true, stroke: color, strokeWidth: 1, fill: '#fff' } } },
            left: { position: 'left', attrs: { circle: { r: 4, magnet: true, stroke: color, strokeWidth: 1, fill: '#fff' } } },
            right: { position: 'right', attrs: { circle: { r: 4, magnet: true, stroke: color, strokeWidth: 1, fill: '#fff' } } },
          },
          items: [
            { group: 'top', id: 'port-top' },
            { group: 'bottom', id: 'port-bottom' },
            { group: 'left', id: 'port-left' },
            { group: 'right', id: 'port-right' },
          ],
        },
        data: nodeData,
      });
    },
    []
  );

  // 同步 store 节点 → graph
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const graphNodes = graph.getNodes();
    const graphNodeIds = new Set(graphNodes.map((n) => n.id));
    const storeNodeIds = new Set(nodes.map((n) => n.id));

    // 添加新节点
    nodes.forEach((nodeData) => {
      if (!graphNodeIds.has(nodeData.id)) {
        const gNode = createGraphNode(graph, nodeData);
        if (nodeData.id === useTopoStore.getState().selectedNodeId) {
          graph.select(gNode);
        }
      } else {
        // 更新标签
        const gNode = graphNodes.find((n) => n.id === nodeData.id);
        if (gNode) {
          const config = getDeviceConfig(nodeData.type);
          const icon = config?.icon || '📦';
          const expectedLabel = `${icon} ${nodeData.label}`;
          const currentLabel = gNode.getAttrByPath('label/text');
          if (currentLabel !== expectedLabel) {
            gNode.setAttrByPath('label/text', expectedLabel);
          }
        }
      }
    });

    // 删除多余节点
    graphNodes.forEach((gNode) => {
      if (!storeNodeIds.has(gNode.id)) {
        gNode.remove();
      }
    });
  }, [nodes, createGraphNode]);

  // 同步 store 连线 → graph
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const graphEdges = graph.getEdges();
    const graphEdgeIds = new Set(graphEdges.map((e) => e.id));
    const storeEdgeIds = new Set(edges.map((e) => e.id));

    // 添加新连线
    edges.forEach((edgeData) => {
      if (!graphEdgeIds.has(edgeData.id)) {
        const edge = graph.addEdge({
          id: edgeData.id,
          source: { cell: edgeData.source, port: 'port-right' },
          target: { cell: edgeData.target, port: 'port-left' },
          attrs: {
            line: {
              stroke: '#c9cdd4',
              strokeWidth: 2,
              targetMarker: edgeData.directed
                ? { name: 'block', width: 10, height: 8 }
                : undefined,
            },
          },
          router: { name: 'manhattan' },
          connector: { name: 'rounded' },
          data: edgeData,
        });

        // 设置标签
        const labels: any[] = [];
        if (edgeData.label) {
          labels.push({
            position: 0.5,
            attrs: {
              text: { text: edgeData.label, fill: '#4e5969', fontSize: 11 },
              rect: { fill: '#fff', rx: 3, ry: 3, stroke: '#dde2e9', strokeWidth: 1 },
            },
          });
        }
        if (edgeData.sourceEndpoint) {
          labels.push({
            position: { distance: 0.15, offset: -10 },
            attrs: {
              text: { text: edgeData.sourceEndpoint, fill: '#0055ff', fontSize: 10 },
              rect: { fill: '#f3f7ff', rx: 2, ry: 2, stroke: '#ccddff', strokeWidth: 1 },
            },
          });
        }
        if (edgeData.targetEndpoint) {
          labels.push({
            position: { distance: 0.85, offset: -10 },
            attrs: {
              text: { text: edgeData.targetEndpoint, fill: '#0055ff', fontSize: 10 },
              rect: { fill: '#f3f7ff', rx: 2, ry: 2, stroke: '#ccddff', strokeWidth: 1 },
            },
          });
        }
        if (labels.length > 0) {
          edge.setLabels(labels);
        }
      } else {
        // 更新已有连线标签
        const gEdge = graphEdges.find((e) => e.id === edgeData.id);
        if (gEdge) {
          const labels: any[] = [];
          if (edgeData.label) {
            labels.push({
              position: 0.5,
              attrs: {
                text: { text: edgeData.label, fill: '#4e5969', fontSize: 11 },
                rect: { fill: '#fff', rx: 3, ry: 3, stroke: '#dde2e9', strokeWidth: 1 },
              },
            });
          }
          if (edgeData.sourceEndpoint) {
            labels.push({
              position: { distance: 0.15, offset: -10 },
              attrs: {
                text: { text: edgeData.sourceEndpoint, fill: '#0055ff', fontSize: 10 },
                rect: { fill: '#f3f7ff', rx: 2, ry: 2, stroke: '#ccddff', strokeWidth: 1 },
              },
            });
          }
          if (edgeData.targetEndpoint) {
            labels.push({
              position: { distance: 0.85, offset: -10 },
              attrs: {
                text: { text: edgeData.targetEndpoint, fill: '#0055ff', fontSize: 10 },
                rect: { fill: '#f3f7ff', rx: 2, ry: 2, stroke: '#ccddff', strokeWidth: 1 },
              },
            });
          }
          gEdge.setLabels(labels);
        }
      }
    });

    // 删除多余连线
    graphEdges.forEach((gEdge) => {
      if (!storeEdgeIds.has(gEdge.id)) {
        gEdge.remove();
      }
    });
  }, [edges]);

  // 同步选中状态
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.cleanSelection();
    if (selectedNodeId) {
      graph.select(selectedNodeId);
    }
  }, [selectedNodeId]);

  // 拖放创建节点
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const graph = graphRef.current;
      if (!graph) return;
      const deviceType = e.dataTransfer.getData('deviceType') as DeviceType;
      if (!deviceType) return;
      const position = graph.clientToLocal({ x: e.clientX, y: e.clientY });
      position.x -= 70;
      position.y -= 35;
      addNode(deviceType, position);
    },
    [addNode]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // 右键菜单操作
  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      const graph = graphRef.current;
      if (!graph) return;

      if (action === 'delete' && contextMenu.cellId) {
        const cell = graph.getCellById(contextMenu.cellId);
        if (cell?.isNode()) {
          deleteNode(contextMenu.cellId);
          cell.remove();
        } else if (cell?.isEdge()) {
          deleteEdge(contextMenu.cellId);
          cell.remove();
        }
      }

      if (action.startsWith('add-') && contextMenu.type === 'pane') {
        const deviceType = action.replace('add-', '') as DeviceType;
        const pos = graph.clientToLocal({ x: contextMenu.x, y: contextMenu.y });
        pos.x -= 70;
        pos.y -= 35;
        addNode(deviceType, pos);
      }

      if (action === 'save-template' && contextMenu.cellId) {
        const nodeData = useTopoStore.getState().nodes.find((n) => n.id === contextMenu.cellId);
        if (nodeData) {
          const name = prompt('模板名称:', `${nodeData.label} 模板`);
          if (name?.trim()) {
            useTopoStore.getState().saveTemplate(name.trim(), nodeData);
          }
        }
      }

      setContextMenu(null);
    },
    [contextMenu, addNode, deleteNode, deleteEdge]
  );

  return (
    <div className="canvas-container">
      <div
        ref={containerRef}
        className="graph-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />
      <div ref={minimapRef} className="minimap-container" />

      {/* 右键菜单 */}
      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.type === 'pane' ? (
              <>
                <div className="menu-title">新建设备</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-server')}>🖥️ 服务器</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-switch')}>🔀 交换机</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-router')}>📡 路由器</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-modem')}>📶 光猫</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-firewall')}>🛡️ 防火墙</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-pc')}>💻 PC/终端</div>
                <div className="menu-item" onClick={() => handleContextMenuAction('add-cloud')}>☁️ 云服务</div>
              </>
            ) : (
              <>
                <div className="menu-item" onClick={() => handleContextMenuAction('save-template')}>📋 保存为模板</div>
                <div className="menu-divider" />
                <div className="menu-item danger" onClick={() => handleContextMenuAction('delete')}>🗑️ 删除</div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Canvas;
