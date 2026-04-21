import { build } from 'esbuild';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['@prisma/client', 'bcrypt', 'jwks-rsa', 'jose'],
};

await Promise.all([
  build({
    ...sharedConfig,
    entryPoints: ['api/_index.ts'],
    outfile: 'api/_index.bundle.js',
  }),
  build({
    ...sharedConfig,
    entryPoints: ['api/_cron.ts'],
    outfile: 'api/_cron.bundle.js',
  }),
]);

console.log('Bundle complete');
