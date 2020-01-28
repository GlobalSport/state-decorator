import { processSideEffects } from '../../src/useStateDecorator';

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
  const sideEffectRef = getSideEffectRef();
  const promisesRef = { current: {} };
  const unmountedRef = { current: false };
  const conflicActionsRef = { current: {} };
  const stateRef = {
    current: { value: 'initial' },
  };

  const optimisticData = {
    history: [],
    optimisticActions: {},
    shouldRecordHistory: false,
  };

  let timer = null;
  const addSideEffect = (ref, sideEffect, delayed) => {
    if (delayed) {
      ref.current.delayed.push(sideEffect);
    } else {
      ref.current.list.push(sideEffect);
    }

    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        processSideEffects(stateRef.current, dispatch, sideEffectRef);
      }, 0);
    }
  };

  return {
    dispatch,
    propsRef,
    unmountedRef,
    actionsRef,
    sideEffectRef,
    promisesRef,
    conflicActionsRef,
    stateRef,
    optimisticData,
    addSideEffect,
  };
}

export function getSideEffectRef() {
  return {
    current: { list: [], delayed: [] },
  };
}
