// jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/test/**/*.test.js",
    "<rootDir>/test/**/*.spec.js",
    "<rootDir>/**/__tests__/**/*.js",
  ],
  collectCoverageFrom: [
    "app.js",
    "routes/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 10000,
  verbose: true,
};
