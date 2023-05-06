import globalClassNames from './style.d';
declare const classNames: typeof globalClassNames & {
  readonly root: 'root';
  readonly paper: 'paper';
  readonly tabs: 'tabs';
  readonly content: 'content';
  readonly btn: 'btn';
};
export = classNames;
