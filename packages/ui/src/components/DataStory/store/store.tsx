import { StoreApi, UseBoundStore } from 'zustand';
import { createWithEqualityFn } from 'zustand/traditional'

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from 'reactflow';

import { SocketClient } from '../clients/SocketClient';
import { AbstractPort, Diagram, LinkGuesser, Node, NodeDescription, PositionGuesser } from '@data-story/core';
import { ReactFlowNode } from '../../Node/ReactFlowNode';
import { ServerClient } from '../clients/ServerClient';
import { JsClient } from '../clients/JsClient';
import { ServerConfig } from '../clients/ServerConfig';
import { reactFlowNodeToDiagramNode, reactFlowToDiagram } from '../../../reactFlowToDiagram';
import React, { useState } from 'react';

export type StoreSchema = {
  /** The main reactflow instance */
  rfInstance: ReactFlowInstance | undefined;
  toDiagram: () => Diagram;

  /** Addable Nodes */
  availableNodes: NodeDescription[],
  setAvailableNodes: (nodes: NodeDescription[]) => void,

  /** The Nodes */
  nodes: ReactFlowNode[];
  updateNode: (node: ReactFlowNode) => void;
  refreshNodes: () => void;
  addNode: (node: ReactFlowNode) => void;
  addNodeFromDescription: (nodeDescription: NodeDescription) => void;
  onNodesChange: OnNodesChange;
  setNodes: (nodes: ReactFlowNode[]) => void;
  traverseNodes: (direction: 'up' | 'down' | 'left' | 'right') => void;
  peeks: Record<string, any[]>;
  addPeekItems: (key: string, peekItems: any[]) => void;

  /** The Edges */
  edges: Edge[];
  onEdgesChange: OnEdgesChange;
  updateEdgeCounts: (edgeCounts: Record<string, number>) => void;
  setEdges: (edges: Edge[]) => void;
  connect: OnConnect;
  calculateInputSchema: (node: ReactFlowNode) => void;

  /** The Server and its config */
  serverConfig: ServerConfig;
  setServerConfig: (config: ServerConfig) => void;
  server: null | ServerClient;
  onInitServer: (server: ServerConfig) => void;

  /** When DataStory component initializes */
  onInit: (options: {
    rfInstance: ReactFlowInstance,
    server?: ServerConfig,
    initDiagram?: Diagram,
    callback?: (server: any) => void,
  }) => void;

  updateDiagram: (diagram: Diagram) => void;

  /** Run the diagram */
  onRun: () => void;

  /** Modals */
  openNodeModalId: string | null;
  setOpenNodeModalId: (id: string | null) => void;

  /** Not used/implemented at the moment */
  flowName: string;
  setFlowName: (name: string) => void;
};

function getNodes(nodes: Node[]):  ReactFlowNode[] {
  return nodes.map(node => {
    return {
      width: 128,
      height: 52,
      id: node.id,
      position: {
        x: node.position!.x,
        y: node.position!.y
      },
      data: {
        docs: node.docs,
        params: node.params,
        computer: node.type,
        label: (node?.label || node.type) as string,
        inputs: node.inputs,
        outputs: node.outputs,
      },
      type: (() => {
        if (node.type === 'Comment') return 'dataStoryCommentNodeComponent';
        if (node.type === 'Input') return 'dataStoryInputNodeComponent';
        if (node.type === 'Output') return 'dataStoryOutputNodeComponent';

        return 'dataStoryNodeComponent'
      })(),
    }
  });
}

function getEdges(diagram: Diagram): Edge[]{
  return diagram.links.map(link => {
    return {
      sourceHandle: link.sourcePortId,
      targetHandle: link.targetPortId,
      source: diagram.nodes.find(node => node.outputs.find(output => output.id === link.sourcePortId) !== undefined)!.id,
      target: diagram.nodes.find(node => node.inputs.find(input => input.id === link.targetPortId) !== undefined)!.id,
      id: link.id,
    }
  });
}

export const createStore = () => createWithEqualityFn<StoreSchema>((set, get) => ({
  // DEFAULTS
  serverConfig: { type: 'SOCKET', url: 'ws://localhost:3100' },
  flowName: 'untitled',
  rfInstance: undefined,
  nodes: [],
  edges: [],
  server: null,
  availableNodes: [],
  openNodeModalId: null,
  peeks: {},


  // METHODS
  toDiagram: () => {
    const reactFlowObject = get().rfInstance!.toObject()

    return reactFlowToDiagram(reactFlowObject)
  },
  setServerConfig: (config: ServerConfig) => {
    set({ serverConfig: config })

    console.log('TODO: We should reconnect to the server now...')
  },
  setFlowName: (name: string) => {
    set({
      flowName: name,
    });
  },
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  connect: (connection: Connection) => {
    const fromHandleId = connection.sourceHandle;
    const toHandleId = connection.targetHandle;

    set({
      edges: addEdge({
        ...connection,
        id: `${fromHandleId}--->${toHandleId}`,
      }, get().edges),
    });

    // Calculate input schema for the target node
    const targetNode = get().nodes.find(node => node.id === connection.target)
    if (targetNode) {
      get().calculateInputSchema(targetNode)
    }
  },
  addNode: (node: ReactFlowNode) => {
    set({
      nodes: [
        ...get().nodes.map(node => {
          // When adding a node, deselect all other nodes
          node.selected = false
          return node
        }),
        node
      ],
    })

    setTimeout(() => {
      get().rfInstance?.fitView();
    }, 1);
  },
  addNodeFromDescription: (nodeDescription: NodeDescription) => {
    const diagram = get().toDiagram()

    const scopedId = (name: string) => {
      const max = diagram.nodes
        .filter((node) => node.type === name)
        .map((node) => node.id)
        .map((id) => id.split('.')[1])
        .map((id) => parseInt(id))
        .reduce((max, id) => Math.max(max, id), 0)

      return max + 1
    }

    const counter = scopedId(nodeDescription.name)
    const id = `${nodeDescription.name}.${counter}`;

    const flowNode: ReactFlowNode = {
      id,
      position: new PositionGuesser(diagram).guess(nodeDescription),
      data: {
        computer: nodeDescription.name,
        docs: nodeDescription.docs,
        // Ensure two nodes of same type don't share the same params object
        params: structuredClone(nodeDescription.params),
        label: nodeDescription.label ?? nodeDescription.name,
        inputs: nodeDescription.inputs.map((input: AbstractPort) => {
          return {
            id: `${id}.${input.name}`,
            ...input
          }
        }),
        outputs: nodeDescription.outputs.map((output: AbstractPort) => {
          return {
            id: `${id}.${output.name}`,
            ...output
          }
        }),
      },
      selected: true,
      type: {
        Comment: 'dataStoryCommentNodeComponent',
        Peek: 'dataStoryPeekNodeComponent',
        Input: 'dataStoryInputNodeComponent',
        Output: 'dataStoryOutputNodeComponent',
      }[nodeDescription.name] ?? 'dataStoryNodeComponent',
    }

    const node: Node = reactFlowNodeToDiagramNode(flowNode)

    const link = new LinkGuesser(diagram).guess(node)

    const connection = link ? {
      source: diagram.nodeWithOutputPortId(link.sourcePortId)!.id,
      target: id,
      sourceHandle: link.sourcePortId,
      targetHandle: link.targetPortId,
    } : null;

    get().addNode(flowNode);

    if (connection) get().connect(connection);
  },
  updateNode: (node: ReactFlowNode) => {

    set({
      nodes: get().nodes.map(existingNode => {
        if (existingNode.id === node.id) {
          return node
        }

        return existingNode
      }),
    })
  },
  setNodes: (nodes: ReactFlowNode[]) => {
    set({
      nodes: [...nodes],
    })
  },
  addPeekItems: (key: string, peekItems: any[]) => {
    const all = get().peeks
    const existingAtKey = all[key] ?? []

    set({
      peeks: {
        ...all,
        [key]: [
          ...existingAtKey,
          ...peekItems
        ],
      },
    })
  },
  refreshNodes: () => {
    console.log(get().nodes)

    set({
      nodes: [...get().nodes],
    })
  },
  setEdges(edges: Edge[]) {
    set({ edges })
  },
  onInit: (options: {
    rfInstance: ReactFlowInstance,
    server?: ServerConfig,
    initDiagram?: Diagram,
    callback?: (options: {run: () => void}) => void
  }) => {
    set({
      serverConfig: options.server || {
        type: 'SOCKET',
        url: 'ws://localhost:3100'
      }
    })

    set({ rfInstance: options.rfInstance })
    get().onInitServer(get().serverConfig)

    if (options.initDiagram) {
      const diagram = options.initDiagram;

      get().setNodes(getNodes(diagram.nodes));
      get().setEdges(getEdges(diagram));
    }

    if (options.callback) {
      const run = () => {
        get().server?.run(
          // TODO it seems this does not await setNodes/setEdges?
          get().toDiagram()
        )
      }

      options.callback({ run })
    }
  },
  updateDiagram: (diagram: Diagram) => {

    get().setNodes(getNodes(diagram.nodes));
    get().setEdges(getEdges(diagram));
  },
  onRun: () => {
    set({ peeks: {} })
    get().server!.run(
      get().toDiagram()
    )
  },
  onInitServer: (serverConfig: ServerConfig) => {
    if (serverConfig.type === 'JS') {
      const server = new JsClient(
        get().setAvailableNodes,
        get().updateEdgeCounts,
        get().addPeekItems,
        (nodes) => set({ nodes }),
        (edges) => set({ edges }),
        // (viewport) => set({ viewport }),
        serverConfig.app
      )

      set({ server })
      server.init()
    }

    if (serverConfig.type === 'SOCKET') {
      const server = new SocketClient(
        get().setAvailableNodes,
        get().updateEdgeCounts,
        get().addPeekItems,
        (nodes) => set({ nodes }),
        (edges) => set({ edges }),
        // (viewport) => set({ viewport }),
      )

      set({ server })
      server.init()
    }
  },
  setAvailableNodes: (availableNodes: NodeDescription[]) => {
    set({ availableNodes })
  },
  updateEdgeCounts: (edgeCounts: Record<string, number>) => {
    for(const [id, count] of Object.entries(edgeCounts)) {
      const edge = get().edges.find(edge => edge.id === id)
      if (edge) edge.label = count
    }

    const newEdges = get().edges.map((edge: Edge) => {
      Object.entries(edgeCounts).forEach(([id, count]) => {
        if (edge.id === id) {
          edge.label = count
          edge.labelBgStyle = {
            opacity: 0.6,
          }
        }
      })

      return edge
    })

    get().setEdges(newEdges);
  },
  setOpenNodeModalId: (id: string | null) => {
    set({ openNodeModalId: id })
  },
  traverseNodes: (direction: 'up' | 'down' | 'left' | 'right') => {
    const selectedNodes = get().nodes.filter(node => node.selected)

    // If multiple nodes are selected we cant navigate
    if (selectedNodes.length > 1) return

    // If no nodes are selected, select the first node
    if (selectedNodes.length === 0 && get().nodes.length > 0) {
      const firstNode = get().nodes.at(0)!
      firstNode.selected = true
      get().updateNode(firstNode)
      return
    }

    // // If one node is selected, navigate
    if (selectedNodes.length === 1 && get().nodes.length > 0) {
      const node = selectedNodes.at(0)!
      const otherNodes = get().nodes.filter(otherNode => otherNode.id !== node.id)

      // Find the closest node in the direction
      if (direction === 'up') {
        const closestNode = otherNodes.reduce((closest, otherNode) => {
          if (otherNode.position.y < node.position.y) {
            if (closest === null) return otherNode
            if (otherNode.position.y > closest.position.y) return otherNode
          }

          return closest
        }, null as ReactFlowNode | null)

        if (closestNode) {
          node.selected = false
          get().updateNode(node)
          closestNode.selected = true
          get().updateNode(closestNode)
        }
      }

      if (direction === 'down') {
        const closestNode = otherNodes.reduce((closest, otherNode) => {
          if (otherNode.position.y > node.position.y) {
            if (closest === null) return otherNode
            if (otherNode.position.y < closest.position.y) return otherNode
          }

          return closest
        }, null as ReactFlowNode | null)

        if (closestNode) {
          node.selected = false
          get().updateNode(node)
          closestNode.selected = true
          get().updateNode(closestNode)
        }
      }

      if (direction === 'left') {
        const closestNode = otherNodes.reduce((closest, otherNode) => {
          if (otherNode.position.x < node.position.x) {
            if (closest === null) return otherNode
            if (otherNode.position.x > closest.position.x) return otherNode
          }

          return closest
        }, null as ReactFlowNode | null)

        if (closestNode) {
          node.selected = false
          get().updateNode(node)
          closestNode.selected = true
          get().updateNode(closestNode)
        }
      }

      if (direction === 'right') {
        const closestNode = otherNodes.reduce((closest, otherNode) => {
          if (otherNode.position.x > node.position.x) {
            if (closest === null) return otherNode
            if (otherNode.position.x < closest.position.x) return otherNode
          }

          return closest
        }, null as ReactFlowNode | null)

        if (closestNode) {
          node.selected = false
          get().updateNode(node)
          closestNode.selected = true
          get().updateNode(closestNode)
        }
      }
    }
  },
  calculateInputSchema: (node: ReactFlowNode) => {
    const links = get().edges.filter(edge => edge.target === node.id)

    links.forEach(link => {
      const sourceNode = get().nodes.find(node => node.id === link.source)
      if (!sourceNode) return

      const sourcePortName = sourceNode.data.outputs.find(output => output.id === link.sourceHandle)?.name
      const targetPortName = node.data.inputs.find(input => input.id === link.targetHandle)?.name
      if (!sourcePortName || !targetPortName) return;

      const outputSchema = sourceNode.data.outputs.find(output => output.id === link.sourceHandle)?.schema

      const inputPort = node.data.inputs.find(input => input.id === link.targetHandle)!
      inputPort.schema = outputSchema ?? {}
    })

    get().updateNode(node)
  },
}));

export const DataStoryContext = React.createContext<ReturnType<typeof createStore>>({} as ReturnType<typeof createStore>);

// @ts-ignore: UseBoundStore is an overloaded function, so the type of params here cannot be accurately inferred.
export const useStore: UseBoundStore<StoreApi<StoreSchema>> = (...params) => {
  const store = React.useContext(DataStoryContext);
  if (!store) throw new Error('useStore must be used within a DataStoryProvider');
  // @ts-ignore
  return store(...params);
};


export const DataStoryProvider = ({ children }: {children: React.ReactNode}) => {
  const [useLocalStore] = useState(() => createStore());

  return <DataStoryContext.Provider value={useLocalStore}>
    {children}
  </DataStoryContext.Provider>;
};
