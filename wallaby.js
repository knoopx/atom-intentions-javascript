module.exports = (wallaby) => {
  return {
    testFramework: 'jest',
    files: ['lib/*.js'],
    tests: ['spec/*.spec.js'],
    debug: true,
    env: {
      type: 'node',
      runner: 'node', // or full path to any node executable
    },
    setup: () => {
      global.expect = require('expect')
      wallaby.testFramework.configure();
    },
    compilers: {
      '**/*.js': wallaby.compilers.babel(),
    },
  }
}
