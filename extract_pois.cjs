const fs = require('fs');
const path = require('path');

function extractPois(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Regex to capture id and name where id contains a hyphen
  const regex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g;
  const pois = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const name = match[2];
    if (id.includes('-')) {
      pois.push({ id, name });
    }
  }
  return pois;
}

// We need to know city name for each poi. For cities.ts, we can also extract city name per poi by parsing city blocks.
// Let's instead extract city blocks and then pois within them.
function extractPoisWithCity(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Split by '},' to get city blocks (each ends with '},' except last)
  // But we need to be careful about nested commas inside pois array.
  // Instead, we can find all city objects by looking for '{' that starts with 'id:' and ends with '},' before a new city or end of array.
  // Given time, we'll use the same regex but also capture nearby city name? Too complex.
  // We'll assume that for cities.ts, the poi id prefix corresponds to city ID, and we can map prefix to city name using a separate map.
  // Let's build city map by extracting city id and name.
  const cityRegex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g;
  const cityMap = {};
  let cityMatch;
  while ((cityMatch = cityRegex.exec(content)) !== null) {
    const cid = cityMatch[1];
    const cname = cityMatch[2];
    // Exclude those where id contains '-' (likely pois)
    if (!cid.includes('-')) {
      cityMap[cid] = cname;
    }
  }
  // Now extract pois
  const pois = [];
  const poiRegex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g;
  let poiMatch;
  while ((poiMatch = poiRegex.exec(content)) !== null) {
    const pid = poiMatch[1];
    const pname = poiMatch[2];
    if (pid.includes('-')) {
      // Determine city ID from prefix before first '-'
      const prefix = pid.split('-')[0];
      const cityName = cityMap[prefix];
      if (cityName) {
        pois.push({ id: pid, name: pname, cityName });
      } else {
        // fallback: maybe prefix is not exact city ID; we can try to find a city ID that starts with prefix?
        // For now, skip.
        console.warn(`Could not map poi ${pid} to city (prefix ${prefix})`);
      }
    }
  }
  return pois;
}

function extractPoisWithCityExtra(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Build city map from extra city IDs (we know them)
  const extraCityMap = {
    cs: '长沙',
    heb: '哈尔滨',
    xm: '厦门',
    sz: '苏州',
    dh: '敦煌',
    zjjs: '张家界',
    ls: '拉萨',
    sy: '三亚',
    py: '平遥',
    wy: '婺源',
    fh: '凤凰'
  };
  const pois = [];
  const poiRegex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g;
  let poiMatch;
  while ((poiMatch = poiRegex.exec(content)) !== null) {
    const pid = poiMatch[1];
    const pname = poiMatch[2];
    if (pid.includes('-')) {
      const prefix = pid.split('-')[0];
      const cityName = extraCityMap[prefix];
      if (cityName) {
        pois.push({ id: pid, name: pname, cityName });
      } else {
        console.warn(`Could not map extra poi ${pid} to city (prefix ${prefix})`);
      }
    }
  }
  return pois;
}

const citiesPois = extractPoisWithCity('./src/data/cities.ts');
const extraPois = extractPoisWithCityExtra('./src/data/extraPois.ts');
const allPois = [...citiesPois, ...extraPois];

console.log(`Found ${allPois.length} POIs with city names.`);

// Build set of city names
const cityNames = [...new Set(allPois.map(p => p.cityName))];
console.log(`Unique city names: ${cityNames.length}`);

const baseDir = path.resolve('./public/images/poi');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Create directories
for (const cityName of cityNames) {
  const cityDir = path.join(baseDir, cityName);
  if (!fs.existsSync(cityDir)) {
    fs.mkdirSync(cityDir, { recursive: true });
    console.log(`Created directory: ${cityDir}`);
  }
}

// Create placeholders and mapping
const mapping = [];
for (const poi of allPois) {
  const cityDir = path.join(baseDir, poi.cityName);
  const fileName = poi.name + '.jpg';
  const filePath = path.join(cityDir, fileName);
  if (!fs.existsSync(filePath)) {
    const whiteJpgSrc = path.join(baseDir, 'beijing', 'bj-gugong.jpg');
    let whiteJpgBuffer;
    if (fs.existsSync(whiteJpgSrc)) {
      whiteJpgBuffer = fs.readFileSync(whiteJpgSrc);
    } else {
      // generate minimal white JPG
      whiteJpgBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x33, 0x34, 0x34, 0x34, 0x34, 0x37, 0x37, 0x37, 0x37,
        0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0xFF,
        0xC0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x22, 0x00,
        0x02, 0x11, 0x01, 0x03, 0x01, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x13, 0x03, 0x14, 0x04,
        0x21, 0x31, 0x41, 0x51, 0x61, 0x71, 0x81, 0x91, 0xA1, 0x02, 0x11, 0x21,
        0x31, 0x41, 0x52, 0x62, 0x72, 0x82, 0x92, 0xA2, 0xB2, 0xC2, 0xD2, 0xE2,
        0xF2, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D,
        0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
        0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01,
        0x00, 0x02, 0x03, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
        0xFF, 0xD9
      ]);
    }
    fs.writeFileSync(filePath, whiteJpgBuffer);
    console.log(`Created placeholder: ${filePath}`);
  }
  mapping.push({ poiId: poi.id, poiName: poi.name, cityName: poi.cityName, filePath });
}

// Write mapping table
const mappingPath = path.resolve('./POI_image_mapping.txt');
let mappingText = 'POI ID\tCity Name\tPOI Name (Chinese)\tImage File Path\n';
for (const m of mapping) {
  mappingText += `${m.poiId}\t${m.cityName}\t${m.poiName}\t${m.filePath}\n`;
}
fs.writeFileSync(mappingPath, mappingText);
console.log(`Mapping table written to: ${mappingPath}`);
console.log(`Done.`);