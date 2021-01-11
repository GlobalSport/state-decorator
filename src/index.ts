import useStateDecorator, {
  setCloneFunction,
  setOnAsyncError,
  setIsTriggerRetryError,
  setNotifyErrorFunction,
  setNotifySuccessFunction,
  setNotifyWarningFunction,
  setDefaultGetErrorMessage,
} from './useStateDecorator';
import {
  StateDecoratorActions,
  ConflictPolicy,
  LoadingProps,
  LoadingMap,
  StateDecoratorOptions,
  AbortActionCallback,
} from './types';
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
  AbortActionCallback,
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
  setDefaultGetErrorMessage,
  StateDecoratorOptions,
};

export default useStateDecorator;
