import axios from 'axios';

const baseUrl = process.argv[2] || 'https://ouka.inschool.fi';

async function checkVersion() {
  try {
    const res = await axios.get(`${baseUrl}/index_json`);
    console.log('ApiVersion:', res.data?.ApiVersion);
    console.log('Full response:', JSON.stringify(res.data, null, 2).substring(0, 500));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkVersion();
