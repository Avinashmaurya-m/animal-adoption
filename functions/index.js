const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.onLikeCreated = onDocumentCreated("posts/{postId}/likes/{userId}", async (event) => {
  const { postId, userId } = event.params;
  const postRef = db.collection("posts").doc(postId);
  const post = await postRef.get();
  if (!post.exists) return;

  const data = post.data();
  await postRef.update({ likes: admin.firestore.FieldValue.increment(1) });
  if (data.authorId !== userId) {
    await db.collection("notifications").doc(`${data.authorId}_like_${event.id}`).set({
      userId: data.authorId,
      text: "Someone liked your post.",
      icon: "❤️",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
});

exports.onLikeDeleted = onDocumentDeleted("posts/{postId}/likes/{userId}", async (event) => {
  const postRef = db.collection("posts").doc(event.params.postId);
  const post = await postRef.get();
  if (post.exists) await postRef.update({ likes: admin.firestore.FieldValue.increment(-1) });
});

exports.onCommentCreated = onDocumentCreated("comments/{commentId}", async (event) => {
  const comment = event.data.data();
  const post = await db.collection("posts").doc(comment.postId).get();
  if (!post.exists || post.data().authorId === comment.authorId) return;
  const ownerId = post.data().authorId;
  await db.collection("notifications").doc(`${ownerId}_comment_${event.params.commentId}`).set({
    userId: ownerId,
    text: `${comment.authorName || "Someone"} commented on your post.`,
    icon: "💬",
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

// Reserved for an administrator to grant a verified-organisation claim.
exports.approveNgo = onCall(async (request) => {
  if (!request.auth?.token.admin) throw new HttpsError("permission-denied", "Administrator access required.");
  const uid = request.data?.uid;
  if (!uid || typeof uid !== "string") throw new HttpsError("invalid-argument", "A user ID is required.");
  await admin.auth().setCustomUserClaims(uid, { ngo: true });
  return { ok: true };
});
