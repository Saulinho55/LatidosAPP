import fs from 'fs';
const files = ['src/context/LatidosContext.jsx', 'src/data/db.js'];
files.forEach(f => {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(/\\`/g, '`');
  fs.writeFileSync(f, data);
});
