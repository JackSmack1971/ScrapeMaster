import { validateEnv } from '../validateEnv';

describe('validateEnv', () => {
  it('should not throw when JWT_SECRET is set', () => {
    process.env.JWT_SECRET = 'abc';
    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw when JWT_SECRET is missing', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow('JWT_SECRET');
    if (original) {
      process.env.JWT_SECRET = original;
    }
  });
});

