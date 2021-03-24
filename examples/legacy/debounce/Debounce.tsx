import React, { useCallback } from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

type State = {
  validationMessage: string;
  value: string;
};
type Actions = {
  onChange: (value: string) => void;
  validate: () => void;
};

function getInitialState() {
  return {
    validationMessage: '',
    value: '',
  };
}

const actions: StateDecoratorActions<State, Actions> = {
  onChange: {
    action: (s, [value]) => ({ ...s, value }),
    onActionDone: (s, args, props, actions) => {
      actions.validate();
    },
  },
  validate: {
    action: (s) => ({
      ...s,
      validationMessage: s.value.length > 10 ? 'Greater than 10 characters' : 'Lower  than 10 characters',
    }),
    debounceTimeout: 250,
  },
};

const DebounceView = React.memo(function DebounceView(p: State & Actions) {
  const onChange = useCallback((e: any) => p.onChange(e.target.value), [p.onChange]);

  return (
    <div>
      <div>
        <input value={p.value} onChange={onChange} />{' '}
      </div>
      <div>Validation (debounced): {p.validationMessage}</div>
    </div>
  );
});

export default React.memo(function Debounce() {
  return (
    <StateDecorator actions={actions} initialState={getInitialState()}>
      {(state, actions) => <DebounceView {...state} {...actions} />}
    </StateDecorator>
  );
});
