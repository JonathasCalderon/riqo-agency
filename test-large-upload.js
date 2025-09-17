#!/usr/bin/env node

/**
 * Test script for verifying large file upload functionality
 * This script creates a test CSV file larger than 4.5MB and tests the upload
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_FILE_SIZE_MB = 6; // Create a 6MB test file
const OUTPUT_FILE = 'test-large-file.csv';
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Generate a large CSV file for testing
function generateLargeCSV(sizeInMB) {
  console.log(`🔧 Generating ${sizeInMB}MB test CSV file...`);
  
  const targetSizeBytes = sizeInMB * 1024 * 1024;
  const header = 'id,name,email,company,department,salary,hire_date,status\n';
  
  let csvContent = header;
  let currentSize = Buffer.byteLength(header, 'utf8');
  let rowCount = 0;
  
  // Sample data templates
  const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
  const companies = ['TechCorp', 'DataSoft', 'InnovateLab', 'FutureTech', 'SmartSolutions'];
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
  const statuses = ['Active', 'Inactive', 'Pending', 'On Leave'];
  
  while (currentSize < targetSizeBytes) {
    const name = names[rowCount % names.length];
    const email = `user${rowCount}@example.com`;
    const company = companies[rowCount % companies.length];
    const department = departments[rowCount % departments.length];
    const salary = Math.floor(Math.random() * 100000) + 30000;
    const hireDate = new Date(2020 + Math.floor(Math.random() * 4), 
                             Math.floor(Math.random() * 12), 
                             Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
    const status = statuses[rowCount % statuses.length];
    
    const row = `${rowCount + 1},"${name}","${email}","${company}","${department}",${salary},"${hireDate}","${status}"\n`;
    
    csvContent += row;
    currentSize += Buffer.byteLength(row, 'utf8');
    rowCount++;
    
    // Progress indicator
    if (rowCount % 10000 === 0) {
      const currentMB = (currentSize / 1024 / 1024).toFixed(2);
      console.log(`   Generated ${rowCount} rows (${currentMB}MB)`);
    }
  }
  
  fs.writeFileSync(OUTPUT_FILE, csvContent);
  const finalSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Generated test file: ${OUTPUT_FILE} (${finalSize}MB, ${rowCount} rows)`);
  
  return OUTPUT_FILE;
}

// Test the upload functionality
async function testUpload(filePath) {
  console.log(`\n🧪 Testing upload to ${BASE_URL}...`);
  
  try {
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    console.log(`📤 Uploading ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB)...`);
    
    // Step 1: Get upload URL
    console.log('1️⃣ Getting upload URL...');
    const uploadUrlResponse = await fetch(`${BASE_URL}/api/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: fileName,
        contentType: 'text/csv',
        size: fileBuffer.length
      })
    });
    
    if (!uploadUrlResponse.ok) {
      throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status}`);
    }
    
    const { uploadUrl, blobUrl, uploadId } = await uploadUrlResponse.json();
    console.log(`   ✅ Got upload URL for ID: ${uploadId}`);
    
    // Step 2: Upload to blob storage
    console.log('2️⃣ Uploading to blob storage...');
    const blobUploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': 'text/csv',
      }
    });
    
    if (!blobUploadResponse.ok) {
      throw new Error(`Failed to upload to blob: ${blobUploadResponse.status}`);
    }
    
    console.log('   ✅ File uploaded to blob storage');
    
    // Step 3: Trigger processing
    console.log('3️⃣ Starting file processing...');
    const processResponse = await fetch(`${BASE_URL}/api/process-blob`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobUrl,
        uploadId,
        filename: fileName
      })
    });
    
    if (!processResponse.ok) {
      throw new Error(`Failed to start processing: ${processResponse.status}`);
    }
    
    console.log('   ✅ Processing started');
    
    // Step 4: Poll for completion
    console.log('4️⃣ Monitoring processing status...');
    await pollStatus(uploadId);
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    return false;
  }
}

// Poll upload status
async function pollStatus(uploadId) {
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/api/upload-blob/status/${uploadId}`);
      const status = await response.json();
      
      if (!response.ok) {
        throw new Error(status.error || 'Failed to check status');
      }
      
      console.log(`   📊 Status: ${status.status}${status.rows_processed ? ` (${status.rows_processed} rows)` : ''}`);
      
      if (status.status === 'completed') {
        console.log('   ✅ Processing completed successfully!');
        return true;
      } else if (status.status === 'failed') {
        throw new Error(status.error_message || 'Processing failed');
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
    } catch (error) {
      console.error('   ❌ Status check failed:', error.message);
      return false;
    }
  }
  
  console.log('   ⏰ Timeout waiting for processing to complete');
  return false;
}

// Main execution
async function main() {
  console.log('🚀 Large File Upload Test\n');
  
  // Check if we need to generate a test file
  if (!fs.existsSync(OUTPUT_FILE)) {
    generateLargeCSV(TEST_FILE_SIZE_MB);
  } else {
    const existingSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
    console.log(`📁 Using existing test file: ${OUTPUT_FILE} (${existingSize}MB)`);
  }
  
  // Test the upload
  const success = await testUpload(OUTPUT_FILE);
  
  if (success) {
    console.log('\n🎉 Large file upload test PASSED!');
    console.log('Your blob storage setup is working correctly.');
  } else {
    console.log('\n❌ Large file upload test FAILED!');
    console.log('Please check your blob storage configuration.');
  }
  
  // Cleanup
  console.log(`\n🧹 Cleaning up test file: ${OUTPUT_FILE}`);
  fs.unlinkSync(OUTPUT_FILE);
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateLargeCSV, testUpload };
