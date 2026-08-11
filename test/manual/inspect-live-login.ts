import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WilmaAuthClient } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const auth = new WilmaAuthClient({
    baseUrl: process.env.WILMA_BASE_URL!,
    usernameField: 'Login',
    passwordField: 'Password'
  });

  const html = await auth.login(process.env.WILMA_USERNAME!, process.env.WILMA_PASSWORD!);
  console.log('children', auth.getChildren().length);
  console.log(JSON.stringify(auth.getChildren(), null, 2));

  const childId = process.env.WILMA_CHILD_ID!;
  const marker = html.indexOf(childId);
  console.log('--- CHILD MARKER ---');
  console.log(marker);
  if (marker >= 0) {
    const snippet = html.slice(Math.max(0, marker - 3000), marker + 6000);
    console.log(snippet);
  }

  await auth.logout();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
