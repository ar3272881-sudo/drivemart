const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const views = walk(path.join(__dirname, '..', 'views')).filter((file) => file.endsWith('.ejs'));
for (const file of views) ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
console.log(`Compiled ${views.length} EJS templates successfully.`);
