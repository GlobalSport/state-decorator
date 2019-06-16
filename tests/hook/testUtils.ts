export function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

export function getFailedTimeoutPromise<C>(timeout: number, err: C = null): Promise<C> {
  return new Promise((_, rej) => {
    setTimeout(rej, timeout, err);
  });
}

export function getAsyncContext() {
  const dispatch = jest.fn();
  type P = {
    prop: string;
    notifySuccess?: (s: string) => void;
    notifyError?: (s: string) => void;
  };
  const propsRef: { current: P } = {
    current: {
      prop: 'prop',
    },
  };
  const actionsRef = {
    current: { setValue: jest.fn() as (...args: any[]) => Promise<any> },
  };
  const sideEffectRef = {
    current: [],
  };
  const promisesRef = { current: {} };
  const conflicActionsRef = { current: {} };
  const stateRef = {
    current: { value: 'initial' },
  };

  const optimisticData = {
    history: [],
    optimisticActions: {},
    shouldRecordHistory: false,
  };

  return {
    dispatch,
    propsRef,
    actionsRef,
    sideEffectRef,
    promisesRef,
    conflicActionsRef,
    stateRef,
    optimisticData,
  };
}
