module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: [
    "**/tests/*/src/**/(*.)+(spec|test).[tj]s?(x)",
    "**/pkg/*/src/**/(*.)+(spec|test).[tj]s?(x)",
  ],
};
