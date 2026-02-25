/* ByteBuddy AI — front-end demo (no server)
   - Users + chats saved in localStorage
   - Fake AI responder (rule-based + helpful templates)
*/

const $ = (q) => document.querySelector(q);

const views = {
  landing: $("#viewLanding"),
  auth: $("#viewAuth"),
  chat: $("#viewChat"),
};

const topActions = $("#topActions");
const topUser = $("#topUser");
const userPill = $("#userPill");

const yearEl = $("#year");
yearEl.textContent = new Date().getFullYear();

// ---------- Storage ----------
const LS_KEYS = {
  users: "bytebuddy_users_v1",
  session: "bytebuddy_session_v1",
  chats: "bytebuddy_chats_v1", // per user
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Users ----------
function getUsers() {
  return loadJSON(LS_KEYS.users, []);
}
function setUsers(users) {
  saveJSON(LS_KEYS.users, users);
}

function ensureDemoAccount() {
  const users = getUsers();
  const exists = users.some(u => u.email.toLowerCase() === "demo@bytebuddy.ai");
  if (!exists) {
    users.push({
      id: crypto.randomUUID(),
      name: "Demo User",
      email: "demo@bytebuddy.ai",
      password: "demo123",
      createdAt: Date.now(),
    });
    setUsers(users);
  }
}
ensureDemoAccount();

function setSession(userId) {
  saveJSON(LS_KEYS.session, { userId, at: Date.now() });
}
function clearSession() {
  localStorage.removeItem(LS_KEYS.session);
}
function getSession() {
  return loadJSON(LS_KEYS.session, null);
}
function getCurrentUser() {
  const session = getSession();
  if (!session?.userId) return null;
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
}

// ---------- Chats ----------
function getAllChats() {
  return loadJSON(LS_KEYS.chats, {}); // { [userId]: { chats: [...] } }
}
function setAllChats(all) {
  saveJSON(LS_KEYS.chats, all);
}
function getUserChats(userId) {
  const all = getAllChats();
  if (!all[userId]) {
    all[userId] = { chats: [] };
    setAllChats(all);
  }
  return all[userId].chats;
}
function setUserChats(userId, chats) {
  const all = getAllChats();
  all[userId] = { chats };
  setAllChats(all);
}

// ---------- UI Routing ----------
function showView(name) {
  Object.values(views).forEach(v => (v.hidden = true));
  views[name].hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshTopbar() {
  const user = getCurrentUser();
  if (user) {
    topActions.hidden = true;
    topUser.hidden = false;
    userPill.textContent = `👤 ${user.name}`;
  } else {
    topActions.hidden = false;
    topUser.hidden = true;
  }
}

// ---------- Brand/Home ----------
$("#brandHome").addEventListener("click", () => {
  const user = getCurrentUser();
  refreshTopbar();
  if (user) openChatApp();
  else showView("landing");
});
$("#brandHome").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") $("#brandHome").click();
});

// ---------- Landing buttons ----------
$("#btnGoLogin").addEventListener("click", () => openAuth("login"));
$("#btnGoSignup").addEventListener("click", () => openAuth("signup"));
$("#btnStartNow").addEventListener("click", () => {
  const user = getCurrentUser();
  if (user) openChatApp();
  else openAuth("signup");
});
$("#btnDemoLogin").addEventListener("click", () => {
  // auto login demo
  const users = getUsers();
  const demo = users.find(u => u.email.toLowerCase() === "demo@bytebuddy.ai");
  if (demo) {
    setSession(demo.id);
    refreshTopbar();
    openChatApp();
  }
});

// ---------- Auth tabs ----------
const tabLogin = $("#tabLogin");
const tabSignup = $("#tabSignup");
const tabForgot = $("#tabForgot");

const formLogin = $("#formLogin");
const formSignup = $("#formSignup");
const formForgot = $("#formForgot");

const authTitle = $("#authTitle");
const authSubtitle = $("#authSubtitle");

function setTab(which) {
  const tabs = [
    [tabLogin, "login"],
    [tabSignup, "signup"],
    [tabForgot, "forgot"],
  ];

  tabs.forEach(([el, name]) => el.setAttribute("aria-selected", name === which ? "true" : "false"));

  formLogin.hidden = which !== "login";
  formSignup.hidden = which !== "signup";
  formForgot.hidden = which !== "forgot";

  if (which === "login") {
    authTitle.textContent = "Welcome back";
    authSubtitle.textContent = "Log in to continue your chats.";
  } else if (which === "signup") {
    authTitle.textContent = "Create your account";
    authSubtitle.textContent = "Sign up to start chatting with ByteBuddy.";
  } else {
    authTitle.textContent = "Reset password";
    authSubtitle.textContent = "Enter your email and set a new password.";
  }

  // clear messages
  $("#loginMsg").textContent = "";
  $("#signupMsg").textContent = "";
  $("#forgotMsg").textContent = "";
  $("#loginMsg").className = "msg";
  $("#signupMsg").className = "msg";
  $("#forgotMsg").className = "msg";
}

function openAuth(which) {
  showView("auth");
  setTab(which);
}

tabLogin.addEventListener("click", () => setTab("login"));
tabSignup.addEventListener("click", () => setTab("signup"));
tabForgot.addEventListener("click", () => setTab("forgot"));

$("#goForgot").addEventListener("click", () => setTab("forgot"));
$("#backToLanding").addEventListener("click", () => showView("landing"));

function togglePw(inputId) {
  const input = $(inputId);
  input.type = input.type === "password" ? "text" : "password";
}
$("#toggleLoginPw").addEventListener("click", () => togglePw("#loginPassword"));
$("#toggleSignupPw").addEventListener("click", () => togglePw("#signupPassword"));
$("#toggleForgotPw").addEventListener("click", () => togglePw("#forgotNewPw"));

// ---------- Auth submit ----------
formSignup.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#signupName").value.trim();
  const email = $("#signupEmail").value.trim().toLowerCase();
  const pw = $("#signupPassword").value;
  const confirm = $("#signupConfirm").value;
  const msg = $("#signupMsg");

  msg.className = "msg";
  msg.textContent = "";

  if (pw.length < 6) return setMsg(msg, "bad", "Password must be at least 6 characters.");
  if (pw !== confirm) return setMsg(msg, "bad", "Passwords do not match.");

  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email)) {
    return setMsg(msg, "bad", "That email is already registered. Try logging in.");
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password: pw,
    createdAt: Date.now(),
  };
  users.push(user);
  setUsers(users);
  setSession(user.id);

  setMsg(msg, "ok", "Account created! Opening chat…");
  refreshTopbar();
  openChatApp();
});

formLogin.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pw = $("#loginPassword").value;
  const msg = $("#loginMsg");

  msg.className = "msg";
  msg.textContent = "";

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email);

  if (!user || user.password !== pw) {
    return setMsg(msg, "bad", "Invalid email or password.");
  }

  setSession(user.id);
  setMsg(msg, "ok", "Logged in! Opening chat…");
  refreshTopbar();
  openChatApp();
});

formForgot.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#forgotEmail").value.trim().toLowerCase();
  const newPw = $("#forgotNewPw").value;
  const msg = $("#forgotMsg");

  msg.className = "msg";
  msg.textContent = "";

  if (newPw.length < 6) return setMsg(msg, "bad", "New password must be at least 6 characters.");

  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email);
  if (idx === -1) return setMsg(msg, "bad", "No account found with that email.");

  users[idx].password = newPw;
  setUsers(users);
  setMsg(msg, "ok", "Password updated! You can log in now.");
  setTab("login");
});

function setMsg(el, kind, text) {
  el.className = `msg ${kind}`;
  el.textContent = text;
}

// ---------- Logout ----------
$("#btnLogout").addEventListener("click", () => {
  clearSession();
  refreshTopbar();
  showView("landing");
});

// ---------- Chat App ----------
const chatListEl = $("#chatList");
const chatStreamEl = $("#chatStream");
const chatTitleEl = $("#chatTitle");
const inputBox = $("#inputBox");
const btnSend = $("#btnSend");
const typingState = $("#typingState");

let currentChatId = null;

function openChatApp() {
  showView("chat");
  refreshTopbar();

  const user = getCurrentUser();
  if (!user) return openAuth("login");

  renderChatList();
  if (!currentChatId) {
    const chats = getUserChats(user.id);
    if (chats.length) currentChatId = chats[0].id;
    else createNewChat();
  }
  openChat(currentChatId);
  inputBox.focus();
}

$("#btnNewChat").addEventListener("click", () => createNewChat());
$("#btnClearAll").addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) return;
  if (!confirm("Clear all chats on this device?")) return;
  setUserChats(user.id, []);
  currentChatId = null;
  renderChatList();
  createNewChat();
});

$("#btnExport").addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) return;
  const chats = getUserChats(user.id);
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  const text = chat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(chat.title || "chat")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

function safeFilename(s) {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 60);
}

function createNewChat() {
  const user = getCurrentUser();
  if (!user) return;

  const chats = getUserChats(user.id);
  const newChat = {
    id: crypto.randomUUID(),
    title: "New chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        role: "ai",
        content: `Hey ${user.name}! I’m ByteBuddy. Ask me anything — ideas, advice, summaries, whatever.`,
        at: Date.now(),
      }
    ],
  };

  chats.unshift(newChat);
  setUserChats(user.id, chats);
  currentChatId = newChat.id;
  renderChatList();
  openChat(currentChatId);
}

function renderChatList() {
  const user = getCurrentUser();
  if (!user) return;

  const chats = getUserChats(user.id);
  chatListEl.innerHTML = "";

  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "tiny muted";
    empty.style.padding = "10px";
    empty.textContent = "No chats yet. Start a new one!";
    chatListEl.appendChild(empty);
    return;
  }

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chatItem" + (chat.id === currentChatId ? " active" : "");
    item.innerHTML = `
      <div class="chatItemTitle">${escapeHtml(chat.title || "Chat")}</div>
      <div class="chatItemMeta">${new Date(chat.updatedAt).toLocaleString()}</div>
    `;
    item.addEventListener("click", () => {
      currentChatId = chat.id;
      renderChatList();
      openChat(chat.id);
    });
    chatListEl.appendChild(item);
  });
}

function openChat(chatId) {
  const user = getCurrentUser();
  if (!user) return;

  const chats = getUserChats(user.id);
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  chatTitleEl.textContent = chat.title || "Chat";
  chatStreamEl.innerHTML = "";
  chat.messages.forEach(m => addBubble(m.role, m.content, false));
  scrollChatToBottom();
}

function addBubble(role, content, scroll = true) {
  const row = document.createElement("div");
  row.className = "bubbleRow";

  const avatar = document.createElement("div");
  avatar.className = "avatar " + (role === "ai" ? "ai" : "user");
  avatar.textContent = role === "ai" ? "🤖" : "🙂";

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (role === "user" ? "user" : "ai");

  const who = document.createElement("div");
  who.className = "who";
  who.textContent = role === "ai" ? "ByteBuddy AI" : "You";

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = content;

  bubble.appendChild(who);
  bubble.appendChild(text);

  row.appendChild(avatar);
  row.appendChild(bubble);

  chatStreamEl.appendChild(row);
  if (scroll) scrollChatToBottom();
  return { textEl: text };
}

function scrollChatToBottom() {
  chatStreamEl.scrollTop = chatStreamEl.scrollHeight;
}

// composer UX: autosize
inputBox.addEventListener("input", () => {
  inputBox.style.height = "auto";
  inputBox.style.height = Math.min(inputBox.scrollHeight, 180) + "px";
});

// Enter to send, shift+enter newline
inputBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
btnSend.addEventListener("click", sendMessage);

function sendMessage() {
  const user = getCurrentUser();
  if (!user) return openAuth("login");
  const prompt = inputBox.value.trim();
  if (!prompt) return;

  const chats = getUserChats(user.id);
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  // set title based on first user message
  const firstUser = chat.messages.find(m => m.role === "user");
  if (!firstUser) {
    chat.title = prompt.slice(0, 40) + (prompt.length > 40 ? "…" : "");
  }

  chat.messages.push({ role: "user", content: prompt, at: Date.now() });
  chat.updatedAt = Date.now();
  setUserChats(user.id, chats);

  addBubble("user", prompt);
  inputBox.value = "";
  inputBox.style.height = "auto";

  renderChatList();
  typingState.textContent = "ByteBuddy is typing…";

  // AI response with typing animation
  const reply = generateAIResponse(prompt, { name: user.name });
  const { textEl } = addBubble("ai", "", true);
  typeOut(textEl, reply, 12, () => {
    typingState.textContent = "";
    // Save AI message
    const chats2 = getUserChats(user.id);
    const chat2 = chats2.find(c => c.id === currentChatId);
    if (!chat2) return;
    chat2.messages.push({ role: "ai", content: reply, at: Date.now() });
    chat2.updatedAt = Date.now();
    setUserChats(user.id, chats2);
    renderChatList();
  });
}

function typeOut(el, text, speedMs, done) {
  let i = 0;
  const timer = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    scrollChatToBottom();
    if (i >= text.length) {
      clearInterval(timer);
      done?.();
    }
  }, speedMs);
}

// ---------- Simple “AI Brain” ----------
function generateAIResponse(prompt, ctx) {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // quick helpers
  const bullets = (arr) => arr.map(x => `• ${x}`).join("\n");
  const greet = `Hey ${ctx?.name || "there"} — `;

  // common intents
  if (lower.startsWith("hi") || lower.startsWith("hello") || lower.includes("how are you")) {
    return `${greet}I’m doing great. What do you want to talk about today?`;
  }

  if (lower.includes("idea") || lower.includes("ideas") || lower.includes("suggest")) {
    return `${greet}here are a few ideas:\n${bullets([
      "A mini habit tracker you can use daily",
      "A simple portfolio site with a projects section",
      "A ‘study timer’ (Pomodoro) with stats + streaks",
      "A notes app with tags and search",
      "A tiny budgeting dashboard (income/expenses)"
    ])}\n\nTell me what theme you like and I’ll tailor it.`;
  }

  if (lower.includes("summarize")) {
    return `${greet}paste the text you want summarized and tell me:\n${bullets([
      "How short you want it (1 sentence / 5 bullets / paragraph)",
      "Your tone (casual / formal)",
      "Anything to focus on (dates, actions, key points)"
    ])}`;
  }

  if (lower.includes("email") || lower.includes("message") || lower.includes("text")) {
    return `${greet}sure — paste what you have (or tell me the goal + who it’s for) and I’ll write a clean version.`;
  }

  if (lower.includes("code") || lower.includes("bug") || lower.includes("error")) {
    return `${greet}paste the code or the error message and tell me what you expected to happen. I’ll help you fix it.`;
  }

  // fallback “chatgpt-like”
  return `${greet}here’s a helpful answer based on what you asked:\n\n` +
    `1) What you’re trying to do: "${p}"\n` +
    `2) A good approach:\n` +
    `${bullets([
      "Break it into small steps",
      "Start with the simplest working version",
      "Test each part, then add features",
      "Keep the UI clean and readable"
    ])}\n\n` +
    `If you tell me your goal in one sentence (and any limits like “mobile only” or “no libraries”), I can give you a more exact solution.`;
}

// ---------- Utilities ----------
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// ---------- Init ----------
function init() {
  refreshTopbar();
  const user = getCurrentUser();
  if (user) openChatApp();
  else showView("landing");
}
init();
