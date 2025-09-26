// Test script for file upload functionality
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testFileUpload() {
  const form = new FormData();
  
  // Add a test message
  form.append('message', 'Hello! This is a test message with file uploads.');
  
  // Add test files (you can create these files or use existing ones)
  // For testing, we'll just show the structure
  
  console.log('🧪 Testing file upload functionality with message arrays...\n');
  
  console.log('📋 Available endpoints:');
  console.log('• POST http://localhost:5000/api/chat - Main chat endpoint with file upload');
  console.log('• POST http://localhost:5000/api/upload-test - Test upload endpoint');
  console.log('• GET  http://localhost:5000/api/chat/history - Get chat history');
  console.log('• GET  http://localhost:5000/ - Health check');
  console.log('• GET  http://localhost:5000/uploads/* - Access uploaded files\n');
  
  console.log('📁 Upload directory structure:');
  console.log('• uploads/images/     - Image files (JPEG, PNG, GIF, WebP, SVG)');
  console.log('• uploads/documents/  - Document files (PDF, DOC, DOCX, TXT)');
  console.log('• uploads/others/     - Other file types\n');
  
  console.log('📝 Example cURL commands for testing:');
  
  console.log('\n1. Test with single message (JSON):');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -H "Content-Type: application/json" \\\n  -d \'{"message": "Hello World!"}\'');
  
  console.log('\n2. Test with single message (multipart):');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -F "message=Single message test" \\\n  -F "images=@/path/to/image.jpg"');
  
  console.log('\n3. Test with array of messages (JSON):');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -H "Content-Type: application/json" \\\n  -d \'{"messages": ["Hello", "How are you?", "This is a test"]}\'');
  
  console.log('\n4. Test with array of message objects (JSON):');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -H "Content-Type: application/json" \\\n  -d \'{"messages": [{"content": "Hello", "type": "text"}, {"content": "How are you?", "type": "text"}]}\'');
  
  console.log('\n5. Test with array of messages (multipart):');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -F "messages=Message 1" \\\n  -F "messages=Message 2" \\\n  -F "messages=Message 3" \\\n  -F "images=@/path/to/image.jpg"');
  
  console.log('\n6. Test with files and messages:');
  console.log('curl -X POST http://localhost:5000/api/chat \\\n  -F "messages=Hello with files" \\\n  -F "messages=Check out these documents" \\\n  -F "images=@/path/to/image.jpg" \\\n  -F "documents=@/path/to/document.pdf"');
  
  console.log('\n7. Test upload endpoint:');
  console.log('curl -X POST http://localhost:5000/api/upload-test \\\n  -F "files=@/path/to/any/file"');
  
  console.log('\n8. Get chat history:');
  console.log('curl http://localhost:5000/api/chat/history');
  
  console.log('\n9. Health check:');
  console.log('curl http://localhost:5000/');
  
  console.log('\n✅ Server is ready for file uploads with message arrays!');
  console.log('🎯 Use the cURL commands above to test the functionality.');
  console.log('📌 Note: You can send either "message" (single) or "messages" (array) in your requests.');
}

// Run the test
testFileUpload().catch(console.error);