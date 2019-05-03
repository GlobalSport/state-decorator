import { retryDecorator, PromiseProvider } from '../src/StateDecorator';

describe('retryDecorator', () => {
  it('3 retries, immediate success', () => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f: PromiseProvider<any, any, any, any> = ([arg1, arg2]) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3)([arg1, arg2], null, null, null);
  });

  it('3 retries, 1 error, 1 success', () => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    let count = 1;
    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      if (count++ === 1) {
        return Promise.reject(new TypeError());
      }
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3, 0)([arg1, arg2], null, null, null).then((res) => expect(res).toBe('OK'));
  });

  it('3 retries, 3 failures', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      return Promise.reject(new TypeError());
    };

    return retryDecorator(f, 3, 0)([arg1, arg2], null, null, null)
      .then(() => done.fail())
      .catch((e) => {
        expect(e).toBeInstanceOf(TypeError);
        done();
      });
  });

  it('3 retries, 1 different failure', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      throw new Error();
    };

    return retryDecorator(f, 3)([arg1, arg2], null, null, null)
      .then(() => done.fail())
      .catch((e) => {
        expect(e).not.toBeInstanceOf(TypeError);
        done();
      });
  });

  it('3 retries, 1 retry error', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const isRetryError = (e: Error) => {
      return e.message === 'OK';
    };

    let count = 1;
    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      if (count++ === 1) {
        return Promise.reject(new Error('OK'));
      }
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3, 0, isRetryError)([arg1, arg2], null, null, null)
      .then((res) => {
        expect(res).toEqual('OK');
        done();
      })
      .catch(done.fail);
  });
});
