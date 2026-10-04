import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const WORKSPACE_ID = "default";

/**
 * Returns the reference to the single workspace integrations collection.
 * Automatically migrates existing credentials from legacy user-based documents
 * into the single workspace object so no credentials are lost, then removes
 * the duplicate user documents.
 */
export async function getWorkspaceIntegrationsRef() {
  const db = adminDb();
  const wsDocRef = db.collection("workspaces").doc(WORKSPACE_ID);
  const integrationsRef = wsDocRef.collection("integrations");

  // One-time auto-migration from legacy users/{uid}/integrations
  try {
    const currentSnap = await integrationsRef.get();
    const existingServices = new Set(currentSnap.docs.map((d) => d.id));

    const usersSnap = await db.collection("users").get();
    if (!usersSnap.empty) {
      for (const uDoc of usersSnap.docs) {
        const userIntegSnap = await db
          .collection("users")
          .doc(uDoc.id)
          .collection("integrations")
          .get();

        for (const iDoc of userIntegSnap.docs) {
          const data = iDoc.data();
          const vals = data?.values || {};
          // If workspace doesn't have this service yet or it has valid values, migrate it
          if (Object.keys(vals).length > 0 && !existingServices.has(iDoc.id)) {
            await integrationsRef.doc(iDoc.id).set(data, { merge: true });
            existingServices.add(iDoc.id);
          }
          // Clean up legacy subcollection doc
          await db
            .collection("users")
            .doc(uDoc.id)
            .collection("integrations")
            .doc(iDoc.id)
            .delete();
        }

        // Clean up legacy parent user doc
        await db.collection("users").doc(uDoc.id).delete();
      }
    }
  } catch (err) {
    console.warn("Workspace migration notice:", err);
  }

  // Ensure parent workspace document exists
  await wsDocRef.set(
    { name: "GrapeLabs FollowUp Agent", updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return integrationsRef;
}
