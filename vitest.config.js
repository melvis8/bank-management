const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only run tests from the canonical tests/ folder.
    // The bank-management-frontend-main/ directory is a legacy duplicate and excluded.
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**', 'bank-management-frontend-main/**', 'frontend/**'],
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
