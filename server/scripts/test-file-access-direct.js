import { getFileMetadata, getFileStream } from '../src/services/google/drive.js';

async function testFileAccess(fileId) {
  console.log(`Testing file access for: ${fileId}\n`);
  
  try {
    console.log('1. Testing getFileMetadata...');
    const metadata = await getFileMetadata(fileId);
    console.log('   ✓ Success! Metadata:', metadata);
    
    console.log('\n2. Testing getFileStream...');
    const stream = await getFileStream(fileId);
    console.log('   ✓ Success! Stream created');
    
    // Read a small chunk to verify it works
    return new Promise((resolve, reject) => {
      let chunkCount = 0;
      stream.on('data', (chunk) => {
        chunkCount++;
        if (chunkCount === 1) {
          console.log(`   ✓ Received first chunk (${chunk.length} bytes)`);
          stream.destroy(); // Stop reading
          resolve(true);
        }
      });
      stream.on('error', (err) => {
        console.error('   ✗ Stream error:', err.message);
        reject(err);
      });
      stream.on('end', () => {
        if (chunkCount === 0) {
          console.log('   ⚠ Stream ended without data');
        }
        resolve(true);
      });
    });
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Status:', error.statusCode);
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Get file ID from command line
const fileId = process.argv[2];

if (!fileId) {
  console.error('Usage: node test-file-access-direct.js <file-id>');
  console.error('\nExample:');
  console.error('  node test-file-access-direct.js 1-vb5HHW9mH7hCxVLLQ_Z9Iqmy4k3Ew92');
  process.exit(1);
}

testFileAccess(fileId)
  .then(() => {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Tests failed:', error);
    process.exit(1);
  });


