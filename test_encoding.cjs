const fs = require('fs');
const path = require('path');

const citiesText = fs.readFileSync('./src/data/cities.ts', 'utf8');
console.log('First 200 chars:', citiesText.substring(0, 200));
// Find the beijing block
const beijingMatch = citiesText.match(/id:\s*'beijing'[\s\S]*?name:\s*'([^']+)'/);
if (beijingMatch) {
  console.log('Beijing name match:', beijingMatch[1]);
  console.log('Beijing name char codes:', [...beijingMatch[1]].map(c => c.charCodeAt(0)));
} else {
  console.log('No match');
}
// Also try to see what the file looks like around that area
const idx = citiesText.indexOf('id:\'beijing\'');
if (idx !== -1) {
  console.log('Context:', citiesText.substring(idx-50, idx+200));
}