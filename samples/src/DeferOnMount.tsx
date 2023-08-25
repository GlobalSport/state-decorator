import { useContext } from 'react';
import useLocalStore, { LoadingProps, StoreConfig } from './sd_src';
import { setResIn } from './sd/helpers';
import { Context, ContextProps, Provider } from './DeferOnMountContext';
import { Typography } from '@mui/material';

// TYPES ===============================

type Props = ContextProps;
type State = {
  childProp: string;
};
type Actions = {
  onLoadChild: () => Promise<string>;
};

// INITIAL STATE =======================

const storeConfig: StoreConfig<State, Actions, Props> = {
  getInitialState: () => ({
    childProp: 'initial',
  }),
  actions: {
    onLoadChild: {
      getPromise: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('valueChild'), 2000);
        }),
      effects: setResIn('childProp'),
    },
  },
  onMount: ({ a }) => {
    a.onLoadChild();
  },
  onMountDeferred: ({ p }) => {
    // call parent code that will trigger a state change (loadingMap is updated)
    p?.onLoad?.();
  },
};

// VIEW ================================

export type ViewProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

// CONTAINER ===========================

export default function () {
  return (
    <Provider>
      <DeferOnMount />
    </Provider>
  );
}

function DeferOnMount() {
  const ctx = useContext(Context);
  const props: Props = ctx;

  const { state, loadingMap } = useLocalStore(storeConfig, props);

  return (
    <div>
      <Typography variant="h4">Defer onMount code after render</Typography>
      <Typography variant="caption">
        By default the onMount code is executed during the component rendering phase. But React trigger an error if a
        component code is triggering a parent component re-render during the its own rendering phase. The solution is to
        defer this code.
      </Typography>
      <div>
        Context: {props.myProp} {props.loadingMap.onLoad?.toString()}
      </div>
      <div>
        Child: {state.childProp} {loadingMap.onLoadChild?.toString()}
      </div>
    </div>
  );
}
