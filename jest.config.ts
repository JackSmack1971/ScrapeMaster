import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend', '<rootDir>/src/tests'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/**/*.ts',
    'src/**/*.ts',
    '!**/AGENTS.md'
  ]
};

export default config;
