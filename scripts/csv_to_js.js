const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'data.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');

const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');

const numericFields = ['learning_gains', 'presence', 'cognitive_load'];

const data = lines.slice(1).map(line => {
  const values = line.split(',');
  const obj = {};
  headers.forEach((header, index) => {
    let value = values[index];
    if (numericFields.includes(header.trim())) {
      value = parseFloat(value);
    } else {
      value = value.trim();
    }
    obj[header.trim()] = value;
  });
  return obj;
});

process.stdout.write(`const globalData = ${JSON.stringify(data, null, 2)};\n`);
