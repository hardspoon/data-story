import { DataStory } from '@data-story/ui'
import '@data-story/ui/dist/data-story.css';
import { ComputerFactory, ConsoleLog, Container, DiagramBuilder, Signal } from "@data-story/core";
import { Computer } from "@data-story/core/dist/types/Computer";

export default () => {
  const app = new Container();

  app.register({
    register(container: Container) {
      container.addComputers(
        new Map<string, Computer>()
          .set('Signal', ComputerFactory.fromComputerConfig(Signal()))
          .set('ConsoleLog', ComputerFactory.fromComputerConfig(ConsoleLog()))
      )
    },
    boot(container: Container) {},
  });

  app.boot();

  const diagram = new DiagramBuilder()
    .add(Signal)
    .add(ConsoleLog)
    .get()

  return (
    <div className="w-full sm:w-1/2" style={{ height: '36vh' }}>
      <DataStory
        server={{ type: 'JS', app }}
        diagram={diagram}        
      />
    </div>   
  );
};