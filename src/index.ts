import useStateDecorator from './useStateDecorator';
import { StateDecoratorActions } from './types';
import { useOnMount, useOnUnmount, useOnUnload } from './hooks';

import StateDecorator from './StateDecorator';

export { StateDecoratorActions, StateDecorator, useOnMount, useOnUnmount, useOnUnload };

export default useStateDecorator;
