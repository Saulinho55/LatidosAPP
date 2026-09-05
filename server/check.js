const sql = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await sql();
  const db = new SQL.Database(fs.readFileSync('latidos.db'));
  const res = db.exec('SELECT email, latidos FROM users');
  console.log(JSON.stringify(res, null, 2));
})();
