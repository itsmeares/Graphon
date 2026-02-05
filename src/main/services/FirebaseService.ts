/**
 * FirebaseService - Centralized Firebase client management for the main process
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  onSnapshot,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { app, BrowserWindow } from 'electron';
import fs from 'fs';

// Load .env
const envPath = app.isPackaged
  ? join(dirname(process.execPath), '.env')
  : join(__dirname, '../../.env');

config({ path: envPath });

// =============================================================================
// TYPES
// =============================================================================

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  updated_at: any;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: any;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: any;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  type: 'chat' | 'board';
  description: string | null;
  created_at: any;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  created_at: any;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.VITE_FIREBASE_API_KEY &&
    process.env.VITE_FIREBASE_PROJECT_ID &&
    process.env.VITE_FIREBASE_APP_ID
  );
}

function getFirebase() {
  if (firebaseApp) return { app: firebaseApp, auth, db };

  if (!isFirebaseConfigured()) {
    console.warn('[FirebaseService] Missing Firebase configuration in .env');
    return { app: null, auth: null, db: null };
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };

  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Global listener for auth state changes
    onAuthStateChanged(auth, (user) => {
      console.log(`[FirebaseService] Auth state change: ${user ? 'SIGNED_IN' : 'SIGNED_OUT'}`);
      broadcastAuthChange(user);
    });

    console.log('[FirebaseService] Client initialized successfully');
    return { app: firebaseApp, auth, db };
  } catch (err) {
    console.error('[FirebaseService] Failed to initialize client:', err);
    return { app: null, auth: null, db: null };
  }
}

function broadcastAuthChange(user: FirebaseUser | null): void {
  const windows = BrowserWindow.getAllWindows();
  const userData = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  } : null;

  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('firebase:auth-change', userData);
    }
  }
}

// =============================================================================
// AUTH OPERATIONS
// =============================================================================

export async function signIn(email: string, password: string) {
  const { auth } = getFirebase();
  if (!auth) throw new Error('Firebase not configured');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}

export async function signUp(email: string, password: string, username?: string) {
  const { auth, db } = getFirebase();
  if (!auth || !db) throw new Error('Firebase not configured');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (username) {
      await updateProfile(user, { displayName: username });
    }

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      username: username || user.email?.split('@')[0],
      avatar_url: null,
      updated_at: serverTimestamp()
    });

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}

export async function signOut() {
  const { auth } = getFirebase();
  if (!auth) return { error: 'Firebase not configured' };

  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getUser() {
  const { auth } = getFirebase();
  if (!auth) return null;
  return auth.currentUser;
}

// =============================================================================
// WORKSPACE OPERATIONS
// =============================================================================

export async function createWorkspace(name: string) {
  const { db, auth } = getFirebase();
  if (!db || !auth || !auth.currentUser) return { data: null, error: 'Not authenticated' };

  try {
    const workspaceRef = doc(collection(db, 'workspaces'));
    const workspaceId = workspaceRef.id;

    await runTransaction(db, async (transaction) => {
      // 1. Create workspace
      transaction.set(workspaceRef, {
        id: workspaceId,
        name,
        owner_id: auth.currentUser!.uid,
        created_at: serverTimestamp()
      });

      // 2. Add owner as admin member
      const memberRef = doc(db, 'workspace_members', `${workspaceId}_${auth.currentUser!.uid}`);
      transaction.set(memberRef, {
        workspace_id: workspaceId,
        user_id: auth.currentUser!.uid,
        role: 'admin',
        joined_at: serverTimestamp()
      });
    });

    return { data: { id: workspaceId }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getWorkspaces() {
  const { db, auth } = getFirebase();
  if (!db || !auth || !auth.currentUser) return { data: null, error: 'Not authenticated' };

  try {
    // Find memberships first
    const q = query(collection(db, 'workspace_members'), where('user_id', '==', auth.currentUser.uid));
    const memberSnap = await getDocs(q);
    
    const workspaces: any[] = [];
    for (const memberDoc of memberSnap.docs) {
      const memberData = memberDoc.data();
      const workspaceSnap = await getDoc(doc(db, 'workspaces', memberData.workspace_id));
      if (workspaceSnap.exists()) {
        workspaces.push({
          ...workspaceSnap.data(),
          role: memberData.role
        });
      }
    }
    
    return { data: workspaces, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function joinWorkspace(workspaceId: string) {
  const { db, auth } = getFirebase();
  if (!db || !auth || !auth.currentUser) return { data: null, error: 'Not authenticated' };

  try {
    const memberRef = doc(db, 'workspace_members', `${workspaceId}_${auth.currentUser.uid}`);
    await setDoc(memberRef, {
      workspace_id: workspaceId,
      user_id: auth.currentUser.uid,
      role: 'member',
      joined_at: serverTimestamp()
    });
    return { data: { workspace_id: workspaceId }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// =============================================================================
// CHANNEL OPERATIONS
// =============================================================================

export async function getChannels(workspaceId: string) {
  const { db } = getFirebase();
  if (!db) return { data: null, error: 'Firebase not configured' };

  try {
    const q = query(
      collection(db, 'channels'), 
      where('workspace_id', '==', workspaceId),
      orderBy('type', 'asc'),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    const channels = snap.docs.map(doc => doc.data());
    return { data: channels, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function createChannel(workspaceId: string, name: string, type: 'chat' | 'board') {
  const { db } = getFirebase();
  if (!db) return { data: null, error: 'Firebase not configured' };

  try {
    const channelRef = doc(collection(db, 'channels'));
    await setDoc(channelRef, {
      id: channelRef.id,
      workspace_id: workspaceId,
      name,
      type,
      description: null,
      created_at: serverTimestamp()
    });
    return { data: { id: channelRef.id }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

export async function sendMessage(channelId: string, content: string) {
  const { db, auth } = getFirebase();
  if (!db || !auth || !auth.currentUser) return { data: null, error: 'Not authenticated' };

  try {
    const messageRef = collection(db, 'channels', channelId, 'messages');
    const docRef = await addDoc(messageRef, {
      channel_id: channelId,
      user_id: auth.currentUser.uid,
      content,
      created_at: serverTimestamp()
    });
    return { data: { id: docRef.id }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getMessages(channelId: string) {
  const { db } = getFirebase();
  if (!db) return { data: null, error: 'Firebase not configured' };

  try {
    const q = query(
      collection(db, 'channels', channelId, 'messages'),
      orderBy('created_at', 'asc')
    );
    const snap = await getDocs(q);
    const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { data: messages, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// =============================================================================
// REALTIME SUBSCRIPTIONS
// =============================================================================

export function subscribeToMessages(channelId: string) {
  const { db } = getFirebase();
  if (!db) return;

  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('created_at', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('firebase:realtime-message', {
              eventType: 'INSERT',
              new: { id: change.doc.id, ...change.doc.data() },
              channelId
            });
          }
        }
      }
    });
  });

  return unsubscribe;
}
