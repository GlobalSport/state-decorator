import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/styles';
import useCommonStyles from '../style.js';

const useLocalStyle = makeStyles({
  container: {
    width: '50%',
    margin: '0 auto',
  },
  textField: {
    margin: '5px 0 10px',
  },
  overflow: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
});

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
  const localClasses = useLocalStyle();
  const commonClasses = useCommonStyles();
  return (
    <div className={localClasses.container}>
      <div>
        <TextField className={localClasses.textField} label="uncontrolled input" onChange={onChange} value={p.value} />{' '}
      </div>
      <div className={[commonClasses.smallCardValue, localClasses.overflow].join(' ')}>Value: {p.value}</div>
      <div className={commonClasses.smallCardValue}>Validation: {p.validationMessage}</div>
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
