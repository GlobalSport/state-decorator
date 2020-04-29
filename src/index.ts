import useStateDecorator, {
  setCloneFunction,
  setOnAsyncError,
  setIsTriggerRetryError,
  setNotifyErrorFunction,
  setNotifySuccessFunction,
  setNotifyWarningFunction,
} from './useStateDecorator';
import { StateDecoratorActions, ConflictPolicy, LoadingProps, LoadingMap, StateDecoratorOptions } from './types';
import { useOnMount, useOnUnmount, useOnUnload } from './hooks';
import {
  testSyncAction,
  testAsyncAction,
  testAdvancedSyncAction,
  isSyncAction,
  isAdvancedSyncAction,
  isAsyncAction,
  hasPropsChanged,
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
  hasPropsChanged,
  isSyncAction,
  isAdvancedSyncAction,
  isAsyncAction,
  setCloneFunction,
  setOnAsyncError,
  setIsTriggerRetryError,
  setNotifyErrorFunction,
  setNotifySuccessFunction,
  setNotifyWarningFunction,
  StateDecoratorOptions,
};

export default useStateDecorator;
