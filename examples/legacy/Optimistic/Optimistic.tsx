import React from 'react';
import { StateDecoratorActions } from '../../../src/types';
import useStateDecorator from '../../../src/useStateDecorator';

// Types

type State = {
  value: string;
  otherValue: string;
  // during optimistic requests the loading flag for action is set to false
  // so we must track loading using this flag
  loading: boolean;
};

type Actions = {
  setOtherValue: (value: string) => Promise<string>;
  setValueSuccess: (value: string) => Promise<string>;
  setValueError: (value: string) => Promise<string>;
};

export type OptimisticViewProps = State & Actions;

// Initial state

export const getInitialState = (): State => ({
  otherValue: 'initial',
  value: 'initial',
  loading: false,
});

// Actions implementation

export const optimisticActions: StateDecoratorActions<State, Actions> = {
  setValueSuccess: {
    preReducer: (s) => ({ ...s, loading: true }),
    promise: ([value]) => new Promise((res) => setTimeout(res, 5000, value)),
    optimisticReducer: (s, [value]) => ({ ...s, value }),
    reducer: (s, value) => ({ ...s, value, loading: false }),
  },
  setValueError: {
    preReducer: (s) => ({ ...s, loading: true }),
    promise: ([value]) => new Promise((_, rej) => setTimeout(rej, 5000, value)),
    optimisticReducer: (s, [value]) => ({ ...s, value }),
    errorReducer: (s) => ({ ...s, loading: false }),
    onFail: () => console.log('failed'),
    errorMessage: 'failed',
  },
  setOtherValue: (s, [otherValue]) => ({ ...s, otherValue }),
};

function OptimisticView(props: OptimisticViewProps) {
  const { value, otherValue, setOtherValue, setValueError, setValueSuccess } = props;
  return (
    <div>
      {props.loading && <div>LOADING...</div>}
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
