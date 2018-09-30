import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const initialState = { color: 'blue' };

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

export default class ContextContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    setColor: (s, color) => ({ ...s, color }),
  };
  render() {
    return (
      <StateDecorator<State, Actions> actions={ContextContainer.actions} initialState={initialState}>
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
}
