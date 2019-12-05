import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const getInitialState = () => ({ color: 'blue' });

export const Context = React.createContext<State & Actions>(null);

class SubComponent extends React.Component {
  render() {
    return (
      <Context.Consumer>
        {(context) => (
          <div>
            <div className="sub-component">{context.color}</div>
            <button onClick={() => context.setColor('red')}>Click</button>
          </div>
        )}
      </Context.Consumer>
    );
  }
}

const MainComponent = () => <SubComponent />;

const actions: StateDecoratorActions<State, Actions> = {
  setColor: (s, [color]) => ({ ...s, color }),
};

export default function ContextContainer() {
  return (
    <StateDecorator<State, Actions> actions={actions} getInitialState={getInitialState}>
      {(state, actions) => (
        <Context.Provider
          value={{
            ...state,
            ...actions,
          }}
        >
          <MainComponent />
        </Context.Provider>
      )}
    </StateDecorator>
  );
}
