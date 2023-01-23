/*! *****************************************************************************
Copyright (c) GlobalSport SAS.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

import type { DecoratedActions, Middleware, MiddlewareFactory } from './types';
import isEqual from 'fast-deep-equal';

export type Logger = {
  log: (...args: any[]) => void;
  group: (...args: any[]) => void;
  groupCollapsed: (...args: any[]) => void;
  groupEnd: (...args: any[]) => void;
};

export let logEffects: <S, A extends DecoratedActions, P>(
  log?: (...msg: any[]) => void
) => MiddlewareFactory<S, A, P> = null;

export let logDetailedEffects: <S, A extends DecoratedActions, P>(logger?: Logger) => MiddlewareFactory<S, A, P> = null;

export let devtools: <S, A extends DecoratedActions, P>() => MiddlewareFactory<S, A, P> = null;

// @ts-ignore
if (process.env.NODE_ENV === 'development') {
  const getNoopMiddleware = <S, A extends DecoratedActions, P>(): Middleware<S, A, P> => {
    const middleware: Middleware<S, A, P> = {
      init: () => {},
      destroy: null,
      effects: () => null,
    };

    return middleware;
  };

  logEffects = <S, A extends DecoratedActions, P>(
    log: (...msg: any[]) => void = console.log
  ): MiddlewareFactory<S, A, P> => {
    const f = () => {
      const logger = log;
      let storeName = '';

      const middleware: Middleware<S, A, P> = {
        init: (storeContext) => {
          storeName = storeContext.options?.name ? `[${storeContext.options?.name}]` : '';
          const newState = storeContext.state;
          logger(storeName, 'initialState', newState);
        },
        destroy: null,
        effects: (action, _oldState, newState, loading: boolean) => {
          logger(
            storeName,
            action.name,
            action.type,
            newState === null ? 'no effect' : newState,
            action.isAsync
              ? action.type === 'preEffects' && !loading
                ? 'Promise cancelled'
                : `loading: ${loading}`
              : ''
          );
          return null;
        },
      };
      return middleware;
    };

    return f;
  };

  logDetailedEffects = <S, A extends DecoratedActions, P>(logger: Logger = console): MiddlewareFactory<S, A, P> => {
    return () => {
      let storeName = '';

      const console = logger;

      const computeDiffPropValue = (oldValue: any, newValue: any) => {
        let res: any;
        if (newValue !== oldValue) {
          const type = oldValue != null ? typeof oldValue : typeof newValue;
          if (type === 'number' || type === 'string' || type === 'boolean') {
            res = `${oldValue} => ${newValue === '' ? '""' : newValue}`;
          } else if ((oldValue && oldValue.length) || (newValue && newValue.length)) {
            if (oldValue == null) {
              res = `was ${oldValue}, now contains ${newValue.length} element(s)`;
            } else if (newValue == null) {
              res = `contained ${oldValue.length} element(s), now is ${newValue}`;
            } else if (oldValue.length === 0) {
              res = `was empty, now contains ${newValue.length} elements`;
            } else if (newValue.length === 0) {
              res = `contained ${oldValue.length} elements, now is empty`;
            } else {
              let addedValues = newValue.filter((a: any) => !oldValue.find((b: any) => isEqual(a, b)));
              let removedValues = oldValue.filter((a: any) => !newValue.find((b: any) => isEqual(a, b)));

              if (addedValues.length > 10) {
                addedValues = `${addedValues.length} element(s) added`;
              }
              if (removedValues.length > 10) {
                removedValues = `${removedValues.length} element(s) removed`;
              }
              res = {
                added: addedValues,
                removed: removedValues,
              };
            }
          } else {
            res = newValue;
          }
        }
        return res;
      };

      const buildDiff = <S>(oldState: S, newState: S) => {
        const res: Record<string, any> = {};

        if (oldState) {
          const keys = Object.keys(oldState) as (keyof S)[];
          keys.forEach((k) => {
            if (newState.hasOwnProperty(k)) {
              const oldValue = oldState[k];
              const newValue = newState[k];
              const diff = computeDiffPropValue(oldValue, newValue);
              if (diff) {
                res[k as any] = diff;
              }
            } else {
              res[k as any] = 'was deleted';
            }
          });
        }

        const keys = Object.keys(newState) as (keyof S)[];
        keys.forEach((k) => {
          if (oldState == null || !oldState.hasOwnProperty(k)) {
            const newValue = newState[k];

            res[k as any] = computeDiffPropValue(undefined, newValue);
          }
        });

        return res;
      };

      const getStr = (v: any) => {
        if (typeof v === 'string') {
          return `"${v}"`;
        }
        return v;
      };

      const middleware: Middleware<S, A, P> = {
        init: (storeContext) => {
          storeName = storeContext.options?.name ? `[${storeContext.options?.name}]` : '';
          const newState = storeContext.state;
          logger.group(storeName, 'initialState');
          const keys = Object.keys(newState) as (keyof S)[];
          keys.forEach((prop) => void console.log(prop, ':', getStr(newState[prop])));
          logger.groupEnd();
        },
        destroy: null,
        effects: (action, oldState, newState, loading) => {
          const args: any[] = action.context?.args;

          const params: string[] = [storeName, action.name.toString()];

          if (action.isAsync) {
            if (action.type === 'preEffects') {
              params.push(loading ? 'START' : 'CANCELLED');
            } else if (action.type === 'effects') {
              params.push('DONE');
            } else {
              params.push('FAILED');
            }
          }

          if (newState == null && (!args || Object.keys(args).length === 0)) {
            console.log(...params);
          } else {
            console.group(...params);
          }

          if (args && Object.keys(args).length > 0) {
            console.group('Arguments');
            args.forEach((arg) => void console.log(arg, ':', getStr(arg)));
            console.groupEnd();
          }

          if (newState != null) {
            console.groupCollapsed('Before');
            if (oldState == null) {
              console.log('was null');
            } else {
              const keys = Object.keys(oldState) as (keyof S)[];
              keys.forEach((prop) => void console.log(prop, ':', getStr(oldState[prop])));
            }
            console.groupEnd();

            console.groupCollapsed('After');
            if (newState == null) {
              console.log('was null');
            } else {
              const keys = Object.keys(newState) as (keyof S)[];
              keys.forEach((prop) => void console.log(prop, ':', getStr(newState[prop])));
            }
            console.groupEnd();

            if (newState != null) {
              console.group('Diff');
              const diff = buildDiff(oldState, newState);
              Object.keys(diff).forEach((prop) => console.log(prop, ':', diff[prop]));
              console.groupEnd();
            }
          }
          //
          console.groupEnd();

          return null;
        },
      };
      return middleware;
    };
  };

  devtools = <S, A extends DecoratedActions, P>(): MiddlewareFactory<S, A, P> => {
    const getMiddleware = () => {
      let extension: any;
      try {
        extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ || (window as any).top.__REDUX_DEVTOOLS_EXTENSION__;
      } catch {}

      if (!extension) {
        return getNoopMiddleware<S, A, P>();
      }

      let devtools: any;
      let unsubscribe: () => void;

      const middleware: Middleware<S, A, P> = {
        init(storeContext) {
          devtools = extension.connect({ name: storeContext.options?.name ?? 'StateDecorator' });
          devtools.init(storeContext.state);
          let savedState: S = null;
          const initialState: S = storeContext.state;

          unsubscribe = devtools.subscribe((message: any) => {
            if (message.type === 'DISPATCH' && message.state && message.payload?.type !== 'ROLLBACK') {
              const newState = JSON.parse(message.state);
              storeContext.setState(newState);
            } else if (message.payload?.type === 'COMMIT') {
              savedState = storeContext.state;
            } else if (message.payload?.type === 'ROLLBACK') {
              if (savedState != null) {
                storeContext.setState(savedState);
              }
            } else if (message.payload?.type === 'RESET') {
              storeContext.setState(initialState);
            }
          });
        },

        effects(ctx, _oldState, newState) {
          if (newState != null) {
            const cleanCtx: any = {
              ...ctx.context,
            };

            delete cleanCtx.a;
            delete cleanCtx.s;
            delete cleanCtx.p;
            delete cleanCtx.res;
            delete cleanCtx.err;
            delete cleanCtx.ds;

            devtools.send(
              {
                type: `${ctx.name.toString()} ${ctx.type}`,
                args: cleanCtx.args,
                context: cleanCtx,
              },
              newState
            );
          }

          return null; // no op on state
        },

        destroy() {
          unsubscribe();
          devtools = null;
        },
      };

      return middleware;
    };

    return getMiddleware;
  };
}
