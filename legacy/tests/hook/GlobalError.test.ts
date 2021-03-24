import {
  addNewSideEffect,
  decorateAsyncAction,
  processSideEffects,
  setDefaultGetErrorMessage,
} from '../../src/useStateDecorator';
import { getAsyncContext, getFailedTimeoutPromise } from './testUtils';

const mockAddNewSideEffect = (sideEffectsRef, newSideEffect, delayed) => {
  addNewSideEffect(sideEffectsRef, newSideEffect, delayed, false);
};

describe('GlobalGetErrorMessage', () => {
  it('dispatches an async action correctly (default error handler)', (done) => {
    const ctx = getAsyncContext();

    const addSideEffect = jest.fn(mockAddNewSideEffect);

    const actions = {
      setValue: {
        promise: () => getFailedTimeoutPromise(100, 'error'),
        onDone: jest.fn(),
      },
    };

    const options = {
      notifyError: (e) => {},
    };

    const defaultErrorHandler = jest.fn((e) => 'Error');
    setDefaultGetErrorMessage(defaultErrorHandler);

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      options,
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    const p = action('value').then(() => {
      expect(defaultErrorHandler).toHaveBeenCalled();
      setDefaultGetErrorMessage(null);
      done();
    });

    processSideEffects(ctx.stateRef.current, ctx.dispatch, ctx.sideEffectRef);

    return p;
  });
});
