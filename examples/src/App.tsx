import React from 'react';
import { MyContainer } from './sample';
import ShapesApp from './Shapes';
import TodoContainer from './Todos';
// import ConflictingActionsApp from './conflict/ConflictingActions';
// import CounterContainer from './counter/Counter';
// import Retry from './retry/Retry';
// import PropsChangeApp from './propsChange/PropsChange';
// import WrappedComponent from './hoc/WrappedComponent';
// import ContextContainer from './context/Context';
// import Debounce from './debounce/Debounce';
// import Optimistic from './Optimistic/Optimistic';
// import WarningActions from './WarningActions';
// import ErrorHandler from './ErrorHandler';
// import Abort from './abort/Abort';

export default function App() {
  return (
    <div>
      <section>
        <h1>Share state</h1>
        <MyContainer />
      </section>
      {/* <section>
        <h1>Todo</h1>
        <TodoContainer />
      </section> */}

      {/* <ShapesApp /> */}

      {/* <section>
          <h1>Abort action</h1>
          <Abort />
        </section>
        <section>
          <h1>Debounce</h1>
          <Debounce />
        </section>
        <section>
          <h1>Counter</h1>
          <CounterContainer />
        </section>
        <section>
          <h1>Context</h1>
          <ContextContainer />
        </section>

        <section>
          <h1>Conflict</h1>
          <ConflictingActionsApp />
        </section>
        <section>
          <Retry />
        </section>
        <section>
          <PropsChangeApp />
        </section>
        <section>
          <h1>Optimistic</h1>
          <Optimistic />
        </section>
        <section>
          <h1>HOC</h1>
          <WrappedComponent value={10} />
        </section>
        <section>
          <h1>WarningActions</h1>
          <p>Look at console, the useStateDecorator is set new action at each render, so a warning is printed</p>
          <WarningActions />
        </section>
        <section>
          <h1>Async error handler</h1>
          <p>Look at console, the useStateDecorator is trigerring a special handler on async errors</p>
          <ErrorHandler />
        </section> */}
    </div>
  );
}
