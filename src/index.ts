import useStateDecorator from './useStateDecorator';
import { StateDecoratorActions, ConflictPolicy, LoadingProps } from './types';
import { useOnMount, useOnUnmount, useOnUnload } from './hooks';
import { testSyncAction, testAsyncAction, testAdvancedSyncAction } from './base';

export {
  StateDecoratorActions,
  ConflictPolicy,
  LoadingProps,
  useOnMount,
  useOnUnmount,
  useOnUnload,
  testSyncAction,
  testAsyncAction,
  testAdvancedSyncAction,
};

export default useStateDecorator;
