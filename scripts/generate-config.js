const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const outPath = path.join(root, 'config.js');

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^['"]|['"]$/g, '').trim();
  }

  return values;
}

if (!fs.existsSync(envPath)) {
  throw new Error('Missing .env file in project root.');
}

const env = parseEnv(envPath);
const url = env.SUPABASE_URL || '';
const anonKey = env.SUPABASE_ANON_KEY || '';

const output = `window.SUPABASE_URL = ${JSON.stringify(url)};\nwindow.SUPABASE_ANON_KEY = ${JSON.stringify(anonKey)};\n`;
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Generated ${path.relative(root, outPath)} from ${path.relative(root, envPath)}`);
