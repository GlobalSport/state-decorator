import React, { useState } from 'react';
import useStateDecorator, { StateDecoratorActions } from '../../../src';

export type State = {
  value: string;
};

export type Actions = {
  get: (param: string) => Promise<any>;
};

export const getInitialState = (): State => ({
  value: 'initial value',
});

type PropsChangeProps = { value: string };

const propChangeActions: StateDecoratorActions<State, Actions, PropsChangeProps> = {
  get: {
    promise: ([param]) => new Promise((resolve) => setTimeout(resolve, 1000, param)),
    reducer: (s, param) => {
      return { ...s, value: param };
    },
  },
};

// State decorator managed functional component that depends on value from props.
export function PropsChange(props: PropsChangeProps) {
  const { state } = useStateDecorator(getInitialState, propChangeActions, props, {
    // we will react if the value prop is changed
    getPropsRefValues: (p) => [p.value],
    // inner state is updated using the updated value prop. updateIndices is 0.
    onPropsChangeReducer: (s, p, updatedIndices) => ({ ...s, value: p.value }),
    // we can call an action on prop change.
    onPropsChange: (s, p, actions, updatedIndices) => actions.get('Updated value from onPropsChange'),
  });
  return <div>value: {state.value}</div>;
}

export interface PropsChangeAppProps {}

export default function PropsChangeApp(props: PropsChangeAppProps) {
  const [state, setState] = useState({ value: 'value' });

  return (
    <div>
      <h1>Props change</h1>
      <div>A state decorator can update its state from its props</div>
      <div>Click on button change the StateDecorator inbound props and update its internal state.</div>
      <br />
      <PropsChange value={state.value} />
      <br />
      <button onClick={() => setState({ value: 'Updated value from props' })}>Update value</button>
    </div>
  );
}
