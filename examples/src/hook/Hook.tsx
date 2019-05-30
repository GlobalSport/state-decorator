import React, { useState } from 'react';
import { StateDecoratorActions } from '../../../src/StateDecorator';
import useStateDecorator, { StateDecoratorOptions } from '../../../src/useStateDecorator';
import { LoadingProps } from '../../../src/types';

type State = {
  value: string;
  value2: string;
};

type Props = {
  v: string;
};

type Actions = {
  setValue: (value: string) => void;
  setValue2: (value: string) => Promise<string>;
  setValue3: (value: string) => Promise<string>;
};

type ViewProps = State & Actions & Pick<LoadingProps<Actions>, 'loadingMap'>;

function getTimeoutPromise<A>(timeout: number, result: A): Promise<A> {
  return new Promise((res) => {
    setTimeout(() => res(result), timeout);
  });
}

const actionsDef: StateDecoratorActions<State, Actions, Props> = {
  setValue: {
    action: (s, [value]) => {
      return { ...s, value };
    },
    onActionDone: (s) => {
      console.log('value set to', s.value);
    },
  },
  setValue3: {
    promise: () => getTimeoutPromise(3000, 'no reducer result'),
    reducer: () => null, // test refresh of onDone side effet
    onDone: (s, res, args, p, actions) => actions.setValue('onDone sideEffet'),
  },
  setValue2: {
    preReducer: (s, [value2]) => {
      return { ...s, value2: 'preReducer' };
    },
    promise: () =>
      new Promise((res) =>
        setTimeout(() => {
          res('result');
        }, 1000)
      ),
    reducer: (s, result) => ({ ...s, value2: result }),
    onDone: (s, result, args, props, actions) => {
      actions.setValue(`side effect ${result}`);
    },
  },
};

function View({ value, setValue, value2, setValue2, setValue3, loadingMap }: ViewProps) {
  return (
    <React.Fragment>
      <div>
        <div>current value = {value}</div>
        <div>
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <button onClick={() => setValue('new value')}>Set new value</button>
        </div>
      </div>
      <div style={{ opacity: loadingMap.setValue2 || loadingMap.setValue3 ? 0.5 : 1 }}>
        <div>current value2 = {value2}</div>
        <div>
          <button onClick={() => setValue2('new value')}>Set new value</button>
          <button onClick={() => setValue3('new value')}>Set new value (no reducer)</button>
        </div>
      </div>
    </React.Fragment>
  );
}

const getInitialState = () => ({ value: 'initial', value2: 'initial Value 2' });

const getPropsRefValues = (p: Props) => [p.v];
const onPropsChangeReducer = (s: State, p: Props) => ({ ...s, value: p.v });
const onPropsChange = (s: State, p: Props) => {
  alert('onPropsChange' + s.value);
};

const options: StateDecoratorOptions<State, Actions> = {
  getPropsRefValues,
  onPropsChangeReducer,
  onPropsChange,
  logEnabled: true,
};

export default function Hook(p?: {}) {
  const [v, setV] = useState('inboundProp');
  const { state, actions, loadingMap } = useStateDecorator(getInitialState, actionsDef, { v }, options);
  return (
    <div>
      <View {...state} {...actions} loadingMap={loadingMap} />
      <button onClick={() => setV(`inboundPropUpdated ${Math.random()}`)}>Update inbound prop</button>
    </div>
  );
}
