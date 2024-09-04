'use client'

import { DataStory } from '@data-story/ui';
import { Application, coreNodeProvider } from '@data-story/core';
import { MockJSClient } from '../../splash/MockJSClient';

export default () => {
  const client = new MockJSClient();
  client.getTree = async({ path }) => {
    return Promise.resolve(null);
  };

  const app = new Application();
  app.register(coreNodeProvider);
  app.boot();

  return (
    <div className="w-full h-80 border-gray-400 border-4">
      <DataStory
        client={client}
        server={{ type: 'JS', app }}
        onInitialize={(options) => options.run()}
        hideControls={true}
      />
    </div>
  );
};