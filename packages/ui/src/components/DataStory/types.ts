import { ServerConfig } from './clients/ServerConfig';
import {
  Diagram,
  Param,
  RepeatableParam,
  type InputObserver,
  type NotifyObserversCallback,
  Application, NodeDescription
} from '@data-story/core';
import { UseFormReturn } from 'react-hook-form';
import { ReactFlowNode } from '../Node/ReactFlowNode';
import type { ReactFlowInstance } from 'reactflow';

export type DataStoryCallback = (options: {run: () => void}) => void;

export type DataStoryObservers = {
  inputObservers: InputObserver[],
  watchDataChange: NotifyObserversCallback,
}
type ClientOptions = {
  setAvailableNodes: (nodes: NodeDescription[]) => void,
  updateEdgeCounts: (edgeCounts: Record<string, number>) => void,
  observers?: DataStoryObservers,
};

export type JSClientOptions = ClientOptions & {
  app: Application,
}

export type SocketClientOptions = ClientOptions & {
  serverConfig: ServerConfig,
}

export type DataStoryProps = {
  server?: ServerConfig
  initDiagram?: Diagram
  callback?: DataStoryCallback
  hideToolbar?: boolean
  slotComponent?: React.ReactNode;
  observers?: DataStoryObservers;
}

export type StoreInitOptions = {
  rfInstance: ReactFlowInstance,
  server?: ServerConfig,
  initDiagram?: Diagram,
  callback?: DataStoryCallback,
  observers?: DataStoryObservers,
}

export type StoreInitServer = (serverConfig: ServerConfig, observers?: DataStoryObservers)  => void;

export type FormCommonProps = {
  form: UseFormReturn<{
    [x: string]: any;
  }, any>;
  node: ReactFlowNode;
  name?: string;
}

export type FormComponentProps = FormCommonProps & {
  param: Param;
}

export type RepeatableInputProps = FormCommonProps & {
  param: RepeatableParam<Param[]>;
}
export interface FormComponent<TParams extends Param> {
  getComponent: (params: FormCommonProps & {param: TParams}) => React.ReactNode;
  getType: () => string;
}
