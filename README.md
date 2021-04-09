![travis static](https://travis-ci.com/GlobalSport/state-decorator.svg?branch=master)

<p align="center">
  <img src="https://github.com/GlobalSport/state-decorator/blob/develop/doc/state-decorator-logo-small.png?raw=true" alt="useLocalStore logo"/>
</p>

The StateDecorator is a set of Reacts hook that manages a complex component state in an easy, testable and deterministic way.

# Features

- Deterministic state changes (clear separation of effects and side effects)
- Ease asynchronous actions state changes (loading states, success & error handlers, parallel actions management, optimistic updates...)
- Easily and efficiently share slices of state.
- Easily testable (uses pure functions, utility functions provided)
- Easily update state from or react to props changes
- Ease debugging (trace state changes)
- Improve code conciseness (no boiler plate code)
- Enforce separation of container components and presentation components.
- Strongly typed

# 🏎️ V6: The Store

- The v6 is the merge of all the state decorator features and an architecture freely inspired from [zustand](https://github.com/pmndrs/zustand) (kudos to them).
- New internal architecture, far simpler and more efficient
- New state sharing feature
- New derived state support
- Updated terminology (less redux, more consistent)
- Action context: no more arguments order issue
- See migration details in [migration section](#migration).

# Getting started

## Installation

```
npm install state-decorator
```

or

```
yarn add state-decorator
```

## Getting started

### Example

```typescript
import React from 'react';
import { useLocalStore, StoreActions } from 'state-decorator';

// Typings

type User = {
  firstName: string;
  lastName: string;
};

type State = {
  selectedUserId: string;
  user: User;
};

type Actions = {
  selectUser: (id: string) => void;
  selectAndLoadUser: (id: string) => void;
  loadUser: () => Promise<User>;
};

type Props = {
  userIds: string[];
};

// Initial state & actions

export const getInitialState = (): State => ({
  selectedUser: null,
  user: null,
});

export const userAppActions: StoreActions<State, Actions, Props> = {
  // synchronous action (simple form)
  selectUser: ({ state, args: [id] }) => ({ ...state, selectedUser: id }),

  // a synchronous action with side effects
  selectAndLoadUser: {
    // same as simple form, using aliases (use short context alias 's' instead of 'state')
    // effects contain only immutable state changes
    effects: ({ s, args: [id] }) => ({ ...s, selectedUser: id }),
    // side effects (ie. other effects than state changes), using "actions" alias
    sideEffects: ({ a }) => {
      a.loadUser();
    },
  },

  // asynchronous action
  loadUser: {
    // promise provider, can use action context (ctx) to get current state, args, props etc.
    getPromise: (ctx) => Promise.resolve({ firstName: 'John', lastName: 'Doe' }),
    // state changes
    effects: ({ s, res }) => ({ ...s, user: res }),
    // state changes if error
    errorEffects: ({ s, error }) => ({ ...s, user: null }),
    // side effects here
    sideEffects: ({ res, actions }) => {},
    // side effects if error
    errorSideEffects: ({ err, actions }) => {},
    // many more options available here, read the doc!
  },
};

// Bind to react component and use state/actions
export function App(props: Props) => {
  const { state, actions } = useLocalStore(getInitialState, userAppActions, props);
  return (
    <div>
      {state.user && (
        <div>
          {state.user.firstName} {state.user.lastName}
        </div>
      )}
      <div>
        {props.userIds.map((userId) => (
          <button
            onClick={() => {
              actions.selectAndLoadUser(userId);
            }}
          >
            {userId}
          </button>
        ))}
      </div>
    </div>
  );
};
```

## State sharing

```typescript
import React from 'react';
import { useStore, useStoreSlice, StoreActions } from 'state-decorator';

// Declare typings & actions as above

// Create a store

export const store = createStore(getInitialState, userAppActions);

// Bind to react component

export function Container(prop: Props) {
  const { state, actions } = useStore(store, props);

  // or
  // useBindStore(store, props);
  // if you are not interested in getting the state here

  return <div />;
}

// Another component deeper in the component tree
export function SubComponet() {
  // Component will be refreshed if, and only if, 'text' is changed (actions are stable)
  const { text, loadList } = useStoreSlice(store, ({ s, a }) => ({ text: s.text, loadList: a.loadList }));
  return <div>{text}</div>;
}
```

[![Edit Slice](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/slices-v6-eg471?file=/src/SliceView.tsx)

# React hooks

| Hook          | Purpose                                                | Component refreshed on store change | Store is destroyed on unmount |
| ------------- | ------------------------------------------------------ | ----------------------------------- | ----------------------------- |
| useLocalStore | Create a store and binds it to the react component     | Y                                   | Y                             |
| useStore      | Binds an existing store to a react component (sharing) | Y                                   | Y                             |
| useStoreSlice | Binds a store slice to a react component (sharing)     | If slice has changed only           | N                             |
| useBindStore  | Bind an existing store to a react component (sharing)  | N                                   | Y                             |

# Global configuration

Overrides configuration to set properties that will be used by all stores.

```typescript
// all parameters are optional
setGlobalConfig({
  // Used to clone state and props when managing optimistic conflicting actions.
  clone: defaultCloneFunc,
  // Compare to objets and returns if they are equal (slices).
  comparator: shallow,
  // Callback function to handle asychronous actions rejected promise (error reporting).
  asyncErrorHandler: () => {},
  // Tests if the error will trigger a retry of the action or will fail directly (retry promises)
  retryOnErrorFunction: (error: Error) => error instanceof TypeError,
  // Notification function on successful asynchronous action (if success message is set on action)
  notifySuccess: undefined,
  // Notification function on failed asynchronous action (if error message is set on action)
  notifyError: undefined,
  // Notification function injected in side effects action context (success and error) to notify warning
  notifyWarning: undefined,
  // Function called to return common error message if error message is not provided or error not managed in action
  getErrorMessage: undefined,
});
```

# Initial state

The initial state is build using a function provided to the store.

```typescript
export const getInitialState = (p: Props): State => ({
  counter: 0,
});

export const CounterContainer = () => {
  const { state, actions } = useLocalStore(getInitialState, actionsImpl);
  return <CounterView {...state} {...actions} />;
};
```

# Action context

The action context contain all the data needed to implement the actions. It contains the action arguments and the injected data.

| Property      | Alias | Availability                   | Description                                       |
| ------------- | ----- | ------------------------------ | ------------------------------------------------- |
| state         | s     | everywhere                     | Current state                                     |
| args          |       | action related                 | Action arguments                                  |
| props         | p     | everywhere                     | Current bound component props                     |
| actions       | a     | side effects / onMount         | Store actions (decorated)                         |
| result        | res   | promise effects / side effects | The promise result                                |
| error         | err   | error effects / side effects   | The promise error                                 |
| promiseId     |       | asynchronous actions callbacks | Parallel asynchronous actions promise identifier  |
| notifyWarning |       | side effects                   | Injected function if set at store or global level |

# React on props changes

## Getting started

```typescript
import { createStore } from 'state-decorator';

const store = createStore(getInitialState, actionsImpl, {
  onPropsChange: {
    // list of depedencies that should trigger effects & side effects if changed
    getDeps: (p) => [p.id],
    // state changes, indices contains the indices of dependencies that have changed
    effects: ({ state, props, indices }) => ({ ...state, selectedId: props.id }),
    // other changes (use short aliases)
    sideEffects: ({ p, a }) => {
      a.loadItem(p.id);
    },
  },
});
```

## Multiple props change configuration

The store can manage several props change configurations to have a better granularity.

- Effects are triggered in order and reuse previously computed state

- Side effects are invoked after all effects using computed state

```typescript
import { createStore } from 'state-decorator';

const store = createStore(getInitialState, actionsImpl, {
  onPropsChange: [
    {
      getDeps: (p) => [p.id],
      effects: ({ state, props, indices }) => ({ ...state, selectedId: props.id }),
    },
    {
      getDeps: (p) => [p.otherId],
      sideEffects: ({ p, a }) => {
        a.loadOtherItem(p.id);
      },
    },
    {
      getDeps: (p) => [p.otherProp],
      effects: ({ state, props, indices }) => ({ ...state, otherProp: props.otherProp }),
      sideEffects: ({ p, a }) => {
        a.otherSideEffect(p.otherProp);
      },
    },
  ],
});
```

# Derived state

A derived state is a state that can be deduced from state and props.

```typescript
import { createStore } from 'state-decorator';

type State = {
  value: number;
};

type Actions = {
  add1: () => void;
};

type Props = {
  propIn: number;
};

type DerivedState = {
  derivedProp: number;
};

const store = createStore<State, Actions, Props, DerivedState>(
  () => ({ value: 0 }),
  {
    add1: ({ s }) => ({ ...s, value: s.value + 1 }),
  },
  {
    derivedState: {
      derivedProp: {
        // get the list of dependencies to be checked to trigger the computation of the derived state
        // if state.value AND/OR props.prop1 changes, derivedProp is recomputed
        getDeps: ({ state, props }) => [state.value, props.propIn],
        // compute derived state from state & props (use short aliases)
        get: ({ s, p }) => s.value * p.propIn,
      },
    },
  }
);

export function App(props: Props) {
  const { state } = useStore(store, props);
  // state contains the store state and derived state
  return <div>{state.derivedProp}</div>;
}
```

## Recipes

- Derived state is the same as using _useMemo_ pin sub component.
- If the derived state is needed in one component only, it may prove better to use a _useMemo_ in this component to save memory when it is unmounted and store not.
- In general, do **not** compute derived values directly in state, it's error prone as you can forget some places or implement different logic.
- Use derived state especially if this state is shared accross several sub components

# Actions

The StateDecorator is taking a list of actions and decorate them to inject state, props, actions etc. and then expose the decorated actions that simply takes the function arguments defined in the type.

**Warning**: The actions are considered static and cannot be changed dynamically. Use state/props in your actions implementation to have different logic depending on some inputs.

# Synchronous actions

## Short form

```typescript
action: (ctx) => ctx.state, // state changes
```

Example:

```typescript
const actions: StoreActions<State, Actions> = {
  setText: ({ s, args: [newText] }) => ({ ...s, text: newText }),
};
```

## Regular form

```typescript
action: {
  effects: (ctx) => ctx.state, // state changes
  sideEffects: (ctx) => {
    // side effect code
  },
  // debounce side effects if > 0
  debounceSideEffectsTimeout: 0,
}
```

Example:

```typescript
const actions: StoreActions<State, Actions> = {
  setText: {
    effects: ({ s, args: [newText] }) => ({ ...s, text: newText }),
    debounceSideEffectsTimeout: 5000,
    sideEffects: ({ a }) => {
      a.saveDocument();
    },
  },
};
```

[![See Debounce demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/debounce-forked-tmk2j?file=/src/Debounce.tsx)

## Cancel effects

To cancel effects just return **null** instead of new state in **effects**.

# Asynchronous actions

```typescript
action: {
  preEffects: (ctx)        => ctx.state,    // state changes before promise
  optimisticEffects: (ctx) => ctx.state,    // optimistic state changes before promise, will be reverted if promise fails. Be sure to install optimistic middleware !
  getPromise: (ctx)        => Promise.resolve(), // promise provider
  effects: (ctx)           => ctx.state,       // state changes if success
  errorEffects: (ctx)      => ctx.state,  // state changes if error
  sideEffects: (ctx)       => { /* side effect code if success */ },
  errorSideEffects: (ctx)  => { /* side effect code if failure */ },
  getSuccessMessage: (ctx) => 'Success', // if a notifySuccess is set locally or globally
  getErrorMessage: (ctx)   => 'Error',   // if a notifyError is set locally or globally

  abortable: true,                           // inject a abort signal in the promise invocation context and allow to abort promise
  conflictPolicy: ConflictPolicy.KEEP_LAST, // behavior if action is called while a promise is ongoing
  getPromiseId: (args) => null,             // parallel actions promise identifier (see conflicting actions)
  retryCount: 1,
  retryDelaySeed: 1000,
}
```

- If **null** is returned by **getPromise**, the action is not executed. It allows to not cancel an action depending on state or props etc.

- **getGetPromise** is a shortcut that sets the conflict policy to **ConflictPolicy.REUSE** and **retryCount** to 3.

- To cancel any effects just return **null** instead of new state in **xxxEffects**.

## Asynchronous action lifecycle

<!-- ![Lifecycle](https://raw.githubusercontent.com/GlobalSport/state-decorator/develop/doc/StateDecoratorDiagram.png) -->

- check if a previous call to this action is ongoing,
  - if yes, check if the conflict policy is parallel,
    - if yes, let the flow continue.
    - if no, return a new promise according to the conflict policy.
- **preEffects**: state changes before promise execution.
- **optimisticEffects**: optimistic state changes before promise execution, will be rollback if promise fails.
- **getPromise**: get a promise from action context:

  - if promise is resolved:
    - **effects**: update state from action contexts and the result of the promise
    - if **notifySuccess** is set, call it with **getSuccessMessage()**
    - **sideEffects**: trigger a side effect with no change on state.
  - if promise is rejected (or aborted):
    - if the action was optimistic, revert the **optimisticEffects** change and replay all following actions.
    - **errorEffects**: change state from promise arguments and returned error.
    - if **notifyError** is set, call it with **getErrorMessage()**.
    - **errorSideEffects**: trigger a side effect with no change on state.

- If a conflicting action is stored, process it.

## Loading state

The loading state of asynchronous actions is automatically computed.

```typescript
const { isLoading, loading } = useLocalStore(getInitialState, actionsImpl);

// loading is set to true is at least one asynchronous action is ongoing.

// isLoading is a function that accepts 1+ arguments
// It returns true, if at least one of the specified actions is loading.
const isOneLoading = isLoading('action1', 'action2', ['parallelAction', 'promiseId']);
```

## Success / error notifications

A notification function can be called when the asynchronous action succeeded or failed.

1. Set notification function on success/error:
   1. Set _notifyError_ and/or _notifySuccess_ using in global configuration _OR_
   2. specify a function to _notifySuccess_ and/or _notifyError_ options of the store.
1. In each asynchronous action, set:
   1. _getErrorMessage_ (message built from the error and action context).
   2. _getSuccessMessage_ (message built from the action context)

## <a name="ErrorManagement"></a>Error management

When an asynchronous action fails, if the state needs to be updated, set the _errorEffects_ property of the asynchronous action.

```typescript
const actions: StoreActions<State, Actions> = {
  loadList: {
    getPromise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
    errorEffects: ({ state, error }) => ({ ...state, error: error.message, list: [] }),
    getErrorMessage: ({ err }) => err.message,
    errorSideEffects: ({ error }) => {
      Logger.log(error);
    },
  },
};
```

**Note:** If an error message or an error reducer is defined, the error will be trapped to prevent other error management (console traces...). If, for any reason, you need to have the promise to be rejected, set **rejectPromiseOnError** to _true_.

## <a name="ConflictingActions"></a>Conflicting actions

The StateDecorator is managing the asynchronous action calls one at a time (default) or in parallel.

When a action call occurs while the same action previous call's promise is ongoing, we call such actions calls _conflicting actions_.

In lots of situations, the UI is disabled using the loading action state, but in other situations one may want to manage such use case (a search bar, autosave feature of an editor etc.).

There are several policies to handles call to an action while there's a previous call to this action is ongoing.

This is controlled by the **conflictPolicy** property of an asynchronous action.

It can takes the following values (use **ConflictPolicy** enum), choose the one the more suited to your use case:

- **ConflictPolicy.IGNORE**: The conflicting action calls are simply ignored.
- **ConflictPolicy.REJECT**: Conflicting action calls are unwanted, they will be rejected with an error.
- **ConflictPolicy.KEEP_ALL** (default): All conflicting action calls will be chained and executed one after the other.
- **ConflictPolicy.KEEP_LAST**: Only the more recent conflicting action call will be executed after the previously ongoing call is resolved. Use case: editor with auto save feature.
- **ConflictPolicy.REUSE**: If an action is already ongoing, the promise is reused, if the arguments are the same (shallow comparison). Otherwise fallback to **ConflictPolicy.KEEP_ALL**. Useful for GET requests.
- **ConflictPolicy.PARALLEL**: Actions are executed in parallel.
  - Use case: several calls with different parameters.
  - A **getPromiseId** function must be provided to assign an identifier to each call from call arguments.
  - The **isLoading** function will return the loading state for each promise identifier.

[![Edit ConflictPolicy](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/conflictpolicy-v6-fhqco)

## Retry

If the promise of an asynchronous action fails, the store can retry this promise before failing.

The following properties action are used:

- **retryCount**: Number of retries in case of "retry error".
- **retryDelaySeed**: Seed of delay between each retry in milliseconds. The applied delay is retryDelaySeed \* retry count. Default is 1000ms.
- **isTriggerRetryError**: A function that returns if the passed error will trigger a retry or if the action fails directly. Default function is returning _true_ for _TypeError_ instances.

## Optimistic actions

⚠ If you are using optimistic effects, make sure to set the **optimisticActions** middleware to your store.⚠

Using global configuration (for all stores):

```typescript
import { setGlobalConfig } from 'state-decorator';
import { optimisticActions } from 'state-decorator/middlewares';

setGlobalConfig({
  defaultMiddlewares: [optimisticActions()],
});
```

On a specific store:

```typescript
import { createStore } from 'state-decorator';
import { optimisticActions } from 'state-decorator/middlewares';

const store = createStore(getInitialState, actionsImpl, options, [optimisticActions()],
```

An optimistic action assumes that the action will, most of the time, succeed. So it will apply the effects as soon as the asynchronous action is called (as opposite to the regular effects which are applied when the promise is resolved).

If the action succeeds the effects, if any, will be called anyway.

If the action fails, the state will be recomputed to undo this action.

The undo strategy is the following:

- Retrieve the state before the optimist action.
- Replay all the subsequent actions effects.
- If there are other optimistic actions ongoing, update their state before action.

Example:

```typescript
const actions: StoreActions<State, Actions> = {
  deleteItem: {
    getPromise: ([id]) => new Promise((resolve) => setTimeout(resolve, 500)),
    optimisticEffects: (state, args) => ({ ...state, list: list.filter((item) => item.id === args[0]) }),
    errorEffects: (state, error: Error) => ({ ...state, error: error.message }),
  },
};
```

[![Edit Optimistic actions](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/optimistic-actions-v6-mvsoh?file=/src/Optimistic.tsx)

**Notes**:

- As optimistic actions can be expensive (clone state, save all actions), make sure to use optimistic reducer for a promise that will, most of the time, returns in a short amount of time.
- To update the state _before_ the action, prefer **_preEffects_**. **_optimisticEffects_** purpose is optimistic actions only. Optimistic actions are not changing the global loading state and are more expensive because the subsequent actions are saved in order to be able to revert the optimistic action in case of failure.

## Abort asynchronous action

Ongoing asynchronous actions can be aborted using, under the hood, the [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/AbortController), if you target browsers which support it.

1. Action implementation:
   - An asynchronous action must be marked as **abortable**.
   - Then, in the **promise** method, the injected **abortSignal** have to be used to add a listener on abort of action and _reject_ the promise with a `new DOMException('Aborted', 'AbortError')`. Or pass it to the **fetch**, i.e. `fetch(url, { signal })`.
2. Usage:
   - In the result of the **useLocalStore**, use the **abortAction** with an action name to abort the action
3. An abort is a specific failure of an action, ie. **errorEffects** and **errorSideEffects** will be called. Use the error type and name to distinguish an aborted action from a regular failed action.

```typescript
export const actionsAbort: StoreActions<State, Actions, Props> = {
  onAction: {
    abortable: true,
    preEffects: () => ({ isError: false, isSuccess: false, isAborted: false }),
    getPromise: ({s, args: [willCrash] abortSignal}) =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(willCrash ? reject : resolve, 2500, willCrash ? new Error('boom') : 'result');
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    errorEffects: ({s, err}) => (err.name === 'AbortError' ? { ...s, isAborted: true } : { ...s, isError: true }),
    effects: ({s}) => ({ ...s, isSuccess: true }),
    errorSideEffects: ({s, err}) => {
      if (e.name === 'AbortError') {
        console.log('AbortError side effect');
      } else {
        console.log('Other error side effect');
      }
    },
  },
};
```

[![Edit Abort](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/abort-v6-uvnl7)

## Call actions on mount

When a hook that creates / binds a store is mounted, the **onMount** option is called.

```typescript
import { createStore } from 'state-decorator';

const store = createStore(getInitialState, actionsImpl, {
  onMount: ({ a }) => {
    a.loadList;
  },
});

// onMount is called when this component is mounted
function Container(p: ContainerProps) {
  useBindStore(store, p);
}
```

# Debug actions

To debug actions, add a middleware to the store.

## Concise logger

```typescript
import { logEffects } from 'state-decorator/middlewares';

function Container(props: Props) {
  const { state, actions } = useLocalStore(getInitialState, actionsImpl, props, { name: 'My Store' }, [logEffects()]);
  return <div />;
}
```

By default the `console.log` function is used but you can pass any function that has the same signature e.g:

```typescript
function logger(...args: any[]) {
  // implementation...
}

const logMiddleware = logEffects(logger);

const store = createStore(getInitialState, actionsImpl, props, options, [logMiddleware]);
```

Example:

```
[StateDecorator sample] loadList effects {list: Array(10), prop1: "", prop2: "", prop3: ""} loading: false
middlewares.ts:36 [StateDecorator sample] setProp1 effects {list: Array(10), prop1: "92", prop2: "", prop3: ""}
```

## Detailed Logger

```typescript
import { logDetailedEffects } from 'state-decorator/middlewares';

function Container(props: Props) {
  const { state, actions } = useLocalStore(getInitialState, actionsImpl, props, { name: 'My Store' }, [
    logDetailedEffects(),
  ]);
  return <div />;
}
```

Like concise logger, by default the `console` is used but you can pass any object implementing `log, group, groupCollapsed, groupEnd` functions.

Example:

```
 onCalendarTimeRangeChange
 ▼ Arguments
 ║ 0 : 2018-08-12T22:00:00.000Z
 ║ 1 : 2018-08-19T22:00:00.000Z
 ▶ Before
 ▶ After
 ▼ Diff
 ║ calendarStartDate : null => 2018-08-12T22:00:00.000Z
 ║ calendarEndDate : null => 2018-08-19T22:00:00.000Z
```

## Redux devtools

You can connect any StateDecorator store to [Chrome Redux devtools extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en) by adding the `devtools` middleware to the store.

```typescript
import { devtools } from 'state-decorator/middlewares';

function Container(props: Props) {
  const { state, actions } = useLocalStore(getInitialState, actionsImpl, props, { name: 'My Store' }, [devtools()]);
  return <div />;
}
```

# Unit testing

## Getting started

```typescript
import { createMockStore } from 'state-decorator/test';

import { getInitialState, todoActions, TodoItem } from './Todos';

describe('Todo', () => {
  // create a mock store and setup initial state
  // state / props can be set in full form or partial form
  // this store can be shared accross tests because it is immutable
  const store = createMockStore(getInitialState, todoActions, {}, {}).setPartialState({
    idCount: 3,
    todoIds: ['id', 'id2'],
    todoMap: {
      id: {
        id: 'id',
        completed: true,
        title: 'todo',
      },
      id2: {
        id: 'id2',
        completed: false,
        title: 'todo 2',
      },
    },
  });

  it('onCreate', async () => {
    await store
      // set partial state and return new store, source store is untouched
      .setPartialState({
        newTitle: 'new todo',
      })
      // get a mock action that can be shared too !
      .getAction('onCreate')
      // Invokes action. It has no side effect on state of mock action
      .call()
      // always return a promise whatever if the action is asynchronous or not
      .then(({ state: { todoIds, todoMap } }) => {
        // assert state
        expect(todoIds).toEqual(['id', 'id2', 'id3']);
        expect(todoMap).toEqual({
          id: {
            id: 'id',
            completed: true,
            title: 'todo',
          },
          id2: {
            id: 'id2',
            completed: false,
            title: 'todo 2',
          },
          id3: {
            id: 'id3',
            completed: false,
            title: 'new todo',
          },
        });
      });
  });

  it('onToggle', async () => {
    // this mock action is shared
    const onToggle = store.getAction('onToggle');

    // arguments of call() depend on the Store action signature, use auto completion!
    await onToggle.call('id2').then(({ state: { todoIds, todoMap } }) => {
      expect(todoIds).toEqual(['id', 'id2']);
      expect(todoMap).toEqual({
        id: {
          id: 'id',
          completed: true,
          title: 'todo',
        },
        id2: {
          id: 'id2',
          completed: true,
          title: 'todo 2',
        },
      });
    });

    await onToggle.call('id').then(({ state: { todoIds, todoMap } }) => {
      expect(todoIds).toEqual(['id', 'id2']);
      expect(todoMap).toEqual({
        id: {
          id: 'id',
          completed: false,
          title: 'todo',
        },
        id2: {
          id: 'id2',
          completed: false,
          title: 'todo 2',
        },
      });
    });
  });

  // Another store / action
  it('getList', async () => {
    await store
      .getAction('getList')
      // override default promise result
      .promiseResolves([])
      // simulate error
      //.promiseRejects(new Error('boom'))
      .call()
      .then((res) => {
        // if there are some side effects calling store action, you test them
        // as mock actions are injected instead of real actions.
        expect(res.actions.sideEffectAction).toHaveBeenCalledWith('sideEffect');
        expect(res.state).toEqual({
          //  state...
        });
      });
  });

  // Another store
  it('onPropsChange', () => {
    store
      // onPropsChange allows to test prop change, no side effect on original store
      // to create a new store with new props, use setProps or setPartialProps
      .onPropsChange({
        prop: 'new_prop',
      })
      .test((res) => {
        // test side effects
        expect(res.actions.sideEffectAction).toHaveBeenCalledWith('sideEffect');
        // test store props
        expect(res.props.prop).toEqual('new_prop');
        //
        expect(res.state).toEqual({
          prop1: 'new_prop',
          derived: '', // derived state is updated
        });
      });
  });
});
```

[![Edit Todo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/todo-forked-ml0z6?file=/src/TodoApp.tsx)

## API

### MockStore

| Function        | Arguments                            | Returns             | Description                                                          |
| --------------- | ------------------------------------ | ------------------- | -------------------------------------------------------------------- |
| setState        | state: S                             | new mock store      | Create a new store with the specified state                          |
| setPartialState | state: Partial<S>                    | new mock store      | Create a new store with the merge of current state and partial state |
| setProps        | props: P                             | new mock store      | Create a new store with the specified props                          |
| setPartialProps | props: Partial<P>                    | new mock store      | Create a new store with the merge of current props and partial props |
| test            | f: (state: S & DS, props: P) => void | same store instance | Call specified fuction to test current state and store               |
| getAction       | actionName: keyof A                  | MockStoreAction     | Get a mock action instance                                           |
| onPropsChange   | props: P                             | MockResult          | Test a prop change. Does not change internal props                   |

### MockStoreAction

| Function        | Parameters                           | Returns             | Description                                                                         |
| --------------- | ------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| setState        | state: S                             | new mock action     | Create a new store with the specified state                                         |
| setPartialState | state: Partial<S>                    | new mock action     | Create a new store with the merge of current state and partial state                |
| setProps        | props: P                             | new mock action     | Create a new store with the specified props                                         |
| setPartialProps | props: Partial<P>                    | new mock action     | Create a new store with the merge of current props and partial props                |
| test            | f: (state: S & DS, props: P) => void | same mock action    | Call specified fuction to test current state and store                              |
| promiseResolves | res: PromiseResult<F>                | new mock action     | Returns a new mock action in which promise will return specified result             |
| promiseRejects  | err: Error                           | new mock action     | Returns a new mock action in which promise will return specified error              |
| call            | ...args: Parameters<F>               | Promise<MockResult> | Call action and returns the results. Has no side effect on internal state and props |

### MockResult

| Attribute | Description                       |
| --------- | --------------------------------- |
| state     | State after action                |
| props     | Props after action                |
| actions   | Mock actions to test side effects |

# Immutability

- Immutability: each effects **must** return a new state instance (or **null** if there's no change).
- I recommend using [Immer](https://github.com/immerjs/immer) to manage complex cases (deep nesting). A **immerizeActions** action decorator is provided to decorate each effect with Immer.

# Limitations

- Due to bundle size constraints and used in specific use cases only, a basic function is used to clone state / props / arguments in conflicting actions and optimistic effects use cases. In some edge cases (like clone moment objects, class instances), you must provide a clone implementation like Lodash cloneDeep implementation.

- "Index signature is missing in type" or "'XxxXxx' does not satisfy the constraint 'DecoratedActions'" error during TS compilation:
  - https://github.com/Microsoft/TypeScript/issues/15300
  - Solution: the **Actions** interface must either extends **DecoratedActions** interface or be a **type**.

# Migration

## Step 1: v5 compatibility layer

To use the new engine while still using v5 API, juste import the v5 compatibility layer.
You can new store in new code.

```diff
-import useStateDecorator, { StateDecoratorActions } from 'state-decorator';
+import useStateDecorator, { StateDecoratorActions } from 'state-decorator/v5';
```

If you are using optimistic effects, make sure to set the **optimisticActions** middleware as a default middleware, see [Optimistic actions](#optimistic-actions).

```typescript
import { setGlobalConfig } from 'state-decorator';
import { optimisticActions } from 'state-decorator/middlewares';

setGlobalConfig({
  defaultMiddlewares: [optimisticActions()],
});
```

### Incompatibilities

- _initialActionsMarkedLoading_ is removed as it's no longer needed. If your initial actions are invoked in _onMount_ they will be marked as loading.
- _debounceTimeout_ is removed, it can be replaced using _debounceSideEffectsTimeout_ but the behavior is different: only the side effects are debounced and not effects + side effects.

## Step 2: Migrate code but keep v5 tests

### Code

#### Types

| Before                | After        |
| --------------------- | ------------ |
| StateDecoratorActions | StoreActions |
| StateDecoratorOptions | StoreOptions |

#### Optimistic actions

If you are using optimistic effects, make sure to set the **optimisticActions** middleware to your stores, see [Optimistic actions](#optimistic-actions).

### Hooks

Choose one of _useLocalStore_, _useStore_, _useBindStore_ or _useStoreSlice_.

### Actions

- rename action properties

| Before            | After             |
| ----------------- | ----------------- |
| action            | effects           |
| onActionDone      | sideEffects       |
| debounceTimeout   | **Removed**       |
| preReducer        | preEffects        |
| optimisticReducer | optimisticEffects |
| reducer           | effects           |
| errorReducer      | errorEffects      |
| onDone            | sideEffects       |
| onFail            | errorSideEffects  |
| promise           | getPromise        |
| promiseGet        | getGetPromise     |
| successMessage    | getSuccessMessage |
| errorMessage      | getErrorMessage   |

- replace argumtents by action context

```diff
- const actions: StateDecoratorActions<S, A, P> = {
+ const actions: StoreActions<S, A, P> = {
-   loadList: {
-     promise: ([id], s, p, a) => {
+     getPromise: ({ s, args: [id], p, a }) => {
-       /* ... */
-     },
-     reducer: (s, res) => ({
+     effects: ({ s, res }) => ({
-       /* ... */
-     }),
-     errorReducer: (s, err) => ({
+     errorEffects: ({ s, err }) => ({
-       /* ... */
-     }),
-   },
- };
```

### Options

#### onMount

```diff
- const options: StateDecoratorOptions<S, A, P> = {
-   onMount: (actions, props, state) => { /* initial side effects */ }
- };

+ const options: StoreOptions<S, A, P> = {
+   onMount: ({state, props, actions}) => { /* initial side effects */ }
+} ;
```

#### logEnabled

```diff
- function Container(props: Props) {
-   const { state, actions } = useStateDecorator(getInitialState, actionsImpl, props, { logEnabled: true });
-   return <div />;
- }

+ import { logDetailedEffects } from 'state-decorator/middlewares';
+
+ function Container(props: Props) {
+   const { state, actions } = useLocalStore(getInitialState, actionsImpl, props, {}, [logDetailedEffects()]);
+   return <div />;
+ }
```

#### Props changes

```diff
- const options: StateDecoratorOptions<S, A, P> = {
-   getPropsRefValues: (p) => [],
-   onPropsChangeReducer: (s, p, indices) => ({ ...s /* new state */ }),
-   onPropsChange: (s, p, a, indices) => {
-     /* side effects */
-   },
- };

+ const options: StoreOptions<S, A, P> = {
+   onPropsChange: {
+     getDeps: (p) => [],
+     effects: ({ s, p, indices }) => ({ ...s /* new state */ }),
+     sideEffects: ({ s, p, a, indices }) => {
+       /* side effects */
+     },
+   },
+} ;
```

### Reuse v5 tests with v6 actions

```diff
- import { testSyncAction, testAsyncAction } from 'state-decorator';

+ import { testV6SyncAction, testV6AsyncAction } from 'state-decorator/v5_test';
```

## Step 3 (optional): Migrate tests

🎊 Congratulations! 🎊

# Examples

## TodoApp

[![Edit Todo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/todo-forked-ml0z6?file=/src/TodoApp.tsx)

## Conflicting actions

Show various ways of handling conflicting actions, ie. asynchronous actions triggered when a previous action of same type is still ongoing.

[![Edit ConflictPolicy](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/conflictpolicy-v6-fhqco)

## Parallel actions

The _onChange_ action calls are executed in parallel.

```typescript
const parallelActions: StoreActions<State, Actions> = {
  onChange: {
    getPromise: ([id, value]) => new Promise((res) => setTimeout(res, 3000, value)),
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    effects: (s, value, [id]) =>
      produce(s, ({ items }) => {
        items.find((i) => i.id === id).value = value;
      }),
  },
};
```

[![Edit Parallel](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/conflictpolicy-v6-fhqco?file=/src/Parallel.tsx)

# Visual Studio Code user snippet

You can add this snippet to quickly create a stateful functional component using the useLocalStore hook. Click on menu File > Preferences > User Snippets, select typescriptreact.json and add this snippet:

```json
{
  "Create useLocalStoreComplete types": {
    "prefix": "rUseStateDecorator",
    "body": [
      "import React from 'react';",
      "import { useStore, StoreActions, LoadingProps } from 'state-decorator';",
      "",
      "export type $1Props = {};",
      "",
      "export type $1State = {};",
      "",
      "export type $1Actions = {};",
      "",
      "type Props = $1Props;",
      "type State = $1State;",
      "type Actions = $1Actions;",
      "",
      "type ViewProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;",
      "",
      "export function getInitialState(p:$1Props): State {",
      "return {};",
      "};",
      "",
      "export function $1View(p: ViewProps) {",
      "  return (<div>[$1View]</div>);",
      "}",
      "",
      "export const actions$1: StoreActions<State, Actions, Props> = {};",
      "",
      "export function onMount(actions:$1Actions) {}",
      "",
      "const store = createStore(getInitialState, actions$1, { onMount });",
      "",
      "export default React.memo(function $1(p: $1Props) {",
      "  const { state:s, actions:a, loadingMap } = useStore(store, p);",
      "  return <$1View {...p} {...s} {...a} loadingMap={loadingMap} />;",
      "});"
    ],
    "description": "Create a new functional component with the useLocalStore hook"
  }
}
```
