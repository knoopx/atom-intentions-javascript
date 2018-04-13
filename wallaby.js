module.exports = (wallaby) => {
  return {
    files: ['lib/*.js'],
    tests: ['spec/*.spec.js'],
    debug: true,
    env: {
      type: 'node',
      runner: 'node', // or full path to any node executable
    },
    setup: () => {
      global.expect = require('expect')
    },
    compilers: {
      '**/*.js': wallaby.compilers.babel({
        babel: require('babel-core'),
        babelrc: true,
      }),
    },
  }
}
