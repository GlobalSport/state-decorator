import { useEffect } from 'react';

/**
 * Hook to execute a function when hook is mounted.
 * @param onMount function to execute on the hook nount
 */
export function useOnMount(onMount: () => any) {
  useEffect(() => {
    const removeListener = onMount();
    return typeof removeListener === 'function' ? removeListener : undefined;
  }, []);
}

/**
 * Hook to execute a function when hook is unmounted.
 * @param onUnMount function to execute on the hook nount
 */
export function useOnUnmount(onUnmount: () => void, propList: any[] = []) {
  useEffect(() => {
    return onUnmount;
  }, propList);
}

/**
 * Hook to execute a function when hook is unmounted.
 * @param onUnMount function to execute on the hook nount
 */
export function useOnUnload(onUnload: () => void) {
  useEffect(() => {
    document.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('beforeunload', onUnload);
    };
  }, []);
}
