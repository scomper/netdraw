import { Graph } from '@antv/x6';

// 模块级 graph 实例引用，供 Toolbar 等组件访问
let graphInstance: Graph | null = null;

export function setGraphInstance(graph: Graph) {
  graphInstance = graph;
}

export function getGraphInstance(): Graph | null {
  return graphInstance;
}
