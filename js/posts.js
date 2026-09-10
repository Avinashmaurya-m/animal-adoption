// ============================================================
// RescueNest — Post rendering helpers (shared across pages)
// ============================================================
import { escapeHtml, timeAgo } from "./app.js";

// Badge style per post type
export function badgeFor(kind) {
  const map = {
    adoption: "Adoption",
    rescue: "Rescue",
    lost: "Lost",
    found: "Found"
  };
  return (map[kind] || "Adoption").toLowerCase();
}

// Build a single post card HTML string
export function postCard(post, currentUid) {
  const badge = badgeFor(post.kind);
  const isMine = currentUid && post.authorId === currentUid;
  const img = post.imageUrl
    ? '<img class="post-image" src="' + escapeHtml(post.imageUrl) + '" alt="Photo of ' + escapeHtml(post.name) + '" loading="lazy" onclick="window.location.href=\'post.html?id=' + escapeHtml(post.id) + '\'">'
    : '<div class="post-image" style="min-height:160px;display:grid;place-items:center;color:var(--muted);font-size:40px">🐾</div>';

  const meta = [
    ["Type", escapeHtml(post.animalType || "—")],
    ["Age", escapeHtml(post.age || "—")],
    ["Gender", escapeHtml(post.gender || "—")],
    ["City", escapeHtml(post.city || "—")]
  ]
    .map((m) => "<div class=\"meta-item\"><b>" + m[0] + "</b>" + m[1] + "</div>")
    .join("");

  const authorInitial = (post.authorName ? post.authorName.charAt(0) : "U").toUpperCase();

  return (
    '<article class="card post-card fade-in" data-id="' + escapeHtml(post.id) + '">' +
    '<div class="post-head">' +
    '<div class="avatar">' + escapeHtml(authorInitial) + "</div>" +
    '<div><div class="post-author">' + escapeHtml(post.authorName || "Unknown") + "</div>" +
    '<div class="post-time">' + timeAgo(post.createdAt) + "</div></div>" +
    (isMine ? '<a class="post-menu" href="post.html?id=' + encodeURIComponent(post.id) + '" title="Manage post">•••</a>' : "") +
    "</div>" +
    img +
    '<div class="post-body">' +
    '<div class="post-title"><h3>' + escapeHtml(post.name || "Animal") + '</h3><span class="badge ' + badge + '">' + escapeHtml(badge) + "</span></div>" +
    '<p class="post-desc expandable">' + escapeHtml(post.description || "") + "</p>" +
    '<div class="post-meta">' + meta + "</div>" +
    "</div>" +
    '<div class="post-actions">' +
    '<button class="like-btn" data-id="' + escapeHtml(post.id) + '" onclick="handleLike(this)"><span>❤️</span><b>' + (post.likes || 0) + "</b> Like</button>" +
    '<button onclick="goToPost(\'' + escapeHtml(post.id) + '\')"><span>💬</span> Comment</button>' +
    '<button onclick="sharePost(\'' + escapeHtml(post.id) + '\')"><span>↗️</span> Share</button>' +
    "</div>" +
    '<div class="contact-bar">' +
    '<a class="btn btn-primary btn-sm" href="tel:' + escapeHtml(post.phone || "") + '">📞 Call owner</a>' +
    '<button class="btn btn-ghost btn-sm" onclick="copyPhone(\'' + escapeHtml(post.phone || "") + '\')">📋 Copy number</button>' +
    "</div>" +
    "</article>"
  );
}

// Full post detail markup (used on post.html)
export function postDetail(post, currentUid) {
  const badge = badgeFor(post.kind);
  const isMine = currentUid && post.authorId === currentUid;
  const img = post.imageUrl
    ? '<img class="post-image" src="' + escapeHtml(post.imageUrl) + '" alt="Photo of ' + escapeHtml(post.name) + '">'
    : '<div class="post-image" style="min-height:200px;display:grid;place-items:center;color:var(--muted);font-size:50px">🐾</div>';

  const meta = [
    ["Animal type", escapeHtml(post.animalType || "—")],
    ["Breed", escapeHtml(post.breed || "—")],
    ["Age", escapeHtml(post.age || "—")],
    ["Gender", escapeHtml(post.gender || "—")],
    ["City", escapeHtml(post.city || "—")],
    ["Vaccinated", escapeHtml(post.vaccinated ? "Yes" : "No")],
    ["Health", escapeHtml(post.health || "—")]
  ]
    .map((m) => "<div class=\"meta-item\"><b>" + m[0] + "</b>" + m[1] + "</div>")
    .join("");

  const authorInitial = (post.authorName ? post.authorName.charAt(0) : "U").toUpperCase();

  return (
    '<div class="card post-card post-detail fade-in">' +
    '<div class="post-head">' +
    '<div class="avatar">' + escapeHtml(authorInitial) + "</div>" +
    '<div><div class="post-author">' + escapeHtml(post.authorName || "Unknown") + "</div>" +
    '<div class="post-time">' + timeAgo(post.createdAt) + "</div></div>" +
    (isMine ? '<button class="post-menu" onclick="deleteMyPost(\'' + escapeHtml(post.id) + '\')" title="Delete post">🗑️</button>' : "") +
    "</div>" +
    img +
    '<div class="post-body">' +
    '<div class="post-title"><h3>' + escapeHtml(post.name || "Animal") + '</h3><span class="badge ' + badge + '">' + escapeHtml(badge) + "</span></div>" +
    '<p class="post-desc">' + escapeHtml(post.description || "") + "</p>" +
    '<div class="post-meta">' + meta + "</div>" +
    "</div>" +
    '<div class="post-actions">' +
    '<button class="like-btn" data-id="' + escapeHtml(post.id) + '" onclick="handleLike(this)"><span>❤️</span><b>' + (post.likes || 0) + "</b> Like</button>" +
    '<button onclick="focusComment()"><span>💬</span> Comment</button>' +
    '<button onclick="sharePost(\'' + escapeHtml(post.id) + '\')"><span>↗️</span> Share</button>' +
    "</div>" +
    '<div class="contact-bar">' +
    '<a class="btn btn-primary btn-sm" href="tel:' + escapeHtml(post.phone || "") + '">📞 Call owner</a>' +
    '<button class="btn btn-ghost btn-sm" onclick="copyPhone(\'' + escapeHtml(post.phone || "") + '\')">📋 Copy number</button>' +
    "</div>" +
    "</div>"
  );
}
