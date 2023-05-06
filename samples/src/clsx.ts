export default function clsx(...args: (string | { [className: string]: boolean })[]): string {
  return args
    .reduce<string[]>((acc, arg) => {
      if (arg == null) {
        return acc;
      }

      if (typeof arg === 'string') {
        acc.push(arg);
      } else {
        Object.keys(arg).forEach((cls) => {
          if (arg[cls]) {
            acc.push(cls);
          }
        });
      }
      return acc;
    }, [])
    .join(' ');
}
