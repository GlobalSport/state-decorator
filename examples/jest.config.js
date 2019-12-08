module.exports = {
  collectCoverage: false,
  coverageDirectory: 'tests/reports',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/jest', '/.history/'],
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  setupFiles: ['<rootDir>/jest/shims.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
  testRegex: '/tests/.*/*.test.tsx?$',
  testPathIgnorePatterns: ['server', '/__snapshots__/', '/.history/', '/node_modules/', '/jest/'],
  transformIgnorePatterns: ['/node_modules/(?!@mycoach).+\\.js$', '.+\\.json$'],
  transform: {
    '.(ts|tsx|js)': 'babel-jest',
  },
};
