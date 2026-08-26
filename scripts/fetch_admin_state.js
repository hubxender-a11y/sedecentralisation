const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async function(){
  try {
    const res = await fetch('http://localhost:3001/api/admin/state');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch failed', err);
    process.exit(1);
  }
})();
