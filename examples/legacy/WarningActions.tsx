import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps } from '../../src';

export type WarningActionsProps = {};

export type WarningActionsState = {
  value: string;
};

export type WarningActionsActions = {
  setValue: (s: string) => void;
};

type Props = WarningActionsProps;
type State = WarningActionsState;
type Actions = WarningActionsActions;

type ViewProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

export function getInitialState(p: WarningActionsProps): State {
  return {
    value: 'initial value',
  };
}

export const WarningActionsView = React.memo(function WarningActionsView(p: ViewProps) {
  return (
    <div>
      <input value={p.value} onChange={(e) => p.setValue(e.target.value)} />
    </div>
  );
});

export default React.memo(function WarningActions(p: WarningActionsProps) {
  const { state: s, actions: a, loadingMap } = useStateDecorator(
    getInitialState,
    {
      setValue: (s, [value]) => ({ ...s, value }),
    } as StateDecoratorActions<State, Actions, Props>,
    p,
    {}
  );
  return <WarningActionsView {...p} {...s} {...a} loadingMap={loadingMap} />;
});
