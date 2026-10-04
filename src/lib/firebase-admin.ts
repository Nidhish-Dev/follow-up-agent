import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
function required(name:string){const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value}
export function adminApp(){if(getApps().length)return getApps()[0]!;return initializeApp({credential:cert({projectId:required("FIREBASE_PROJECT_ID"),clientEmail:required("FIREBASE_CLIENT_EMAIL"),privateKey:required("FIREBASE_PRIVATE_KEY").replace(/\\n/g,"\n")})})}
export const adminAuth=()=>getAuth(adminApp());export const adminDb=()=>getFirestore(adminApp());
