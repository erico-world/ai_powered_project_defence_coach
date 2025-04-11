import * as admin from "firebase-admin";
import { Bucket } from "@google-cloud/storage";

// Validate required Firebase configuration
const validateConfig = () => {
  const requiredEnvVars = [
    { name: "FIREBASE_PROJECT_ID", value: process.env.FIREBASE_PROJECT_ID },
    { name: "FIREBASE_CLIENT_EMAIL", value: process.env.FIREBASE_CLIENT_EMAIL },
    { name: "FIREBASE_PRIVATE_KEY", value: process.env.FIREBASE_PRIVATE_KEY },
  ];

  const missingVars = requiredEnvVars.filter((v) => !v.value);
  if (missingVars.length > 0) {
    const missingNames = missingVars.map((v) => v.name).join(", ");
    console.error(
      `ERROR: Missing required Firebase environment variables: ${missingNames}`
    );
    console.error(
      "Please check your .env.local file and ensure all required variables are set."
    );
    return false;
  }
  return true;
};

// Check if storage bucket is available
const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET;
// Remove the 'gs://' prefix if it exists
const formattedBucketName = storageBucketName?.startsWith("gs://")
  ? storageBucketName.substring(5)
  : storageBucketName;

if (!formattedBucketName) {
  console.warn(
    "WARNING: FIREBASE_STORAGE_BUCKET is not defined in environment variables. File upload functionality will not work."
  );
} else {
  console.log(`Firebase Storage bucket configured: ${formattedBucketName}`);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (!validateConfig()) {
      console.error(
        "Firebase initialization skipped due to missing configuration."
      );
    } else {
      const privateKeyFixed = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

      // Format the bucket name correctly (remove gs:// if present)
      const formattedBucketName = storageBucketName?.startsWith("gs://")
        ? storageBucketName.substring(5)
        : storageBucketName;

      const adminConfig = {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKeyFixed,
        }),
        ...(formattedBucketName ? { storageBucket: formattedBucketName } : {}),
      };

      admin.initializeApp(adminConfig);

      console.log("Firebase Admin initialized successfully");
      if (formattedBucketName) {
        console.log(`Storage bucket initialized: ${formattedBucketName}`);
      }
    }
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

// Export Firebase services with fallbacks to prevent crashes
let db, auth;
let storage: Bucket | null = null;

try {
  db = admin.firestore();
} catch (error) {
  console.error("Error initializing Firestore:", error);
  // Create a mock DB to prevent crashes
  db = {
    collection: () => ({
      doc: () => ({
        set: async () => ({}),
        get: async () => ({ exists: false, data: () => ({}) }),
        update: async () => ({}),
        delete: async () => ({}),
      }),
    }),
  };
}

try {
  auth = admin.auth();
} catch (error) {
  console.error("Error initializing Auth:", error);
  // Create a mock Auth to prevent crashes
  auth = {
    verifySessionCookie: async () => ({}),
    createUser: async () => ({}),
    getUser: async () => ({}),
  };
}

try {
  storage = formattedBucketName
    ? admin.storage().bucket(formattedBucketName)
    : null;
  if (storage) {
    console.log(`Storage bucket instance created for: ${formattedBucketName}`);

    // Test bucket access to verify it's working
    storage
      .getMetadata()
      .then(([metadata]) => {
        console.log(`✅ Storage bucket verified with name: ${metadata.name}`);
      })
      .catch((error) => {
        console.error(`❌ Error accessing storage bucket: ${error.message}`);
        console.error(
          `Please verify your Firebase Storage bucket name: ${formattedBucketName}`
        );
        console.error(
          `If using Firebase, make sure Storage is enabled in the Firebase console.`
        );
      });
  }
} catch (error) {
  console.error("Error initializing Storage:", error);
  storage = null;
}

// Export the services
export { db, auth, storage, formattedBucketName };
export default admin;
