const { copyFileSync, existsSync, readdirSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frontend = path.resolve(__dirname, '../../opencollective-frontend/lib/graphql');
if (!existsSync(path.join(frontend, 'schema.graphql'))) {
  throw new Error('Local frontend schemas are unavailable; use npm run graphql:update to fetch published schemas.');
}
const outputs = readdirSync(frontend)
  .filter((file) => file.endsWith('.graphql'))
  .map((file) => {
    const target = path.resolve(__dirname, '../src/graphql', file);
    copyFileSync(path.join(frontend, file), target);
    return target;
  });
const result = spawnSync(path.resolve(__dirname, '../node_modules/.bin/prettier'), ['--write', ...outputs], {
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
