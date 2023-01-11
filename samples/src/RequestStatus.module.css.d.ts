import globalClassNames from './style.d';
declare const classNames: typeof globalClassNames & {
  readonly icon: 'icon';
  readonly paused: 'paused';
  readonly succeeded: 'succeeded';
  readonly aborted: 'aborted';
  readonly errored: 'errored';
};
export = classNames;
