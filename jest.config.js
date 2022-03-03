module.exports = {
  collectCoverage: true,
  coverageDirectory: 'tests/reports',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/jest', '/.history/'],
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
  testRegex: '/tests/.*/*.test.tsx?$',
  testPathIgnorePatterns: ['/.history/', '/node_modules/', '/jest/'],
  transform: {
    '.(ts|tsx|js)': [
      '@swc/jest',
      {
        sourceMaps: 'inline',
        jsc: {
          parser: {
            tsx: true,
            syntax: 'typescript',
          },
          transform: {
            react: {
              importSource: 'react',
              runtime: 'automatic',
              throwIfNamespace: true,
              useBuiltins: true,
            },
          },
        },
      },
    ],
  },
  testEnvironment: 'jsdom',
};
