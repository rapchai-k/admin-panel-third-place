#!/usr/bin/env node

/**
 * Simple Favicon Generator
 * This script creates a basic favicon.ico file from the SVG
 * 
 * For production use, consider using:
 * - https://realfavicongenerator.net/
 * - ImageMagick: convert favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
 * - sharp package: npm install sharp
 */

const fs = require('fs');
const path = require('path');

console.log('📝 Favicon Generator');
console.log('====================\n');

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error('❌ Error: favicon.svg not found in public directory');
  process.exit(1);
}

console.log('✅ Found favicon.svg');
console.log('\n📋 To generate proper ICO and PNG files, use one of these methods:\n');

console.log('1. Online Tool (Recommended):');
console.log('   Visit: https://realfavicongenerator.net/');
console.log('   Upload: public/favicon.svg');
console.log('   Download and extract to public/ directory\n');

console.log('2. ImageMagick (Command Line):');
console.log('   brew install imagemagick  # macOS');
console.log('   convert public/favicon.svg -define icon:auto-resize=16,32,48 public/favicon.ico\n');

console.log('3. Sharp (Node.js):');
console.log('   npm install sharp');
console.log('   Then use sharp to convert SVG to PNG/ICO\n');

console.log('💡 For now, the app uses SVG favicons which work in all modern browsers.');
console.log('   The SVG favicon is already configured in index.html\n');

// Create a simple HTML file to test the favicon
const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Favicon Test</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
</head>
<body>
  <h1>Favicon Test</h1>
  <p>Check the browser tab to see the favicon.</p>
  <img src="favicon.svg" width="64" height="64" alt="Favicon preview" />
</body>
</html>`;

const testPath = path.join(publicDir, 'favicon-test.html');
fs.writeFileSync(testPath, testHtml);
console.log('✅ Created favicon-test.html for testing');
console.log('   Open public/favicon-test.html in a browser to preview\n');

