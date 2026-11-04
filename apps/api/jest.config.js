module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  // Same alias as tsconfig "paths": tests run from the package sources, so a
  // fresh clone does not need `@loopambiental/database` built first.
  moduleNameMapper: {
    '^@loopambiental/database$': '<rootDir>/../../packages/database/src',
  },
};
