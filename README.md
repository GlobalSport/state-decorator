![travis static](https://travis-ci.com/GlobalSport/state-decorator.svg?branch=master)

<p align="center">
  <img src="https://github.com/GlobalSport/state-decorator/blob/develop/doc/state-decorator-logo-small.png?raw=true" alt="useStateDecorator logo"/>
</p>

The useStateDecorator is a React hook that manages a component state in an easy, testable and deterministic way.

# Features

- Deterministic state changes
- Ease asynchronous actions state changes (loading states, success & error handlers, parallel actions management, optimistic updates...)
- Easily testable (uses pure functions, utility functions provided)
- Easily update state from props change (no error prone getDerivedStateFromProps)
- Ease debugging (trace state changes)
- Improve code conciseness (no boiler plate code)
- Enforce separation of container components and presentation components.
- Strongly typed

# 5.0: The one with the hook

## v5.x vs v4.x

- React >= 16.8: use 5.x version and _useStateDecorator_ hook. The _StateDecorator_ and _injectState_ HOC are still valid but are using internally the hook.
- React < 16.8: use 4.x version.

## Progressive migration

- Actions implementation is 100% compatible (same type).
- The **useStateDecorator** hook is now the default way to go but to ease transition, the **StateDecorator** was rewritten using the hook.

Change the import from

`import StateDecorator from 'state-decorator';`

to

`import StateDecorator from 'state-decorator/compat';`

In 'state-decorator/compat' both the hook and the legacy are contained:

- no need to import from both `state-decorator/compat` and `state-decorator`: you would double the imported code size.

- you can import the hook from `state-decorator` during migration:

  - `import { useStateDecorator } from 'state-decorator/compat';`

## Migrating from the StateDecorator to useStateDecorator

The basic use case can be migrated like this:

```typescript
const CounterContainer = () => {
  return (
    <StateDecorator getInitialState={getInitialState} actions={counterActions} props={props}>
      {(state, actions) => <CounterView {...state} {...actions} />}
    </StateDecorator>
  );
};
```

becomes

```typescript
const CounterContainer = () => {
  const { state, actions } = useStateDecorator(getInitialState, actions, props);
  return <CounterView {...state} {...actions} />;
};
```

- First parameter of the hook is the function that returns the initial state from the props.
- Second parameter is the actions. You can reuse as-is the actions from previous version.
- Third parameter is the props.
- An optional Last parameter contains the options (see documentation).

The onUnmount, onUnload that were in the props are now other hooks you can import from the StateDecorator.

# Getting started

## Installation

```
npm install state-decorator
```

or

```
yarn add state-decorator
```

## Basic example

The simpler example: the state is a literal value and two synchronous actions to change the state.

- First define your types: State, Actions and optionally your props.
- Then implement your initial state and actions

```typescript
import React from 'react';
import useStateDecorator, { StateDecoratorActions } from 'state-decorator';

type State = {
  counter: number;
};

type Actions = {
  increment: (incr: number) => void;
  decrement: (incr: number) => void;
};

export const getInitialState = (): State => ({
  counter: 0,
});

export const counterActions: StateDecoratorActions<State, Actions> = {
  decrement: (s, [incr]) => ({ counter: s.counter - incr }),
  increment: (s, [incr]) => ({ counter: s.counter + incr }),
};

// Stateless component
// Separate container from view for easier view unit testing.
const CounterView = React.memo(function CounterView(props: State & Actions) {
  const { counter, increment, decrement } = props;
  return (
    <div>
      {counter}
      <button onClick={() => decrement(10)}>Substracts 10</button>
      <button onClick={() => increment(10)}>Adds 10</button>
    </div>
  );
});

// Container that is managing the state using useStateDecorator hook
export const CounterContainer = () => {
  const { state, actions } = useStateDecorator(getInitialState, counterActions);
  return <CounterView {...state} {...actions} />;
};
```

# Types

The useStateDecorator is a generic React hook that needs two interfaces: State and Actions.

- State: The type of the state managed by the StateDecorator.
- Actions: The type of the actions that will update the state.

# Initial state

The initial state is retrieved using the first hook parameter which is a function that takes the props and returns a state.

```typescript
export const getInitialState = (): State => ({
  counter: 0,
});

export const CounterContainer = () => {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  return <CounterView {...state} {...actions} />;
};
```

# Actions

The StateDecorator is taking a list of actions and decorate them to inject state, props, actions etc. and then expose to the child render prop the decorated actions that simply takes the function arguments.

**Warning**: The actions are considered static and cannot be changed dynamically. Use state/props in your actions implementation to have a difference behavior.

## Initial action

When the useStateDecorator is mounted, the **onMount** option is called with the decorated actions and props as parameters.

```typescript
import useStateDecorator from 'state-decorator';

export const CounterContainer = () => {
  const { state, actions } = useStateDecorator(getInitialState, counterActions, { onMount });
  return <CounterView {...state} {...actions} />;
};
```

This is usually used to load asynchronous data to populate the state.

## Synchronous actions

### Simple form

A simple synchronous action is a function that takes the current state and an optional list of parameters and returns a new state or _null_ if there's no change.

```typescript
const actions: StateDecoratorActions<State, Actions> = {
  setText: (s, [text], props) => ({ ...s, text }),
};
```

### Advanced form

An advanced synchronous action is a made of, at least, an **action**. It's function that takes the current state and an optional list of parameters and returns a new state or _null_ if there's no change like the simple form.

The advanced form allows to add some additional properties for this action.

```typescript
const actions: StateDecoratorActions<State, Actions> = {
  setText: {
    action: (s, [text], props) => ({ ...s, text }),
    debounceTimeout: 300,
    onActionDone: (s, args, props, actions) => {
      /* insert code here but beware of infinite loop!! */
    },
  },
};
```

[![See Debounce demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/debounce-91lwo?autoresize=1&fontsize=14&hidenavigation=1&module=%2Fsrc%2FDebounce.tsx&theme=dark)

## Asynchronous actions

An asynchronous action is made of, at least:

- a function that returns a promise (using **promise** or **promiseGet**)

and

- a reducer (to use redux terminology), ie. a function that takes as parameter the old state, the result of the request, the list of call arguments and returns a new state or _null_ if there's no change.

```typescript
import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps } from 'state-decorator';

type State = {
  list: string[];
};

type Actions = {
  loadList: (param1: string) => Promise<string[]>;
};

type Props = {};

const getInitialState = (p: Props) => ({ list: [] });

const actionsImpl: StateDecoratorActions<State, Actions, Props> = {
  loadList: {
    promise: ([param1], state, props, actions) =>
      new Promise((resolve) => setTimeout(resolve, 500, ['hello', 'world'])) as Promise<string[]>,
    reducer: (state, result, args, props) => ({ ...state, list: result }),
  },
};

const MyView = (props: State & Actions & LoadingProps<Actions>) => <div />;

export default function MyContainer(props: Props) {
  const { state, actions, ...loadingProps } = useStateDecorator(getInitialState, actionsImpl, props);
  return <MyView {...state} {...actions} {...loadingProps} />;
}
```

If **null** is returned by **promise**, the action is not executed. It allows to not cancel an action depending on state or props.

**promiseGet** is a shortcut that sets the conflict policy to **ConflictPolicy.REUSE** and **retryCount** to 3.

### Asynchronous action lifecycle

![Lifecycle](https://raw.githubusercontent.com/GlobalSport/state-decorator/develop/doc/StateDecoratorDiagram.png)

- check if a previous call to this action is ongoing,
  - if yes, check if the conflict policy is parallel,
    - if yes, let the flow continue.
    - if no, return a new promise according to the conflict policy.
- **preReducer**: change state from actions arguments.
- **optimisticReducer**: change state from action arguments and record next state changes to rollback if promise fails.
- **promise**: get a promise from action arguments:

  - if promise is resolved:
    - **reducer**: update state from action arguments and the result of the promise
    - if **notifySuccess** is set, call it with **successMessage** or **getSuccessMessage()**
    - **onDone**: trigger a side effect with no change on state.
  - if promise is rejected (or aborted):
    - if the action was optimistic, revert the **optimisticReducer** change and replay all following actions.
    - **errorReducer**: change state from promise arguments and returned error.
    - if **notifyError** is set, call it with **errorMessage** or **getErrorMessage()**.
    - **onFail**: trigger a side effect with no change on state.

- If a conflicting action is stored, process it.

### Loading state

The loading state of asynchronous actions are automatically computed and returned by the hook.

```typescript
const { state, actions, loading, loadingMap, loadingParallelMap } = useStateDecorator(getInitialState, actionsImpl);
```

- **loading**: the global loading state, ie. true if at least one asynchronous action is ongoing.
  - Note that optimistic actions are not taken into account.
- **loadingMap**: a map action name => loading state. The loading state can have 3 values:
  - undefined: the action was not called
  - true: the action is ongoing
  - false: the action has finished (successfully or not)
- **loadingParallelMap**: a map action name => list of promise identifiers. Used only of parallel actions, see [Conflicting actions](#ConflictingActions) section.

### Success / error notification

A notification function can be called when the asynchronous action succeeded or failed.

1. Set notification function on success/error:
   1. Set global _notifyError_ and/or _notifySuccess_ using _setNotifyErrorFunction_ and/or setNotifySuccessFunction at application initialization time _OR_
   2. specify a function to _notifySuccess_ and/or _notifyError_ options or properties of the useStateDecorator.
1. In each asynchronous action, set:
   1. _errorMessage_ (static message) or _getErrorMessage_ (message built from the error and action parameters) _OR_
   2. _successMessage_ (static message) or _getSuccessMessage_ (message built from the action result and parameters)

### <a name="ErrorManagement"></a>Error management

When an asynchronous action fails, if the state needs to be updated, set the _errorReducer_ property of the asynchronous action.

```typescript
const actions: StateDecoratorActions<State, Actions> = {
  loadList: {
    promise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
    reducer: (state, list) => ({ ...state, list, error: undefined }),
    errorReducer: (state, error: Error) => ({ ...state, error: error.message, list: [] }),
  },
};
```

**Note:** If an error message or an error reducer is defined, the error will be trapped to prevent other error management (console traces...). If, for any reason, you need to have the promise to be rejected, set _rejectPromiseOnError_ to _true_.

### Retry

If the action fails, the action can be retried a specified amount of times.

The following properties of an asynchronous action are used:

- **retryCount**: Number of retries in case of "retry error".
- **retryDelaySeed**: Seed of delay between each retry in milliseconds. The applied delay is retryDelaySeed \* retry count. Default is 1000ms.
- **isTriggerRetryError**: A function that returns if the passed error will trigger a retry or if the action fails directly. Default function is returning _true_ for _TypeError_ instances.

Note: _setIsTriggerRetryError_ function can be used to set a function to determine which error will trigger a retry.

### Optimistic action

An optimistic action assumes that the action will, most of the time, succeed. So it will apply a reducer as soon as the asynchronous action is called (as opposite to the regular reducer which is called when the promise is resolved).

If the action succeeds the reducer, if any, will be called anyway.

If the action fails, the state will be recomputed to undo this action.

The undo strategy is the following:

- Retrieve the state before the optimist action.
- Replay all the subsequent action reducers.
- If there are other optimistic actions ongoing, update their state before action.

Example:

```typescript
const actions: StateDecoratorActions<State, Actions> = {
  deleteItem: {
    promise: ([id]) => new Promise((resolve) => setTimeout(resolve, 500)),
    optimisticReducer: (state, args) => ({ ...state, list: list.filter((item) => item.id === args[0]) }),
    errorReducer: (state, error: Error) => ({ ...state, error: error.message }),
  },
};
```

**Notes**:

- As optimistic actions can be expensive (clone state, save all actions), make sure to use optimistic reducer for a promise that will, most of the time, returns in a short amount of time.
- To update the state _before_ the action, prefer **_preReducer_**. **_optimisticReducer_** purpose is optimistic actions only. Optimistic actions are not changing the global loading state and are more expensive because the subsequent actions are saved in order to be able to revert the optimistic action in case of failure.

### <a name="ConflictingActions"></a>Conflicting actions

The StateDecorator is managing the asynchronous action calls one at a time (default) or in parallel.

In lots of situations, the UI is disabled using the _loading_ or _loadingMap_ parameters, but in other situation one may want to manage such use case (a search bar, autosave feature of an editor etc.).

When a action call occurs while another call of the same action is ongoing, we call such actions calls _conflicting actions_.

There are several policies to handles call to an action while there's a previous call to this action is ongoing.

This is controlled by the **conflictPolicy** property of an asynchronous action.

It can takes the following values (use ConflictPolicy enum), choose the one the more suited to your use case:

- **ConflictPolicy.IGNORE**: The conflicting action calls are simply ignored.
- **ConflictPolicy.REJECT**: Conflicting action calls are unwanted, they will be rejected with an error.
- **ConflictPolicy.KEEP_ALL** (default): All conflicting action calls will be chained and executed one after the other.
- **ConflictPolicy.KEEP_LAST**: Only the more recent conflicting action call will be executed after the previously ongoing call is resolved. Use case: editor with auto save feature.
- **ConflictPolicy.REUSE**: If an action is already ongoing, the promise is reused, if the arguments are the same (shallow comparison). Otherwise fallback to **ConflictPolicy.KEEP_ALL**. Useful for GET requests.
- **ConflictPolicy.PARALLEL**: Actions are executed in parallel.
  - Use case: several calls with different parameters.
  - A **getPromiseId** function must be provided to assign an identifier to each call from call arguments.
  - The **loadingParallelMap** of the render prop function contains for each parallel action the promise identifiers that are ongoing.

Run the "Conflicting actions" example.

_Note_: In conjunction to this parameter, you can use [lodash debounce](https://lodash.com/docs/4.17.10#debounce) to call actions every _n_ ms at most

### Abort asynchronous action

Ongoing asynchronous actions can be aborted using, under the hood, the [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/AbortController), if you target browsers which support it.

1. Action implementation:
   - An asynchronous action must be marked as **abortable**.
   - Then, in the **promise** method, the injected **abortSignal** have to be used to add a listener on abort of action and _reject_ the promise with a `new DOMException('Aborted', 'AbortError')`. Or pass it to the **fetch**, i.e. `fetch(url, { signal })`.
2. Usage:
   - In the result of the **useStateDecorator**, use the **abortAction** with an action name to abort the action
3. An abort is a specific failure of an action, ie. **errorReducer** and **onFail** will be called. Use the error type and name to distinguish an aborted action from a regular failed action.

```typescript
export const actionsAbort: StateDecoratorActions<State, Actions, Props> = {
  onAction: {
    abortable: true,
    preReducer: () => ({ isError: false, isSuccess: false, isAborted: false }),
    promise: ([willCrash], s, p, a, abortSignal) =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(willCrash ? reject : resolve, 2500, willCrash ? new Error('boom') : 'result');
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    errorReducer: (s, e) => (e.name === 'AbortError' ? { ...s, isAborted: true } : { ...s, isError: true }),
    reducer: (s) => ({ ...s, isSuccess: true }),
    onFail: (s, e) => {
      if (e.name === 'AbortError') {
        console.log('AbortError side effect');
      } else {
        console.log('Other error side effect');
      }
    },
  },
};
```

[![Edit blissful-lake-dilyo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/blissful-lake-dilyo?fontsize=14&hidenavigation=1&module=%2Fsrc%2FAbort.tsx&theme=dark)

## Persist state on unmount

To persist the state when the container hook is unmounted, use the **onUnmount** hook.

```typescript
import useStateDecorator, { StateDecoratorActions, useOnUnmount } from 'state-decorator';

export default function Container(props: Props) {
  const { state, actions } = useStateDecorator(getInitialState, actions, props);

  useOnUnmount(() => {
    localStorage.setItem('state', JSON.stringify(state));
  });

  return <View {...state} {...actions} />;
}
```

## Persist state on page unload

For cases where the state is needed to be saved when the window is unloaded (the page is refreshed or the window/tab is closed).
The StateDecorator listens to the 'beforeunload' window event and call the **onUnload** property with the current state and props as parameter.

```typescript
import useStateDecorator, { StateDecoratorActions, useOnUnload } from 'state-decorator';

export default function Container(props: Props) {
  const { state, actions } = useStateDecorator(getInitialState, actions, props);

  useOnUnload(() => {
    localStorage.setItem('state', JSON.stringify(state));
  });

  return <View {...state} {...actions} />;
}
```

# Chain actions

Synchronous and asynchronous actions can be chained.

- Synchronous actions can be chained naturally (one action after the other) in the user code.
- Advanced synchronous actions can internally call another action using **actionDone**.
- Asynchronous actions can internally call another action.
  - The promise provider function has the decorated actions in parameter (see [API](#API)) so they can return a promise by calling another action. To chain an asynchronous action to a synchronous action, create a new asynchronous action that will call the synchronous action and returns the asynchronous action.
  - Using **onDone** or **onFail**, you can call another action.
  - The difference is that if the chained action fails, the entire action has failed (see [Error management](#ErrorManagement)). Using **onDone**, the chained action is a side effect of the success of the first action.

```typescript
import React from 'react';
import useStateDecorator, { StateDecoratorActions } from 'state-decorator';

interface Item {
  id?: string;
  value: string;
}

export type State = {
  items: Item[];
};

export type Actions = {
  getItems: () => Promise<Item[]>;
  addItem: (item: Item) => Promise<any>;
};

export const getInitialState = (): State => ({
  items: [],
});

class APIClient {
  static getItems(): Promise<Item[]> {
    return Promise.resolve([]);
  }

  // addItem is silly and is not returning the created object!!
  static addItem(item: Item): Promise<any> {
    return Promise.resolve();
  }
}

const actionsImpl: StateDecoratorActions<State, Actions> = {
  getItems: {
    promise: () => APIClient.getItems(),
    reducer: (s, list) => ({ ...s, list }),
  },
  addItem: {
    // As addItem is silly, we must reload the list after having added the item...
    promise: ([item], state, props, actions) => APIClient.addItem(item),
    // action side effect: reload the list
    onDone: (state, result, args, props, actions) => {
      actions.getItems();
    },
    // No reducer needed, the decorated action will call its reducer
  },
};

const View = (p: State & Actions) => <div />;

export default function ChainContainer() {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  return <View {...state} {...actions} />;
}
```

# Update the state after a prop change

The _props_ property of the StateDecorator is passed to nearly all action callbacks. It's usually used to pass some context data.

Sometimes the state is built from one of several _props_. If one of these props change the state must be recomputed or some action must be executed.

In the options parameter of the useStateDecorator, set these following properties:

- **getPropsRefValues**: **mandatory**: a function that computes from the props the reference values that will be used to detect a prop change. For example: `(p) => [p.item.id, p.otherProps];`.
- **onPropsChangeReducer**: a reducer function to update the state from new props. For example: `(state, newProps, updatedIndices) => ({...state, item: {...newProps.item})`
- **onPropsChange**: a callback to trigger an action. The reducer of the _loadData_ action will then update the state.

Note: The **onPropsChangeReducer** is called _before_ the **onPropsChange**.

```typescript
import React, { useState } from 'react';
import { useStateDecorator, StateDecoratorActions } from '../../../state-decorator';

export type State = {
  value: string;
};

export type Actions = {
  get: (param: string) => Promise<any>;
};

export const getInitialState = (): State => ({
  value: 'initial value',
});

type PropsChangeProps = { value: string };

const propChangeActions: StateDecoratorActions<State, Actions, PropsChangeProps> = {
  get: {
    promise: ([param]) => new Promise((resolve) => setTimeout(resolve, 1000, param)),
    reducer: (s, param) => {
      return { ...s, value: param };
    },
  },
};

// we will react if the value prop is changed
const getPropsRefValues = (p: PropsChangeProps) => [p.value];

// inner state is updated using the updated value prop. updateIndices is 0.
const onPropsChangeReducer = (s: State, p: PropsChangeProps, updatedIndices) => ({ ...s, value: p.value });

// we can call an action on prop change.
const onPropsChange = (s, p, actions, updatedIndices) => {
  actions.get('Updated value from onPropsChange');
};

export function PropsChange(props: PropsChangeProps) {
  const { state } = useStateDecorator(getInitialState, propChangeActions, props, {
    getPropsRefValues,
    onPropsChangeReducer,
    onPropsChange,
  });
  return <div>value: {state.value}</div>;
}
```

# Debug actions

The StateDecorator has a **_logEnabled_** option property that logs in the Browser console the actions and related state changes.

```typescript
function Comp(props: Props) {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl, props, { logEnabled: true });
  return <div />;
}
```

Example of console log:

```
[StateDecorator] Action onCalendarTimeRangeChange
 ▼ Arguments
 ║ 0 : 2018-08-12T22:00:00.000Z
 ║ 1 : 2018-08-19T22:00:00.000Z
 ▶ Before
 ▶ After
 ▼ Diff
 ║ calendarStartDate : null => 2018-08-12T22:00:00.000Z
 ║ calendarEndDate : null => 2018-08-19T22:00:00.000Z
```

# Unit testing

A major advantage of the StateDecorator is to decouple the state management from the UI rendering so they can be tested separately.

The UI rendering is tested using [Enzyme](https://github.com/airbnb/enzyme) as usual.
As the view component is not managing a state, just test the rendering depending on the props.

To test the state, a simple JS test framework is needed (Jest, Mocha, Jasmine...).

If the asynchronous action is processing the result before passing it to the reducer, you can mock the http calls and test the action promise.

The synchronous actions and the asynchronous reducers are all pure functions, ie. all the data you need is provided by the user (arguments) or injected (state & props).

Use _testSyncAction_, _testAdvancedSyncAction_ and _testAsyncAction_ utility function that allows to easily test actions in a typed manner.

## Example

### Component

```typescript
import React from 'react';
import { useStateDecorator, StateDecoratorActions, LoadingProps } from 'state-decorator';

type Item = {
  id: string;
};

type State = {
  list: Item[];
};

type Actions = {
  loadList: () => Promise<Item[]>;
  addItem: (item: Item) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

type Props = {};

export const getInitialState = (p: Props) => ({ list: [] });

export const actionsImpl: StateDecoratorActions<State, Actions, Props> = {
  loadList: {
    promise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
    reducer: (state, list: Item[]): State => ({ ...state, list }),
  },
  addItem: {
    promise: ([item]) => Promise.resolve(),
    optimisticReducer: (s, [item]: Item[]): State => ({ ...s, list: [...s.list, item] }),
  },
  removeItem: {
    promise: ([id]) => Promise.resolve(),
    optimisticReducer: (s, [id]): State => ({ ...s, list: s.list.filter((i) => i.id !== id) }),
  },
};

const MyView = (props: State & Actions & LoadingProps<Actions>) => <div />;

export default function MyContainer(props: Props) {
  const { state, actions, ...loadingProps } = useStateDecorator(getInitialState, actionsImpl, props);
  return <MyView {...state} {...actions} {...loadingProps} />;
}
```

## Test

This example is using [Jest](https://jestjs.io/).

```typescript
import { testSyncAction, testAsyncAction } from 'state-decorator';
import { actionsImpl, getInitialState } from '../../../examples/src/doc/Async';

describe('MyContainer', () => {
  describe('loadList', () => {
    it('reducer add list to state', () => {
      const initialState = getInitialState({});
      const list = [
        { id: '1', value: 'item1' },
        { id: '2', value: 'item2' },
      ];

      return testAsyncAction(actionsImpl.loadList, (action) => {
        const newState = action.reducer(initialState, list, [], {});
        expect(newState.list).toBe(list);
      });
    });
  });

  describe('addItem', () => {
    it('reducer add item list correctly', () => {
      const list = [
        { id: '1', value: 'item1' },
        { id: '2', value: 'item2' },
      ];
      const item = { id: '3', value: 'item3' };
      const initialState = { ...getInitialState({}), list };

      return testAsyncAction(actionsImpl.addItem, (action) => {
        const newState = action.optimisticReducer(initialState, [item], {});

        expect(newState.list).not.toBe(list);
        expect(newState.list).toHaveLength(3);
        expect(newState.list[0].id).toBe('1');
        expect(newState.list[1].id).toBe('2');
        expect(newState.list[2].id).toBe('3');
      });
    });
  });

  describe('removeItem', () => {
    it('reducer remove item from list correctly', () => {
      const list = [
        { id: '1', value: 'item1' },
        { id: '2', value: 'item2' },
        { id: '3', value: 'item3' },
      ];
      const initialState = { ...getInitialState({}), list };

      return testAsyncAction(actionsImpl.removeItem, (action) => {
        const newState = action.optimisticReducer(initialState, ['2'], {});

        expect(newState.list).not.toBe(list);
        expect(newState.list).toHaveLength(2);
        expect(newState.list[0].id).toBe('1');
        expect(newState.list[1].id).toBe('3');
      });
    });
  });
});
```

### Result

```
PASS  tests/MyContainer.test.tsx
  MyContainer
    loadList
      ✓ reducer add list to state (3ms)
    addItem
      ✓ reducer add item list correctly (2ms)
    removeItem
      ✓ reducer remove item from list correctly

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        1.814s
```

# Immutability

- Immutability: each action/reducer **must** return a new state instance (or **null** if there's no change).
- Pure components: thanks to immutability, React can detect that some renders are not needed if you are using React.memo (functional components) or React.PureComponent (classes). See [React.memo API](https://reactjs.org/docs/react-api.html#reactmemo) and [React.PureComponent API](https://reactjs.org/docs/react-api.html#reactpurecomponent)

You can use immutable libraries in your state / reducers to help you manage immutability.
Then, use React.memo / PureComponents in the view component tree to prevent useless renderings.

# Global state

The [React 16 context API](https://reactjs.org/docs/context.html) can be used to use the StateDecorator to manage the global state and thus allow injection in a component deeper in the component tree.

```typescript
import React, { useContext } from 'react';
import useStateDecorator, { StateDecoratorActions } from 'state-decorator';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const getInitialState = () => ({
  color: 'blue',
});

export const Context = React.createContext<State & Actions>(null);

const SubComponent = () => {
  const { color, setColor } = useContext(Context);

  return (
    <div>
      <div className="sub-component">{color}</div>
      <button onClick={() => setColor('red')}>Click</button>
    </div>
  );
};

const MainComponent = () => <SubComponent />;

const actionsImpl: StateDecoratorActions<State, Actions> = {
  setColor: (s, [color]) => ({ ...s, color }),
};

export default function ContextContainer() {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  return (
    <Context.Provider
      value={{
        ...state,
        ...actions,
      }}
    >
      <MainComponent />
    </Context.Provider>
  );
}
```

# Limitations

- Due to bundle size constraints and used in specific use cases only, _fast-clone_ library is used to clone state / props / arguments in conflicting actions and optimistic reducer use cases. In some edge cases (like clone moment objects), _fast-clone_ will fail. In that case, use Lodash cloneDeep implementation:

```typescript
import cloneDeep from 'lodash.cloneDeep';
import { setCloneFunction } from 'state-decorator';

setCloneFunction(cloneDeep);
```

- "Index signature is missing in type" or "'XxxXxx' does not satisfy the constraint 'DecoratedActions'" error during TS compilation:
  - https://github.com/Microsoft/TypeScript/issues/15300
  - Solution: the **Actions** interface must either extends **DecoratedActions** interface or be a **type**.

# StateDecorator & Redux comparison

The StateDecorator is like Redux (and others) a state management tool.
They both have pros and cons and can be used at the same time (Redux for global state and StateDecorator for local states).

## State cleaning

Redux state is global and stays until you explicitly implement send an action to clear the data.

The StateDecorator is local to the component where it's used. If the component is unmounted the entire state attached to this component is removed.

## Messages and decoupling

Redux is based on actions which are messages:

- The advantage is a decoupling that allows to reuse the actions (and middleware) anywhere in the app
- The downside is that you have to create lots of code for action, action creators, action types...

Most of the time, in real life cases, such extended decoupling is not really needed.

The StateDecorator is directly based on reducers:

- The advantage is far simpler code, in a single place (easier to browse).
- The downside is that there's no middleware.

## State injection

The state managed by Redux is global by nature and must be injected using the **connect** function.

The StateDecorator state and actions can be injected using new React context API or just be local and use props.

## Asynchronous actions

Usually Redux developers create 3 actions to handle one asynchronous action: loading / success / error which results in lots of code.

If you are in that case, you can use [redux promise middleware](https://github.com/pburtchaell/redux-promise-middleware) to write less code.

To handle optimistic asynchronous actions, another middleware is needed like [redux optimistic](https://github.com/ForbesLindesay/redux-optimist).

The StateDecorator has these features built-in.

## <a name="API"></a>API

_State_ is the generic state class passed to the StateDecorator.
_Actions_ is the generic actions class passed to the StateDecorator.

### useStateDecorator options

| Property                    | Description                                                                                                                                                 | Type                                                                             | Mandatory | Default value |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------- | ------------- |
| initialActionsMarkedLoading | List of action names to be marked as loading at initial time.                                                                                               | `string[]`                                                                       | false     | `undefined`   |
| logEnabled                  | If **true**, logs state changes to the console.                                                                                                             | `boolean`                                                                        |           | `false`       |
| notifyError                 | Callback function triggered when an asynchronous actions fails and an error message is provided.                                                            | `(message: string) => void`                                                      |           |               |
| notifySuccess               | Callback function triggered when an asynchronous actions succeeds and an success message is provided.                                                       | `(message: string) => void`                                                      |           |               |
| getPropsRefValues           | Get a list of values that will be use as reference values. If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called. | `(props: any) => any[];`                                                         |           |               |
| onPropsChangeReducer        | Triggered when values of reference from props have changed. Allow to update state after a prop change.                                                      | `(s: State, newProps: any, updatedIndices: number[]) => State;`                  |           |               |  |
| onPropsChange               | Triggered when values of reference from props have changed. Allow to call actions after a prop change.                                                      | `(s: State, newProps: any, actions: Actions, updatedIndices: number[]) => void;` |           |               |  |

### Synchronous action

## Simple form

Type:

```
(state: State, args: Arguments<Action>, props: Props) => State | null;
```

## Advanced form

| Property        | Description                                | Type                                                                                                         | Mandatory | Default value            |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------- | ------------------------ |
| action          | The action                                 | `(state:State, args: Arguments<Action>, props: Props) => State`                                              | `null`    | true (or **promiseGet**) |  |
| debounceTimeout | Debounce action if set                     | `number`                                                                                                     |           |                          |
| onActionDone    | Callback executed when the action is done. | `(state: State, args: Arguments<Action>, props: Props, actions: Actions, notifyWarning: NotifyFunc) => void` |           |                          |

### Asynchronous action

| Property             | Description                                                                                                                                                                                                                             | Type                                                                                                                                       | Mandatory                                                     | Default value                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| promise              | The asynchronous action promise provider. If null is returned, nothing is done.                                                                                                                                                         | `(args: Arguments<Action>, state:State, props: Props, actions:Actions) => Promise<Result<Action>> | null`                                  | `null` (or **promise**)                                       | `true` (or **promiseGet**)                |  |
| promiseGet           | The asynchronous action promise provider shortcut for a GET request. Sets **conflictPolicy** to **ConflictPolicy.REUSE** and **retryCount** to **3**.                                                                                   | `(args: Arguments<Action>, state:State, props: Props, actions:Actions) => Promise<Result<Action>> | null`                                  | `null` (or **promise**)                                       |                                           |
| preReducer           | The state update function triggered before optimisticReducer and the promise provider                                                                                                                                                   | `(state: State, args: Arguments<Action>, props: Props) => State | null`                                                                    |                                                               |                                           |
| reducer              | The state update function triggered when the promise is resolved.                                                                                                                                                                       | `(state: State, promiseResult: any, args: Arguments<Action>, props: Props) => State | null`                                                |                                                               |                                           |
| errorReducer         | The state update function triggered when the promise is rejected.                                                                                                                                                                       | `(state: State, error: any, args: Arguments<Action>, props: Props) => State | null`                                                        |                                                               |                                           |
| optimisticReducer    | The state update function triggered when promise started                                                                                                                                                                                | `(state: State, args: Arguments<Action>, props: Props) => State | null`                                                                    |                                                               |                                           |
| onDone               | Callback executed when the promise is resolved.                                                                                                                                                                                         | `(state: State, promiseResult: PromiseResult, args: Arguments<Action>, props: Props, actions: Actions, notifyWarning: NotifyFunc) => void` |
| onFail               | Callback executed when the promise has failed.                                                                                                                                                                                          | `(state: State, error: Error, args: Arguments<Action>, props: Props, actions: Actions, notifyWarning: NotifyFunc) => void`                 |                                                               |                                           |
| successMessage       | Success message provided to the **notifySuccess** function of the StateDecorator                                                                                                                                                        | `string`                                                                                                                                   |                                                               |                                           |
| getSuccessMessage    | Success message provider function to pass to the **notifySuccess** function of the StateDecorator                                                                                                                                       | `(promiseResult: any, args: Arguments<Action>, props: Props) => string`                                                                    |                                                               |                                           |
| errorMessage         | Error message provided to the **notifyError** function of the StateDecorator                                                                                                                                                            | `string`                                                                                                                                   |                                                               |                                           |
| getErrorMessage      | Error message provider function to pass to the **notifyError** function of the StateDecorator                                                                                                                                           | `(error: any, args: Arguments<Action>, props: Props) => string`                                                                            |                                                               |                                           |
| rejectPromiseOnError | When an errorReducer or an error message is provided the outer promise is marked as resolved to prevent error in console or other error management. Set this property to true to reject the promise and process it in a catch function. | `boolean`                                                                                                                                  |                                                               | `false`                                   |
| conflictPolicy       | Policy to apply when a call to an asynchronous action is done but a previous call is still not resolved.                                                                                                                                | `ConflictPolicy`                                                                                                                           |                                                               | `ConflictPolicy.KEEP_ALL`                 |
| getPromiseId         | A function that returns the promise identifier from the arguments.                                                                                                                                                                      | `(...args:Arguments<Action>) => string`                                                                                                    | Mandatory if conflictPolicy is set to ConflictPolicy.PARALLEL |                                           |
| retryCount           | Number of tentative call to promise function.                                                                                                                                                                                           | `number`                                                                                                                                   |                                                               | `0`                                       |
| retryDelaySeed       | Seed of delay between each retry in milliseconds. The applied delay is retryDelaySeed x retry count.                                                                                                                                    | `number`                                                                                                                                   |                                                               | `1000`                                    |
| isTriggerRetryError  | Function to test if the error will trigger an action retry or will fail directly.                                                                                                                                                       | `(e:Error) => boolean`                                                                                                                     |                                                               | A function that tests TypeError instances |

# Examples

## TodoMVC

Synchronous actions, complex state with normalized storage of todo list.

```typescript
import React, { useCallback } from 'react';
import produce from 'immer';
import { pick } from 'lodash';
import useStateDecorator, { StateDecoratorActions } from 'state-decorator';

export enum Filter {
  ALL = 'all',
  COMPLETED = 'completed',
  NON_COMPLETED = 'non_completed',
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

export type State = {
  todoMap: { [id: string]: TodoItem };
  todoIds: string[];
  idCount: number;
  newTitle: string;
  filter: Filter;
};

export const getInitialState = (): State => ({
  todoMap: {},
  todoIds: [],
  idCount: 0,
  newTitle: '',
  filter: Filter.ALL,
});

export type Actions = {
  onCreate: () => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetNewTitle: (title: string) => void;
  onSetFilter: (filter: Filter) => void;
};

const Header = React.memo(function Header(
  props: Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>
) {
  const onChange = useCallback((e) => props.onSetNewTitle(e.target.value), []);
  const onSubmit = useCallback((e) => {
    e.preventDefault();
    props.onCreate();
  }, []);

  const { newTitle } = props;
  return (
    <form onSubmit={onSubmit}>
      <input value={newTitle} onChange={onChange} />
      <button type="submit">Create</button>
    </form>
  );
});

const Todo = React.memo(function Todo(props: { todo: TodoItem } & Actions) {
  const { todo } = props;

  const onToggle = useCallback((e) => props.onToggle(todo.id), [todo.id]);

  return (
    <div>
      <div>{todo.title}</div>
      <label>
        <input type="checkbox" checked={todo.completed} onChange={onToggle} />
        completed
      </label>
    </div>
  );
});

const Todos = React.memo(function Todos(props: Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions) {
  const { filter } = props;

  const onFilter = useCallback(
    (todoId: string) => {
      const { filter, todoMap } = props;
      const todo = todoMap[todoId];

      if (filter === Filter.ALL) {
        return true;
      }

      return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
    },
    [filter]
  );

  const { todoIds, todoMap } = props;

  return (
    <div>
      {todoIds.filter(onFilter).map((todoId) => (
        <Todo key={todoId} todo={todoMap[todoId]} {...props} />
      ))}
    </div>
  );
});

const Footer = React.memo(function Footer(props: Pick<State, 'filter'> & Actions) {
  const { onClearCompleted, filter } = props;

  const onFilterChange = useCallback((e) => props.onSetFilter(e.target.value), []);

  return (
    <div>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.ALL}
          checked={filter === Filter.ALL}
          onChange={onFilterChange}
        />
        All
      </label>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.NON_COMPLETED}
          checked={filter === Filter.NON_COMPLETED}
          onChange={onFilterChange}
        />
        Non Completed
      </label>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.COMPLETED}
          checked={filter === Filter.COMPLETED}
          onChange={onFilterChange}
        />
        Completed
      </label>
      <button onClick={onClearCompleted}>Clear completed</button>
    </div>
  );
});

export const todoActions: StateDecoratorActions<State, Actions> = {
  onCreate: (state) =>
    produce(state, (draftState) => {
      const newTodo: TodoItem = {
        title: state.newTitle,
        id: `${draftState.idCount}`,
        completed: false,
      };
      draftState.idCount++;
      draftState.todoMap[newTodo.id] = newTodo;
      draftState.todoIds.push(newTodo.id);
      draftState.newTitle = '';
    }),

  onEdit: (state, [id, title]) =>
    produce(state, (draftState) => {
      draftState.todoMap[id].title = title;
    }),

  onDelete: (state, [id]) =>
    produce(state, (draftState) => {
      delete draftState.todoMap[id];
      draftState.todoIds = draftState.todoIds.filter((todoId) => todoId !== id);
    }),

  onToggle: (state, [id]) =>
    produce(state, (draftState) => {
      const todo = draftState.todoMap[id];
      todo.completed = !todo.completed;
    }),

  onClearCompleted: (state) =>
    produce(state, (draftState) => {
      draftState.todoIds = draftState.todoIds.filter((id) => {
        const todo = draftState.todoMap[id];
        if (todo.completed) {
          delete draftState.todoMap[todo.id];
        }
        return !todo.completed;
      });
    }),

  onSetNewTitle: (s, [newTitle]) => ({
    ...s,
    newTitle,
  }),

  onSetFilter: (s, [filter]) => ({
    ...s,
    filter,
  }),
};

// Container that is managing the state.
export default function TodoContainer() {
  const { state, actions } = useStateDecorator(getInitialState, todoActions);
  const todoProps = pick(state, 'todoMap', 'todoIds', 'filter');

  return (
    <div>
      <Header {...actions} newTitle={state.newTitle} />
      <Todos {...actions} {...todoProps} />
      <Footer {...actions} filter={state.filter} />
    </div>
  );
}
```

## Conflicting actions

Show various ways of handling conflicting actions, ie. asynchronous actions triggered when a previous action of same type is still ongoing.

```typescript
import React, { useMemo } from 'react';
import useStateDecorator, { StateDecoratorActions } from 'state-decorator';

export type State = {
  counter: number;
  text: string;
};

export type Actions = {
  updateText: (text: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
  text: '',
});

interface Props {
  title: string;
  conflictPolicy: ConflictPolicy;
}

function ConflictingActionsContainer(props: Props) {
  const { title, description } = props;

  const actionsImpl = useMemo(() => {
    const actionsImpl: StateDecoratorActions<State, Actions> = {
      updateText: {
        promise: ([text]) => new Promise((res) => setTimeout(res, 1000, text)),
        reducer: (s, text) => ({ ...s, text, counter: s.counter + 1 }),
        conflictPolicy: props.conflictPolicy,
      },
    };
    return actionsImpl;
  }, [props.conflictPolicy]);

  const { state, actions } = useStateDecorator(getInitialState, actionsImpl, props);
  const { counter, text } = state;

  return (
    <div style={{ border: '1px solid grey', marginBottom: 10 }}>
      <h3>{title}</h3>
      <p>{description}</p>
      <div>
        <input onChange={(e) => actions.updateText(e.target.value)} />
      </div>
      <div>Server calls #: {counter}</div>
      <div>Server state: {text}</div>
    </div>
  );
}

export default class ConflictApp extends React.Component {
  render() {
    return (
      <div>
        <ConflictingActionsContainer title="Keep All" conflictPolicy={ConflictPolicy.KEEP_ALL} />
        <ConflictingActionsContainer title="Keep Last" conflictPolicy={ConflictPolicy.KEEP_LAST} />
        <ConflictingActionsContainer title="Ignore" conflictPolicy={ConflictPolicy.IGNORE} />
        <ConflictingActionsContainer title="Reject" conflictPolicy={ConflictPolicy.REJECT} />
      </div>
    );
  }
}
```

## Parallel actions

The _onChange_ action calls are executed in parallel. The map of ongoing action calls is available on _loadingParallelMap_.

```typescript
import React from 'react';
import produce from 'immer';
import useStateDecorator, { StateDecoratorActions, ConflictPolicy, LoadingProps } from 'state-decorator';

type Item = {
  id: string;
  value: string;
};

export type State = {
  items: Item[];
};

export type Actions = {
  onChange: (id: string, value: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  items: [
    {
      id: 'user1',
      value: '',
    },
    {
      id: 'user2',
      value: '',
    },
    {
      id: 'user3',
      value: '',
    },
    {
      id: 'user4',
      value: '',
    },
  ],
});

const ParallelActionsView = (props: State & Actions & LoadingProps<Actions>) => {
  const { items, loadingParallelMap, onChange } = props;
  return (
    <div style={{ border: '1px solid grey', marginBottom: 10 }}>
      <h2>Parallel actions</h2>
      <p>Actions are launched on blur, in parallel for 3s</p>
      {items.map((item) => {
        const isItemLoading = loadingParallelMap.onChange[item.id];
        return (
          <div key={item.id}>
            {item.id}
            <input
              onBlur={(e) => onChange(item.id, e.target.value)}
              disabled={isItemLoading}
              style={{ backgroundColor: isItemLoading ? 'grey' : null }}
            />
          </div>
        );
      })}
    </div>
  );
};

const actionsImpl: StateDecoratorActions<State, Actions> = {
  onChange: {
    promise: ([id, value]) => new Promise((res) => setTimeout(res, 3000, value)),
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    reducer: (s, value, [id]) =>
      produce(s, ({ items }) => {
        items.find((i) => i.id === id).value = value;
      }),
  },
};

export default function ParallelActions() {
  const { state, actions, ...loadingProps } = useStateDecorator(getInitialState, actionsImpl);
  return <ParallelActionsView {...state} {...actions} {...loadingProps} />;
}
```

# Visual Studio Code user snippet

You can add this snippet to quickly create a stateful functional component using the useStateDecorator hook. Click on menu File > Preferences > User Snippets, select typescriptreact.json and add this snippet:

```json
"Create useStateDecoratorComplete types": {
	"prefix": "rUseStateDecorator",
	"body": [
		"import React from 'react';",
		"import useStateDecorator, { StateDecoratorActions, LoadingProps } from 'state-decorator';",
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
		"export const $1View = React.memo(function $1View(p: ViewProps) {",
		"  return (<div>[$1View]</div>);",
		"});",
		"",
		"export const actions$1: StateDecoratorActions<State, Actions, Props> = {};",
		"",
		"export function onMount(actions:$1Actions) {}",
		"",
		"export default React.memo(function $1(p: $1Props) {",
		"  const { state:s, actions:a, loadingMap } = useStateDecorator(getInitialState, actions$1, p, { onMount });",
		"  return <$1View {...p} {...s} {...a} loadingMap={loadingMap} />;",
		"});"
	],
	"description": "Create a new functional component with the useStateDecorator hook"
},
```
