import globalClassNames from './style.d';
declare const classNames: typeof globalClassNames & {
  readonly btn: 'btn';
  readonly box: 'box';
};
export = classNames;
