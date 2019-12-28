import useStateDecorator, {
  setCloneFunction,
  setOnAsyncError,
  setIsTriggerRetryError,
  setNotifyErrorFunction,
  setNotifySuccessFunction,
} from './useStateDecorator';

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

import StateDecorator, { injectState } from './StateDecorator';

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
  setCloneFunction,
  setOnAsyncError,
  setIsTriggerRetryError,
  setNotifyErrorFunction,
  setNotifySuccessFunction,
  injectState,
  useStateDecorator,
};

export default StateDecorator;
