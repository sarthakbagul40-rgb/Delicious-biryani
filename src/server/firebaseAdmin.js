import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

let adminInstance = null;
let isInitialized = false;

/**
 * Lazily initialize Firebase Admin SDK using available service account credentials
 */
export async function getFirebaseAdmin() {
  if (isInitialized) return adminInstance;

  try {
    const admin = await import('firebase-admin');
    const defaultAdmin = admin.default || admin;

    // Check potential service account paths
    const candidates = [
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      path.join(projectRoot, 'serviceAccountKey.json'),
      path.join(projectRoot, 'firebase-service-account.json'),
      path.join(projectRoot, 'service-account.json')
    ].filter(Boolean);

    let credentialConfig = null;

    for (const candidate of candidates) {
      try {
        if (typeof candidate === 'string' && candidate.trim().startsWith('{')) {
          credentialConfig = JSON.parse(candidate);
          break;
        } else if (typeof candidate === 'string' && fs.existsSync(candidate)) {
          const raw = fs.readFileSync(candidate, 'utf-8');
          credentialConfig = JSON.parse(raw);
          break;
        }
      } catch (_) {}
    }

    if (credentialConfig) {
      defaultAdmin.initializeApp({
        credential: defaultAdmin.credential.cert(credentialConfig),
        projectId: credentialConfig.project_id || 'delicious-biryani'
      });
      adminInstance = defaultAdmin;
      isInitialized = true;
      console.log('✅ [Firebase Admin] Successfully initialized with Service Account credentials');
      return adminInstance;
    } else {
      console.log('ℹ️ [Firebase Admin] No serviceAccountKey.json found yet. Server-side password resets require serviceAccountKey.json.');
      return null;
    }
  } catch (err) {
    console.warn('[Firebase Admin] Initialization notice:', err.message);
    return null;
  }
}

/**
 * Check if Firebase Admin SDK is ready to execute privileged operations
 */
export async function isFirebaseAdminAvailable() {
  const admin = await getFirebaseAdmin();
  return !!admin;
}

/**
 * Securely update a user password directly in Firebase Authentication
 * @param {string} email 
 * @param {string} newPassword 
 * @returns {Promise<{ success: boolean, error?: string, uid?: string }>}
 */
export async function updateUserPasswordServerSide(email, newPassword) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    return {
      success: false,
      error: 'NO_ADMIN_CREDENTIALS',
      message: 'Firebase Admin credentials (serviceAccountKey.json) not installed on server. Please add serviceAccountKey.json to enable instant server-side password resets.'
    };
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRecord = await admin.auth().getUserByEmail(cleanEmail);
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });
    console.log(`✅ [Firebase Admin] Password updated successfully for user ${cleanEmail} (${userRecord.uid})`);
    return {
      success: true,
      uid: userRecord.uid
    };
  } catch (err) {
    console.error('[Firebase Admin] Failed to update user password:', err);
    return {
      success: false,
      error: err.code || 'AUTH_ERROR',
      message: err.message
    };
  }
}
