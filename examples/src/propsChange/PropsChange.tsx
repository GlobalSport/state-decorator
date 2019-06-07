import React, { useState } from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import useStateDecorator from '../../../src/useStateDecorator';

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

// State decorator managed class that depends on value from props.
export function PropsChange(props: PropsChangeProps) {
  const { state } = useStateDecorator(getInitialState, propChangeActions, props, {
    getPropsRefValues: (p) => [p.value],
    onPropsChangeReducer: (s, p) => ({ ...s, value: p.value }),
    onPropsChange: (s, p, actions) => actions.get('Updated value from onPropsChange'),
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
