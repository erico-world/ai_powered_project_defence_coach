/**
 * Test script for Firebase storage functionality
 * Run with: node lib/test-upload.js
 */

const { storage } = require("../firebase/admin");
const fs = require("fs");
const path = require("path");

async function testUpload() {
  try {
    console.log("Starting storage test...");

    if (!storage) {
      console.error("Storage not initialized");
      return;
    }

    console.log(`Storage bucket: ${storage.name}`);

    // Create a test file if it doesn't exist
    const testFilePath = path.join(__dirname, "test-file.txt");
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(
        testFilePath,
        "This is a test file for Firebase Storage upload"
      );
      console.log("Created test file");
    }

    // Read the file
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log(`Test file size: ${fileBuffer.length} bytes`);

    // Upload the file
    const fileDest = "test-files/test-file.txt";
    const fileRef = storage.file(fileDest);

    console.log("Uploading file...");
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: "text/plain",
      },
    });

    // Make the file public
    console.log("Making file public...");
    await fileRef.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${storage.name}/${fileDest}`;
    console.log("Upload successful!");
    console.log(`Public URL: ${publicUrl}`);

    // Test download
    console.log("Testing download...");
    const [downloadedFile] = await fileRef.download();
    console.log(`Downloaded file size: ${downloadedFile.length} bytes`);

    if (downloadedFile.toString() === fileBuffer.toString()) {
      console.log("✅ Download test passed - content matches!");
    } else {
      console.error("❌ Download test failed - content does not match!");
    }

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error in test:", error);
  }
}

testUpload().catch(console.error);
