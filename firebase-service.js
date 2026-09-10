// Firebase data layer for the configured PetCircle Firebase project.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
export async function signUp({ name, email, password }) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", result.user.uid), { name, email, role: "person", createdAt: serverTimestamp() });
  return result.user;
}
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const watchAuth = callback => onAuthStateChanged(auth, callback);
async function uploadImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const form = new FormData();
  form.append("image", file);
  // Keep compatibility with the active local media service.
  const response = await fetch("http://localhost:5501/api/uploads", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Photo upload failed.");
  return result.url;
}
export async function publishPost({ kind, pet, location, text, imageFile }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  const imageUrl = imageFile ? await uploadImage(imageFile) : "";
  const profile = await getUserProfile(user.uid);
  return addDoc(collection(db, "posts"), {
    ownerId:user.uid, author:profile?.name || user.email, kind, pet, location, text,
    imageUrl, status:"open", createdAt:serverTimestamp()
  });
}
export function watchPosts(callback) {
  return onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")),
    snapshot => callback(snapshot.docs.map(d => ({ id:d.id, ...d.data() }))));
}
export const getUserProfile = async uid => {
  const item = await getDoc(doc(db, "users", uid));
  return item.exists() ? item.data() : null;
};
export async function sendMessage(conversationId, participantIds, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  const conversation = doc(db, "conversations", conversationId);
  await setDoc(conversation, { participantIds, updatedAt:serverTimestamp() }, { merge:true });
  return addDoc(collection(conversation, "messages"), { senderId:user.uid, body, createdAt:serverTimestamp() });
}
export function watchMessages(conversationId, callback) {
  return onSnapshot(query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt")),
    snapshot => callback(snapshot.docs.map(d => ({ id:d.id, ...d.data() }))));
}
