import React from 'react';
import { StateDecoratorActions } from '../../../src/types';
import useStateDecorator from '../../../src/useStateDecorator';

type State = {
  value: string;
  otherValue: string;
};

type Actions = {
  setOtherValue: (value: string) => Promise<string>;
  setValueSuccess: (value: string) => Promise<string>;
  setValueError: (value: string) => Promise<string>;
};

function getInitialState() {
  return {
    otherValue: 'initial',
    value: 'initial',
  };
}

const optimisticActions: StateDecoratorActions<State, Actions> = {
  setValueSuccess: {
    promise: ([value]) => new Promise((res) => setTimeout(res, 1000, value)),
    optimisticReducer: (s, [value]) => ({ ...s, value }),
    reducer: (s, value) => ({ ...s, value }),
  },
  setValueError: {
    promise: ([value]) => new Promise((_, rej) => setTimeout(rej, 1000, value)),
    optimisticReducer: (s, [value]) => ({ ...s, value }),
  },
  setOtherValue: (s, [otherValue]) => ({ ...s, otherValue }),
};

function OptimisticView(props: State & Actions) {
  const { value, otherValue, setOtherValue, setValueError, setValueSuccess } = props;
  return (
    <div>
      <div />
      <div>value: {value}</div>
      <div>other value: {otherValue}</div>
      <div>
        <button onClick={() => setValueSuccess('new value')}>Set value (optimistic, will succeed)</button>
        <button onClick={() => setValueError('new temporary value')}>Set value (optimistic, will fail)</button>
        <button onClick={() => setOtherValue('value set')}>Set other value (synchronous)</button>
      </div>
    </div>
  );
}

export default function Optimistic() {
  const { state, actions } = useStateDecorator(getInitialState, optimisticActions, {}, { logEnabled: true });

  return <OptimisticView {...state} {...actions} />;
}
