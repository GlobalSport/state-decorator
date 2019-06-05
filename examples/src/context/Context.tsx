import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import Button from '@material-ui/core/Button';
import useCommonStyles from '../style.js';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const initialState = { color: 'blue' };

export const Context = React.createContext<State & Actions>(null);

const SubComponent = () => {
  const commonClasses = useCommonStyles();

  return (
    <Context.Consumer>
      {(context) => (
        <div className={commonClasses.smallCardContainer}>
          <Button className={commonClasses.button} onClick={() => context.setColor('red')}>
            Click
          </Button>
          <div className={commonClasses.smallCardValue}>{context.color}</div>
        </div>
      )}
    </Context.Consumer>
  );
};

const MainComponent = () => <SubComponent />;

export default class ContextContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    setColor: (s, [color]) => ({ ...s, color }),
  };
  render() {
    return (
      <StateDecorator<State, Actions> actions={ContextContainer.actions} initialState={initialState}>
        {(state, actions) => (
          <Context.Provider
            value={{
              ...state,
              ...actions,
            }}
          >
            <MainComponent />
          </Context.Provider>
        )}
      </StateDecorator>
    );
  }
}
