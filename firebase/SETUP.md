# Firebase Setup Instructions

This document provides step-by-step instructions for setting up your Firebase project for the Graphon Team Chat feature.

## Prerequisites

1. A Google account.
2. A Firebase project created in the [Firebase Console](https://console.firebase.google.com/).
3. Firebase CLI installed (optional, but recommended for rules).

## Setup Steps

### 1. Enable Authentication

1. Go to **Authentication** in the left sidebar of your Firebase console.
2. Click **Get Started**.
3. In the **Sign-in method** tab, click **Add new provider**.
4. Select **Email/Password** and enable it. Click **Save**.

### 2. Enable Firestore Database

1. Go to **Firestore Database** in the left sidebar.
2. Click **Create database**.
3. Choose a location and start in **Test mode** (you will update rules later).
4. Click **Create**.

### 3. Register your App

1. Go to **Project Settings** (gear icon next to Project Overview).
2. Under **Your apps**, click the **Web** icon (`</>`).
3. Enter an app nickname (e.g., `Graphon Desktop`).
4. Click **Register app**.
5. Copy the `firebaseConfig` object values.

### 4. Configure Environment Variables

Update your `.env` file in the project root with the values from your `firebaseConfig`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Note:** Remove any old `VITE_SUPABASE_*` variables to avoid confusion.

### 5. Set up Firestore Rules

1. In the Firebase Console, go to **Firestore Database** -> **Rules**.
2. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is a member of a workspace
    function isMember(workspaceId) {
      return exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
    }

    // Workspaces
    match /workspaces/{workspaceId} {
      allow read: if request.auth != null && isMember(workspaceId);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role == 'admin';
      
      // Members sub-collection
      match /members/{userId} {
        allow read: if request.auth != null && isMember(workspaceId);
        allow write: if request.auth != null && (
          // Allow creating yourself as admin when creating a workspace
          (request.resource.data.role == 'admin' && userId == request.auth.uid) ||
          // Admin can manage other members
          get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role == 'admin'
        );
      }
    }

    // Channels
    match /channels/{channelId} {
      allow read: if request.auth != null && isMember(resource.data.workspace_id);
      allow create: if request.auth != null && isMember(request.resource.data.workspace_id);
      
      // Messages sub-collection
      match /messages/{messageId} {
        allow read: if request.auth != null; // Simplified for now, should check parent channel/workspace
        allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      }
    }
  }
}
```

### 6. Verify the Setup

1. Run the app: `npm run dev`
2. Switch to **Teamspace** mode from the Gateway.
3. Sign up with a new account.
4. Create a workspace.
5. Create a channel and send a message.

## Troubleshooting

### Issue: "Firebase not configured"
- **Solution**: Check your `.env` file for correct variable names and values.
- Restart the dev server after changing `.env`.

### Issue: "Permission denied"
- **Solution**: Verify your Firestore rules. Ensure that your workspace creation logic also creates a member entry in the `members` sub-collection of the workspace.

### Issue: Realtime updates not working
- **Solution**: Firebase handles realtime automatically via `onSnapshot`. Check the console for any errors related to Firestore indexing if you used complex queries.
