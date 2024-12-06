import { PortId } from './types/PortId'
import { Link, LinkId } from './types/Link'
import { Node } from './types/Node'
import { Param } from './Param'

// This is what a serialized Diagram looks like
export type Diagrammable = {
  [K in keyof Diagram as Diagram[K] extends (...args: any[]) => any ? never : K]: Diagram[K];
};

export class Diagram {
  nodes: Node[]
  links: Link[]
  params: Param[]
  viewport: { x: number, y: number, zoom: number }

  constructor(options?: {
    nodes?: Node[],
    links?: Link[],
    params?: Param[],
    viewport?: { x: number, y: number, zoom: number }
  }) {
    this.nodes = options?.nodes || []
    this.links = options?.links || []
    this.params = options?.params || []
    this.viewport = options?.viewport || {
      x: 0,
      y: 0,
      zoom: 1
    }
  }

  clone(): Diagram {
    return new Diagram({
      nodes: this.nodes.map(node => ({ ...node })),
      links: this.links.map(link => ({ ...link })),
      params: this.params.map(param => ({ ...param })),
      viewport: { ...this.viewport },
    });
  }

  add(node: Node) {
    this.nodes.push(node)

    return this
  }

  connect(link: Link) {
    this.links.push(link)

    return this
  }

  linksAtInputPortId(id: PortId | undefined): Link[] {
    return this.links.filter(link => link.targetPortId === id)
  }

  linksAtOutputPortId(id: PortId | undefined): Link[] {
    return this.links.filter(link => link.sourcePortId === id)
  }

  nodeWithInputPortId(portId: PortId): Node | undefined {
    return this.nodes.find(node => {
      return node.inputs.find(input => input.id === portId)
    })
  }

  nodeWithOutputPortId(portId: PortId): Node | undefined {
    return this.nodes.find(node => {
      return node.outputs.find(output => output.id === portId)
    })
  }

  linksAtInput(node: Node, name: string): Link[] {
    const port = node.inputs.find(input => input.name === name)!

    return this.linksAtInputPortId(port.id)
  }

  linksAtOutput(node: Node, name: string): Link[] {
    const port = node.outputs.find(input => input.name === name)!

    return this.linksAtOutputPortId(port.id)
  }

  getNodeIdAndPortIdFromLinkId(linkId: string): { nodeId: string, portId: string } {
    const link = this.links.find(link => link.id === linkId)

    if (!link) throw new Error(`Link with id ${linkId} not found`)

    const sourceNode = this.nodeWithOutputPortId(link.sourcePortId)
    const targetNode = this.nodeWithInputPortId(link.targetPortId)

    if (!sourceNode || !targetNode) throw new Error(`Source or target node not found for link ${linkId}`)

    return {
      nodeId: targetNode.id,
      portId: link.targetPortId
    }
  }

  getLinkIdFromNodeId(nodeId: string, portName: string): LinkId | undefined {
    const node = this.nodes.find(node => node.id === nodeId)
    if (!node) return;

    const port = node.inputs.find(input => input.name === portName)
    if (!port) return;

    const link = this.links.find(link => link.targetPortId === port.id)
    if (!link) return;

    return link.id
  }

  getInputLinkIdsFromNode(node: Node): LinkId[] {
    const inputIds = node.inputs.map(input => input.id);
    return this.links.filter(link => inputIds.includes(link.targetPortId)).map(link => link.id);
  }

  directAncestor(node: Node): Node[] {
    const inputLinks = node.inputs.flatMap(input => this.linksAtInputPortId(input.id))
    const outputPortIds = inputLinks.map(link => link.sourcePortId)
    return outputPortIds.map(portId => this.nodeWithOutputPortId(portId)!)
  }

  directDescendant(node: Node): Node[] {
    const outputLinks = node.outputs.flatMap(output => this.linksAtOutputPortId(output.id))
    const inputPortIds = outputLinks.map(link => link.targetPortId)

    return inputPortIds.map(portId => this.nodeWithInputPortId(portId)!)
  }

  inputNodes(): Node[] {
    return this.nodes.filter(node => node.type === 'Input')
  }

  outputNodes(): Node[] {
    return this.nodes.filter(node => node.type === 'Output')
  }
}