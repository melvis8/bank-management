const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: [
        'src/config/swagger.js',
        'src/routes/**/*.js',
        'src/config/redis.js',
        'src/config/database.js'
      ],
    },
  },
});
