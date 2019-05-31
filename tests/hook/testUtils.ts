export function getTimeoutPromise<C>(timeout: number, result: C = null) {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

export function getFailedTimeoutPromise<C>(timeout: number, err: C = null) {
  return new Promise((_, rej) => {
    setTimeout(rej, timeout, err);
  });
}
