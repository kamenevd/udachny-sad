// Локальный запуск vitest в обход node_modules/.vite-temp (root-owned, EACCES).
// Опции продублированы из vitest.config.ts; config:false не даёт vite писать
// временный бандл конфига в node_modules.
import { createVitest } from 'vitest/node';
import react from '@vitejs/plugin-react';

const filters = process.argv.slice(2);

const vitest = await createVitest(
  'test',
  {
    config: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/*.rootowned/**'],
    watch: false,
  },
  {
    plugins: [react()],
    cacheDir: '/tmp/vitest-cache',
    resolve: { alias: { '@': '/src' } },
  },
);

await vitest.start(filters);
await vitest.close();

const files = vitest.state.getFiles();
const failed = files.some(
  (f) => f.result?.state === 'fail' || vitest.state.getFailedFilepaths().includes(f.filepath),
);
process.exit(failed ? 1 : 0);
