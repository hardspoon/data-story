import { ItemValue } from './ItemValue';
import { LinkId } from './Link';
import { NodeId } from './Node';
import { NodeStatus } from '../Executor';

/**
 * Interface for storage implementations used by InputObserverController
 */
export type GetLinkItemsParams = {
  linkId: LinkId;
  offset: number;
  limit: number;
};

export interface ObserverStorage {
// Link Counts
  getLinkCount(linkId: LinkId): Promise<number | undefined>;
  setLinkCount(linkId: LinkId, count: number): Promise<void>;

  // Link Items
  getLinkItems(params: GetLinkItemsParams): Promise<ItemValue[] | undefined>;
  setLinkItems(linkId: LinkId, items: ItemValue[]): Promise<void>;
  appendLinkItems(linkId: LinkId, items: ItemValue[]): Promise<void>;

  // Node Status
  getNodeStatus(nodeId: NodeId): Promise<NodeStatus | undefined>;
  setNodeStatus(nodeId: NodeId, status: NodeStatus): Promise<void>;
}
