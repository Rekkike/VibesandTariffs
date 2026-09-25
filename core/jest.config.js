module.exports = {
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/test/register_port_data.ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov']
};
