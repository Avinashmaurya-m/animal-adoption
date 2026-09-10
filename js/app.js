// ============================================================
// RescueNest — Shared App Logic
// Navigation, toast, dark mode, bottom nav, Cloudinary upload
// ============================================================

// ============================================================
// CLOUDINARY CONFIG
// ============================================================
// To make image uploads work, fill in these two values:
//
// 1. CLOUD_NAME  -> your cloud name (e.g. "qvbnhogq")
// 2. UPLOAD_PRESET -> an UNSIGNED upload preset you create in
//    Cloudinary Dashboard -> Settings -> Upload -> Upload presets
//    -> Add preset -> Signing Mode = Unsigned
//
// IMPORTANT: You MUST create the upload preset yourself in
// Cloudinary and paste its name here. Without it, uploads will fail.
// ============================================================
export const CLOUD_NAME = "qvbnhogq";
export const UPLOAD_PRESET = "rescuenest";

// Cloudinary upload endpoint (unsigned upload)
const CLOUD_UPLOAD_URL = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload";

// ============================================================
// IMAGE COMPRESSION + UPLOAD
// ============================================================
// 1. Reads the file
// 2. Compresses it in the browser (canvas)
// 3. Uploads to Cloudinary
// 4. Returns the secure image URL
export async function uploadImage(file, maxSize = 1080, quality = 0.8) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }

  // Compressing a photo can hang on some mobile formats. Time out this step as
  // well as the network request so the publish button is always released.
  const compressed = await withTimeout(
    compressImage(file, maxSize, quality),
    45000,
    "Could not prepare this image. Please choose a JPG or PNG photo and try again."
  );

  // Build the FormData for Cloudinary
  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", UPLOAD_PRESET);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let res;
  let data;
  try {
    res = await fetch(CLOUD_UPLOAD_URL, { method: "POST", body: formData, signal: controller.signal });
    data = await res.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Image upload timed out. Please check your connection and try again.");
    }
    throw new Error("Could not reach Cloudinary. Please check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Image upload failed. Check your Cloudinary preset.");
  }
  return data.secure_url;
}

function withTimeout(promise, milliseconds, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Compress an image file using a canvas
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        // Scale down if larger than maxSize
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to blob (JPEG) with given quality
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Could not compress image."));
            // Wrap in a File with the same name
            const stripped = file.name.replace(/\.[^.]+$/, "");
            const name = stripped + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Could not read the image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// NAVIGATION (SPA-style page switching)
// ============================================================
export function navigate(page) {
  window.location.href = page;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
export function toast(message, type) {
  type = type || "success";
  let wrap = document.getElementById("toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    wrap.className = "toast-wrap";
    document.body.append(wrap);
  }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = message;
  wrap.append(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity 0.3s";
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

// ============================================================
// DARK MODE
// ============================================================
export function initTheme() {
  const saved = localStorage.getItem("rn-theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("rn-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("rn-theme", "dark");
  }
}

// Expose theme toggle globally (used by inline onclick in topBar)
window.toggleTheme = toggleTheme;

// ============================================================
// BOTTOM NAVIGATION MARKUP
// ============================================================
export function bottomNav(active) {
  const items = [
    { page: "feed.html", icon: "⌂", label: "Home" },
    { page: "search.html", icon: "⌕", label: "Explore" },
    { page: "create-post.html", icon: "+", label: "Post", featured: true },
    { page: "notifications.html", icon: "♡", label: "Alerts" },
    { page: "profile.html", icon: "◌", label: "Profile" }
  ];
  let html = '<nav class="bottom-nav">';
  items.forEach((it) => {
    const cls = active === it.label.toLowerCase() ? "active" : "";
    html += '<a href="' + it.page + '" class="' + cls + (it.featured ? " featured" : "") + '"><span>' + it.icon +
      "</span>" + it.label + "</a>";
  });
  html += "</nav>";
  return html;
}

// ============================================================
// TOP BAR MARKUP
// ============================================================
export function topBar(user, active) {
  const initial = (user && user.name && user.name.charAt(0) ? user.name.charAt(0).toUpperCase() : "U");
  let right = '';
  if (user) {
    right = '<a href="profile.html" class="avatar" title="' + escapeHtml(user.name) + '">' +
      escapeHtml(initial) + "</a>";
  } else {
    right = '<a href="login.html" class="btn btn-primary btn-sm">Sign in</a>';
  }
  const links = [
    ["feed.html", "Home", "home"], ["search.html", "Explore", "explore"],
    ["create-post.html", "Share a rescue", "create"], ["notifications.html", "Updates", "alerts"]
  ];
  const nav = links.map(function (item) {
    return '<a href="' + item[0] + '" class="' + (active === item[2] ? "active" : "") + '">' + item[1] + '</a>';
  }).join("");
  return (
    '<header class="topbar"><div class="topbar-inner">' +
    '<a href="feed.html" class="brand" aria-label="RescueNest home"><span class="logo" aria-hidden="true">✦</span><span>Rescue<span class="brand-accent">Nest</span></span></a>' +
    '<nav class="desktop-nav" aria-label="Primary navigation">' + nav + '</nav>' +
    '<div class="top-actions">' +
    '<button class="icon-btn" onclick="window.toggleTheme()" title="Toggle colour theme">◐</button>' +
    '<a class="icon-btn hide-mobile" href="notifications.html" title="Notifications">♡</a>' +
    right +
    "</div></div></header>" + bottomNav(active)
  );
}

// ============================================================
// HELPER: escape HTML
// ============================================================
// Entities are built via concatenation to avoid any encoding issues.
var AMP = "&" + "amp;";
var LT = "&" + "lt;";
var GT = "&" + "gt;";
var QUOT = "&" + "quot;";
var APOS = "&#" + "39;";

export function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/[&<>"']/g, function (c) {
    if (c === "&") return AMP;
    if (c === "<") return LT;
    if (c === ">") return GT;
    if (c === '"') return QUOT;
    return APOS;
  });
}

// ============================================================
// HELPER: format relative time
// ============================================================
export function timeAgo(ts) {
  if (!ts) return "recently";
  var date = ts.toDate ? ts.toDate() : new Date(ts);
  var diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return date.toLocaleDateString();
}

// ============================================================
// INIT
// ============================================================
initTheme();
