# FollowUp Agent setup

## Firebase

1. Create a Firebase project and enable Firestore in Native mode.
2. Enable Firebase Authentication's Anonymous provider. Replace this with your real sign-in provider before giving other people access.
3. Create a service account key in Firebase Project Settings > Service accounts. Add its project id, client email, and private key to `.env.local` using `.env.example` as the template.
4. Add the Firebase Web App values to the `NEXT_PUBLIC_FIREBASE_*` fields in `.env.local`.
5. Generate `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -base64 32`.
6. Use Firestore rules that deny browser access, because all vault operations go through the authenticated server API:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

Credentials are saved under `users/{firebaseUid}/integrations/{service}`. They are AES-256-GCM encrypted before Firestore storage. The frontend receives masked values only.

## n8n workflow changes

## n8n credential provisioning

When the n8n connection is saved in the dashboard, the server uses the stored n8n API key to create these native n8n credentials automatically:

- `GrapeLabs OpenAI` (`openAiApi`)
- `GrapeLabs Telegram` (`telegramApi`)

Save OpenAI and Telegram before saving the n8n connection. To repeat provisioning after changing either key, open n8n in the dashboard and save it again.

In n8n, create an API key at **Settings > n8n API**. On Enterprise, grant it `credential:create`; also grant `credential:list` and `credential:update` if you later add credential replacement support. Enter the n8n instance root URL and API key in the dashboard, not `/api/v1` unless your instance already uses that path.

Gmail, Google Sheets, and Google Drive require an interactive Google OAuth consent flow. Create their native OAuth credentials in n8n and complete **Connect my account** there. Client ID and client secret by themselves are not a usable Gmail/Drive/Sheets authorization. QuickChart does not need a credential.

For a self-hosted n8n instance, set a persistent `N8N_ENCRYPTION_KEY` environment variable before storing credentials. Without it, n8n cannot reliably decrypt saved credentials after a redeploy.

### Apply credentials to the imported workflow

After provisioning, open the workflow in n8n and select the credentials by name in these nodes:

- `Message a model1` and `Message a model (Revise)`: `GrapeLabs OpenAI`.
- `Telegram Trigger1`, `Ask For Edit Instructions`, `Answer Button Tap1`, every `Notify...` node, and both preview nodes: `GrapeLabs Telegram`.
- Every Google Sheets node: one connected `Google Sheets OAuth2` credential.
- `Send Gmail to Lead`: one connected `Gmail OAuth2` credential.
- Every Google Drive upload/public node: one connected `Google Drive OAuth2` credential.

The original JSON refers to existing n8n credential IDs and names from the old workspace. They do not transfer when you import the workflow, so reselect the newly created credentials in each node, save the workflow, then publish it.

1. Replace hard-coded values with configuration fields: Telegram `chatId`, Sheets document IDs and sheet names, Drive folder ID, and QuickChart URL. Pass them into nodes with n8n expressions from a single `Load runtime config` node.
2. Add an HTTP Request node directly after the Manual Trigger and after the Telegram Trigger. It should call a server-only configuration endpoint with the authenticated workspace/user id and an internal shared secret. Never let n8n read Firestore directly with browser credentials.
3. Add a Code node after that request to map `config.telegram.chatId`, `config.sheets.spreadsheetId`, `config.drive.folderId`, and `config.quickchart.endpoint` into the JSON used by every branch.
4. Keep Gmail, Google Sheets, Google Drive, Telegram, and OpenAI as native n8n credentials for a single shared workspace. Native n8n nodes select credentials at design time and should not be fed decrypted secrets at runtime.
5. For true per-customer credentials, replace native nodes with server API calls or a credential broker that performs each provider action. Do not send decrypted keys to n8n: execution data can be retained in logs.
6. Change the `Webhook` node to accept an authenticated request from the Next.js app. It should receive only `workspaceId`, `leadId`, and action data. Resolve any credential server-side.
7. Point frontend actions at the Production URL from the n8n Webhook node, not the test URL. Add an `X-Workflow-Secret` header stored only in server environment variables.

The workflow map in the app contains all nodes from the supplied export grouped into draft generation, approval/sending, and revision paths.
