export function getFailedTimeoutPromise(timeout: number, err: Error = null, id: string): Promise<string> {
  return new Promise((_, rej) => {
    setTimeout(rej, timeout, err);
  });
}

export function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}
