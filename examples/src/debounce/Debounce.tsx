import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

type State = {
  validationMessage: string;
  value: string;
};
type Actions = {
  update: (value: string) => void;
  validate: () => void;
};

function getInitialState() {
  return {
    validationMessage: '',
    value: '',
  };
}

const actions: StateDecoratorActions<State, Actions> = {
  update: {
    action: (s, [value]) => ({ ...s, value }),
    debounceTimeout: 500,
    onActionDone: (s, args, props, actions) => {
      actions.validate();
    },
  },
  validate: (s) => ({
    ...s,
    validationMessage: s.value.length > 10 ? 'Greater than 10 characters' : 'Lower  than 10 characters',
  }),
};

const DebounceView = React.memo(function DebounceView(p: State & Actions) {
  const onChange = (e: any) => p.update(e.target.value);

  return (
    <div>
      <div>State value: {p.value}</div>
      <div>
        Uncontrolled input: <input onChange={onChange} />{' '}
      </div>
      <div>Validation: {p.validationMessage}</div>
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
