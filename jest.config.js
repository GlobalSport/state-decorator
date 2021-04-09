module.exports = {
  collectCoverage: true,
  coverageDirectory: 'tests/reports',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/jest', '/.history/'],
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  setupFiles: ['<rootDir>/jest/shims.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
  testRegex: '/tests/.*/*.test.tsx?$',
  testPathIgnorePatterns: ['/.history/', '/node_modules/', '/jest/'],
  transform: {
    '.(ts|tsx|js)': 'babel-jest',
  },
};
