import React, { useContext } from 'react';
import useStateDecorator, { StateDecoratorActions } from '../../../src/';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const getInitialState = () => ({
  color: 'blue',
});

export const Context = React.createContext<State & Actions>(null);

const SubComponent = () => {
  const { color, setColor } = useContext(Context);

  return (
    <div>
      <div className="sub-component">{color}</div>
      <button onClick={() => setColor('red')}>Click</button>
    </div>
  );
};

const MainComponent = () => <SubComponent />;

const actionsImpl: StateDecoratorActions<State, Actions> = {
  setColor: (s, [color]) => ({ ...s, color }),
};

export default function ContextContainer() {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  return (
    <Context.Provider
      value={{
        ...state,
        ...actions,
      }}
    >
      <MainComponent />
    </Context.Provider>
  );
}
