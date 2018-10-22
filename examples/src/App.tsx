import React from 'react';
import TodoContainer from './todo/Todos';
import ConflictingActionsApp from './conflict/ConflictingActions';
import CounterContainer from './counter/Counter';
import Retry from './retry/Retry';

export default class App extends React.Component {
  render() {
    return (
      <div>
        <section>
          <h1>Counter</h1>
          <CounterContainer />
        </section>
        <section>
          <h1>Todo</h1>
          <TodoContainer />
        </section>
        <section>
          <h1>Conflict</h1>
          <ConflictingActionsApp />
        </section>
        <section>
          <Retry />
        </section>
      </div>
    );
  }
}
