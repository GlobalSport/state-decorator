/**
 * Effect function that sets the first action argument to the specified prop.
 */
export function setArgIn<S, K extends keyof S>(propName: K): (ctx: { s: S; args: [S[K]] }) => Partial<S> {
  return ({ s, args: [v] }) =>
    s[propName] === v
      ? null
      : (({
          [propName]: v,
        } as unknown) as Partial<S>);
}

/**
 * Effect function that sets <code>true</code> in the specified prop.
 */
export function setTrueIn<S, K extends keyof S>(propName: K): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    s[propName]
      ? null
      : (({
          [propName]: true,
        } as unknown) as Partial<S>);
}

/**
 * Effect function that sets <code>false</code> in the specified prop.
 */
export function setFalseIn<S, K extends keyof S>(propName: K): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    !s[propName]
      ? null
      : (({
          [propName]: false,
        } as unknown) as Partial<S>);
}

/**
 * Effect function that sets toggles the boolean value of the specified prop.
 */
export function toggleProp<S, K extends keyof S>(propName: K): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    (({
      [propName]: !s[propName],
    } as unknown) as Partial<S>);
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setMapItem<S, K extends keyof S, T>(propName: K): (ctx: { s: S; args: [string, T] }) => Partial<S> {
  return ({ s, args: [id, v] }) =>
    (({
      [propName]: {
        ...s[propName],
        [id]: v,
      },
    } as unknown) as Partial<S>);
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setArrayItem<S, K extends keyof S, T>(propName: K): (ctx: { s: S; args: [number, T] }) => Partial<S> {
  return ({ s, args: [idx, v] }) => {
    const arr = (s[propName] as any) as T[];

    const newArr = [...arr];
    newArr[idx] = v;
    return ({
      [propName]: newArr,
    } as unknown) as Partial<S>;
  };
}

/**
 * Effect function that sets the asynchronous action result to the specified prop.
 */
export function setResIn<S, K extends keyof S>(propName: K): (ctx: { s: S; res: S[K] }) => Partial<S> {
  return ({ res }) =>
    (({
      [propName]: res,
    } as unknown) as Partial<S>);
}
