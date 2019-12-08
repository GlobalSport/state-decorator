//React expects requestAnimationFrame to exist
Object.assign(window, {
  requestAnimationFrame: callback => window.setTimeout(callback, 0)
});
