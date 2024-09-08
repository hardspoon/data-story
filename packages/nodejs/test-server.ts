import { DirectoryTreeManager, nodeJsProvider, SocketServer } from './src';
import { Application, coreNodeProvider } from '@data-story/core';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { hubspotProvider } from '@data-story/hubspot';
import { openAiProvider } from '@data-story/openai';

const root = path.resolve('./tree');
dotenv.config({ path: '.env.local' });

const app = new Application(
  new DirectoryTreeManager(root)
);
app.register([
  coreNodeProvider,
  nodeJsProvider,
  hubspotProvider,
  openAiProvider,
]);

app.boot();

const server = new SocketServer({
  app,
  port: 3300,
})

server.start()