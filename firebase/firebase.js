// ============================================================
// RescueNest — Firebase configuration & initialization
// ============================================================
// This file contains the Firebase web SDK setup.
// Replace the config below with YOUR Firebase project config if
// it ever changes. The current config is for project: rescunest2
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  initializeFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// YOUR FIREBASE WEB CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBdjOPmGItQeBFVB8k04FUp3EFgb3wSxkc",
  authDomain: "rescunest2.firebaseapp.com",
  projectId: "rescunest2",
  storageBucket: "rescunest2.firebasestorage.app",
  messagingSenderId: "423055617972",
  appId: "1:423055617972:web:5db01ad5d0af193d598ce1",
  measurementId: "G-RLH7V17VQV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Automatically fall back to long polling when a browser, mobile network, or
// firewall blocks Firestore's default streaming connection.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
let persistenceReady;

function ensureAuthPersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence);
  }
  return persistenceReady;
}

function withTimeout(promise, milliseconds, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ============================================================
// AUTH HELPERS
// ============================================================
export async function registerUser({ name, email, password }) {
  await ensureAuthPersistence();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  // Authentication is the account-creation boundary. A profile record improves
  // the experience, but must not leave a newly created user stuck on the form
  // if Firestore is slow or temporarily unavailable.
  try {
    await withTimeout(setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      bio: "",
      location: "",
      photo: "",
      createdAt: serverTimestamp()
    }), 8000, "Profile setup timed out.");
  } catch (error) {
    console.warn("Profile setup will be retried when the user edits their profile.", error);
  }
  return cred.user;
}

export async function loginUser(email, password) {
  await ensureAuthPersistence();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ============================================================
// USERS HELPERS
// ============================================================
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, "users", uid), data);
}

// ============================================================
// POSTS HELPERS
// ============================================================
export async function createPost(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  return addDoc(collection(db, "posts"), {
    ...data,
    ownerId: user.uid,
    authorId: user.uid,
    likes: 0,
    createdAt: serverTimestamp()
  });
}

export function onPosts(callback) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    (snap) =>
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      )
  );
}

export async function getPost(id) {
  const snap = await getDoc(doc(db, "posts", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deletePost(id) {
  return deleteDoc(doc(db, "posts", id));
}

export async function updatePost(id, data) {
  return updateDoc(doc(db, "posts", id), data);
}

export async function getUserPosts(uid) {
  const snap = await getDocs(
    query(collection(db, "posts"), where("authorId", "==", uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============================================================
// LIKES HELPERS  (one like per user)
// ============================================================
export async function toggleLike(postId, userId) {
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    return false;
  } else {
    await setDoc(likeRef, { postId, userId, createdAt: serverTimestamp() });
    return true;
  }
}

export async function hasLiked(postId, userId) {
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

// ============================================================
// COMMENTS HELPERS  (realtime)
// ============================================================
export async function addComment(postId, text) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  return addDoc(collection(db, "comments"), {
    postId,
    text,
    authorId: user.uid,
    authorName: user.displayName || user.email,
    createdAt: serverTimestamp()
  });
}

export function onComments(postId, callback) {
  return onSnapshot(
    query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// ============================================================
// NOTIFICATIONS HELPERS
// ============================================================
export function onNotifications(userId, callback) {
  return onSnapshot(
    query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}
