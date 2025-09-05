const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('Testing temp directory creation...');
console.log('System temp dir:', os.tmpdir());

const testDir = path.join(os.tmpdir(), 'riqo-uploads', 'test-' + Date.now());
console.log('Test directory:', testDir);

try {
  fs.mkdirSync(testDir, { recursive: true });
  console.log('✅ Test directory created successfully');
  
  // Test file creation
  const testFile = path.join(testDir, 'test.txt');
  fs.writeFileSync(testFile, 'test content');
  console.log('✅ Test file created successfully');
  
  // Clean up
  fs.rmSync(testDir, { recursive: true });
  console.log('✅ Test directory cleaned up');
  
  console.log('All temp directory tests passed!');
} catch (error) {
  console.error('❌ Temp directory test failed:', error);
}
