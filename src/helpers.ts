/**
 * Effect function that sets the first action argument to the specified prop.
 */
export function setArgIn<S, K extends keyof S>(propName: K): (ctx: { s: S; args: [S[K]] }) => S {
  return ({ s, args: [v] }) =>
    s[propName] === v
      ? null
      : {
          ...s,
          [propName]: v,
        };
}

/**
 * Effect function that sets <code>true</code> in the specified prop.
 */
export function setTrueIn<S, K extends keyof S>(propName: K): (ctx: { s: S }) => S {
  return ({ s }) =>
    s[propName]
      ? null
      : {
          ...s,
          [propName]: true,
        };
}

/**
 * Effect function that sets <code>false</code> in the specified prop.
 */
export function setFalseIn<S, K extends keyof S>(propName: K): (ctx: { s: S }) => S {
  return ({ s }) =>
    !s[propName]
      ? null
      : {
          ...s,
          [propName]: false,
        };
}

/**
 * Effect function that sets toggles the boolean value of the specified prop.
 */
export function toggleProp<S, K extends keyof S>(propName: K): (ctx: { s: S }) => S {
  return ({ s }) => ({
    ...s,
    [propName]: !s[propName],
  });
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setMapItem<S, K extends keyof S, T>(propName: K): (ctx: { s: S; args: [string, T] }) => S {
  return ({ s, args: [id, v] }) => ({
    ...s,
    [propName]: {
      ...s[propName],
      [id]: v,
    },
  });
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setArrayItem<S, K extends keyof S, T>(propName: K): (ctx: { s: S; args: [number, T] }) => S {
  return ({ s, args: [idx, v] }) => {
    const arr = (s[propName] as any) as T[];

    const newArr = [...arr];
    newArr[idx] = v;
    return {
      ...s,
      [propName]: newArr,
    };
  };
}

/**
 * Effect function that sets the asynchronous action result to the specified prop.
 */
export function setResIn<S, K extends keyof S>(propName: K): (ctx: { s: S; res: S[K] }) => S {
  return ({ s, res }) => ({
    ...s,
    [propName]: res,
  });
}
