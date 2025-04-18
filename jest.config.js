module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  roots: ['<rootDir>/packages/backend/src'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8'
};