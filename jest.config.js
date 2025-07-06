module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/index.ts',
    'backend/services/AuthService.ts',
    'backend/middleware/**/*.ts',
    'backend/utils/**/*.ts'
  ],
};
