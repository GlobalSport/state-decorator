function addDirty<S, K extends keyof S>(s: any, dirtyProp?: K) {
  if (dirtyProp) {
    (s[dirtyProp] as any) = true;
  }
  return (s as unknown) as Partial<S>;
}

/**
 * Effect function that sets the first action argument to the specified prop.
 * if dirtyProp is set
 */
export function setArgIn<S, K extends keyof S, K2 extends keyof S>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; args: [S[K]] }) => Partial<S> {
  return ({ s, args: [v] }) =>
    s[propName] === v
      ? null
      : addDirty<S, any>(
          {
            [propName]: v,
          },
          dirtyProp
        );
}

/**
 * Effect function that sets <code>true</code> in the specified prop.
 */
export function setTrueIn<S, K extends keyof S, K2 extends keyof S>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    s[propName]
      ? null
      : addDirty<S, any>(
          {
            [propName]: true,
          },
          dirtyProp
        );
}

/**
 * Effect function that sets <code>false</code> in the specified prop.
 */
export function setFalseIn<S, K extends keyof S, K2 extends keyof S>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    !s[propName]
      ? null
      : addDirty<S, any>(
          {
            [propName]: false,
          },
          dirtyProp
        );
}

/**
 * Effect function that sets toggles the boolean value of the specified prop.
 */
export function toggleProp<S, K extends keyof S, K2 extends keyof S>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S }) => Partial<S> {
  return ({ s }) =>
    addDirty<S, any>(
      {
        [propName]: !s[propName],
      },
      dirtyProp
    );
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setArgsInMap<S, K extends keyof S, K2 extends keyof S, T>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; args: [string, T] }) => Partial<S> {
  return ({ s, args: [id, v] }) =>
    addDirty<S, any>(
      {
        [propName]: {
          ...s[propName],
          [id]: v,
        },
      },
      dirtyProp
    );
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setArgsInArray<S, K extends keyof S, K2 extends keyof S, T>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; args: [number, T] }) => Partial<S> {
  return ({ s, args: [idx, v] }) => {
    const arr = (s[propName] as any) as T[];

    const newArr = [...arr];
    newArr[idx] = v;
    return addDirty<S, any>(
      {
        [propName]: newArr,
      },
      dirtyProp
    );
  };
}

/**
 * Effect function that sets the asynchronous action result to the specified prop.
 */
export function setResIn<S, K extends keyof S, K2 extends keyof S>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; res: S[K] }) => Partial<S> {
  return ({ res }) =>
    addDirty<S, any>(
      {
        [propName]: res,
      },
      dirtyProp
    );
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setResInArray<S, K extends keyof S, K2 extends keyof S, T>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; args: [number]; res: T }) => Partial<S> {
  return ({ s, args: [idx], res }) => {
    const arr = (s[propName] as any) as T[];

    const newArr = [...arr];
    newArr[idx] = res;
    return addDirty<S, any>(
      {
        [propName]: newArr,
      },
      dirtyProp
    );
  };
}

/**
 * Effect function that sets the update the specifed prop as an array using first action argument as index
 * and second as value to set.
 */
export function setResInMap<S, K extends keyof S, K2 extends keyof S, T>(
  propName: K,
  dirtyProp?: K2
): (ctx: { s: S; args: [string]; res: T }) => Partial<S> {
  return ({ s, args: [id], res }) =>
    addDirty<S, any>(
      {
        [propName]: {
          ...s[propName],
          [id]: res,
        },
      },
      dirtyProp
    );
}
