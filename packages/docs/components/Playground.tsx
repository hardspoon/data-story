import { DataStory } from '@data-story/ui'
import '@data-story/ui/dist/data-story.css';
import { coreNodeProvider, Application, DiagramBuilder } from '@data-story/core';

export default ({ mode}: { mode?: 'js' | 'node' }) => {
  const app = new Application()
    .register(coreNodeProvider)
    .boot();

  return (
    <div className="w-full" style={{ height: '100vh' }}>
      <DataStory
        server={mode === 'node'
          ? { type: 'SOCKET', url: 'ws://localhost:3100' }
          : { type: 'JS', app }}
      />
    </div>
  );
};