import shallow from '../src/shallow';

describe('shallow', () => {
  it('Set is compared shallowly', () => {
    const set1 = new Set();
    const set2 = new Set();
    expect(shallow(set1, null)).toBeFalsy();
    expect(shallow(null, set1)).toBeFalsy();
    expect(shallow(set1, set2)).toBeFalsy();
    expect(shallow(set1, set1)).toBeTruthy();
  });
});
