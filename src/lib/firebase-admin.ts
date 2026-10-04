import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function cleanEnv(val?: string): string {
  if (!val) return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function getPrivateKey(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY environment variable. Please configure it in your deployment settings.");
  }
  let key = cleanEnv(raw);
  // Handle literal escaped \n strings as well as actual newlines
  key = key.replace(/\\n/g, "\n");
  return key;
}

export function adminApp() {
  if (getApps().length) return getApps()[0]!;

  const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = getPrivateKey();

  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) environment variable.");
  }
  if (!clientEmail) {
    throw new Error("Missing FIREBASE_CLIENT_EMAIL environment variable.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

