import useStateDecorator from './useStateDecorator';
import { StateDecoratorActions, ConflictPolicy, LoadingProps, LoadingMap } from './types';
import { useOnMount, useOnUnmount, useOnUnload } from './hooks';
import {
  testSyncAction,
  testAsyncAction,
  testAdvancedSyncAction,
  isSyncAction,
  isAdvancedSyncAction,
  isAsyncAction,
} from './base';

export {
  StateDecoratorActions,
  ConflictPolicy,
  LoadingProps,
  LoadingMap,
  useOnMount,
  useOnUnmount,
  useOnUnload,
  testSyncAction,
  testAsyncAction,
  testAdvancedSyncAction,
  isSyncAction,
  isAdvancedSyncAction,
  isAsyncAction,
};

export default useStateDecorator;
