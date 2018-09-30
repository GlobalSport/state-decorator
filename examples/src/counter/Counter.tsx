import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

type State = number;

type Actions = {
  increment: () => void;
  decrement: () => void;
};

export const initialState: State = 0;

// Stateless component.
const CounterView: React.SFC<{ counter: number } & Actions> = ({ counter, increment, decrement }) => (
  <div>
    {counter}
    <button onClick={decrement}>Decrement</button>
    <button onClick={increment}>Increment</button>
  </div>
);

// Container that is managing the state.
export default class CounterContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    decrement: (counter) => counter - 1,
    increment: (counter) => counter + 1,
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={CounterContainer.actions} initialState={initialState}>
        {(counter, actions) => {
          console.log(counter);
          return <CounterView counter={counter} {...actions} />;
        }}
      </StateDecorator>
    );
  }
}
