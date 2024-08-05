import './../../styles/globals.css';
import { Allotment } from 'allotment';
import { DataStoryProps } from './types';
import 'allotment/dist/style.css';
import { ActivityBar } from './sidebar/activityBar';
import { Sidebar } from './sidebar/sidebar';
import { WorkbenchContainer } from './WorkbenchContainer';
import { useEffect, useState } from 'react';
import { ReactFlowNode } from '../Node/ReactFlowNode';

export const DataStory = (
  props: DataStoryProps
) => {
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode>();
  const [isSidebarClose, setIsSidebarClose] = useState(true);
  const [updateSelectedNodeData, setUpdateSelectedNodeData] = useState<ReactFlowNode['data']>();
  const [activeKey, setActiveKey] = useState('activity');

  useEffect(() => {
    if (activeKey !== 'node') {
      setSelectedNode(undefined);
    }
  }, [activeKey]);

  return (
    <Allotment className='h-full border-0.5'>
      <Allotment.Pane minSize={60} maxSize={60}>
        <ActivityBar selectedNode={selectedNode} onActivityChange={setActiveKey} onClose={setIsSidebarClose}/>
      </Allotment.Pane>
      <Allotment.Pane visible={!isSidebarClose} snap maxSize={500}>
        <Sidebar activeBar={activeKey} node={selectedNode}
          onUpdateNodeData={setUpdateSelectedNodeData} onClose={setIsSidebarClose}/>
      </Allotment.Pane>
      <Allotment.Pane minSize={300}>
        <WorkbenchContainer {...props} selectedNode={selectedNode} selectedNodeData={updateSelectedNodeData} onNodeSelected={setSelectedNode}/>
      </Allotment.Pane>
    </Allotment>
  )
}
