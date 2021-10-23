module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@rad/(.*)$": "<rootDir>/pkg/$1/src",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: [
    "**/tests/*/src/**/(*.)+(spec|test).[tj]s?(x)",
    "**/pkg/*/src/**/(*.)+(spec|test).[tj]s?(x)",
  ],
  coverageThreshold: {
    global: {
      statements: 100,
    },
  },
};
