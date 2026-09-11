import { supabase } from "./supabase-config.js";

export const auth = supabase.auth;

async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name, role: "person" }
    }
  });

  if (error) throw error;

  if (data.user) {
    await supabase.from("users").upsert({
      id: data.user.id,
      name,
      email,
      role: "person",
      created_at: new Date().toISOString()
    }, { onConflict: "id" });
  }

  return data.user;
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data.user;
};

export const logOut = () => supabase.auth.signOut();

export const watchAuth = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
};

export async function registerUser({ name, email, password }) {
  return signUp({ name, email, password });
}

export async function loginUser(email, password) {
  return signIn(email, password);
}

export async function logoutUser() {
  return logOut();
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export function onAuth(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.status !== 401) throw error;
  return data.user;
}

async function uploadImage(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const { data, error } = await supabase.storage.from("post_images").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) throw error;
  const { data: publicUrlData } = supabase.storage.from("post_images").getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}

export const getUserProfile = async (uid) => {
  const { data, error } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data || null;
};

export async function updateUserProfile(uid, data) {
  const { error } = await supabase.from("users").update(data).eq("id", uid);
  if (error) throw error;
}

export async function createPost(data) {
  const user = await getSessionUser();
  if (!user) throw new Error("Please log in first.");

  const profile = await getUserProfile(user.id).catch(() => null);
  const textValue = (data.text || data.description || "").trim();
  const locationValue = (data.location || data.city || "").trim();
  const animalValue = (data.pet || data.animalType || "Dog").trim();

  const payload = {
    owner_id: user.id,
    author: data.author || profile?.name || user.email,
    kind: data.kind || "adoption",
    pet: animalValue,
    location: locationValue,
    text: textValue,
    image_url: data.imageUrl || data.image_url || "",
    status: data.status || "open",
    created_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase.from("posts").insert(payload).select().single();

  if (error) throw error;
  return inserted;
}

export async function publishPost({ kind, pet, location, text, imageFile, animalType, name, breed, age, gender, city, health, vaccinated, phone, description, authorName }) {
  const user = await getSessionUser();
  if (!user) throw new Error("Please log in first.");

  const profile = await getUserProfile(user.id).catch(() => null);
  const imageUrl = imageFile ? await uploadImage(imageFile) : "";

  const payload = {
    owner_id: user.id,
    author: profile?.name || user.email,
    kind: kind || "adoption",
    pet: pet || animalType || "Dog",
    location: location || city || "",
    text: text || description || "",
    image_url: imageUrl,
    status: "open",
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("posts").insert(payload).select().single();

  if (error) throw error;
  return data;
}

export async function watchPosts(callback) {
  const load = async () => {
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    callback((data || []).map((p) => ({
      id: p.id,
      ownerId: p.owner_id,
      authorId: p.owner_id,
      author: p.author,
      authorName: p.author_name || p.author || "Unknown",
      kind: p.kind,
      pet: p.pet || p.animal_type || "Dog",
      animalType: p.animal_type || p.pet || "Dog",
      name: p.name || p.pet || "Animal",
      breed: p.breed || "",
      age: p.age || "",
      gender: p.gender || "",
      city: p.city || p.location || "",
      location: p.location || p.city || "",
      text: p.text || p.description || "",
      description: p.description || p.text || "",
      health: p.health || "",
      vaccinated: !!p.vaccinated,
      phone: p.phone || "",
      imageUrl: p.image_url,
      status: p.status,
      createdAt: p.created_at,
      likes: 0
    })));
  };

  await load();

  const channel = supabase.channel("posts_changes").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "posts" },
    () => load()
  ).subscribe();

  return () => supabase.removeChannel(channel);
}

export async function onPosts(callback) {
  return watchPosts(callback);
}

export async function getPost(id) {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    ...data,
    ownerId: data.owner_id,
    authorId: data.owner_id,
    authorName: data.author_name || data.author || "Unknown",
    animalType: data.animal_type || data.pet || "Dog",
    city: data.city || data.location || "",
    location: data.location || data.city || "",
    description: data.description || data.text || "",
    text: data.text || data.description || "",
    imageUrl: data.image_url,
    createdAt: data.created_at,
    likes: 0
  };
}

export async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export async function updatePost(id, data) {
  const { error } = await supabase.from("posts").update(data).eq("id", id);
  if (error) throw error;
}

export async function getUserPosts(uid) {
  const { data, error } = await supabase.from("posts").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    ...p,
    ownerId: p.owner_id,
    authorId: p.owner_id,
    authorName: p.author_name || p.author || "Unknown",
    animalType: p.animal_type || p.pet || "Dog",
    city: p.city || p.location || "",
    description: p.description || p.text || "",
    imageUrl: p.image_url,
    createdAt: p.created_at,
    likes: 0
  }));
}

export async function toggleLike(postId, userId) {
  const { data: existing, error: findError } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("likes").insert({
    post_id: postId,
    user_id: userId,
    created_at: new Date().toISOString()
  });

  if (error) throw error;
  return true;
}

export async function hasLiked(postId, userId) {
  const { data, error } = await supabase.from("likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addComment(postId, text) {
  const user = await getSessionUser();
  if (!user) throw new Error("Please log in first.");

  const profile = await getUserProfile(user.id);
  const { data, error } = await supabase.from("comments").insert({
    post_id: postId,
    text,
    author_id: user.id,
    author_name: profile?.name || user.email,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) throw error;
  return data;
}

export async function onComments(postId, callback) {
  const load = async () => {
    const { data, error } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) throw error;
    callback((data || []).map((item) => ({
      id: item.id,
      postId: item.post_id,
      text: item.text,
      authorId: item.author_id,
      authorName: item.author_name,
      createdAt: item.created_at
    })));
  };

  await load();

  const channel = supabase.channel(`comments:${postId}`).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
    () => load()
  ).subscribe();

  return () => supabase.removeChannel(channel);
}

export async function onNotifications(userId, callback) {
  const load = async () => {
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    callback((data || []).map((item) => ({ id: item.id, userId: item.user_id, type: item.type, message: item.message, postId: item.post_id, createdAt: item.created_at })));
  };

  await load();

  const channel = supabase.channel(`notifications:${userId}`).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
    () => load()
  ).subscribe();

  return () => supabase.removeChannel(channel);
}

export async function sendMessage(conversationId, participantIds, body) {
  const user = await getSessionUser();
  if (!user) throw new Error("Please log in first.");

  const { error: convError } = await supabase.from("conversations").upsert({
    id: conversationId,
    participant_ids: participantIds,
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });

  if (convError) throw convError;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
    created_at: new Date().toISOString()
  });

  if (error) throw error;
}

export function watchMessages(conversationId, callback) {
  const load = async () => {
    const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (error) throw error;
    callback((data || []).map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      body: message.body,
      createdAt: message.created_at
    })));
  };

  load();

  const channel = supabase.channel(`messages:${conversationId}`).on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
    () => load()
  ).subscribe();

  return () => supabase.removeChannel(channel);
}
