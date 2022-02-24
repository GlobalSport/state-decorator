import React from 'react';
import useLocalStore, { StoreActions } from '../../lib/es';
import DebounceView from './DebounceView';

// Types

type State = {
  value: string;
  validationMessage: string;
  validationMessageDebounced: string;
  calls: number;
  callsDebounced: number;
};

type Actions = {
  onChange: (value: string) => void;
  validate: () => void;
};

export type DebounceViewProps = State & Actions;

// Initial state

const getInitialState = (): State => ({
  validationMessage: '',
  validationMessageDebounced: '',
  value: '',
  calls: 0,
  callsDebounced: 0,
});

// Actions implementation

const validate = (v: string) => (v.length > 10 ? 'Greater than 10 characters' : 'Lower  than 10 characters');

const debounceActions: StoreActions<State, Actions> = {
  // Advanced action with state change and side effects
  onChange: {
    effects: ({ s, args: [value] }) => ({ value, calls: s.calls + 1 }),
    debounceSideEffectsTimeout: 500,
    sideEffects: ({ actions }) => {
      // action side effects
      actions.validate();
    },
  },

  // Simple action with only state change
  validate: ({ s }) => ({
    validationMessage: validate(s.value),
    callsDebounced: s.callsDebounced + 1,
  }),
};

// Container component
export default function Debounce() {
  const { state, actions } = useLocalStore(getInitialState, debounceActions, {});

  return <DebounceView {...state} {...actions} />;
}
