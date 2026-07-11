// ============================================================
// Render everything from TRIP_DATA (see data.js) into the DOM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const renderLucideIcons = () => {
    if (!window.lucide?.createIcons) return;
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2,
        width: 18,
        height: 18
      }
    });
    document.body.classList.add("lucide-ready");
  };

  const lucideIcon = (name, className = "ui-icon") =>
    `<span class="${className}" data-lucide="${escapeHTML(name)}" aria-hidden="true"></span>`;

  const data = TRIP_DATA;
  const locationData = data.locations || {};
  const weatherPlaceKeys = new Set((data.weatherPlaces || []).map(place => place.key));

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const imgAttrs = ({ lazy = true } = {}) => `decoding="async"${lazy ? ' loading="lazy"' : ""}`;

  const blockLocationKeys = block => {
    if (Array.isArray(block.locations)) return block.locations;
    return block.location ? [block.location] : [];
  };

  const authAccounts = (data.members || []).map(member => ({
    username: String(member.name || "").trim(),
    displayName: ""
  })).filter(account => account.username);

  let authMember = null;

  const getAuthMember = () => authMember;

  const emitAuthChange = () => {
    window.dispatchEvent(new CustomEvent("hue-auth-change", { detail: authMember }));
  };

  const initAuthWidget = () => {
    const config = window.HUE_SUPABASE || {};
    const loginOpen = document.getElementById("authLoginOpen");
    const authUser = document.getElementById("authUser");
    const greetingButton = document.getElementById("authGreetingButton");
    const greetingName = document.getElementById("authGreetingName");
    const userMenu = document.getElementById("authUserMenu");
    const changePassword = document.getElementById("authChangePassword");
    const logout = document.getElementById("authLogout");
    const modal = document.getElementById("authModal");
    const form = document.getElementById("authForm");
    const accountSelect = document.getElementById("authAccountSelect");
    const accountButton = document.getElementById("authAccountButton");
    const accountCurrent = document.getElementById("authAccountCurrent");
    const accountMenu = document.getElementById("authAccountMenu");
    const passwordField = document.getElementById("authPasswordField");
    const password = document.getElementById("authPassword");
    const newPasswordField = document.getElementById("authNewPasswordField");
    const newPassword = document.getElementById("authNewPassword");
    const submit = document.getElementById("authSubmit");
    const cancel = document.getElementById("authCancel");
    const title = document.getElementById("authModalTitle");
    const copy = document.getElementById("authCopy");
    const modeLabel = document.getElementById("authModeLabel");
    const errorBox = document.getElementById("authError");

    if (!loginOpen || !authUser || !greetingButton || !greetingName || !userMenu || !changePassword || !logout || !modal || !form || !accountSelect || !accountButton || !accountCurrent || !accountMenu || !passwordField || !password || !newPasswordField || !newPassword || !submit || !cancel || !title || !copy || !modeLabel || !errorBox) return;

    const sessionKey = "hueAuthSession";
    const isConfigured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
    const client = isConfigured ? window.supabase.createClient(config.url, config.anonKey) : null;
    let mode = "login";

    let selectedUsername = authAccounts[0]?.username || "";
    const accountField = accountSelect.closest("label");

    const renderAccountCurrent = () => {
      const index = Math.max(authAccounts.findIndex(account => account.username === selectedUsername), 0);
      const account = authAccounts[index];
      if (!account) return;
      accountCurrent.innerHTML = `
        <img src="figures/people/${index + 1}.png" alt="" ${imgAttrs()}>
        <span>${escapeHTML(account.username)}</span>
      `;
      accountMenu.querySelectorAll("[role='option']").forEach(option => {
        option.setAttribute("aria-selected", String(option.dataset.username === selectedUsername));
      });
    };

    const setAccountMenuOpen = open => {
      if (accountButton.disabled) return;
      accountMenu.hidden = !open;
      accountButton.setAttribute("aria-expanded", String(open));
    };

    const setUserMenuOpen = open => {
      userMenu.hidden = !open;
      greetingButton.setAttribute("aria-expanded", String(open));
    };

    const renderAccountMenu = () => {
      accountMenu.innerHTML = authAccounts.map((account, index) => `
        <button class="auth-account-option" type="button" role="option" data-username="${escapeHTML(account.username)}" aria-selected="false">
          <img src="figures/people/${index + 1}.png" alt="" ${imgAttrs()}>
          <span>${escapeHTML(account.username)}</span>
        </button>
      `).join("");
      renderAccountCurrent();
    };

    renderAccountMenu();

    const rpcRow = data => Array.isArray(data) ? data[0] : data;

    const loadAuthAccounts = async () => {
      if (!client) return;
      const { data: rows, error } = await client.rpc("trip_list_members");
      if (error) return;

      const displayNames = new Map((rows || []).map(row => [
        row.username,
        row.displayName || row.display_name || row.username
      ]));
      authAccounts.forEach(account => {
        account.displayName = displayNames.get(account.username) || account.username;
      });
      renderAccountMenu();
    };

    const setError = message => {
      errorBox.textContent = message || "";
      errorBox.hidden = !message;
    };

    const saveSession = member => {
      authMember = member;
      localStorage.setItem(sessionKey, JSON.stringify(member));
      localStorage.setItem("hueChatName", member.displayName || member.username);
      renderAuth();
      emitAuthChange();
    };

    const clearSession = () => {
      authMember = null;
      localStorage.removeItem(sessionKey);
      renderAuth();
      emitAuthChange();
    };

    const renderAuth = () => {
      const loggedIn = Boolean(authMember?.displayName);
      loginOpen.hidden = loggedIn;
      authUser.hidden = !loggedIn;
      greetingName.textContent = authMember?.displayName || "";
      setUserMenuOpen(false);
    };

    const setMode = (nextMode, options = {}) => {
      mode = nextMode;
      setError("");
      modal.classList.toggle("is-required", Boolean(options.required));
      accountButton.disabled = Boolean(options.lockUsername);
      accountSelect.classList.toggle("is-disabled", Boolean(options.lockUsername));
      if (accountField) accountField.hidden = nextMode === "changePassword";
      passwordField.hidden = nextMode === "firstPassword";
      newPasswordField.hidden = nextMode === "login";
      password.required = nextMode === "changePassword";
      newPassword.required = nextMode !== "login";
      password.placeholder = nextMode === "changePassword" ? "" : "Để trống nếu đăng nhập lần đầu";
      password.value = "";
      newPassword.value = "";

      if (nextMode === "firstPassword") {
        modeLabel.textContent = "lần đầu đăng nhập";
        title.textContent = "Điền mật khẩu cho tài khoản";
        copy.textContent = "Tài khoản này chưa có mật khẩu. Đặt mật khẩu để dùng từ lần sau.";
        submit.textContent = "Lưu mật khẩu";
      } else if (nextMode === "changePassword") {
        modeLabel.textContent = "tài khoản";
        title.textContent = "Đổi mật khẩu";
        copy.textContent = "Nhập mật khẩu cũ và mật khẩu mới.";
        submit.textContent = "Đổi mật khẩu";
      } else {
        modeLabel.textContent = "gogo pass";
        title.textContent = "Đăng nhập";
        copy.textContent = "Ai đây?";
        submit.textContent = "Tiếp tục";
      }
    };

    const openModal = (options = {}) => {
      if (options.username) {
        selectedUsername = options.username;
        renderAccountCurrent();
      }
      setMode(options.mode || "login", options);
      modal.hidden = false;
      const target = mode === "firstPassword" ? newPassword : mode === "changePassword" ? password : accountButton;
      window.setTimeout(() => target.focus(), 0);
    };

    const closeModal = () => {
      if (modal.classList.contains("is-required")) return;
      modal.hidden = true;
      setError("");
    };

    const login = async () => {
      const selected = selectedUsername;
      const pass = password.value;
      const { data, error } = await client.rpc("trip_login", {
        p_username: selected,
        p_password: pass || null
      });
      if (error) throw error;

      const row = rpcRow(data);
      if (row?.needs_password) {
        openModal({ mode: "firstPassword", required: true, lockUsername: true, username: selected });
        return;
      }
      if (!row?.authenticated) {
        setError(row?.message || "Sai tài khoản hoặc mật khẩu.");
        return;
      }

      saveSession(row);
      modal.hidden = true;
    };

    const setInitialPassword = async () => {
      const pass = newPassword.value.trim();
      if (pass.length < 4) {
        setError("Mật khẩu cần ít nhất 4 ký tự.");
        return;
      }

      const { data, error } = await client.rpc("trip_set_initial_password", {
        p_username: selectedUsername,
        p_password: pass
      });
      if (error) throw error;

      const row = rpcRow(data);
      if (!row?.authenticated) {
        setError(row?.message || "Không lưu được mật khẩu.");
        return;
      }

      saveSession(row);
      modal.hidden = true;
    };

    const changeCurrentPassword = async () => {
      const oldPass = password.value;
      const pass = newPassword.value.trim();
      if (!oldPass) {
        setError("Nhập mật khẩu cũ.");
        return;
      }
      if (pass.length < 4) {
        setError("Mật khẩu mới cần ít nhất 4 ký tự.");
        return;
      }

      const { data, error } = await client.rpc("trip_change_password", {
        p_session_token: authMember?.sessionToken || "",
        p_current_password: oldPass,
        p_new_password: pass
      });
      if (error) throw error;

      const row = rpcRow(data);
      if (!row?.authenticated) {
        setError(row?.message || "Không đổi được mật khẩu.");
        return;
      }

      saveSession(row);
      modal.hidden = true;
    };

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client) {
        setError("Chưa cấu hình Supabase hoặc thiếu migration auth.");
        return;
      }

      submit.disabled = true;
      try {
        if (mode === "firstPassword") await setInitialPassword();
        else if (mode === "changePassword") await changeCurrentPassword();
        else await login();
      } catch (error) {
        setError(error.message || "Không đăng nhập được. Kiểm tra migration Supabase.");
      } finally {
        submit.disabled = false;
      }
    });

    loginOpen.addEventListener("click", () => openModal());
    greetingButton.addEventListener("click", event => {
      event.stopPropagation();
      setUserMenuOpen(userMenu.hidden);
    });
    authUser.addEventListener("click", event => {
      if (event.target.closest("#authLogout, #authUserMenu")) return;
      setUserMenuOpen(userMenu.hidden);
    });
    changePassword.addEventListener("click", () => {
      setUserMenuOpen(false);
      if (!authMember?.username) return;
      openModal({ mode: "changePassword", lockUsername: true, username: authMember.username });
    });
    accountButton.addEventListener("click", () => setAccountMenuOpen(accountMenu.hidden));
    accountMenu.addEventListener("click", event => {
      const option = event.target.closest("[data-username]");
      if (!option) return;
      selectedUsername = option.dataset.username;
      renderAccountCurrent();
      setAccountMenuOpen(false);
      accountButton.focus();
    });
    cancel.addEventListener("click", closeModal);
    logout.addEventListener("click", clearSession);
    modal.addEventListener("click", event => {
      if (!event.target.closest("#authAccountSelect")) setAccountMenuOpen(false);
      if (event.target === modal) closeModal();
    });
    document.addEventListener("click", event => {
      if (!event.target.closest("#authUser")) setUserMenuOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setAccountMenuOpen(false);
      if (event.key === "Escape") setUserMenuOpen(false);
      if (event.key === "Escape" && !modal.hidden) closeModal();
    });

    const saved = JSON.parse(localStorage.getItem(sessionKey) || "null");
    if (saved?.sessionToken && saved?.displayName) {
      authMember = saved;
    }
    renderAuth();

    loadAuthAccounts();

    if (!saved?.sessionToken || !client) return;

    client.rpc("trip_validate_session", { p_session_token: saved.sessionToken })
      .then(({ data, error }) => {
        if (error) throw error;
        const row = rpcRow(data);
        if (row?.authenticated) saveSession(row);
        else clearSession();
      })
      .catch(clearSession);
  };

  const renderOutfitPeek = outfit => {
    if (!outfit) return "";

    const outfitItems = String(outfit)
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean);

    return `
      <span class="location-peek outfit-peek" tabindex="0">
        <span class="location-chip outfit-chip">
          ${lucideIcon("shirt", "outfit-icon")}
          Dresscode
        </span>
        <span class="location-card outfit-card" role="tooltip">
          <span class="location-photo outfit-photo" aria-hidden="true">${lucideIcon("shirt", "outfit-card-icon")}</span>
          <span class="location-copy outfit-copy">
            <strong>Trang phục</strong>
            <span>${outfitItems.map(escapeHTML).join(" · ")}</span>
          </span>
        </span>
      </span>
    `;
  };

  const renderLocationPeek = key => {
    const location = locationData[key];
    if (!location) return "";

    const imageHTML = location.image
      ? `<img src="${escapeHTML(location.image)}" alt="${escapeHTML(location.name)}" ${imgAttrs()}>`
      : `<span>${escapeHTML(location.name.slice(0, 2).toUpperCase())}</span>`;

    return `
      <span class="location-peek" tabindex="0">
        <span class="location-chip">
          <span class="location-pin" aria-hidden="true"></span>
          ${escapeHTML(location.name)}
        </span>
        <span class="location-card" role="tooltip">
          <span class="location-photo ${location.image ? "" : "location-photo--empty"}">${imageHTML}</span>
          <span class="location-copy">
            <strong>${escapeHTML(location.name)}</strong>
            ${location.desc ? `<span>${escapeHTML(location.desc)}</span>` : ""}
            <span class="location-actions">
              ${location.mapsUrl ? `
                <a class="maps-button" href="${escapeHTML(location.mapsUrl)}" target="_blank" rel="noopener noreferrer">
                  <img class="maps-icon" src="figures/decor/google-maps.png" alt="" aria-hidden="true" ${imgAttrs()}>
                  <span>Mở trong Google Maps</span>
                </a>
              ` : ""}
              ${weatherPlaceKeys.has(key) ? `
                <button class="weather-mini-button" type="button" data-weather-key="${escapeHTML(key)}">
                  ${lucideIcon("sun")}
                  <span>Thời tiết</span>
                </button>
              ` : ""}
            </span>
          </span>
        </span>
      </span>
    `;
  };

  const mapsUrlForPlace = place => place.mapsUrl || locationData[place.key]?.mapsUrl || "";

  const weatherInfo = code => {
    const table = {
      0: ["sun", "Trời quang"],
      1: ["cloud-sun", "Ít mây"],
      2: ["cloud-sun", "Mây rải rác"],
      3: ["cloud", "Nhiều mây"],
      45: ["cloud-fog", "Sương mù"],
      48: ["cloud-fog", "Sương mù đóng băng"],
      51: ["cloud-drizzle", "Mưa phùn nhẹ"],
      53: ["cloud-drizzle", "Mưa phùn"],
      55: ["cloud-drizzle", "Mưa phùn dày"],
      61: ["cloud-rain", "Mưa nhẹ"],
      63: ["cloud-rain", "Mưa vừa"],
      65: ["cloud-rain", "Mưa to"],
      80: ["cloud-sun-rain", "Mưa rào nhẹ"],
      81: ["cloud-rain", "Mưa rào"],
      82: ["cloud-rain-wind", "Mưa rào mạnh"],
      95: ["cloud-lightning", "Giông"],
      96: ["cloud-lightning", "Giông kèm mưa đá"],
      99: ["cloud-lightning", "Giông mạnh"]
    };
    return table[code] || ["thermometer", "Không rõ"];
  };

  const formatWeatherDate = date => new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok"
  }).format(new Date(`${date}T00:00:00+07:00`));

  const initChatWidget = () => {
    const config = window.HUE_SUPABASE || {};
    const widget = document.getElementById("chatWidget");
    const toggle = document.getElementById("chatToggle");
    const close = document.getElementById("chatClose");
    const panel = document.getElementById("chatPanel");
    const nameForm = document.getElementById("chatNameForm");
    const nameToggle = document.getElementById("chatNameToggle");
    const nameInput = document.getElementById("chatName");
    const status = document.getElementById("chatStatus");
    const messages = document.getElementById("chatMessages");
    const reactionPopover = document.getElementById("chatReactionPopover");
    const replyPreview = document.getElementById("chatReplyPreview");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const sendButton = form?.querySelector("button[type='submit']");
    const unread = document.getElementById("chatUnread");
    const confirmDialog = document.getElementById("chatConfirm");
    const deleteCancel = document.getElementById("chatDeleteCancel");
    const deleteConfirm = document.getElementById("chatDeleteConfirm");

    if (!widget || !toggle || !panel || !nameForm || !nameToggle || !nameInput || !status || !messages || !reactionPopover || !replyPreview || !form || !input || !sendButton || !unread || !confirmDialog || !deleteCancel || !deleteConfirm) return;

    const table = "chat_messages";
    const reactionTable = "chat_reactions";
    const messageLimit = 1000;
    const reactionOptions = ["❤️", "😂", "😮", "😢", "👍", "🔥", "🎉", "🙏", "💀", "🤡"];
    const knownIds = new Set();
    const messageById = new Map();
    const reactionsByMessage = new Map();
    let messageCount = 0;
    let client = null;
    let selectedReply = null;
    let pendingDelete = null;
    let chatScrollY = 0;
    let chatLoaded = false;
    let chatLoading = null;
    let realtimeStarted = false;

    const getUserId = () => {
      const saved = localStorage.getItem("hueChatUserId");
      if (saved) return saved;
      const generated = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("hueChatUserId", generated);
      return generated;
    };

    const currentUserId = getUserId();
    const getChatAuthorId = () => getAuthMember()?.username || currentUserId;
    const savedName = localStorage.getItem("hueChatName") || getAuthMember()?.displayName || "";
    nameInput.value = savedName;
    nameForm.hidden = Boolean(savedName);
    nameToggle.hidden = !savedName;

    const cleanName = value => String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const cleanBody = value => String(value || "").trim().slice(0, 500);
    const memberAvatarByName = new Map();
    const memberAvatarByUserId = new Map();
    (data.members || []).forEach((member, index) => {
      const avatar = `figures/people/${index + 1}.png`;
      memberAvatarByName.set(cleanName(member.name), avatar);
      const account = authAccounts[index];
      if (account) {
        memberAvatarByName.set(cleanName(account.displayName), avatar);
        memberAvatarByUserId.set(account.username, avatar);
      }
    });
    const replyText = value => {
      const text = cleanBody(value).replace(/\s+/g, " ");
      return text.length > 90 ? `${text.slice(0, 87)}...` : text;
    };
    const isConfigured = Boolean(config.url && config.anonKey && window.supabase?.createClient);

    const setStatus = (text, kind = "") => {
      status.textContent = text;
      status.dataset.kind = kind;
      status.hidden = !text;
    };

    const isMobileChat = () => window.matchMedia("(max-width: 560px)").matches;

    const setPageLocked = locked => {
      if (locked) {
        if (!isMobileChat()) return;
        chatScrollY = window.scrollY;
        document.body.style.top = `-${chatScrollY}px`;
        document.body.classList.add("chat-page-locked");
        return;
      }
      if (!document.body.classList.contains("chat-page-locked")) return;
      document.body.classList.remove("chat-page-locked");
      document.body.style.top = "";
      window.scrollTo(0, chatScrollY);
    };

    const setOpen = open => {
      widget.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      setPageLocked(open);
      if (!open) return;
      ensureChatLoaded().finally(() => {
        messages.scrollTop = messages.scrollHeight;
        if (!isMobileChat()) (nameForm.hidden ? input : nameInput).focus();
      });
    };

    const setMessageCount = count => {
      messageCount = Math.min(Math.max(Number(count) || 0, 0), messageLimit);
      unread.textContent = String(messageCount);
      unread.hidden = messageCount === 0;
    };

    const setNameFormVisible = visible => {
      nameForm.hidden = !visible;
      nameToggle.hidden = visible;
      if (visible) nameInput.focus();
    };

    const clearReply = () => {
      selectedReply = null;
      replyPreview.hidden = true;
      replyPreview.innerHTML = "";
    };

    const setReply = message => {
      selectedReply = {
        id: message.id,
        username: cleanName(message.username),
        body: replyText(message.body)
      };
      replyPreview.hidden = false;
      replyPreview.innerHTML = `
        <div>
          <strong>Đang trả lời ${escapeHTML(selectedReply.username)}</strong>
          <p>${escapeHTML(selectedReply.body)}</p>
        </div>
        <button type="button" class="chat-reply-cancel" aria-label="Bỏ reply">${lucideIcon("x")}</button>
      `;
      renderLucideIcons();
      input.focus();
    };

    const setConfirmOpen = open => {
      confirmDialog.hidden = !open;
      if (open) deleteConfirm.focus();
    };

    const softDeleteMessage = message => {
      const username = cleanName(localStorage.getItem("hueChatName"));
      const authorId = getChatAuthorId();
      if (!message || (message.user_id ? message.user_id !== authorId : message.username !== username)) return;
      const query = client
        .from(table)
        .update({ body: "", reply_to_id: null, reply_to_username: null, reply_to_body: null })
        .eq("id", message.id);
      (message.user_id ? query.eq("user_id", authorId) : query.eq("username", username))
        .then(({ error }) => {
          if (error) {
            console.error("Delete chat message failed:", error);
            setStatus(`Không xóa được tin nhắn: ${error.message || "kiểm tra SQL soft delete"}`, "error");
          } else {
            markMessageDeleted({ id: message.id });
          }
        });
    };

    const closeReactionPickers = except => {
      messages.querySelectorAll(".chat-message.is-reacting").forEach(item => {
        if (item !== except) item.classList.remove("is-reacting");
      });
      if (!except) {
        reactionPopover.hidden = true;
        reactionPopover.innerHTML = "";
      }
    };

    const positionReactionPicker = item => {
      const bubble = item.querySelector(".chat-message-bubble");
      if (!bubble) return;

      const bubbleRect = bubble.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const popoverRect = reactionPopover.getBoundingClientRect();
      const pickerWidth = popoverRect.width || 244;
      const pickerHeight = popoverRect.height || 112;
      const gap = 8;
      const center = bubbleRect.left + bubbleRect.width / 2;
      const minLeft = panelRect.left + 18 + pickerWidth / 2;
      const maxLeft = panelRect.right - 18 - pickerWidth / 2;
      const left = Math.min(Math.max(center, minLeft), maxLeft);
      const canShowAbove = bubbleRect.top - pickerHeight - gap >= panelRect.top + 12;
      const canShowBelow = bubbleRect.bottom + pickerHeight + gap <= panelRect.bottom - 12;
      const rawTop = canShowAbove || !canShowBelow
        ? bubbleRect.top - pickerHeight - gap
        : bubbleRect.bottom + gap;
      const top = Math.min(Math.max(rawTop, panelRect.top + 12), panelRect.bottom - pickerHeight - 12);

      reactionPopover.style.setProperty("--picker-left", `${left - panelRect.left}px`);
      reactionPopover.style.setProperty("--picker-top", `${top - panelRect.top}px`);
    };

    const reactionBucket = messageId => {
      if (!reactionsByMessage.has(messageId)) reactionsByMessage.set(messageId, new Map());
      return reactionsByMessage.get(messageId);
    };

    const renderReactionBar = messageId => {
      const bar = messages.querySelector(`[data-reactions-for="${messageId}"]`);
      if (!bar) return;
      const row = bar.closest(".chat-message");
      const beforeRowHeight = row?.offsetHeight || 0;
      const beforeScrollHeight = messages.scrollHeight;
      const beforeTop = row?.getBoundingClientRect().top || bar.getBoundingClientRect().top;
      const viewport = messages.getBoundingClientRect();

      const bucket = reactionBucket(messageId);
      const entries = Array.from(bucket.entries())
        .map(([emoji, users]) => ({ emoji, users }))
        .filter(item => item.users.size)
        .sort((a, b) => b.users.size - a.users.size || a.emoji.localeCompare(b.emoji));

      if (!entries.length) {
        bar.hidden = true;
        bar.innerHTML = "";
        const heightDelta = (row?.offsetHeight || 0) - beforeRowHeight || messages.scrollHeight - beforeScrollHeight;
        if (heightDelta > 0 && beforeTop < viewport.bottom) messages.scrollTop += heightDelta;
        return;
      }

      bar.hidden = false;
      bar.innerHTML = `
        ${entries.map(({ emoji, users }) => `
          <button class="chat-reaction-chip ${users.has(currentUserId) ? "is-active" : ""}" type="button" data-reaction-id="${escapeHTML(messageId)}" data-reaction-emoji="${escapeHTML(emoji)}" aria-label="Reaction ${escapeHTML(emoji)}">
            <span>${escapeHTML(emoji)}</span>
            <strong>${users.size}</strong>
          </button>
        `).join("")}
        <button class="chat-reaction-add" type="button" data-reaction-bar-menu="${escapeHTML(messageId)}" aria-label="Thêm reaction">${lucideIcon("plus")}</button>
      `;
      renderLucideIcons();
      const heightDelta = (row?.offsetHeight || 0) - beforeRowHeight || messages.scrollHeight - beforeScrollHeight;
      if (heightDelta > 0 && beforeTop < viewport.bottom) messages.scrollTop += heightDelta;
    };

    const applyReaction = reaction => {
      if (!reaction?.message_id || !reaction?.emoji || !reaction?.user_id) return;
      const bucket = reactionBucket(reaction.message_id);
      if (!bucket.has(reaction.emoji)) bucket.set(reaction.emoji, new Set());
      bucket.get(reaction.emoji).add(reaction.user_id);
      renderReactionBar(reaction.message_id);
    };

    const removeReaction = reaction => {
      if (!reaction?.message_id || !reaction?.emoji || !reaction?.user_id) return;
      const bucket = reactionBucket(reaction.message_id);
      bucket.get(reaction.emoji)?.delete(reaction.user_id);
      if (bucket.get(reaction.emoji)?.size === 0) bucket.delete(reaction.emoji);
      renderReactionBar(reaction.message_id);
    };

    const loadReactions = async messageIds => {
      if (!messageIds.length) return;
      const { data: rows, error } = await client
        .from(reactionTable)
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds);

      if (error) throw error;
      reactionsByMessage.clear();
      (rows || []).forEach(applyReaction);
      messageIds.forEach(renderReactionBar);
    };

    const toggleReaction = async (messageId, emoji) => {
      const bucket = reactionBucket(messageId);
      const active = bucket.get(emoji)?.has(currentUserId);
      const distinctCount = Array.from(bucket.values()).filter(users => users.size).length;

      if (!active && !bucket.has(emoji) && distinctCount >= 5) {
        setStatus("Quá nhiều reaction", "error");
        window.setTimeout(() => setStatus(""), 1400);
        return;
      }

      if (active) {
        const { error } = await client
          .from(reactionTable)
          .delete()
          .match({ message_id: messageId, user_id: currentUserId, emoji });
        if (error) setStatus("Không bỏ được reaction.", "error");
        else removeReaction({ message_id: messageId, user_id: currentUserId, emoji });
        return;
      }

      const { error } = await client
        .from(reactionTable)
        .insert({ message_id: messageId, user_id: currentUserId, emoji });
      if (error) setStatus("Không react được tin này.", "error");
      else applyReaction({ message_id: messageId, user_id: currentUserId, emoji });
    };

    const openReactionPicker = item => {
      const messageId = item?.dataset.id;
      if (!messageId) return;
      reactionPopover.innerHTML = reactionOptions.map(emoji => `
        <button type="button" data-reaction-id="${escapeHTML(messageId)}" data-reaction-emoji="${escapeHTML(emoji)}" aria-label="React ${escapeHTML(emoji)}">${escapeHTML(emoji)}</button>
      `).join("");
      reactionPopover.hidden = false;
      positionReactionPicker(item);
    };

    const formatChatTime = value => new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok"
    }).format(new Date(value));

    const renderChatAvatar = message => {
      const avatar = memberAvatarByUserId.get(message.user_id) || memberAvatarByName.get(cleanName(message.username));
      if (!avatar) return "";
      return `
        <img class="chat-message-avatar" src="${escapeHTML(avatar)}" alt="${escapeHTML(message.username)}" ${imgAttrs()}>
      `;
    };

    const renderMessage = (message, options = {}) => {
      if (!message?.id || knownIds.has(message.id)) return;
      knownIds.add(message.id);

      const ownName = cleanName(localStorage.getItem("hueChatName"));
      const authorId = getChatAuthorId();
      const isMine = message.user_id ? message.user_id === authorId : ownName && message.username === ownName;
      const isDeleted = !String(message.body || "").trim();
      const item = document.createElement("article");
      item.className = "chat-message";
      if (isMine) item.classList.add("is-mine");
      if (isDeleted) item.classList.add("is-deleted");
      item.dataset.id = message.id;
      item.innerHTML = `
        ${renderChatAvatar(message)}
        <div class="chat-message-stack">
          <div class="chat-message-bubble">
            ${message.reply_to_body ? `
              <button class="chat-reply-quote" type="button" data-scroll-reply-id="${escapeHTML(message.reply_to_id || "")}">
                <strong>${escapeHTML(message.reply_to_username || "Tin nhắn")}</strong>
                <span>${escapeHTML(message.reply_to_body)}</span>
              </button>
            ` : ""}
            <div class="chat-message-meta">
              <strong>${escapeHTML(message.username)}</strong>
              <time>${escapeHTML(formatChatTime(message.created_at))}</time>
            </div>
            <p class="chat-message-body">${isDeleted ? "Đã xóa" : escapeHTML(message.body)}</p>
          </div>
          <div class="chat-reactions" data-reactions-for="${escapeHTML(message.id)}" hidden></div>
        </div>
        <div class="chat-message-actions">
          ${isMine && !isDeleted ? `
            <button class="chat-delete-button" type="button" data-delete-id="${escapeHTML(message.id)}" aria-label="Xóa tin nhắn">
              ${lucideIcon("trash-2")}
              <span class="sr-only">Xóa</span>
            </button>
          ` : ""}
          <button class="chat-reply-button" type="button" data-reply-id="${escapeHTML(message.id)}" aria-label="Reply tin nhắn">${lucideIcon("reply")}</button>
          <button class="chat-react-button" type="button" data-reaction-menu="${escapeHTML(message.id)}" aria-label="React tin nhắn">${lucideIcon("plus")}</button>
        </div>
      `;
      messageById.set(message.id, {
        id: message.id,
        user_id: message.user_id,
        username: message.username,
        body: message.body
      });

      const shouldStick = options.stick === false
        ? false
        : messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      messages.appendChild(item);
      if (options.icons !== false) renderLucideIcons();

      while (messages.children.length > messageLimit) {
        const first = messages.firstElementChild;
        knownIds.delete(first?.dataset.id);
        messageById.delete(first?.dataset.id);
        reactionsByMessage.delete(first?.dataset.id);
        first?.remove();
      }

      if (shouldStick || widget.classList.contains("open")) messages.scrollTop = messages.scrollHeight;
      setMessageCount(messageCount + 1);
    };

    const markMessageDeleted = message => {
      if (!message?.id) return;
      const item = messages.querySelector(`[data-id="${message.id}"]`);
      if (!item) return;
      item.classList.add("is-deleted");
      item.querySelector(".chat-message-body").textContent = "Đã xóa";
      item.querySelector(".chat-reply-quote")?.remove();
      item.querySelector("[data-delete-id]")?.remove();
      const cached = messageById.get(message.id);
      if (cached) cached.body = "";
    };

    const loadMessages = async () => {
      setStatus("Đang tải tin nhắn...");
      const { data: rows, error } = await client
        .from(table)
        .select("id, user_id, username, body, created_at, reply_to_id, reply_to_username, reply_to_body")
        .order("created_at", { ascending: false })
        .limit(messageLimit);

      if (error) throw error;

      messages.innerHTML = "";
      knownIds.clear();
      messageById.clear();
      (rows || []).reverse().forEach(row => renderMessage(row, { icons: false, stick: false }));
      renderLucideIcons();
      await loadReactions((rows || []).map(row => row.id));
      setMessageCount(rows?.length || 0);
      chatLoaded = true;
      setStatus(rows?.length ? "" : "Chưa có tin nào. Mở bát đi.", rows?.length ? "" : "empty");
    };

    const loadMessageCount = async () => {
      const { count, error } = await client
        .from(table)
        .select("id", { count: "exact", head: true });
      if (!error) {
        setMessageCount(count || 0);
        setStatus("");
      }
    };

    const startRealtime = () => {
      if (realtimeStarted) return;
      realtimeStarted = true;
      client
        .channel("chat_messages")
        .on("postgres_changes", { event: "INSERT", schema: "public", table }, payload => {
          renderMessage(payload.new);
          setStatus("");
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table }, payload => {
          if (!String(payload.new?.body || "").trim()) markMessageDeleted(payload.new);
        })
        .subscribe(subscribeStatus => {
          if (subscribeStatus === "SUBSCRIBED") setStatus("");
          if (subscribeStatus === "CHANNEL_ERROR") setStatus("Realtime đang lỗi. Thử tải lại trang.", "error");
        });

      client
        .channel("chat_reactions")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: reactionTable }, payload => {
          applyReaction(payload.new);
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: reactionTable }, payload => {
          removeReaction(payload.old);
        })
        .subscribe();
    };

    const ensureChatLoaded = () => {
      if (chatLoaded) return Promise.resolve();
      chatLoading ||= loadMessages()
        .then(startRealtime)
        .finally(() => {
          chatLoading = null;
        });
      return chatLoading;
    };

    window.addEventListener("hue-auth-change", event => {
      const member = event.detail;
      const displayName = member?.displayName || member?.username || "";
      if (displayName) {
        localStorage.setItem("hueChatName", displayName);
        nameInput.value = displayName;
        setNameFormVisible(false);
        if (client && chatLoaded) loadMessages().catch(() => setStatus("Không tải lại được chat.", "error"));
        return;
      }

      nameInput.value = localStorage.getItem("hueChatName") || "";
      setNameFormVisible(!nameInput.value);
    });

    nameForm.addEventListener("submit", event => {
      event.preventDefault();
      const name = cleanName(nameInput.value);
      if (!name) {
        setStatus("Nhập Biệt danh trước đã.", "error");
        return;
      }
      localStorage.setItem("hueChatName", name);
      nameInput.value = name;
      setNameFormVisible(false);
      setStatus("Đã lưu tên.", "ok");
      window.setTimeout(() => setStatus(""), 1200);
      input.focus();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const username = cleanName(nameInput.value || localStorage.getItem("hueChatName") || getAuthMember()?.username);
      const body = cleanBody(input.value);

      if (!username) {
        setStatus("Đăng nhập hoặc nhập Biệt danh trước đã.", "error");
        setNameFormVisible(true);
        nameInput.focus();
        return;
      }

      if (!body) return;

      localStorage.setItem("hueChatName", username);
      nameInput.value = username;
      input.value = "";
      input.style.height = "";
      sendButton.disabled = true;

      const payload = { user_id: getChatAuthorId(), username, body };
      if (selectedReply) {
        payload.reply_to_id = selectedReply.id;
        payload.reply_to_username = selectedReply.username;
        payload.reply_to_body = selectedReply.body;
      }

      const { error } = await client.from(table).insert(payload);
      sendButton.disabled = false;
      if (error) {
        input.value = body;
        setStatus("Không gửi được tin. Kiểm tra Supabase hoặc mạng.", "error");
      } else {
        clearReply();
      }
    });

    input.addEventListener("input", () => {
      input.style.height = "";
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });

    input.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      form.requestSubmit();
    });

    sendButton.addEventListener("pointerdown", event => {
      if (!isMobileChat() || document.activeElement !== input) return;
      event.preventDefault();
    });

    nameToggle.addEventListener("click", () => {
      setNameFormVisible(true);
    });
    window.addEventListener("resize", () => {
      if (!widget.classList.contains("open") || !isMobileChat()) setPageLocked(false);
    });
    replyPreview.addEventListener("click", event => {
      if (event.target.closest(".chat-reply-cancel")) clearReply();
    });
    deleteCancel.addEventListener("click", () => {
      pendingDelete = null;
      setConfirmOpen(false);
    });
    deleteConfirm.addEventListener("click", () => {
      const message = pendingDelete;
      pendingDelete = null;
      setConfirmOpen(false);
      softDeleteMessage(message);
    });
    reactionPopover.addEventListener("click", event => {
      const reactionButton = event.target.closest("[data-reaction-emoji]");
      if (!reactionButton) return;
      toggleReaction(reactionButton.dataset.reactionId, reactionButton.dataset.reactionEmoji);
      closeReactionPickers();
    });
    messages.addEventListener("click", event => {
      const reactionButton = event.target.closest(".chat-reaction-chip");
      if (reactionButton) {
        toggleReaction(reactionButton.dataset.reactionId, reactionButton.dataset.reactionEmoji);
        closeReactionPickers();
        return;
      }

      const reactionMenu = event.target.closest("[data-reaction-menu], [data-reaction-bar-menu]");
      if (reactionMenu) {
        const item = reactionMenu.closest(".chat-message");
        const isOpen = item.classList.contains("is-reacting");
        closeReactionPickers(item);
        item.classList.toggle("is-reacting", !isOpen);
        if (!isOpen) openReactionPicker(item);
        else closeReactionPickers();
        return;
      }

      const deleteButton = event.target.closest("[data-delete-id]");
      if (deleteButton) {
        const message = messageById.get(deleteButton.dataset.deleteId);
        const username = cleanName(localStorage.getItem("hueChatName"));
        const authorId = getChatAuthorId();
        if (!message || (message.user_id ? message.user_id !== authorId : message.username !== username)) return;
        pendingDelete = message;
        setConfirmOpen(true);
        return;
      }

      const button = event.target.closest("[data-reply-id]");
      if (!button) return;
      const message = messageById.get(button.dataset.replyId);
      if (message) setReply(message);
    });
    messages.addEventListener("click", event => {
      const quote = event.target.closest("[data-scroll-reply-id]");
      const replyId = quote?.dataset.scrollReplyId;
      if (!replyId) return;
      const target = messages.querySelector(`[data-id="${replyId}"]`);
      if (!target) {
        setStatus("Tin được reply đã bị xoá khỏi danh sách.", "error");
        window.setTimeout(() => setStatus(""), 1400);
        return;
      }
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.classList.add("is-highlighted");
      window.setTimeout(() => target.classList.remove("is-highlighted"), 1200);
    });
    document.addEventListener("click", event => {
      if (!event.target.closest(".chat-message")) closeReactionPickers();
    });
    toggle.addEventListener("click", () => setOpen(!widget.classList.contains("open")));
    close.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !confirmDialog.hidden) {
        pendingDelete = null;
        setConfirmOpen(false);
        return;
      }
      if (event.key === "Escape") setOpen(false);
    });

    if (!isConfigured) {
      setStatus("Chat chưa được cấu hình Supabase.", "error");
      sendButton.disabled = true;
      return;
    }

    client = window.supabase.createClient(config.url, config.anonKey);
    loadMessageCount().catch(() => setStatus("Không nối được Supabase. Kiểm tra URL, anon key và schema.", "error"));
  };

  const initWeatherWidget = () => {
    const widget = document.getElementById("weatherWidget");
    const toggle = document.getElementById("weatherToggle");
    const close = document.getElementById("weatherClose");
    const refresh = document.getElementById("weatherRefresh");
    const panel = document.getElementById("weatherPanel");
    const placeSelect = document.getElementById("weatherPlace");
    const body = document.getElementById("weatherBody");
    const places = data.weatherPlaces || [];
    const range = (data.weatherDates || [])[0] || { start: "2026-07-17", end: "2026-07-19" };

    if (!widget || !toggle || !panel || !placeSelect || !body || !places.length || !refresh) return;

    placeSelect.innerHTML = places.map(place => `
      <option value="${escapeHTML(place.key)}">${escapeHTML(place.name)}</option>
    `).join("");

    const setOpen = open => {
      widget.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open && !body.dataset.loaded) loadWeather();
    };

    const openForPlace = key => {
      const place = places.find(item => item.key === key);
      if (!place) return;
      const shouldReload = widget.classList.contains("open") || body.dataset.loaded;
      placeSelect.value = key;
      setOpen(true);
      if (shouldReload) loadWeather();
    };

    const cacheKeyFor = (place, range) => `weather:${place.key}:${range.start}:${range.end}`;

    const isValidWeather = forecast =>
      Boolean(
        forecast?.daily?.time?.length &&
        forecast?.daily?.weather_code?.length &&
        forecast?.hourly?.time?.length &&
        forecast?.hourly?.weather_code?.length
      );

    const fetchWeather = async (place, range, options = {}) => {
      const cacheKey = cacheKeyFor(place, range);
      const cached = !options.force && sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.time < 30 * 60 * 1000 && isValidWeather(parsed.data)) return parsed.data;
        } catch (error) {
          // Bad cached JSON should never block a fresh request.
        }
        sessionStorage.removeItem(cacheKey);
      }

      const params = new URLSearchParams({
        latitude: place.lat,
        longitude: place.lng,
        timezone: "Asia/Bangkok",
        start_date: range.start,
        end_date: range.end,
        daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset",
        hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m"
      });
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?${params}`;
      let response;
      try {
        response = await fetch(weatherUrl);
      } catch (error) {
        if (options.retry) throw error;
        await new Promise(resolve => setTimeout(resolve, 450));
        return fetchWeather(place, range, { ...options, force: true, retry: true });
      }

      if (!response.ok) {
        sessionStorage.removeItem(cacheKey);
        if (options.retry) throw new Error(`Open-Meteo ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 450));
        return fetchWeather(place, range, { ...options, force: true, retry: true });
      }

      const data = await response.json();
      if (!isValidWeather(data)) {
        sessionStorage.removeItem(cacheKey);
        if (options.retry) throw new Error("Open-Meteo invalid payload");
        await new Promise(resolve => setTimeout(resolve, 450));
        return fetchWeather(place, range, { ...options, force: true, retry: true });
      }

      sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data }));
      return data;
    };

    const renderWeather = (forecast, place) => {
      const daily = forecast.daily;
      const hourly = forecast.hourly;
      const chosenDates = new Set(daily.time);
      const dailyHTML = daily.time.map((date, index) => {
        const [iconName, label] = weatherInfo(daily.weather_code[index]);
        const rainProb = daily.precipitation_probability_max[index] ?? 0;
        const rainHours = daily.precipitation_hours[index] ?? 0;
        const rainMm = Number(daily.precipitation_sum[index] ?? 0).toFixed(1);
        const wind = Math.round(daily.wind_speed_10m_max[index]);
        const gust = Math.round(daily.wind_gusts_10m_max[index]);
        const uv = Math.round(daily.uv_index_max[index] ?? 0);
        return `
          <article class="weather-day">
            <div class="weather-day-main">
              <div class="weather-day-icon">${lucideIcon(iconName, "weather-icon")}</div>
              <div>
                <h4>${formatWeatherDate(date)}</h4>
                <p>${label}</p>
              </div>
              <strong>${Math.round(daily.temperature_2m_min[index])}-${Math.round(daily.temperature_2m_max[index])}°C</strong>
            </div>
            <div class="weather-metrics">
              <span><b>Cảm giác</b>${Math.round(daily.apparent_temperature_min[index])}-${Math.round(daily.apparent_temperature_max[index])}°C</span>
              <span><b>Mưa</b>${rainProb}% · ${rainHours}h · ${rainMm}mm</span>
              <span><b>Gió</b>${wind} km/h · giật ${gust}</span>
              <span><b>UV</b>${uv}</span>
              <span><b>Mặt trời</b>${daily.sunrise[index]?.slice(11, 16) || "--:--"} - ${daily.sunset[index]?.slice(11, 16) || "--:--"}</span>
            </div>
          </article>
        `;
      }).join("");

      const hourlyGroups = hourly.time.reduce((groups, time, index) => {
        const [date, hour] = time.split("T");
        if (!chosenDates.has(date) || !["06:00", "12:00", "18:00", "21:00"].includes(hour)) return groups;
        const [iconName, label] = weatherInfo(hourly.weather_code[index]);
        groups[date] ||= [];
        groups[date].push(`
          <div class="weather-hour-row">
            <time>${hour}</time>
            <strong>${lucideIcon(iconName, "weather-hour-icon")} ${Math.round(hourly.temperature_2m[index])}°C</strong>
            <span>${label}</span>
            <span>Mưa ${hourly.precipitation_probability[index] ?? 0}%</span>
            <span>Ẩm ${hourly.relative_humidity_2m[index] ?? 0}%</span>
            <span>Mây ${hourly.cloud_cover[index] ?? 0}%</span>
          </div>
        `);
        return groups;
      }, {});

      const hourlyHTML = Object.entries(hourlyGroups).map(([date, rows]) => `
        <section class="weather-hour-day">
          <h5>${formatWeatherDate(date)}</h5>
          <div class="weather-hour-list">${rows.join("")}</div>
        </section>
      `).join("");

      body.dataset.loaded = "true";
      body.innerHTML = `
        <div class="weather-summary">
          <strong>${escapeHTML(place.name)}</strong>
          <span>Dự báo 3 ngày</span>
        </div>
        <div class="weather-days">${dailyHTML}</div>
        <div class="weather-hours">
          <h4>Theo giờ</h4>
          ${hourlyHTML || `<p class="weather-muted">Chưa có dữ liệu theo giờ.</p>`}
        </div>
      `;
      renderLucideIcons();
    };

    const loadWeather = async (options = {}) => {
      const place = places.find(item => item.key === placeSelect.value) || places[0];
      body.dataset.loaded = "";
      body.innerHTML = `
        <div class="weather-loading">
          <span></span><span></span><span></span>
        </div>
      `;
      try {
        refresh.disabled = true;
        renderWeather(await fetchWeather(place, range, options), place);
      } catch (error) {
        body.dataset.loaded = "";
        body.innerHTML = `
          <div class="weather-error">
            <strong>Không lấy được thời tiết.</strong>
            <span>Kiểm tra mạng hoặc làm mới lại.</span>
            <button type="button" class="weather-retry">Thử lại</button>
          </div>
        `;
        body.querySelector(".weather-retry")?.addEventListener("click", () => loadWeather({ force: true }));
      } finally {
        refresh.disabled = false;
      }
    };

    toggle.addEventListener("click", () => setOpen(!widget.classList.contains("open")));
    close.addEventListener("click", () => setOpen(false));
    refresh.addEventListener("click", () => loadWeather({ force: true }));
    placeSelect.addEventListener("change", loadWeather);
    document.addEventListener("click", event => {
      const trigger = event.target.closest("[data-weather-key]");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      openForPlace(trigger.dataset.weatherKey);
    });
    document.addEventListener("click", event => {
      if (event.target.closest("[data-weather-key]")) return;
      if (!widget.classList.contains("open") || widget.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setOpen(false);
    });
  };

  // ---- Nav toggle (mobile) ----
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  navLinks.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  initAuthWidget();
  initWeatherWidget();
  initChatWidget();

  // ---- Hero ----
  document.getElementById("heroSubtitle").textContent = data.subtitle;
  document.getElementById("heroDate").textContent = data.dateRange;
  document.getElementById("heroIntro").textContent = data.intro;

  const heroCountdown = document.getElementById("heroCountdown");
  const heroCountdownNote = document.getElementById("heroCountdownNote");
  if (heroCountdown) {
    const targetTime = new Date("2026-07-16T05:30:00+07:00").getTime();
    const pad = value => String(value).padStart(2, "0");
    const countdownParts = {
      days: heroCountdown.querySelector('[data-countdown-part="days"]'),
      hours: heroCountdown.querySelector('[data-countdown-part="hours"]'),
      minutes: heroCountdown.querySelector('[data-countdown-part="minutes"]'),
      seconds: heroCountdown.querySelector('[data-countdown-part="seconds"]')
    };
    const setCountdown = parts => {
      Object.entries(parts).forEach(([key, value]) => {
        if (countdownParts[key]) countdownParts[key].textContent = pad(value);
      });
    };
    const renderCountdown = () => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (heroCountdownNote) {
          heroCountdownNote.hidden = false;
          heroCountdownNote.textContent = "Đã tới giờ có mặt tại Huế";
        }
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCountdown({ days, hours, minutes, seconds });
    };

    renderCountdown();
    window.setInterval(renderCountdown, 1000);
  }

  // ---- Hero Stickers (Images 1.png - 10.png) ----
  // Bố cục cố định - dồn 10 mặt người thành cụm collage ở NỬA PHẢI hero, xen kẽ
  // giữa các sticker trang trí (.hero-deco). Nửa trái để trống cho khối chữ + vé.
  const heroStickers = document.getElementById("heroStickers");
  if (heroStickers) {
    const positions = [
      // Hàng trên (2)
      { top: '9%',  left: '58%', scale: 0.62, z: 8,  shadow: 0.12 },
      { top: '12%', left: '75%', scale: 0.72, z: 9,  shadow: 0.15 },
      // Hàng giữa-trên (3)
      { top: '25%', left: '50%', scale: 0.82, z: 11, shadow: 0.18 },
      { top: '27%', left: '66%', scale: 0.98, z: 14, shadow: 0.25 },
      { top: '30%', left: '83%', scale: 0.80, z: 9,  shadow: 0.16 },
      // Hàng giữa-dưới (3)
      { top: '46%', left: '55%', scale: 0.90, z: 12, shadow: 0.22 },
      { top: '49%', left: '71%', scale: 1.06, z: 15, shadow: 0.30 },
      { top: '51%', left: '87%', scale: 0.80, z: 10, shadow: 0.18 },
      // Hàng dưới (2)
      { top: '68%', left: '61%', scale: 0.96, z: 13, shadow: 0.26 },
      { top: '70%', left: '78%', scale: 0.86, z: 11, shadow: 0.20 }
    ];

    const stickersArray = Array.from({ length: 10 }, (_, i) => `figures/people/${i + 1}.png`);

    heroStickers.innerHTML = stickersArray.map((src, i) => {
      const pos = positions[i % positions.length];
      // Góc xoay nhỏ, xen kẽ trái/phải cho tự nhiên chứ không loạn
      const rot = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 3);
      const popDelay = (i * 0.08).toFixed(2);

      return `
        <div class="hero-sticker" style="
          top: ${pos.top};
          left: ${pos.left};
          z-index: ${pos.z};
          --rot: ${rot}deg;
          --scale: ${pos.scale};
          --shadow: ${pos.shadow};
          --pop-delay: ${popDelay}s;
        "><img src="${src}" alt="Thành viên ${i + 1}" ${imgAttrs({ lazy: false })}></div>
      `;
    }).join("");
  }

  // ---- Crew section (ảnh thật thay vì chữ cái) ----
  const crewGrid = document.getElementById("crewGrid");
  if (crewGrid && data.members) {
    crewGrid.innerHTML = data.members.map((m, i) => {
      const rot = Math.floor(Math.random() * 6 - 3);
      return `
        <div class="crew-card" style="--i: ${rot}">
          <div class="crew-avatar">
            <img src="figures/people/${i + 1}.png" alt="${m.name}" ${imgAttrs()}>
          </div>
          <div class="crew-name">${m.name}</div>
          ${m.role ? `<div class="crew-role">${m.role}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  const initTripLeaderboard = () => {
    const mount = document.getElementById("tripLeaderboard");
    if (!mount) return;

    const config = window.HUE_SUPABASE || {};
    const client = config.url && config.anonKey && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;
    const defaultHosts = new Set(["gtm", "linh"]);
    const fallbackMembers = (data.members || []).map((member, index) => ({
      username: member.name,
      displayName: member.name,
      role: defaultHosts.has(member.name) ? "host" : "member",
      avatar: `figures/people/${index + 1}.png`
    }));
    let leaderboardState = { members: fallbackMembers, results: [] };
    let loading = false;
    let errorMessage = "";

    const sessionToken = () => getAuthMember()?.sessionToken || "";
    const memberMeta = member => {
      const index = fallbackMembers.findIndex(item => item.username === member.username);
      return {
        username: member.username,
        displayName: member.username,
        role: member.role || (defaultHosts.has(member.username) ? "host" : "member"),
        avatar: `figures/people/${Math.max(index, 0) + 1}.png`
      };
    };

    function rankedPlayers() {
      const photoPlayers = new Set(leaderboardState.results
        .filter(result => result.gameKey === "anh-challenge-binh-minh")
        .map(result => result.username));
      const players = leaderboardState.members.map(memberMeta)
        .filter(member => member.role !== "host" || photoPlayers.has(member.username));
      const totals = new Map(players.map(player => [player.username, 0]));
      leaderboardState.results.forEach(result => {
        if (totals.has(result.username)) {
          totals.set(result.username, totals.get(result.username) + Number(result.points || 0));
        }
      });
      return players
        .map(player => ({ ...player, total: totals.get(player.username) || 0 }))
        .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username, "vi"));
    }

    function render({ animate = true } = {}) {
      const loggedIn = Boolean(sessionToken());
      mount.innerHTML = `
        <section class="crew-leaderboard-shell${animate ? "" : " is-static"}">
          <div class="crew-leaderboard-title">
            <div>
              <span>${lucideIcon("trophy")} Phiếu bé ngoan</span>
              <h3>Bảng xếp hạng</h3>
            </div>
          </div>
          ${errorMessage ? `<p class="crew-leaderboard-error" role="status">${escapeHTML(errorMessage)}</p>` : ""}
          ${loading ? `<div class="crew-leaderboard-loading"><span></span><span></span><span></span></div>` : !loggedIn ? `
            <div class="game-empty-state">Đăng nhập để xem bảng xếp hạng của cả nhóm.</div>
          ` : `
            ${(() => {
              const players = rankedPlayers();
              const winners = players.slice(0, 3);
              const punished = players.slice(3);
              return `
                <div class="crew-podium" aria-label="Ba người dẫn đầu">
                  ${winners.map((player, index) => `
                    <article class="crew-podium-card rank-${index + 1}">
                      <div class="crew-medal" aria-label="Huy chương ${index === 0 ? "vàng" : index === 1 ? "bạc" : "đồng"}">
                        <img class="crew-medal-icon" src="figures/decor/${["medal_gold.svg", "medal_silver.svg", "medal_bronze.svg"][index]}" alt="Huy chương ${index + 1}">
                      </div>
                      <img src="${escapeHTML(player.avatar)}" alt="" ${imgAttrs()}>
                      <strong>${escapeHTML(player.username)}</strong>
                      <b>${player.total} điểm</b>
                    </article>
                  `).join("")}
                </div>
                ${punished.length ? `
                  <div class="crew-penalty-heading"><span>Hạng bị phạt</span></div>
                  <div class="crew-penalty-list">
                    ${punished.map((player, index) => `
                      <div class="crew-penalty-row">
                        <strong>${index + 4}</strong>
                        <div class="game-rank-player"><img src="${escapeHTML(player.avatar)}" alt="" ${imgAttrs()}><span>${escapeHTML(player.username)}</span></div>
                        <b>${player.total} điểm</b>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              `;
            })()}
          `}
        </section>
      `;
      renderLucideIcons();
    }

    async function loadLeaderboard({ silent = false } = {}) {
      if (!client || !sessionToken()) {
        loading = false;
        errorMessage = client ? "" : "Chưa cấu hình Supabase.";
        leaderboardState = { members: fallbackMembers, results: [] };
        render();
        return;
      }
      if (!silent) {
        loading = true;
        render();
      }
      const { data: payload, error } = await client.rpc("trip_games_get_state", {
        p_session_token: sessionToken()
      });
      loading = false;
      if (error || !payload?.authenticated) {
        errorMessage = error ? "Chưa cài migration game hub trên Supabase." : "Phiên đăng nhập đã hết hạn.";
        render({ animate: !silent });
      } else {
        errorMessage = "";
        const nextState = {
          members: payload.members || fallbackMembers,
          results: payload.results || []
        };
        const changed = JSON.stringify(nextState) !== JSON.stringify(leaderboardState);
        leaderboardState = nextState;
        if (!silent || changed) render({ animate: !silent });
      }
    }

    window.addEventListener("hue-auth-change", () => loadLeaderboard());
    window.addEventListener("hue-game-results-change", event => {
      const payload = event.detail;
      if (payload?.members && payload?.results) {
        leaderboardState = { members: payload.members, results: payload.results };
        errorMessage = "";
        render();
      } else {
        loadLeaderboard({ silent: true });
      }
    });

    window.setInterval(() => {
      if (document.hidden || !sessionToken()) return;
      loadLeaderboard({ silent: true });
    }, 10000);

    render();
    loadLeaderboard();
  };

  initTripLeaderboard();

  const initCommunityJournal = () => {
    const config = window.HUE_SUPABASE || {};
    const confessionForm = document.getElementById("confessionForm");
    const confessionInput = document.getElementById("confessionInput");
    const confessionCount = document.getElementById("confessionCount");
    const confessionSubmit = document.getElementById("confessionSubmit");
    const confessionStatus = document.getElementById("confessionStatus");
    const confessionRefresh = document.getElementById("confessionRefresh");
    const confessionList = document.getElementById("confessionList");
    const reflectionSection = document.getElementById("reflections");
    const reflectionGate = document.getElementById("reflectionGate");
    const reflectionForm = document.getElementById("reflectionForm");
    const reflectionInput = document.getElementById("reflectionInput");
    const reflectionCount = document.getElementById("reflectionCount");
    const reflectionSubmit = document.getElementById("reflectionSubmit");
    const reflectionStatus = document.getElementById("reflectionStatus");
    const reflectionList = document.getElementById("reflectionList");
    const reflectionComposerAvatar = document.getElementById("reflectionComposerAvatar");
    const reflectionComposerName = document.getElementById("reflectionComposerName");

    if (!confessionForm || !confessionInput || !confessionCount || !confessionSubmit || !confessionStatus || !confessionRefresh || !confessionList || !reflectionSection || !reflectionGate || !reflectionForm || !reflectionInput || !reflectionCount || !reflectionSubmit || !reflectionStatus || !reflectionList || !reflectionComposerAvatar || !reflectionComposerName) return;

    const client = config.url && config.anonKey && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;
    const anonymousTokenKey = "hueConfessionToken";
    const reflectionOpensAt = data.reflectionOpensAt || "2026-07-19T00:00:00+07:00";
    let reflectionsState = null;
    let reflectionsLoading = false;

    const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
    const getAnonymousToken = () => {
      const saved = localStorage.getItem(anonymousTokenKey);
      if (isUuid(saved)) return saved;
      const token = window.crypto?.randomUUID?.();
      if (!token) return null;
      localStorage.setItem(anonymousTokenKey, token);
      return token;
    };
    const formatDate = value => new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Bangkok"
    }).format(new Date(value));
    const setStatus = (element, message = "", kind = "") => {
      element.textContent = message;
      element.dataset.kind = kind;
      element.hidden = !message;
    };
    const updateCount = (input, output, max) => {
      output.textContent = `${input.value.length}/${max}`;
    };
    const renderRichText = value => escapeHTML(value)
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\r?\n/g, "<br>");
    const renderMarkdownInline = value => {
      let rendered = escapeHTML(value);
      rendered = rendered.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s<)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      rendered = rendered.replace(/`([^`\n]+)`/g, "<code>$1</code>");
      rendered = rendered.replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (_, asterisk, underscore) => `<strong>${asterisk || underscore}</strong>`);
      rendered = rendered.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
      return rendered.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    };
    const renderReflectionMarkdown = value => {
      const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
      const blocks = [];
      let paragraph = [];
      const flushParagraph = () => {
        if (!paragraph.length) return;
        blocks.push(`<p>${paragraph.map(renderMarkdownInline).join("<br>")}</p>`);
        paragraph = [];
      };

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line.trim()) {
          flushParagraph();
          continue;
        }
        if (/^```/.test(line)) {
          flushParagraph();
          const codeLines = [];
          index += 1;
          while (index < lines.length && !/^```/.test(lines[index])) {
            codeLines.push(lines[index]);
            index += 1;
          }
          blocks.push(`<pre><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
          continue;
        }
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          flushParagraph();
          const tag = ["h4", "h5", "h6"][heading[1].length - 1];
          blocks.push(`<${tag}>${renderMarkdownInline(heading[2])}</${tag}>`);
          continue;
        }
        if (/^>\s?/.test(line)) {
          flushParagraph();
          const quoteLines = [];
          while (index < lines.length && /^>\s?/.test(lines[index])) {
            quoteLines.push(lines[index].replace(/^>\s?/, ""));
            index += 1;
          }
          index -= 1;
          blocks.push(`<div class="markdown-quote">${quoteLines.map(renderMarkdownInline).join("<br>")}</div>`);
          continue;
        }
        const listMatch = line.match(/^([-*])\s+(.+)$/);
        const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
        if (listMatch || orderedMatch) {
          flushParagraph();
          const ordered = Boolean(orderedMatch);
          const items = [ordered ? orderedMatch[1] : listMatch[2]];
          const expression = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
          while (index + 1 < lines.length && expression.test(lines[index + 1])) {
            index += 1;
            items.push(lines[index].match(expression)[1]);
          }
          const tag = ordered ? "ol" : "ul";
          blocks.push(`<${tag}>${items.map(item => `<li>${renderMarkdownInline(item)}</li>`).join("")}</${tag}>`);
          continue;
        }
        paragraph.push(line);
      }
      flushParagraph();
      return blocks.join("");
    };
    const avatarFor = username => {
      const index = (data.members || []).findIndex(member => member.name === username);
      return `figures/people/${Math.max(index, 0) + 1}.png`;
    };

    const renderConfessionSkeleton = () => {
      confessionList.innerHTML = `<div class="confession-loading" aria-label="Đang tải confession"><span></span><span></span><span></span></div>`;
    };
    const formatConfessionCode = row => row.code || `#${String(row.id).padStart(6, "0")}`;
    const renderConfessions = rows => {
      if (!rows?.length) {
        confessionList.innerHTML = `<div class="community-empty confession-empty"><span class="ui-icon" data-lucide="mail-open" aria-hidden="true"></span><p>Chưa có lời nhắn nào. Bạn mở hàng nhé?</p></div>`;
        renderLucideIcons();
        return;
      }
      confessionList.innerHTML = rows.map((row, index) => `
        <article class="confession-card" style="--confession-rotation: ${(index % 2 ? 1 : -1) * (index % 3 + 0.4)}deg;">
          <div class="confession-card-meta"><strong>${escapeHTML(formatConfessionCode(row))}</strong><time datetime="${escapeHTML(row.createdAt)}">${escapeHTML(formatDate(row.createdAt))}</time></div>
          <p>${renderRichText(row.body)}</p>
        </article>
      `).join("");
    };
    const loadConfessions = async ({ silent = false } = {}) => {
      if (!client) {
        setStatus(confessionStatus, "Confession cần Supabase để hoạt động.", "error");
        return;
      }
      if (!silent) renderConfessionSkeleton();
      confessionRefresh.disabled = true;
      const { data: rows, error } = await client.rpc("trip_confession_list");
      confessionRefresh.disabled = false;
      if (error) {
        confessionList.innerHTML = `<div class="community-empty"><p>Không tải được confession lúc này.</p></div>`;
        setStatus(confessionStatus, "Kiểm tra migration Community Journal trên Supabase.", "error");
        return;
      }
      setStatus(confessionStatus, "");
      renderConfessions(rows || []);
    };

    const countdownText = opensAt => {
      const difference = new Date(opensAt).getTime() - Date.now();
      if (difference <= 0) return "Cảm nhận đang mở.";
      const hours = Math.floor(difference / 3600000);
      const days = Math.floor(hours / 24);
      const minutes = Math.floor((difference % 3600000) / 60000);
      return days ? `Còn ${days} ngày ${hours % 24} giờ` : `Còn ${hours} giờ ${minutes} phút`;
    };
    const renderReflections = () => {
      const authMember = getAuthMember();
      const state = reflectionsState || {
        open: new Date(reflectionOpensAt).getTime() <= Date.now(),
        opensAt: reflectionOpensAt,
        authenticated: Boolean(authMember?.sessionToken),
        viewer: authMember ? { username: authMember.username, displayName: authMember.displayName } : null,
        reflections: []
      };
      const isLoggedIn = Boolean(authMember?.sessionToken && state.authenticated);
      const reflections = state.reflections || [];
      const isOpen = Boolean(state.open);

      // Guests only see this section when there is a real reflection to read.
      reflectionSection.hidden = !isLoggedIn && !reflections.length;
      reflectionForm.hidden = !isLoggedIn || !isOpen;

      if (isLoggedIn && !isOpen) {
        reflectionGate.innerHTML = `
          <div class="reflection-locked">
            <span class="ui-icon" data-lucide="clock-3" aria-hidden="true"></span>
            <div><strong>Mở từ 00:00 Chủ Nhật 19/07 (UTC+7)</strong><p>${escapeHTML(countdownText(state.opensAt || reflectionOpensAt))}. Khi về tới ngày cuối ở Huế, bạn sẽ có một trang để viết lại chuyến đi.</p></div>
          </div>
        `;
      } else if (!isLoggedIn && reflections.length) {
        reflectionGate.innerHTML = `<p class="reflection-public-note">Những dòng đã được lưu lại sau chuyến đi.</p>`;
      } else if (isLoggedIn) {
        reflectionGate.innerHTML = `<p class="reflection-public-note">Viết cho chính mình và cho cả nhóm. Bản ghi cũ sẽ được thay bằng lần lưu mới nhất.</p>`;
      } else {
        reflectionGate.innerHTML = "";
      }

      if (isLoggedIn && isOpen) {
        const viewer = state.viewer || authMember;
        reflectionComposerAvatar.innerHTML = `<img src="${escapeHTML(avatarFor(viewer.username))}" alt="">`;
        reflectionComposerName.textContent = state.reflection ? "Chỉnh lại dòng đã viết" : "Viết một dòng cho chuyến đi";
        reflectionSubmit.innerHTML = `${lucideIcon(state.reflection ? "save" : "pen-line")} ${state.reflection ? "Cập nhật cảm nhận" : "Lưu cảm nhận"}`;
        if (document.activeElement !== reflectionInput) {
          reflectionInput.value = state.reflection?.body || "";
          updateCount(reflectionInput, reflectionCount, 1500);
        }
      }

      if (!reflections.length) {
        reflectionList.innerHTML = isLoggedIn && isOpen
          ? `<div class="community-empty reflection-empty"><span class="ui-icon" data-lucide="book-open-text" aria-hidden="true"></span><p>Trang này đang chờ nét bút đầu tiên của nhóm.</p></div>`
          : "";
      } else {
        reflectionList.innerHTML = reflections.map(reflection => `
          <article class="reflection-entry">
            <div class="reflection-author">
              <img src="${escapeHTML(avatarFor(reflection.username))}" alt="">
              <div><h3>${escapeHTML(reflection.displayName || reflection.username)}</h3><time datetime="${escapeHTML(reflection.updatedAt)}">${escapeHTML(formatDate(reflection.updatedAt))}</time></div>
            </div>
            <blockquote>${renderReflectionMarkdown(reflection.body)}</blockquote>
          </article>
        `).join("");
      }
      renderLucideIcons();
    };
    const loadReflections = async () => {
      if (!client) {
        const loggedIn = Boolean(getAuthMember()?.sessionToken);
        if (loggedIn) {
          reflectionSection.hidden = false;
          reflectionGate.innerHTML = `<div class="reflection-locked"><span class="ui-icon" data-lucide="triangle-alert" aria-hidden="true"></span><div><strong>Chưa kết nối được nhật ký</strong><p>Hãy chạy migration Community Journal trên Supabase trước.</p></div></div>`;
          renderLucideIcons();
        }
        return;
      }
      if (reflectionsLoading) return;
      reflectionsLoading = true;
      const { data: payload, error } = await client.rpc("trip_reflections_get", {
        p_session_token: getAuthMember()?.sessionToken || null
      });
      reflectionsLoading = false;
      if (error) {
        if (getAuthMember()?.sessionToken) {
          reflectionSection.hidden = false;
          reflectionGate.innerHTML = `<div class="reflection-locked"><span class="ui-icon" data-lucide="triangle-alert" aria-hidden="true"></span><div><strong>Không tải được cảm nhận</strong><p>Hãy kiểm tra migration Community Journal.</p></div></div>`;
          renderLucideIcons();
        }
        return;
      }
      reflectionsState = payload || null;
      renderReflections();
    };

    confessionInput.addEventListener("input", () => updateCount(confessionInput, confessionCount, 800));
    reflectionInput.addEventListener("input", () => updateCount(reflectionInput, reflectionCount, 1500));
    confessionRefresh.addEventListener("click", () => loadConfessions());
    confessionForm.addEventListener("submit", async event => {
      event.preventDefault();
      const body = confessionInput.value.trim();
      const authorToken = getAnonymousToken();
      if (!body || !authorToken) {
        setStatus(confessionStatus, "Trình duyệt không tạo được mã ẩn danh để gửi tin.", "error");
        return;
      }
      if (!client) {
        setStatus(confessionStatus, "Confession chưa được cấu hình Supabase.", "error");
        return;
      }
      confessionSubmit.disabled = true;
      setStatus(confessionStatus, "Đang gửi...");
      const { error } = await client.rpc("trip_confession_submit", {
        p_author_token: authorToken,
        p_body: body
      });
      confessionSubmit.disabled = false;
      if (error) {
        setStatus(confessionStatus, error.message || "Không gửi được confession.", "error");
        return;
      }
      confessionInput.value = "";
      updateCount(confessionInput, confessionCount, 800);
      setStatus(confessionStatus, "Đã gửi ẩn danh. Cảm ơn bạn đã nhắn tử tế.", "ok");
      await loadConfessions({ silent: true });
    });
    reflectionForm.addEventListener("submit", async event => {
      event.preventDefault();
      const body = reflectionInput.value.trim();
      const sessionToken = getAuthMember()?.sessionToken;
      if (!sessionToken) {
        document.getElementById("authLoginOpen")?.click();
        return;
      }
      if (!body || !client) return;
      reflectionSubmit.disabled = true;
      setStatus(reflectionStatus, "Đang lưu...");
      const { data: payload, error } = await client.rpc("trip_reflections_save", {
        p_session_token: sessionToken,
        p_body: body
      });
      reflectionSubmit.disabled = false;
      if (error) {
        setStatus(reflectionStatus, error.message || "Không lưu được cảm nhận.", "error");
        return;
      }
      reflectionsState = payload || reflectionsState;
      setStatus(reflectionStatus, "Đã lưu. Bạn có thể quay lại chỉnh sửa bất cứ lúc nào.", "ok");
      renderReflections();
    });

    window.addEventListener("hue-auth-change", () => loadReflections());
    window.setInterval(() => {
      if (document.hidden) return;
      loadConfessions({ silent: true });
      loadReflections();
    }, 60000);

    updateCount(confessionInput, confessionCount, 800);
    updateCount(reflectionInput, reflectionCount, 1500);
    renderConfessionSkeleton();
    loadConfessions();
    loadReflections();
  };

  initCommunityJournal();



  // ---- Lucky wheel ----
  const luckyWheel = document.getElementById("luckyWheel");
  const luckyResult = document.getElementById("luckyResult");
  const luckyMembers = (data.members || []).slice(0, 10);

  if (luckyWheel && luckyResult && luckyMembers.length) {
    const segment = 360 / luckyMembers.length;
    let wheelRotation = 0;

    const randomCircleAngle = segmentCount => {
      if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        const max53 = 2 ** 53;
        const bucketCount = segmentCount * 2;
        const limit = Math.floor(max53 / bucketCount) * bucketCount;
        let value;
        do {
          window.crypto.getRandomValues(values);
          value = (values[0] & 0x1fffff) * 0x100000000;
          window.crypto.getRandomValues(values);
          value += values[0];
        } while (value >= limit);
        return (value / limit) * 360;
      }
      return Math.random() * 360;
    };

    const randomWholeSpins = () => {
      if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return 5 + (values[0] % 4);
      }
      return 5 + Math.floor(Math.random() * 4);
    };

    const memberAngles = luckyMembers.map((_, index) => index * segment);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const placeWheelPeople = spin => {
      const radius = luckyWheel.clientWidth * 0.36;
      luckyWheel.querySelectorAll(".wheel-person").forEach(person => {
        const angle = Number(person.dataset.angle) + spin;
        person.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(${-radius}px) rotate(${-angle}deg)`;
      });
    };

    luckyWheel.innerHTML = `
      <div class="wheel-face" aria-hidden="true"></div>
      <button class="lucky-spin" id="luckySpin" type="button">Quay ngay</button>
      ${luckyMembers.map((member, index) => {
      const angle = memberAngles[index];
      return `
        <div class="wheel-person" data-angle="${angle}">
          <img src="figures/people/${index + 1}.png" alt="${escapeHTML(member.name)}" ${imgAttrs()}>
          <span>${escapeHTML(member.name)}</span>
        </div>
      `;
    }).join("")}
    `;
    const luckySpin = document.getElementById("luckySpin");
    placeWheelPeople(0);
    window.addEventListener("resize", () => placeWheelPeople(wheelRotation % 360));

    const renderWinner = index => {
      const member = luckyMembers[index];
      luckyResult.classList.add("has-winner");
      luckyResult.innerHTML = `
        <span class="lucky-result-label">Trúng rồi</span>
        <div class="lucky-result-photo">
          <img src="figures/people/${index + 1}.png" alt="${escapeHTML(member.name)}" ${imgAttrs()}>
        </div>
        <h3>${escapeHTML(member.name)}</h3>
        <p>Nhân vật chính đã xuất hiện.</p>
      `;
    };

    luckySpin.addEventListener("click", () => {
      if (luckyWheel.classList.contains("is-spinning")) return;

      const stopAngle = randomCircleAngle(luckyMembers.length);
      const winner = Math.floor(((stopAngle + segment / 2) % 360) / segment);
      const current = ((wheelRotation % 360) + 360) % 360;
      const target = (360 - stopAngle) % 360;
      const delta = (target - current + 360) % 360;
      wheelRotation += randomWholeSpins() * 360 + delta;
      luckyWheel.dataset.stopAngle = stopAngle.toFixed(4);
      luckyWheel.dataset.winner = luckyMembers[winner].name;

      luckyWheel.classList.add("is-spinning");
      luckySpin.disabled = true;
      luckyWheel.style.setProperty("--rotation", `${wheelRotation}deg`);
      placeWheelPeople(wheelRotation);

      window.setTimeout(() => {
        luckyWheel.classList.remove("is-spinning");
        luckySpin.disabled = false;
        renderWinner(winner);
      }, reduceMotion.matches ? 80 : 5200);
    });
  }

  // ---- Itinerary route ----
  const itineraryRoute = document.getElementById("itineraryRoute");
  if (itineraryRoute && data.itineraryPlaces) {
    itineraryRoute.innerHTML = `
      <div class="itinerary-route" aria-label="Thứ tự các điểm ở Huế">
        ${data.itineraryPlaces.map((place, index) => {
          const mapsUrl = mapsUrlForPlace(place);
          const rotate = (index % 2 === 0 ? -1 : 1) * (1 + (index % 3));
          const detailUrl = place.detailUrl || mapsUrl || "#";
          return `
            <article class="route-card route-card--${(index % 4) + 1}" role="link" tabindex="0" data-href="${escapeHTML(detailUrl)}" aria-label="Xem giới thiệu ${escapeHTML(place.title)}" style="--route-rot: ${rotate}deg; --route-index: ${index};">
              <div class="route-photo">
                ${mapsUrl ? `
                  <a class="route-map-link" href="${escapeHTML(mapsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Mở ${escapeHTML(place.title)} trên Google Maps">
                    <img class="maps-icon" src="figures/decor/google-maps.png" alt="" aria-hidden="true" ${imgAttrs()}>
                  </a>
                ` : ""}
                ${weatherPlaceKeys.has(place.key) ? `
                  <button class="route-weather-button" type="button" data-weather-key="${escapeHTML(place.key)}" aria-label="Xem thời tiết ${escapeHTML(place.title)}">
                    ${lucideIcon("sun")}
                  </button>
                ` : ""}
                <img src="${escapeHTML(place.image)}" alt="${escapeHTML(place.title)}" ${imgAttrs()}>
              </div>
              <div class="route-copy">
                <div class="route-kicker">
                  <span>${escapeHTML(place.day)}</span>
                  <span>${escapeHTML(place.time)}</span>
                </div>
                <h3>${escapeHTML(place.title)}</h3>
                <p class="route-meta">${escapeHTML(place.meta)}</p>
                <p>${escapeHTML(place.desc)}</p>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;

    itineraryRoute.querySelectorAll(".route-card[data-href]").forEach(card => {
      card.addEventListener("click", event => {
        if (event.target.closest(".route-map-link, .route-weather-button")) return;
        window.open(card.dataset.href, "_blank", "noopener,noreferrer");
      });
      card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        window.open(card.dataset.href, "_blank", "noopener,noreferrer");
      });
    });
  }

  // ---- Timeline detail tabs ----
  const daysList = document.getElementById("daysList");
  if (daysList && data.days) {
    const tripYear = 2026;
    const dayStartDates = ["2026-07-17", "2026-07-18", "2026-07-19"];
    const padTimeline = value => String(value).padStart(2, "0");
    const parseTimelineStart = (time, dayIndex) => {
      const text = String(time || "");
      const clock = text.match(/(\d{1,2}):(\d{2})/);
      if (!clock) return null;

      const explicitDate = text.match(/\((\d{1,2})\/(\d{1,2})\)/);
      const date = explicitDate
        ? `${tripYear}-${padTimeline(explicitDate[2])}-${padTimeline(explicitDate[1])}`
        : dayStartDates[dayIndex];

      return new Date(`${date}T${padTimeline(clock[1])}:${clock[2]}:00+07:00`).getTime();
    };
    const scheduleItems = data.days.flatMap((day, dayIndex) =>
      day.blocks.map((block, blockIndex) => ({
        dayIndex,
        blockIndex,
        start: parseTimelineStart(block.time, dayIndex)
      }))
    ).filter(item => Number.isFinite(item.start));

    let timelineHTML = `<div class="timeline-horizontal">`;
    
    // The horizontal track with stops
    timelineHTML += `<div class="timeline-track-container">
      <div class="timeline-track-line"></div>
      <div class="timeline-stops">
        ${data.days.map((d, index) => `
          <button class="timeline-stop ${index === 0 ? 'active' : ''}" type="button" data-day="${index}">
            <div class="stop-dot"></div>
            <div class="stop-label">Ngày ${d.day}</div>
          </button>
        `).join("")}
      </div>
    </div>`;

    // The detail panels
    timelineHTML += `<div class="timeline-details-container">
      ${data.days.map((d, index) => `
        <div class="timeline-detail-panel ${index === 0 ? 'active' : ''}" id="day-panel-${index}">
          <div class="day-card">
            <h3>${escapeHTML(d.title)}</h3>
            <div class="day-date">${escapeHTML(d.date)}</div>
            <div class="day-blocks-list">
              ${d.blocks.map((b, blockIndex) => `
                <div class="time-row" data-day-index="${index}" data-block-index="${blockIndex}">
                  <div class="time-tag">${escapeHTML(b.time)}</div>
                  <div>
                    <div class="time-activity">${escapeHTML(b.activity)}</div>
                    ${b.note ? `<div class="time-note">${escapeHTML(b.note)}</div>` : ""}
                    ${blockLocationKeys(b).length || b.outfit ? `<div class="location-peeks">${blockLocationKeys(b).map(renderLocationPeek).join("")}${renderOutfitPeek(b.outfit)}</div>` : ""}
                  </div>
                  <div class="route-runner" aria-hidden="true">
                    <span class="runner-wind runner-wind-one"></span>
                    <span class="runner-wind runner-wind-two"></span>
                    <span class="runner-wind runner-wind-three"></span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `).join("")}
    </div>`;

    timelineHTML += `</div>`;
    daysList.innerHTML = timelineHTML;

    // Interactive logic
    const stops = daysList.querySelectorAll(".timeline-stop");
    const panels = daysList.querySelectorAll(".timeline-detail-panel");
    const showDay = dayIndex => {
      stops.forEach(s => s.classList.toggle("active", s.dataset.day === String(dayIndex)));
      panels.forEach(p => p.classList.toggle("active", p.id === `day-panel-${dayIndex}`));
    };
    
    stops.forEach(stop => {
      stop.addEventListener("click", () => {
        closeLocationPeeks();
        showDay(stop.getAttribute("data-day"));
      });
    });

    const highlightCurrentBlock = () => {
      const now = Date.now();
      let activeItem = scheduleItems[0];
      scheduleItems.forEach(item => {
        if (item.start <= now && item.start >= activeItem.start) activeItem = item;
      });

      if (!activeItem) return;
      showDay(activeItem.dayIndex);
      daysList.querySelectorAll(".time-row.is-current").forEach(row => row.classList.remove("is-current"));
      const row = daysList.querySelector(`[data-day-index="${activeItem.dayIndex}"][data-block-index="${activeItem.blockIndex}"]`);
      row?.classList.add("is-current");
    };

    highlightCurrentBlock();
    window.setInterval(highlightCurrentBlock, 30 * 1000);

    let pinnedLocationPeek = null;
    let hoverLocationPeek = null;
    const hideOpenLocationPeeks = except => {
      daysList.querySelectorAll(".location-peek.is-open").forEach(peek => {
        if (peek !== except) peek.classList.remove("is-open");
      });
    };
    const closeLocationPeeks = () => {
      daysList.querySelectorAll(".location-peek.is-open, .location-peek.is-pinned").forEach(peek => {
        if (peek.contains(document.activeElement)) document.activeElement.blur();
        peek.classList.remove("is-open", "is-pinned");
      });
      pinnedLocationPeek = null;
      hoverLocationPeek = null;
    };
    const openHoverLocationPeek = peek => {
      if (pinnedLocationPeek && pinnedLocationPeek !== peek) closeLocationPeeks();
      hoverLocationPeek = peek;
      hideOpenLocationPeeks(peek);
      peek.classList.add("is-open");
    };
    const togglePinnedLocationPeek = peek => {
      if (pinnedLocationPeek === peek) {
        closeLocationPeeks();
        return;
      }
      closeLocationPeeks();
      pinnedLocationPeek = peek;
      peek.classList.add("is-open", "is-pinned");
    };
    const canHoverLocationPeek = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let locationCloseTimer;

    daysList.addEventListener("click", event => {
      const peek = event.target.closest(".location-peek");

      if (!peek) {
        closeLocationPeeks();
        return;
      }

      if (event.target.closest("[data-weather-key]")) {
        closeLocationPeeks();
        return;
      }
      if (event.target.closest(".maps-button")) {
        closeLocationPeeks();
        return;
      }

      event.stopPropagation();
      if (!event.target.closest(".location-chip")) return;

      togglePinnedLocationPeek(peek);
    });

    daysList.addEventListener("pointerover", event => {
      if (!canHoverLocationPeek) return;
      const peek = event.target.closest(".location-peek");
      if (!peek) return;
      if (peek.contains(event.relatedTarget)) return;
      window.clearTimeout(locationCloseTimer);
      openHoverLocationPeek(peek);
    });

    daysList.addEventListener("pointerout", event => {
      if (!canHoverLocationPeek) return;
      const peek = event.target.closest(".location-peek");
      if (!peek) return;
      if (peek.contains(event.relatedTarget)) return;
      locationCloseTimer = window.setTimeout(() => {
        if (peek.matches(":hover")) return;
        if (peek === hoverLocationPeek) hoverLocationPeek = null;
        if (peek !== pinnedLocationPeek) peek.classList.remove("is-open");
      }, 140);
    });

    daysList.addEventListener("focusin", event => {
      const peek = event.target.closest(".location-peek");
      if (peek) openHoverLocationPeek(peek);
    });

    daysList.addEventListener("focusout", event => {
      const peek = event.target.closest(".location-peek");
      if (!peek || peek.contains(event.relatedTarget)) return;
      window.setTimeout(() => {
        if (peek.contains(document.activeElement)) return;
        if (peek === hoverLocationPeek) hoverLocationPeek = null;
        if (peek !== pinnedLocationPeek) peek.classList.remove("is-open");
      }, 80);
    });

    document.addEventListener("click", event => {
      if (event.target.closest(".location-peek")) return;
      closeLocationPeeks();
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      closeLocationPeeks();
    });
  }

  // ---- Destinations ----
  document.getElementById("destGrid").innerHTML = data.destinations.map(dest => {
    const randomRot = Math.floor(Math.random() * 6 - 3); // -3 to 3
    return `
      <div class="dest-card dest-card-photo" style="--i: ${randomRot}">
        <span class="photo-stamp">Huế ✦</span>
        ${dest.image ? `<div class="dest-photo"><img src="${dest.image}" alt="${dest.name}" ${imgAttrs()}></div>` : `<div class="dest-photo placeholder"></div>`}
        <div class="dest-info">
          <h3>${dest.name}</h3>
          <p>${dest.desc}</p>
        </div>
      </div>
    `;
  }).join("");

  // ---- Food ----
  const foodGrid = document.getElementById("foodGrid");
  if (foodGrid && data.food) {
    foodGrid.innerHTML = data.food.map(f => {
      const randomRot = Math.floor(Math.random() * 6 - 3);
      return `
        <div class="dest-card dest-card-photo food-card" style="--i: ${randomRot}">
          <span class="photo-stamp food-stamp">Ăn ✦</span>
          ${f.image ? `<div class="dest-photo food-photo"><img src="${f.image}" alt="${f.name}" ${imgAttrs()}></div>` : `<div class="dest-photo food-photo placeholder"></div>`}
          <div class="dest-info food-info">
            <h3>${f.name}</h3>
            <p class="food-address">${lucideIcon("map-pin", "food-address-icon")} ${f.address}</p>
            <p>${f.desc}</p>
            ${f.note ? `<span class="food-note">${f.note}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  // ---- Games ----
  document.getElementById("gameGrid").innerHTML = data.games.map(g => {
    const randomRot = Math.floor(Math.random() * 6 - 3);
    return `
      <button class="game-card" type="button" style="--i: ${randomRot}" data-game-key="${escapeHTML(g.key || "")}">
        <div class="game-meta">
          <span>${g.occasion}</span>
        </div>
        <h3>${g.name}</h3>
        <p>${g.teaser}</p>
      </button>
    `;
  }).join("");

  const initGameMenus = () => {
    const mount = document.getElementById("gameMenu");
    const grid = document.getElementById("gameGrid");
    if (!mount || !grid) return;

    const config = window.HUE_SUPABASE || {};
    const client = config.url && config.anonKey && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;
    const defaultHosts = new Set(["gtm", "linh"]);
    const fallbackMembers = (data.members || []).map((member, index) => ({
      username: member.name,
      displayName: member.name,
      role: defaultHosts.has(member.name) ? "host" : "member",
      avatar: `figures/people/${index + 1}.png`
    }));

    let activeGame = null;
    let gameState = { viewer: null, members: fallbackMembers, teams: [], results: [] };
    let statusMessage = "";
    let statusKind = "";
    let loading = false;
    let teamPhotos = new Map();
    let photosLoading = false;
    let photoError = "";
    let uploadingPhotos = false;
    let photoChallengeLoading = false;
    let photoChallengeState = {
      teamCount: 2,
      voteStatus: "draft",
      draws: [],
      voteTallies: [],
      myTeam: 0,
      myVote: 0,
      authenticated: false
    };
    let imposterMusic = null;
    let imposterMusicLoading = false;
    let imposterMusicError = "";
    let youtubePlayer = null;
    let youtubeApiPromise = null;
    let scheduledMusicRound = 0;
    let imposterRealtime = null;
    let imposterServerOffset = 0;

    const sessionToken = () => getAuthMember()?.sessionToken || "";
    const isHost = () => (gameState.viewer?.role || getAuthMember()?.role) === "host";
    const memberMeta = username => {
      const index = fallbackMembers.findIndex(member => member.username === username);
      const dbMember = gameState.members.find(member => member.username === username);
      return {
        username,
        displayName: username,
        role: dbMember?.role || (defaultHosts.has(username) ? "host" : "member"),
        avatar: `figures/people/${Math.max(index, 0) + 1}.png`
      };
    };
    const players = () => gameState.members
      .map(member => memberMeta(member.username))
      .filter(member => isPhotoChallenge() || member.role !== "host");
    const normalizeTeams = teams => (teams || []).map(team => ({
      gameKey: team.gameKey || team.game_key || "",
      username: team.username || "",
      teamNumber: Number(team.teamNumber ?? team.team_number ?? 0)
    })).filter(team => team.gameKey && team.username && team.teamNumber);
    const normalizeResults = results => (results || []).map(result => ({
      gameKey: result.gameKey || result.game_key || "",
      username: result.username || "",
      points: Number(result.points || 0),
      note: result.note || ""
    }));
    const normalizePhotoChallenge = payload => ({
      teamCount: Number(payload?.teamCount ?? payload?.team_count ?? 2),
      voteStatus: payload?.voteStatus || payload?.vote_status || "draft",
      draws: (payload?.draws || []).map(draw => ({
        teamNumber: Number(draw.teamNumber ?? draw.team_number ?? 0),
        poseNumber: Number(draw.poseNumber ?? draw.pose_number ?? 0)
      })).filter(draw => draw.teamNumber && draw.poseNumber),
      voteTallies: (payload?.voteTallies || payload?.vote_tallies || []).map(tally => ({
        teamNumber: Number(tally.teamNumber ?? tally.team_number ?? 0),
        voteCount: Number(tally.voteCount ?? tally.vote_count ?? 0)
      })).filter(tally => tally.teamNumber),
      myTeam: Number(payload?.myTeam ?? payload?.my_team ?? 0),
      myVote: Number(payload?.myVote ?? payload?.my_vote ?? 0),
      authenticated: Boolean(payload?.authenticated),
      viewer: payload?.viewer || null
    });
    const isPhotoChallenge = () => activeGame?.key === "anh-challenge-binh-minh";
    const effectiveTeamCount = () => isPhotoChallenge()
      ? photoChallengeState.teamCount
      : Number(activeGame?.teamCount || 0);
    const applyPayload = payload => {
      gameState = {
        viewer: payload?.viewer || gameState.viewer,
        members: payload?.members || gameState.members || fallbackMembers,
        teams: normalizeTeams(payload?.teams),
        results: normalizeResults(payload?.results)
      };
    };

    function randomIndex(max) {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      do window.crypto.getRandomValues(values); while (values[0] >= limit);
      return values[0] % max;
    }

    function shuffle(items) {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = randomIndex(index + 1);
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    }

    const setStatus = (message = "", kind = "") => {
      statusMessage = message;
      statusKind = kind;
    };

    const parseClock = value => {
      const parts = String(value || "").trim().split(":").map(Number);
      if (parts.some(part => !Number.isFinite(part) || part < 0)) return null;
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return null;
    };

    const youtubeVideoId = url => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0];
        if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      } catch (_) {}
      return "";
    };

    function loadYoutubeApi() {
      if (window.YT?.Player) return Promise.resolve(window.YT);
      if (youtubeApiPromise) return youtubeApiPromise;
      youtubeApiPromise = new Promise((resolve, reject) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof previousReady === "function") previousReady();
          resolve(window.YT);
        };
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => reject(new Error("Không tải được YouTube player."));
        document.head.appendChild(script);
      });
      return youtubeApiPromise;
    }

    async function unlockMusic(track) {
      const videoId = youtubeVideoId(track?.youtubeUrl);
      const dock = document.getElementById("imposterAudioPlayer");
      if (!videoId || !dock) throw new Error("Link YouTube chưa hợp lệ.");
      const YT = await loadYoutubeApi();
      if (!youtubePlayer) {
        await new Promise((resolve, reject) => {
          dock.replaceChildren();
          const playerMount = document.createElement("div");
          playerMount.id = "imposterYoutubeFrame";
          dock.appendChild(playerMount);
          youtubePlayer = new YT.Player(playerMount, {
            width: "1",
            height: "1",
            videoId,
            playerVars: { playsinline: 1, controls: 0, rel: 0, origin: window.location.origin },
            events: { onReady: resolve, onError: () => reject(new Error("YouTube không mở được video này.")) }
          });
        });
      }
      // A muted play/pause inside the Ready click establishes a user-initiated media session.
      youtubePlayer.loadVideoById({ videoId, startSeconds: Number(track.startSeconds || 0) });
      youtubePlayer.mute();
      youtubePlayer.playVideo();
      window.setTimeout(() => {
        youtubePlayer.pauseVideo();
        youtubePlayer.unMute();
      }, 180);
    }

    function stopScheduledMusic() {
      if (youtubePlayer?.stopVideo) youtubePlayer.stopVideo();
      scheduledMusicRound = 0;
    }

    function scheduleMusicPlayback() {
      const room = imposterMusic?.room;
      const track = imposterMusic?.myTrack;
      if (!room || room.status !== "playing" || !track || scheduledMusicRound === room.round) return;
      if (!youtubePlayer) {
        imposterMusicError = "Nhạc đã bắt đầu. Hãy bấm Sẵn sàng để phát ngay trên máy này.";
        render();
        return;
      }
      const videoId = youtubeVideoId(track.youtubeUrl);
      if (!videoId) return;
      const startAt = new Date(room.startsAt).getTime() - imposterServerOffset;
      const delay = Math.max(0, startAt - Date.now());
      const elapsed = Math.max(0, (Date.now() - startAt) / 1000);
      const duration = Number(track.durationSeconds || 20);
      if (elapsed >= duration) return;
      scheduledMusicRound = room.round;
      window.setTimeout(() => {
        youtubePlayer.loadVideoById({ videoId, startSeconds: Number(track.startSeconds || 0) + elapsed });
        youtubePlayer.unMute();
        youtubePlayer.playVideo();
        window.setTimeout(stopScheduledMusic, Math.max(0, (duration - elapsed) * 1000));
      }, delay);
    }

    async function loadImposterMusicState() {
      if (!client || !sessionToken()) {
        imposterMusic = null;
        imposterMusicError = "Đăng nhập để nhận bài nhạc riêng của bạn.";
        return;
      }
      imposterMusicLoading = true;
      const requestStartedAt = Date.now();
      const { data: payload, error } = await client.rpc("imposter_music_get_state", { p_session_token: sessionToken() });
      imposterMusicLoading = false;
      if (error || !payload?.authenticated) {
        imposterMusicError = error?.message || "Không tải được phòng nhạc. Hãy chạy migration Imposter music.";
        return;
      }
      imposterMusic = payload;
      if (payload.serverNow) {
        // Estimate server time at receipt to counter small device clock differences.
        imposterServerOffset = new Date(payload.serverNow).getTime() + ((Date.now() - requestStartedAt) / 2) - Date.now();
      }
      imposterMusicError = "";
      scheduleMusicPlayback();
    }

    function renderImposterMusic() {
      if (activeGame?.key !== "who-is-the-imposter") return "";
      const room = imposterMusic?.room || { round: 0, status: "idle" };
      const isMusicHost = Boolean(imposterMusic?.isHost);
      const isPrepared = room.status === "prepared";
      const isPlaying = room.status === "playing";
      return `
        <section class="imposter-music-room game-menu-panel" aria-live="polite">
          <div class="imposter-music-head">
            <div>
              <span class="imposter-music-kicker">Phòng nhạc đồng bộ</span>
              <h3>${isPlaying ? "Nhạc đang chạy" : isPrepared ? "Chờ mọi người sẵn sàng" : "Chưa có vòng nhạc"}</h3>
              <p>${isPlaying ? "Mỗi máy sẽ vào bài theo cùng mốc thời gian." : isMusicHost ? "Người chơi sẽ bấm Sẵn sàng tại đây trước khi bạn phát nhạc." : "Bấm Sẵn sàng để cấp quyền phát nhạc cho trình duyệt của bạn."}</p>
            </div>
            <strong class="imposter-music-round">Vòng ${room.round || 0}</strong>
          </div>
          ${imposterMusicError ? `<p class="imposter-music-error" role="status">${escapeHTML(imposterMusicError)}</p>` : ""}
          ${imposterMusicLoading ? `<div class="imposter-music-skeleton"><span></span><span></span></div>` : ""}
          ${(isPrepared || isPlaying) && !isMusicHost ? `
            <div class="imposter-player-ready">
              <div><strong>${isPlaying ? "Nhạc đã bắt đầu" : imposterMusic?.ready ? "Máy bạn đã sẵn sàng" : "Tai nghe đã cắm chưa?"}</strong><span>${isPlaying ? "Nếu máy chưa phát, bấm Phát ngay để vào đúng đoạn còn lại." : imposterMusic?.ready ? "Chờ Quản trò đếm ngược và bấm bắt đầu." : "Nút này không phát nhạc ngay, chỉ mở quyền phát cho lúc bắt đầu."}</span></div>
              <button type="button" data-imposter-ready>${lucideIcon("headphones")} ${isPlaying ? "Phát ngay" : imposterMusic?.ready ? "Sẵn sàng rồi" : "Sẵn sàng"}</button>
            </div>
          ` : `<div class="game-empty-state">${isMusicHost ? "Dùng menu quản lý bên dưới để chuẩn bị vòng nhạc." : "Quản trò đang chuẩn bị nhạc cho vòng tiếp theo."}</div>`}
        </section>
      `;
    }

    function renderImposterMusicManager() {
      if (activeGame?.key !== "who-is-the-imposter" || !imposterMusic?.isHost) return "";
      const room = imposterMusic.room || { status: "idle" };
      const isPrepared = room.status === "prepared";
      const isPlaying = room.status === "playing";
      const tracks = imposterMusic.tracks || [];
      const playersForMusic = imposterMusic.players || [];
      const hostRound = imposterMusic.hostRound || {};
      const customSelect = (name, selectedValue, placeholder, options, disabled) => {
        const selected = options.find(option => option.value === selectedValue);
        return `
          <div class="imposter-custom-select" data-custom-select>
            <input type="hidden" name="${escapeHTML(name)}" value="${escapeHTML(selectedValue || "")}">
            <button type="button" data-select-toggle aria-expanded="false" ${disabled ? "disabled" : ""}><span>${escapeHTML(selected?.label || placeholder)}</span><i aria-hidden="true"></i></button>
            <div class="imposter-select-menu" role="listbox">
              ${options.map(option => `<button type="button" role="option" data-select-option data-value="${escapeHTML(option.value)}" aria-selected="${option.value === selectedValue}">${escapeHTML(option.label)}</button>`).join("")}
            </div>
          </div>
        `;
      };
      const trackChoices = tracks.map(track => ({
        value: track.id,
        label: `${track.label || "Bài chưa đặt tên"} (${Math.floor(track.startSeconds / 60)}:${String(track.startSeconds % 60).padStart(2, "0")}, ${track.durationSeconds}s)`
      }));
      const playerChoices = playersForMusic.map(player => ({ value: player.username, label: player.username }));
      return `
        <section class="game-menu-panel imposter-music-manager">
          <div class="game-panel-heading"><div><h3>Quản lý phòng nhạc</h3><p>Chọn hai bài riêng, chọn imposter, rồi phát cho cả nhóm.</p></div></div>
          <div class="imposter-host-status"><strong>${imposterMusic.readyCount || 0}/${imposterMusic.playerCount || 0}</strong><span>người chơi đã sẵn sàng</span></div>
          <form class="imposter-round-form" data-imposter-round-form>
            <label><span>Nhạc cho người thường</span>${customSelect("commonTrack", hostRound.commonTrackId, "Chọn bài", trackChoices, isPlaying)}</label>
            <label><span>Nhạc cho imposter</span>${customSelect("imposterTrack", hostRound.imposterTrackId, "Chọn bài khác", trackChoices, isPlaying)}</label>
            <label><span>Imposter</span>${customSelect("imposter", hostRound.imposterUsername, "Random hoặc chọn người", playerChoices, isPlaying)}</label>
            <div class="imposter-round-actions">
              <button type="button" data-imposter-random ${tracks.length < 2 || isPlaying ? "disabled" : ""}>${lucideIcon("shuffle")} Random vòng</button>
              <button type="submit" ${tracks.length < 2 || isPlaying ? "disabled" : ""}>${lucideIcon("music-2")} ${isPrepared ? "Đổi vòng" : "Bắt đầu ván mới"}</button>
              ${isPrepared ? `<button class="imposter-start" type="button" data-imposter-start>${lucideIcon("radio")} Bắt đầu sau 5 giây</button>` : ""}
              ${isPlaying ? `<button class="imposter-finish" type="button" data-imposter-finish>${lucideIcon("square")} Kết thúc lượt</button>` : ""}
            </div>
          </form>
          <form class="imposter-track-form" data-imposter-track-form>
            <h4>Kho nhạc</h4>
            <label><span>Link YouTube</span><input name="youtubeUrl" type="url" required placeholder="https://www.youtube.com/watch?v=..."></label>
            <label><span>Tên gợi nhớ</span><input name="label" maxlength="100" placeholder="Ví dụ: Chorus bài A"></label>
            <label><span>Bắt đầu</span><input name="startAt" inputmode="numeric" value="0:00" pattern="[0-9]{1,2}:[0-5][0-9]|[0-9]+" required></label>
            <label><span>Nghe trong giây</span><input name="duration" type="number" min="5" max="180" value="20" required></label>
            <button type="submit">${lucideIcon("plus")} Thêm bài</button>
          </form>
          ${tracks.length ? `<div class="imposter-track-list">${tracks.map(track => `<div><span>${escapeHTML(track.label || "Bài chưa đặt tên")}</span><small>${Math.floor(track.startSeconds / 60)}:${String(track.startSeconds % 60).padStart(2, "0")}, ${track.durationSeconds}s</small><button type="button" data-imposter-delete-track="${escapeHTML(track.id)}" aria-label="Xóa ${escapeHTML(track.label || "bài nhạc")}">${lucideIcon("trash-2")}</button></div>`).join("")}</div>` : `<p class="game-empty-state">Thêm ít nhất hai bài để Quản trò chuẩn bị một vòng.</p>`}
        </section>
      `;
    }

    async function loadGameState() {
      if (!client) {
        gameState = { viewer: null, members: fallbackMembers, teams: [], results: [] };
        return;
      }
      loading = true;
      render();
      if (!sessionToken()) {
        const { data: payload, error } = await client.rpc("trip_games_get_public_state");
        loading = false;
        if (error) {
          setStatus("Chưa cài RPC public cho đội hình. Hãy chạy lại migration add_game_hub.sql.", "error");
          gameState = { viewer: null, members: fallbackMembers, teams: [], results: [] };
          return;
        }
        gameState = {
          viewer: null,
          members: fallbackMembers,
          teams: normalizeTeams(payload?.teams),
          results: []
        };
        return;
      }
      const { data: payload, error } = await client.rpc("trip_games_get_state", {
        p_session_token: sessionToken()
      });
      loading = false;
      if (error || !payload?.authenticated) {
        setStatus(error ? "Chưa cài migration game hub trên Supabase." : "Phiên đăng nhập đã hết hạn.", "error");
        gameState = { viewer: null, members: fallbackMembers, teams: [], results: [] };
        return;
      }
      applyPayload(payload);
    }

    async function loadPhotoChallengeState({ silent = false } = {}) {
      if (!client || !isPhotoChallenge()) return;
      if (!silent) {
        photoChallengeLoading = true;
        render();
      }
      const rpcName = sessionToken() ? "photo_challenge_get_state" : "photo_challenge_public_state";
      const args = sessionToken() ? { p_session_token: sessionToken() } : undefined;
      const { data: payload, error } = await client.rpc(rpcName, args);
      photoChallengeLoading = false;
      if (error) {
        setStatus("Chưa cài migration add_photo_challenge.sql trên Supabase.", "error");
        return;
      }
      photoChallengeState = normalizePhotoChallenge(payload);
    }

    function currentResults() {
      return new Map(gameState.results
        .filter(result => result.gameKey === activeGame.key)
        .map(result => [result.username, result]));
    }

    function renderRules() {
      return `
        <section class="game-menu-panel game-rules-panel">
          <div class="game-rule-summary">
            <span>${lucideIcon("clock-3")} ${escapeHTML(activeGame.duration || "Linh hoạt")}</span>
            <span>${lucideIcon("users-round")} ${escapeHTML(activeGame.format || "Cả nhóm")}</span>
          </div>
          <h3>Luật chơi</h3>
          <ol class="game-rule-list">
            ${(activeGame.rules || []).map(rule => `<li>${escapeHTML(rule)}</li>`).join("")}
          </ol>
          ${activeGame.prep?.length ? `
            <div class="game-prep-note">
              <strong>${lucideIcon("backpack")} Chuẩn bị</strong>
              <ul>${activeGame.prep.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
            </div>
          ` : ""}
          ${activeGame.scoring ? `<p class="game-scoring"><strong>Cách tính điểm:</strong> ${escapeHTML(activeGame.scoring)}</p>` : ""}
          ${activeGame.key === "spy-game" ? `
            <button class="game-spy-open" type="button" data-open-spy-game>${lucideIcon("scan-face")} Mở phòng vai trò bí mật</button>
          ` : ""}
        </section>
      `;
    }

    function renderTeams() {
      const teamCount = effectiveTeamCount();
      if (!teamCount) return "";
      const assignments = gameState.teams.filter(team => team.gameKey === activeGame.key);
      const byTeam = Array.from({ length: teamCount }, (_, index) => ({
        number: index + 1,
        members: assignments.filter(team => Number(team.teamNumber) === index + 1)
      }));
      return `
        <section class="game-menu-panel game-team-panel">
          <div class="game-panel-heading">
            <div><h3>Chia đội</h3><p>${assignments.length ? "Đội hình chung trên mọi thiết bị." : "Quản trò chưa chia đội cho game này."}</p></div>
          </div>
          ${assignments.length ? `
            <div class="game-team-grid">
              ${byTeam.map(team => `
                <div class="game-team-card">
                  <strong>Đội ${team.number}</strong>
                  <div>${team.members.map(item => {
                    const member = memberMeta(item.username);
                    return `<span><img src="${escapeHTML(member.avatar)}" alt="" ${imgAttrs()}>${escapeHTML(member.username)}</span>`;
                  }).join("")}</div>
                </div>
              `).join("")}
            </div>
          ` : `<div class="game-empty-state">Đội hình sẽ xuất hiện tại đây sau khi Quản trò chia đội.</div>`}
        </section>
      `;
    }

    function poseImage(poseNumber) {
      return activeGame.poseImages?.[poseNumber - 1] || "";
    }

    function renderPhotoChallengeBoard() {
      if (!isPhotoChallenge()) return "";
      const teamCount = effectiveTeamCount();
      const poseCount = Number(activeGame.photoPoseCount || 2);
      return `
        <section class="game-menu-panel photo-pose-panel">
          <div class="game-panel-heading">
            <div>
              <h3>Bộ ảnh tạo dáng</h3>
              <p>Mỗi đội bốc ngẫu nhiên ${poseCount} trong 5 dáng dưới đây.</p>
            </div>
          </div>
          <div class="photo-pose-reference" aria-label="5 ảnh tạo dáng">
            ${(activeGame.poseImages || []).map((src, index) => `
              <a href="${escapeHTML(src)}" target="_blank" rel="noopener noreferrer" class="photo-pose-reference-card">
                <img src="${escapeHTML(src)}" alt="Dáng mẫu ${index + 1}" ${imgAttrs()}>
                <span>Dáng ${index + 1}</span>
              </a>
            `).join("")}
          </div>
          <div class="photo-draw-heading">
            <strong>Phiếu bốc của từng đội</strong>
            <span>Mỗi đội cần đủ ${poseCount} dáng</span>
          </div>
          ${photoChallengeLoading ? `<div class="photo-draw-loading"><span></span><span></span></div>` : `
            <div class="photo-draw-teams">
              ${Array.from({ length: teamCount }, (_, index) => index + 1).map(teamNumber => {
                const draws = photoChallengeState.draws
                  .filter(draw => draw.teamNumber === teamNumber)
                  .sort((a, b) => a.poseNumber - b.poseNumber);
                return `
                  <article class="photo-draw-team">
                    <div class="photo-draw-team-title">
                      <strong>Đội ${teamNumber}</strong>
                      <span class="${draws.length === poseCount ? "is-ready" : ""}">${draws.length}/${poseCount} dáng</span>
                    </div>
                    ${draws.length ? `
                      <div class="photo-draw-grid">
                        ${draws.map(draw => `
                          <a href="${escapeHTML(poseImage(draw.poseNumber))}" target="_blank" rel="noopener noreferrer">
                            <img src="${escapeHTML(poseImage(draw.poseNumber))}" alt="Đội ${teamNumber}, dáng ${draw.poseNumber}" ${imgAttrs()}>
                            <span>${draw.poseNumber}</span>
                          </a>
                        `).join("")}
                      </div>
                    ` : `<div class="photo-draw-empty">Quản trò chưa bốc ảnh cho Đội ${teamNumber}.</div>`}
                  </article>
                `;
              }).join("")}
            </div>
          `}
        </section>
      `;
    }

    function renderPhotoChallengeVoting() {
      if (!isPhotoChallenge()) return "";
      const teamCount = effectiveTeamCount();
      const tallies = new Map(photoChallengeState.voteTallies.map(tally => [tally.teamNumber, tally.voteCount]));
      const maxVotes = Math.max(0, ...tallies.values());
      const statusCopy = {
        draft: "Vote chưa mở",
        open: "Đang mở vote",
        closed: "Đã chốt vote"
      };
      return `
        <section class="game-menu-panel photo-vote-panel">
          <div class="photo-vote-title">
            <div>
              <h3>Vote đội thắng</h3>
              <p>Mỗi người chọn một đội mình thích nhất.</p>
            </div>
            <span class="is-${escapeHTML(photoChallengeState.voteStatus)}">${statusCopy[photoChallengeState.voteStatus]}</span>
          </div>
          ${photoChallengeState.voteStatus === "draft" ? `
            <div class="game-empty-state">Quản trò sẽ mở vote sau khi các đội hoàn thành và upload ảnh.</div>
          ` : photoChallengeState.voteStatus === "open" ? `
            ${!sessionToken() ? `<div class="game-empty-state">Đăng nhập để vote cho đội bạn thích.</div>` : isHost() && !isPhotoChallenge() ? `<div class="game-empty-state">Quản trò không tham gia vote. Số phiếu trực tiếp nằm trong công cụ quản trò.</div>` : !photoChallengeState.myTeam ? `<div class="game-empty-state">Bạn cần được chia đội trước khi vote.</div>` : `
              <div class="photo-vote-options">
                ${Array.from({ length: teamCount }, (_, index) => index + 1)
                  .map(teamNumber => `
                    <button type="button" class="${photoChallengeState.myVote === teamNumber ? "is-selected" : ""}" data-photo-vote="${teamNumber}">
                      <span>${photoChallengeState.myVote === teamNumber ? lucideIcon("check") : lucideIcon("heart")}</span>
                      <strong>Đội ${teamNumber}</strong>
                      <small>${photoChallengeState.myVote === teamNumber ? "Đã chọn" : "Chọn đội này"}</small>
                    </button>
                  `).join("")}
              </div>
              ${photoChallengeState.myVote ? `<p class="photo-vote-note">Bạn có thể đổi lựa chọn khi vote còn mở.</p>` : ""}
            `}
          ` : `
            <div class="photo-vote-results">
              ${Array.from({ length: teamCount }, (_, index) => index + 1).map(teamNumber => {
                const votes = tallies.get(teamNumber) || 0;
                const isWinner = maxVotes > 0 && votes === maxVotes;
                return `
                  <div class="photo-vote-result ${isWinner ? "is-winner" : ""}">
                    <span>${isWinner ? lucideIcon("trophy") : lucideIcon("users")}</span>
                    <strong>Đội ${teamNumber}</strong>
                    <em>${votes} phiếu</em>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        </section>
      `;
    }

    function ownTeamNumber() {
      const username = getAuthMember()?.username;
      if (!username || activeGame?.key !== "anh-challenge-binh-minh") return 0;
      return Number(gameState.teams.find(team =>
        team.gameKey === activeGame.key && team.username === username
      )?.teamNumber || 0);
    }

    async function loadTeamPhotos() {
      if (!client || !isPhotoChallenge()) return;
      photosLoading = true;
      photoError = "";
      render();
      const bucket = client.storage.from("trip-game-photos");
      const loaded = new Map();
      for (let teamNumber = 1; teamNumber <= effectiveTeamCount(); teamNumber += 1) {
        const folder = `${activeGame.key}/team-${teamNumber}`;
        const { data: files, error } = await bucket.list(folder, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" }
        });
        if (error) {
          photoError = "Chưa đọc được album ảnh công khai. Kiểm tra bucket và policy Storage.";
          loaded.set(teamNumber, []);
          continue;
        }
        loaded.set(teamNumber, (files || [])
          .filter(file => file.name && file.name !== ".emptyFolderPlaceholder")
          .map(file => ({
            name: file.name,
            url: bucket.getPublicUrl(`${folder}/${file.name}`).data.publicUrl
          })));
      }
      teamPhotos = loaded;
      photosLoading = false;
    }

    function renderPhotoGallery() {
      if (!isPhotoChallenge()) return "";
      const myTeam = ownTeamNumber();
      return `
        <section class="game-menu-panel team-photo-panel">
          <div class="game-panel-heading">
            <div>
              <h3>Album ảnh của đội</h3>
              <p>Ảnh trong album được công khai cho tất cả mọi người.</p>
            </div>
          </div>
          ${photoError ? `<p class="team-photo-error" role="status">${escapeHTML(photoError)}</p>` : ""}
          ${photosLoading ? `<div class="team-photo-loading"><span></span><span></span></div>` : `
            <div class="team-photo-groups">
              ${Array.from({ length: effectiveTeamCount() }, (_, index) => index + 1).map(teamNumber => {
                const photos = teamPhotos.get(teamNumber) || [];
                return `
                  <div class="team-photo-group">
                    <div class="team-photo-group-title">
                      <strong>Đội ${teamNumber}</strong>
                      <span>${photos.length} ảnh</span>
                    </div>
                    ${photos.length ? `
                      <div class="team-photo-grid">
                        ${photos.map(photo => `
                          <a href="${escapeHTML(photo.url)}" target="_blank" rel="noopener noreferrer">
                            <img src="${escapeHTML(photo.url)}" alt="Ảnh challenge của đội ${teamNumber}" ${imgAttrs()}>
                          </a>
                        `).join("")}
                      </div>
                    ` : `<div class="team-photo-empty">Đội ${teamNumber} chưa có ảnh.</div>`}
                  </div>
                `;
              }).join("")}
            </div>
          `}
          ${myTeam ? `
            <form class="team-photo-upload" data-team-photo-upload>
              <label>
                <span>Thêm ảnh cho Đội ${myTeam}</span>
                <input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple required>
              </label>
              <button type="submit" ${uploadingPhotos ? "disabled" : ""}>${lucideIcon("image-up")} ${uploadingPhotos ? "Đang upload..." : "Upload ảnh"}</button>
              <small>Mỗi ảnh tối đa 10 MB. Thành viên nào trong đội cũng có thể thêm ảnh.</small>
            </form>
          ` : sessionToken() ? `<p class="team-photo-login-note">Bạn cần được Quản trò chia vào một đội trước khi upload ảnh.</p>` : `<p class="team-photo-login-note">Đăng nhập để upload ảnh cho đội của bạn.</p>`}
        </section>
      `;
    }

    function renderHostResults() {
      if (!isHost() || ["truth-or-dare", "su-that-va-loi-noi-doi"].includes(activeGame?.key)) return "";
      const gameResults = currentResults();
      return `
        <section class="game-menu-panel game-host-results">
          <div class="game-panel-heading"><div><h3>Nhập kết quả</h3><p>Điểm được cộng vào bảng tổng ngay sau khi lưu.</p></div></div>
          <form data-game-results-form>
            <div class="game-result-list">
              ${players().map(player => {
                const result = gameResults.get(player.username);
                return `
                  <label class="game-result-row">
                    <img src="${escapeHTML(player.avatar)}" alt="" ${imgAttrs()}>
                    <strong>${escapeHTML(player.username)}</strong>
                    <span>Điểm<input type="number" name="points-${escapeHTML(player.username)}" min="0" max="100" value="${Number(result?.points || 0)}"></span>
                    <span>Ghi chú<input type="text" name="note-${escapeHTML(player.username)}" maxlength="180" value="${escapeHTML(result?.note || "")}" placeholder="Đội thắng, top 3..."></span>
                  </label>
                `;
              }).join("")}
            </div>
            <button class="game-save-results" type="submit">${lucideIcon("save")} Lưu kết quả</button>
          </form>
        </section>
      `;
    }

    function renderPhotoChallengeHostControls() {
      if (!isHost() || !isPhotoChallenge()) return "";
      const teamCount = effectiveTeamCount();
      const poseCount = Number(activeGame.photoPoseCount || 2);
      const tallies = new Map(photoChallengeState.voteTallies.map(tally => [tally.teamNumber, tally.voteCount]));
      return `
        <section class="game-menu-panel photo-host-controls">
          <div class="game-panel-heading">
            <div>
              <h3>Thiết lập thử thách ảnh</h3>
              <p>Chọn số đội, bốc dáng và điều khiển lượt vote.</p>
            </div>
          </div>
          <div class="photo-host-setting">
            <div>
              <strong>Số đội</strong>
              <span>Đổi số đội sẽ reset vote và bỏ assignment vượt quá số đội mới.</span>
            </div>
            <div class="photo-team-count-switch" role="group" aria-label="Chọn số đội">
              ${(activeGame.teamCountOptions || [2, 3]).map(count => `
                <button type="button" class="${teamCount === count ? "is-active" : ""}" data-photo-team-count="${count}" aria-pressed="${teamCount === count}">${count} đội</button>
              `).join("")}
            </div>
          </div>
          <div class="photo-host-setting is-draws">
            <div>
              <strong>Bốc ảnh tạo dáng</strong>
              <span>Mỗi lần bốc chọn ngẫu nhiên ${poseCount} trong 5 ảnh.</span>
            </div>
            <div class="photo-host-draw-actions">
              <button type="button" class="is-primary" data-photo-draw="all">${lucideIcon("shuffle")} Bốc cho tất cả</button>
              ${Array.from({ length: teamCount }, (_, index) => index + 1).map(teamNumber => {
                const hasDraw = photoChallengeState.draws.filter(draw => draw.teamNumber === teamNumber).length === poseCount;
                return `<button type="button" data-photo-draw="${teamNumber}">${lucideIcon("images")} ${hasDraw ? "Bốc lại" : "Bốc"} Đội ${teamNumber}</button>`;
              }).join("")}
            </div>
          </div>
          <div class="photo-host-setting is-voting">
            <div>
              <strong>Điều khiển vote</strong>
              <span>${photoChallengeState.voteStatus === "open" ? "Người chơi đang có thể vote." : photoChallengeState.voteStatus === "closed" ? "Kết quả đã được công bố." : "Vote chưa bắt đầu."}</span>
            </div>
            <div class="photo-host-vote-actions">
              ${photoChallengeState.voteStatus !== "open" ? `<button type="button" class="is-primary" data-photo-vote-status="open">${lucideIcon("play")} Mở vote</button>` : `<button type="button" class="is-primary" data-photo-vote-status="closed">${lucideIcon("square")} Đóng vote</button>`}
              <button type="button" data-photo-vote-reset>${lucideIcon("rotate-ccw")} Reset vote</button>
            </div>
          </div>
          <div class="photo-host-live-votes">
            ${Array.from({ length: teamCount }, (_, index) => index + 1).map(teamNumber => `
              <span><strong>Đội ${teamNumber}</strong><em>${tallies.get(teamNumber) || 0} phiếu</em></span>
            `).join("")}
          </div>
        </section>
      `;
    }

    function renderHostTeamManager() {
      const teamCount = effectiveTeamCount();
      if (!isHost() || !teamCount) return "";
      const assignments = gameState.teams.filter(team => team.gameKey === activeGame.key);
      return `
        <section class="game-menu-panel game-host-team-manager">
          <div class="game-panel-heading">
            <div>
              <h3>Quản lý đội hình</h3>
              <p>Random nhanh hoặc chọn đội thủ công cho từng người.</p>
            </div>
            <button type="button" data-random-teams>${lucideIcon("shuffle")} ${assignments.length ? "Random lại" : "Random đội"}</button>
          </div>
          <form class="game-team-editor" data-team-editor>
            <div class="game-team-editor-head">
              <strong>Chỉnh đội thủ công</strong>
              <span>Chọn “Chưa xếp” để đưa một người ra khỏi đội.</span>
            </div>
            <div class="game-team-editor-list">
              ${players().map(player => {
                const currentTeam = Number(assignments.find(team => team.username === player.username)?.teamNumber || 0);
                return `
                  <label class="game-team-editor-row">
                    <img src="${escapeHTML(player.avatar)}" alt="" ${imgAttrs()}>
                    <strong>${escapeHTML(player.username)}</strong>
                    <select data-team-player="${escapeHTML(player.username)}" aria-label="Chọn đội cho ${escapeHTML(player.username)}">
                      <option value="0" ${currentTeam === 0 ? "selected" : ""}>Chưa xếp</option>
                      ${Array.from({ length: teamCount }, (_, index) => index + 1).map(teamNumber => `
                        <option value="${teamNumber}" ${currentTeam === teamNumber ? "selected" : ""}>Đội ${teamNumber}</option>
                      `).join("")}
                    </select>
                  </label>
                `;
              }).join("")}
            </div>
            <div class="game-team-editor-actions">
              ${assignments.length ? `<button class="game-team-clear" type="button" data-clear-teams>${lucideIcon("trash-2")} Xóa đội hình</button>` : ""}
              <button class="game-team-save" type="submit">${lucideIcon("save")} Lưu đội hình</button>
            </div>
          </form>
        </section>
      `;
    }

    function renderHostConsole() {
      // The spy game has its own player/host flow in the dedicated room modal.
      if (!isHost() || activeGame?.key === "spy-game") return "";
      return `
        <section class="game-host-console">
          <header class="game-host-console-title">
            <span>${lucideIcon("shield-check")} Công cụ quản trò</span>
            <h3>Điều khiển game</h3>
            <p>Các thao tác quản trị được tách riêng khỏi phần người chơi nhìn thấy.</p>
          </header>
          <div class="game-host-console-content">
            ${renderImposterMusicManager()}
            ${renderPhotoChallengeHostControls()}
            ${renderHostTeamManager()}
            ${renderHostResults()}
          </div>
        </section>
      `;
    }

    function render() {
      if (!activeGame) return;
      mount.innerHTML = `
        <div class="game-menu-shell">
          <header class="game-menu-titlebar">
            <div>
              <span class="game-menu-time">${escapeHTML(activeGame.occasion)}</span>
              <h2>${escapeHTML(activeGame.name)}</h2>
              <p>${escapeHTML(activeGame.teaser)}</p>
            </div>
            <button class="game-menu-close" type="button" data-game-menu-close aria-label="Đóng menu game">${lucideIcon("x")}</button>
          </header>
          ${statusMessage ? `<p class="game-menu-status is-${escapeHTML(statusKind || "ok")}" role="status">${escapeHTML(statusMessage)}</p>` : ""}
          ${loading ? `<div class="game-menu-loading" aria-label="Đang tải"><span></span><span></span><span></span></div>` : `
            <div class="game-menu-layout is-single">
              <div>${renderRules()}${renderTeams()}${renderPhotoChallengeBoard()}${renderPhotoGallery()}${renderPhotoChallengeVoting()}</div>
            </div>
            ${renderImposterMusic()}
            ${renderHostConsole()}
          `}
        </div>
      `;
      renderLucideIcons();
    }

    async function openGame(gameKey) {
      activeGame = data.games.find(game => game.key === gameKey);
      if (!activeGame) return;
      // Switching cards closes the separate spy-room surface before opening the new game.
      document.getElementById("spyGame")?.setAttribute("hidden", "");
      setStatus("");
      mount.hidden = false;
      render();
      await loadGameState();
      if (isPhotoChallenge()) {
        await loadPhotoChallengeState();
        await loadTeamPhotos();
      }
      if (activeGame.key === "who-is-the-imposter") await loadImposterMusicState();
      render();
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveTeamAssignments(assignments, successMessage) {
      if (!client || !effectiveTeamCount() || !isHost()) {
        setStatus("Chưa cấu hình Supabase nên không lưu được đội hình.", "error");
        render();
        return false;
      }
      const previousTeams = [...gameState.teams];
      gameState.teams = [
        ...gameState.teams.filter(team => team.gameKey !== activeGame.key),
        ...assignments.map(assignment => ({ gameKey: activeGame.key, ...assignment }))
      ];
      setStatus("Đang lưu đội hình...", "ok");
      render();
      const { data: payload, error } = await client.rpc("trip_game_save_teams", {
        p_session_token: sessionToken(),
        p_game_key: activeGame.key,
        p_assignments: assignments
      });
      if (error) {
        gameState.teams = previousTeams;
        setStatus(`Không lưu được đội hình: ${error.message || "Lỗi Supabase."}`, "error");
        render();
        return false;
      }

      const savedTeams = normalizeTeams(payload?.teams).filter(team => team.gameKey === activeGame.key);
      applyPayload(payload);
      if (assignments.length && !savedTeams.length) {
        gameState.teams = [
          ...gameState.teams.filter(team => team.gameKey !== activeGame.key),
          ...assignments.map(assignment => ({ gameKey: activeGame.key, ...assignment }))
        ];
        setStatus("Đội hình đã đổi trên màn hình nhưng Supabase chưa trả về dữ liệu. Hãy chạy lại migration add_game_hub.sql.", "error");
        render();
        return false;
      }
      setStatus(successMessage, "ok");
      render();
      return true;
    }

    grid.addEventListener("click", event => {
      const card = event.target.closest("[data-game-key]");
      if (!card?.dataset.gameKey) return;
      openGame(card.dataset.gameKey);
    });

    mount.addEventListener("click", async event => {
      if (event.target.closest("[data-game-menu-close]")) {
        mount.hidden = true;
        document.getElementById("spyGame")?.setAttribute("hidden", "");
        activeGame = null;
        return;
      }
      const selectOption = event.target.closest("[data-select-option]");
      if (selectOption) {
        const select = selectOption.closest("[data-custom-select]");
        const input = select?.querySelector("input[type='hidden']");
        const triggerLabel = select?.querySelector("[data-select-toggle] span");
        if (select && input && triggerLabel) {
          input.value = selectOption.dataset.value || "";
          triggerLabel.textContent = selectOption.textContent;
          select.querySelectorAll("[data-select-option]").forEach(option => {
            option.setAttribute("aria-selected", String(option === selectOption));
          });
          select.classList.remove("is-open");
          select.querySelector("[data-select-toggle]")?.setAttribute("aria-expanded", "false");
        }
        return;
      }
      const selectToggle = event.target.closest("[data-select-toggle]");
      if (selectToggle) {
        const select = selectToggle.closest("[data-custom-select]");
        const opening = !select?.classList.contains("is-open");
        mount.querySelectorAll("[data-custom-select].is-open").forEach(item => {
          item.classList.remove("is-open");
          item.querySelector("[data-select-toggle]")?.setAttribute("aria-expanded", "false");
        });
        if (opening && select) {
          select.classList.add("is-open");
          selectToggle.setAttribute("aria-expanded", "true");
        }
        return;
      }
      mount.querySelectorAll("[data-custom-select].is-open").forEach(select => {
        select.classList.remove("is-open");
        select.querySelector("[data-select-toggle]")?.setAttribute("aria-expanded", "false");
      });
      if (event.target.closest("[data-open-spy-game]")) {
        window.dispatchEvent(new CustomEvent("hue-open-spy-game"));
        return;
      }
      const teamCountButton = event.target.closest("[data-photo-team-count]");
      if (teamCountButton && isHost() && isPhotoChallenge()) {
        const nextCount = Number(teamCountButton.dataset.photoTeamCount);
        if (nextCount === effectiveTeamCount()) return;
        if (!window.confirm(`Đổi sang ${nextCount} đội? Vote hiện tại sẽ được reset.`)) return;
        const { data: payload, error } = await client.rpc("photo_challenge_set_team_count", {
          p_session_token: sessionToken(),
          p_team_count: nextCount
        });
        if (error) setStatus(error.message || "Không đổi được số đội.", "error");
        else {
          photoChallengeState = normalizePhotoChallenge(payload);
          await loadGameState();
          await loadTeamPhotos();
          setStatus(`Đã chuyển game sang ${nextCount} đội.`, "ok");
        }
        render();
        return;
      }
      const drawButton = event.target.closest("[data-photo-draw]");
      if (drawButton && isHost() && isPhotoChallenge()) {
        const drawTarget = drawButton.dataset.photoDraw;
        const { data: payload, error } = await client.rpc("photo_challenge_randomize_draws", {
          p_session_token: sessionToken(),
          p_team_number: drawTarget === "all" ? null : Number(drawTarget)
        });
        if (error) setStatus(error.message || "Không bốc được ảnh tạo dáng.", "error");
        else {
          photoChallengeState = normalizePhotoChallenge(payload);
          setStatus(drawTarget === "all" ? "Đã bốc 4 ảnh cho tất cả đội." : `Đã bốc 4 ảnh cho Đội ${drawTarget}.`, "ok");
        }
        render();
        return;
      }
      const voteStatusButton = event.target.closest("[data-photo-vote-status]");
      if (voteStatusButton && isHost() && isPhotoChallenge()) {
        const nextStatus = voteStatusButton.dataset.photoVoteStatus;
        const { data: payload, error } = await client.rpc("photo_challenge_set_vote_status", {
          p_session_token: sessionToken(),
          p_status: nextStatus,
          p_reset: false
        });
        if (error) setStatus(error.message || "Không đổi được trạng thái vote.", "error");
        else {
          photoChallengeState = normalizePhotoChallenge(payload);
          setStatus(nextStatus === "open" ? "Đã mở vote." : "Đã đóng và công bố kết quả vote.", "ok");
        }
        render();
        return;
      }
      if (event.target.closest("[data-photo-vote-reset]") && isHost() && isPhotoChallenge()) {
        if (!window.confirm("Xóa toàn bộ phiếu và đưa vote về trạng thái chưa mở?")) return;
        const { data: payload, error } = await client.rpc("photo_challenge_set_vote_status", {
          p_session_token: sessionToken(),
          p_status: "draft",
          p_reset: true
        });
        if (error) setStatus(error.message || "Không reset được vote.", "error");
        else {
          photoChallengeState = normalizePhotoChallenge(payload);
          setStatus("Đã xóa toàn bộ phiếu vote.", "ok");
        }
        render();
        return;
      }
      const voteButton = event.target.closest("[data-photo-vote]");
      if (voteButton && isPhotoChallenge()) {
        const { data: payload, error } = await client.rpc("photo_challenge_cast_vote", {
          p_session_token: sessionToken(),
          p_team_number: Number(voteButton.dataset.photoVote)
        });
        if (error) setStatus(error.message || "Không gửi được phiếu vote.", "error");
        else {
          photoChallengeState = normalizePhotoChallenge(payload);
          setStatus(`Đã vote cho Đội ${voteButton.dataset.photoVote}.`, "ok");
        }
        render();
        return;
      }
      if (event.target.closest("[data-imposter-ready]")) {
        if (!imposterMusic?.myTrack) return;
        try {
          await unlockMusic(imposterMusic.myTrack);
          if (imposterMusic.room?.status === "playing") {
            imposterMusicError = "";
            scheduleMusicPlayback();
            render();
            return;
          }
          const { data: payload, error } = await client.rpc("imposter_music_set_ready", { p_session_token: sessionToken() });
          if (error) throw error;
          imposterMusic = payload;
          imposterMusicError = "";
          scheduleMusicPlayback();
        } catch (error) {
          imposterMusicError = error.message || "Máy chưa mở được YouTube. Kiểm tra mạng rồi thử lại.";
        }
        render();
        return;
      }
      if (event.target.closest("[data-imposter-start]")) {
        const { data: payload, error } = await client.rpc("imposter_music_start_round", { p_session_token: sessionToken() });
        if (error) imposterMusicError = error.message || "Không bắt đầu được vòng.";
        else {
          imposterMusic = payload;
          scheduleMusicPlayback();
        }
        render();
        return;
      }
      if (event.target.closest("[data-imposter-finish]")) {
        const { data: payload, error } = await client.rpc("imposter_music_finish_round", { p_session_token: sessionToken() });
        if (error) imposterMusicError = error.message || "Không kết thúc được lượt.";
        else {
          imposterMusic = payload;
          stopScheduledMusic();
        }
        render();
        return;
      }
      if (event.target.closest("[data-imposter-random]")) {
        const form = mount.querySelector("[data-imposter-round-form]");
        const tracks = imposterMusic?.tracks || [];
        const playersForMusic = imposterMusic?.players || [];
        if (!form || tracks.length < 2 || !playersForMusic.length) return;
        const picks = shuffle(tracks).slice(0, 2);
        form.elements.commonTrack.value = picks[0].id;
        form.elements.imposterTrack.value = picks[1].id;
        form.elements.imposter.value = playersForMusic[randomIndex(playersForMusic.length)].username;
        return;
      }
      const deleteTrack = event.target.closest("[data-imposter-delete-track]");
      if (deleteTrack) {
        const { data: payload, error } = await client.rpc("imposter_music_delete_track", {
          p_session_token: sessionToken(), p_track_id: deleteTrack.dataset.imposterDeleteTrack
        });
        if (error) imposterMusicError = error.message || "Không xóa được bài.";
        else imposterMusic = payload;
        render();
        return;
      }
      if (event.target.closest("[data-clear-teams]")) {
        if (!window.confirm("Xóa toàn bộ đội hình của game này?")) return;
        await saveTeamAssignments([], "Đã xóa đội hình.");
        return;
      }
      if (!event.target.closest("[data-random-teams]") || !effectiveTeamCount() || !isHost()) return;
      const assignments = shuffle(players()).map((player, index) => ({
        username: player.username,
        teamNumber: (index % effectiveTeamCount()) + 1
      }));
      await saveTeamAssignments(assignments, "Đã random và lưu đội hình.");
    });

    mount.addEventListener("submit", async event => {
      if (event.target.matches("[data-imposter-track-form]")) {
        event.preventDefault();
        const form = new FormData(event.target);
        const startSeconds = parseClock(form.get("startAt"));
        if (startSeconds === null) {
          imposterMusicError = "Mốc bắt đầu dùng dạng 2:31 hoặc số giây.";
          render();
          return;
        }
        const { data: payload, error } = await client.rpc("imposter_music_add_track", {
          p_session_token: sessionToken(),
          p_youtube_url: String(form.get("youtubeUrl") || ""),
          p_label: String(form.get("label") || ""),
          p_start_seconds: startSeconds,
          p_duration_seconds: Number(form.get("duration") || 20)
        });
        if (error) imposterMusicError = error.message || "Không thêm được bài.";
        else imposterMusic = payload;
        render();
        return;
      }
      if (event.target.matches("[data-imposter-round-form]")) {
        event.preventDefault();
        const form = new FormData(event.target);
        const { data: payload, error } = await client.rpc("imposter_music_prepare_round", {
          p_session_token: sessionToken(),
          p_common_track_id: String(form.get("commonTrack") || ""),
          p_imposter_track_id: String(form.get("imposterTrack") || ""),
          p_imposter_username: String(form.get("imposter") || "")
        });
        if (error) imposterMusicError = error.message || "Không chuẩn bị được vòng.";
        else {
          imposterMusic = payload;
          scheduledMusicRound = 0;
        }
        render();
        return;
      }
      if (!event.target.matches("[data-team-editor]") || !effectiveTeamCount() || !isHost()) return;
      event.preventDefault();
      const assignments = [...event.target.querySelectorAll("[data-team-player]")]
        .map(select => ({ username: select.dataset.teamPlayer, teamNumber: Number(select.value) }))
        .filter(assignment => assignment.username && assignment.teamNumber > 0);
      await saveTeamAssignments(assignments, "Đã lưu đội hình chỉnh thủ công.");
    });

    mount.addEventListener("submit", async event => {
      if (!event.target.matches("[data-team-photo-upload]") || activeGame?.key !== "anh-challenge-binh-minh") return;
      event.preventDefault();
      const myTeam = ownTeamNumber();
      const files = [...(event.target.elements.photos?.files || [])];
      if (!myTeam || !files.length || !sessionToken()) return;

      uploadingPhotos = true;
      photoError = "";
      render();
      let uploadFailure = "";
      for (const file of files) {
        const body = new FormData();
        body.append("sessionToken", sessionToken());
        body.append("gameKey", activeGame.key);
        body.append("file", file);
        try {
          const response = await fetch(`${config.url}/functions/v1/team-photo-upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.anonKey}`,
              apikey: config.anonKey
            },
            body
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "Upload thất bại.");
        } catch (error) {
          uploadFailure = error.message || "Không upload được ảnh.";
          break;
        }
      }
      uploadingPhotos = false;
      await loadTeamPhotos();
      if (uploadFailure) photoError = uploadFailure;
      else if (!photoError) setStatus("Đã upload ảnh vào album công khai của đội.", "ok");
      render();
    });

    mount.addEventListener("submit", async event => {
      if (!event.target.matches("[data-game-results-form]") || !activeGame || !isHost()) return;
      event.preventDefault();
      if (!client) {
        setStatus("Chưa cấu hình Supabase nên không lưu được kết quả.", "error");
        render();
        return;
      }
      const form = new FormData(event.target);
      const results = players().map(player => ({
        username: player.username,
        points: Number(form.get(`points-${player.username}`) || 0),
        note: String(form.get(`note-${player.username}`) || "").trim()
      }));
      const submit = event.target.querySelector("[type='submit']");
      submit.disabled = true;
      const { data: payload, error } = await client.rpc("trip_game_save_results", {
        p_session_token: sessionToken(),
        p_game_key: activeGame.key,
        p_results: results
      });
      if (error) setStatus("Không lưu được kết quả.", "error");
      else {
        applyPayload(payload);
        setStatus("Đã lưu kết quả và cập nhật bảng xếp hạng.", "ok");
        window.dispatchEvent(new CustomEvent("hue-game-results-change", { detail: payload }));
      }
      render();
    });

    window.addEventListener("hue-auth-change", async () => {
      if (mount.hidden || !activeGame) return;
      await loadGameState();
      if (isPhotoChallenge()) {
        await loadPhotoChallengeState();
        await loadTeamPhotos();
      }
      if (activeGame.key === "who-is-the-imposter") await loadImposterMusicState();
      render();
    });

    if (client) {
      imposterRealtime = client.channel("imposter-music-room")
        .on("postgres_changes", { event: "*", schema: "public", table: "imposter_music_room" }, async () => {
          if (activeGame?.key !== "who-is-the-imposter") return;
          await loadImposterMusicState();
          render();
        })
        .subscribe();
    }

    window.setInterval(async () => {
      if (mount.hidden || !isPhotoChallenge() || document.hidden) return;
      if (mount.contains(document.activeElement)) return;
      await loadPhotoChallengeState({ silent: true });
      render();
    }, 5000);
  };

  initGameMenus();

  const initSpyGame = () => {
    const mount = document.getElementById("spyGame");
    const grid = document.getElementById("gameGrid");
    if (!mount || !grid) return;

    const config = window.HUE_SUPABASE || {};
    const client = config.url && config.anonKey && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;
    const roleLabels = {
      villager: "Dân",
      spy: "Gián điệp"
    };
    const roleHints = {
      villager: "Không có nhiệm vụ. Mục tiêu là tìm đủ 2 gián điệp.",
      spy: "Có nhiệm vụ riêng. Hoàn thành nhiệm vụ và sống sót qua vote."
    };
    let memberRoles = new Map((data.members || []).map(member => [member.name, member.role || ""]));
    const players = () => (data.members || [])
      .filter(member => memberRoles.get(member.name) !== "host")
      .map((member, index) => ({
        username: member.name,
        displayName: member.name,
        avatar: `figures/people/${(data.members || []).findIndex(item => item.name === member.name) + 1}.png`
      }));

    let dbError = client ? "" : "Chưa cấu hình Supabase.";
    let confirmNewGameOpen = false;
    let gameResults = [];
    let state;
    state = createState("");

    function randomIndex(max) {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      do {
        window.crypto.getRandomValues(values);
      } while (values[0] >= limit);
      return values[0] % max;
    }

    function shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = randomIndex(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    function createState(sessionId = state?.sessionId || "", randomizeSpies = false) {
      const spies = new Set(randomizeSpies ? shuffle(players().map(player => player.username)).slice(0, 2) : []);
      return {
        sessionId,
        isDraft: randomizeSpies || !sessionId,
        status: "stopped",
        round: 1,
        tasksDone: false,
        winner: "",
        missions: state?.missions || [],
        assignments: players().map(player => ({
          username: player.username,
          role: spies.has(player.username) ? "spy" : "villager",
          alive: true
        })),
        viewerIsHost: getAuthMember()?.role === "host",
        kills: []
      };
    }

    function sessionToken() {
      return getAuthMember()?.sessionToken || "";
    }

    function stateFromPayload(payload) {
      const session = payload?.session;
      const dbPlayers = payload?.isHost ? (payload.players || []) : (payload.self ? [payload.self] : []);
      const missions = payload?.missions || [];
      const next = {
        sessionId: session?.id || "",
        isDraft: false,
        isHost: Boolean(payload?.isHost),
        status: session?.status || "stopped",
        round: session?.round || 1,
        tasksDone: Boolean(session?.tasksDone),
        winner: session?.winner || "",
        votingOpen: Boolean(session?.votingOpen),
        voteRound: session?.voteRound || 1,
        myVotes: payload?.myVotes || [],
        candidates: payload?.candidates || [],
        voteTallies: payload?.voteTallies || [],
        missions: missions.map(mission => ({
          id: mission.id,
          title: mission.title,
          done: mission.done,
          visibleToSpies: Boolean(mission.visibleToSpies ?? mission.visible_to_spies),
          order: mission.order || mission.mission_order
        })),
        assignments: dbPlayers.map(row => ({
          username: row.username,
          role: row.role || "villager",
          alive: row.alive ?? true
        })),
        viewerIsHost: Boolean(payload?.isHost),
        kills: []
      };
      if (!next.assignments.length && next.isHost) next.assignments = createState("", false).assignments;
      return next;
    }

    function setDbError(message) {
      dbError = message || "";
    }

    async function loadGameState() {
      if (!client || !sessionToken()) {
        setDbError("Bạn cần đăng nhập để mở game.");
        return false;
      }
      const { data: payload, error } = await client.rpc("spy_game_get_state", {
        p_session_token: sessionToken()
      });
      if (error) {
        setDbError("Không tải được game từ database.");
        console.warn("Cannot load spy game state:", error);
        return false;
      }
      if (!payload?.authenticated) {
        setDbError("Bạn cần đăng nhập để mở game.");
        return false;
      }
      state = stateFromPayload(payload);
      setDbError("");
      return true;
    }

    async function loadSession() {
      return loadGameState();
    }

    async function loadLatestSession() {
      return loadGameState();
    }

    async function loadGameResults() {
      if (!client || !sessionToken()) return;
      const { data: payload, error } = await client.rpc("trip_games_get_state", {
        p_session_token: sessionToken()
      });
      if (!error) {
        memberRoles = new Map((payload?.members || []).map(member => [member.username, member.role || ""]));
        gameResults = payload?.results || [];
        if (state?.isHost && !state.sessionId) state = createState("", false);
      }
    }

    function draftNewGame() {
      state = createState("", true);
      state.missions = state.missions.map(mission => ({ ...mission, done: false }));
    }

    async function startDraftGame() {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không tạo game được.");
        return;
      }

      const { data: payload, error } = await client.rpc("spy_game_start_current", {
        p_session_token: sessionToken(),
        p_players: state.assignments.map(item => ({
        username: item.username,
        role: item.role,
        alive: true
        }))
      });
      if (error) {
        setDbError("Không tạo được game mới trong database.");
        console.warn("Cannot start spy game:", error);
        return;
      }
      state = stateFromPayload(payload);
    }

    async function startCurrentGame() {
      if (state.isDraft || !state.sessionId) {
        await startDraftGame();
        return;
      }

      state.status = "running";
      await persistSession();
    }

    async function stopCurrentGame() {
      state.status = "stopped";
      state.winner = "";
      await persistSession();
    }

    async function persistSession() {
      if (!client || !state.sessionId) return;
      const { data: payload, error } = await client.rpc("spy_game_update_session", {
        p_session_token: sessionToken(),
        p_status: state.status,
        p_round: state.round,
        p_tasks_done: state.tasksDone,
        p_winner: state.winner || ""
      });
      if (error) {
        setDbError("Không lưu được trạng thái game.");
        console.warn("Cannot update spy game session:", error);
        return;
      }
      state = stateFromPayload(payload);
    }

    async function persistPlayer(username) {
      if (!client || !state.sessionId) return;
      const assignment = assignmentOf(username);
      const { data: payload, error } = await client.rpc("spy_game_update_player", {
        p_session_token: sessionToken(),
        p_username: username,
        p_role: assignment.role,
        p_alive: assignment.alive
      });
      if (error) {
        setDbError("Không lưu được vai trò người chơi.");
        console.warn("Cannot update spy game player:", error);
        return;
      }
      state = stateFromPayload(payload);
    }

    async function setVoting(open, round = state.voteRound || 1) {
      if (!client || !state.sessionId) return;
      const { data: payload, error } = await client.rpc("spy_game_set_voting", {
        p_session_token: sessionToken(),
        p_round: Number(round),
        p_open: open
      });
      if (error) {
        setDbError("Không cập nhật được trạng thái vote.");
        console.warn("Cannot update spy game voting:", error);
        return;
      }
      state = stateFromPayload(payload);
    }

    async function castVotes(targets) {
      if (!client || !state.sessionId) return;
      const { data: payload, error } = await client.rpc("spy_game_cast_votes", {
        p_session_token: sessionToken(),
        p_targets: targets
      });
      if (error) {
        setDbError(error.message || "Không gửi được phiếu vote.");
        console.warn("Cannot cast spy game votes:", error);
        return;
      }
      state = stateFromPayload(payload);
    }

    async function persistMission(mission, includeDone = true) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không lưu nhiệm vụ được.");
        return false;
      }
      const { data: payload, error } = await client.rpc("spy_game_upsert_mission", {
        p_session_token: sessionToken(),
        p_id: mission.id || null,
        p_title: mission.title,
        p_done: mission.done,
        p_order: mission.order,
        p_include_done: includeDone
      });
      if (error) {
        setDbError("Không lưu được nhiệm vụ.");
        console.warn("Cannot update spy game mission:", error);
        return false;
      }
      state = stateFromPayload(payload);
      return true;
    }

    async function insertMission(mission) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không thêm nhiệm vụ được.");
        return false;
      }
      const { data: payload, error } = await client.rpc("spy_game_upsert_mission", {
        p_session_token: sessionToken(),
        p_id: null,
        p_title: mission.title,
        p_done: mission.done,
        p_order: mission.order,
        p_include_done: true
      });
      if (error) {
        setDbError("Không thêm được nhiệm vụ.");
        console.warn("Cannot insert spy game mission:", error);
        return false;
      }
      state = stateFromPayload(payload);
      return true;
    }

    async function deleteMission(missionId) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không xóa nhiệm vụ được.");
        return false;
      }
      const { data: payload, error } = await client.rpc("spy_game_delete_mission", {
        p_session_token: sessionToken(),
        p_id: missionId
      });
      if (error) {
        setDbError("Không xóa được nhiệm vụ.");
        console.warn("Cannot delete spy game mission:", error);
        return false;
      }
      state = stateFromPayload(payload);
      return true;
    }

    function currentPlayer() {
      const member = getAuthMember();
      return member?.username || players()[0]?.username || "";
    }

    function assignmentOf(username = currentPlayer()) {
      return state.assignments.find(item => item.username === username) || state.assignments[0];
    }

    function isHost() {
      if (typeof state.isHost === "boolean") return state.isHost;
      return state.viewerIsHost || getAuthMember()?.role === "host";
    }

    function playerMeta(username) {
      return players().find(player => player.username === username) || { username, displayName: username, avatar: "" };
    }

    function statusText() {
      if (state.winner) return state.winner === "villagers" ? "Dân thắng" : "Gián điệp thắng";
      return state.status === "running" ? `Đang chơi · Vòng ${state.round}` : "Đang dừng";
    }

    function applyWinLogic() {
      const killedSpies = state.assignments.filter(item => item.role === "spy" && !item.alive).length;
      if (killedSpies >= 2) state.winner = "villagers";
      else if (state.round > 2) state.winner = state.tasksDone ? "spies" : "villagers";
      else state.winner = "";
    }

    function renderRules() {
      return `
        <ul class="spy-rules">
          ${(data.spyGame?.rules || []).map(rule => `<li>${escapeHTML(rule)}</li>`).join("")}
        </ul>
      `;
    }

    function renderVotingView(assignment) {
      if (state.status !== "running") return "";
      if (!state.votingOpen) {
        return `
          <div class="spy-vote-box is-closed">
            <div>
              <span class="spy-kicker">Vote vòng ${state.voteRound || 1}</span>
              <strong>Chưa mở vote</strong>
            </div>
          </div>
        `;
      }
      if (!assignment.alive) {
        return `
          <div class="spy-vote-box is-closed">
            <div>
              <span class="spy-kicker">Vote vòng ${state.voteRound || 1}</span>
              <strong>Bạn đã bị loại nên không thể vote.</strong>
            </div>
          </div>
        `;
      }

      const selected = new Set(state.myVotes || []);
      const candidates = (state.candidates || []).filter(candidate => candidate.alive && candidate.username !== assignment.username);
      return `
        <div class="spy-vote-box">
          <div class="spy-vote-head">
            <div>
              <span class="spy-kicker">Vote vòng ${state.voteRound || 1}</span>
              <strong>Chọn tối đa 2 người nghi là gián điệp</strong>
            </div>
            <span>${selected.size}/2</span>
          </div>
          <div class="spy-vote-list">
            ${candidates.map(candidate => {
              const meta = playerMeta(candidate.username);
              const isSelected = selected.has(candidate.username);
              const isDisabled = !isSelected && selected.size >= 2;
              return `
              <label class="${selected.has(candidate.username) ? "is-selected" : ""}">
                <input type="checkbox" data-spy-vote-target="${escapeHTML(candidate.username)}" ${isSelected ? "checked" : ""} ${isDisabled ? "disabled" : ""}>
                <img src="${escapeHTML(meta.avatar)}" alt="${escapeHTML(candidate.username)}" ${imgAttrs()}>
                <span>${escapeHTML(candidate.username)}</span>
                <em>${isSelected ? "Đã chọn" : isDisabled ? "Đủ 2 phiếu" : "Chọn"}</em>
              </label>
            `;
            }).join("")}
          </div>
        </div>
      `;
    }

    function renderPlayerView() {
      if (isHost()) {
        return `
          <section class="spy-panel spy-self">
            <div class="spy-paused">
              <span class="spy-kicker">Giao diện người chơi</span>
              <h3>${statusText()}</h3>
              <p>Quản trò điều khiển game từ công cụ quản lý bên dưới và không tham gia với vai trò trong game.</p>
            </div>
          </section>
        `;
      }
      if (state.status !== "running" && !isHost()) {
        return `
          <section class="spy-panel spy-self">
            <div class="spy-paused">
              <span class="spy-kicker">Trạng thái</span>
              <h3>Đang dừng</h3>
              <p>Quản trò chưa bắt đầu game. Vai trò và trạng thái sẽ hiện khi game chạy.</p>
            </div>
          </section>
        `;
      }

      const assignment = assignmentOf();
      const meta = playerMeta(assignment.username);
      return `
        <section class="spy-panel spy-self">
          <div class="spy-profile">
            <img src="${escapeHTML(meta.avatar)}" alt="${escapeHTML(assignment.username)}" ${imgAttrs()}>
            <div>
              <div class="spy-role-line">
                <span class="spy-kicker">Bạn là</span>
                <h3 class="spy-role-badge is-${escapeHTML(assignment.role)}">${escapeHTML(roleLabels[assignment.role])}</h3>
              </div>
              <p>${escapeHTML(roleHints[assignment.role])}</p>
            </div>
          </div>
          <div class="spy-status-strip">
            <span class="${assignment.alive ? "is-alive" : "is-dead"}">${assignment.alive ? "Còn sống" : "Đã bị loại"}</span>
            <span class="is-round">${statusText()}</span>
          </div>
          ${renderVotingView(assignment)}
          ${assignment.role === "spy" ? `
            <div class="spy-mission-card">
              <span>Nhiệm vụ gián điệp</span>
              <div class="spy-mission-list">
                ${state.missions.filter(mission => mission.visibleToSpies).length ? state.missions.filter(mission => mission.visibleToSpies).map(mission => `
                  <div class="spy-mission-item ${mission.done ? "is-done" : ""}">
                    <strong>${escapeHTML(mission.title)}</strong>
                    <em>${mission.done ? "Đã hoàn thành" : "Chưa hoàn thành"}</em>
                  </div>
                `).join("") : `<p class="spy-mission-hidden">Quản trò chưa mở nhiệm vụ cho bạn.</p>`}
              </div>
            </div>
          ` : ""}
        </section>
      `;
    }

    function renderHostView() {
      const tallyByUsername = new Map((state.voteTallies || []).map(tally => [tally.username, tally]));
      return `
        <section class="spy-panel spy-host">
          <div class="spy-host-head">
            <div>
              <span class="spy-kicker">Quản trò</span>
              <h3>Bảng điều khiển</h3>
              <p>${statusText()}</p>
            </div>
            <div class="spy-actions">
              <button type="button" data-spy-action="confirm-new">${lucideIcon("shuffle")}Game mới</button>
              <button type="button" data-spy-action="toggle">${lucideIcon(state.status === "running" ? "square" : "play")} ${state.status === "running" ? "Dừng" : "Bắt đầu"}</button>
            </div>
          </div>
          <div class="spy-host-grid">
            <div class="spy-host-block">
              <div class="spy-host-block-head">
                <h4>Người chơi</h4>
                <span>Vote vòng ${state.voteRound || 1}</span>
              </div>
              <div class="spy-player-list">
                ${state.assignments.map(item => {
                  const meta = playerMeta(item.username);
                  const tally = tallyByUsername.get(item.username);
                  const voteCount = Number(tally?.count || 0);
                  const voters = tally?.voters || [];
                  return `
                    <div class="spy-player-row ${!item.alive ? "is-dead" : ""}">
                      <img src="${escapeHTML(meta.avatar)}" alt="${escapeHTML(item.username)}" ${imgAttrs()}>
                      <strong>${escapeHTML(item.username)}</strong>
                      <select class="is-${escapeHTML(item.role)}" data-spy-role="${escapeHTML(item.username)}">
                        ${Object.entries(roleLabels).map(([value, label]) => `<option class="is-${escapeHTML(value)}" value="${value}" ${item.role === value ? "selected" : ""}>${label}</option>`).join("")}
                      </select>
                      <label><input type="checkbox" data-spy-alive="${escapeHTML(item.username)}" ${item.alive ? "checked" : ""}> ${item.alive ? "Sống" : "Chết"}</label>
                      <div class="spy-player-votes">
                        <span>${voteCount} phiếu</span>
                        <small>${voters.length ? `Từ: ${voters.map(escapeHTML).join(", ")}` : "Chưa có phiếu"}</small>
                      </div>
                      <button class="spy-kill-button" type="button" data-spy-kill-target="${escapeHTML(item.username)}" ${!item.alive ? "disabled" : ""}>Loại</button>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
            <div class="spy-host-block">
              <h4>Nhiệm vụ</h4>
              <form class="spy-task-form" data-spy-task-form>
                <input type="text" name="title" maxlength="180" placeholder="Thêm nhiệm vụ mới">
                <button type="submit">${lucideIcon("plus")}Thêm</button>
              </form>
              <div class="spy-task-list">
                ${state.missions.map(task => `
                  <div class="spy-task-row">
                    <input type="checkbox" data-spy-task-done="${escapeHTML(task.id)}" ${task.done ? "checked" : ""} aria-label="Đánh dấu nhiệm vụ hoàn thành">
                    <input type="text" value="${escapeHTML(task.title)}" data-spy-task-title="${escapeHTML(task.id)}" maxlength="180">
                    <button type="button" class="spy-task-visibility ${task.visibleToSpies ? "is-visible" : ""}" data-spy-task-visibility="${escapeHTML(task.id)}" aria-label="${task.visibleToSpies ? "Ẩn nhiệm vụ khỏi gián điệp" : "Hiển thị nhiệm vụ cho gián điệp"}" title="${task.visibleToSpies ? "Ẩn khỏi gián điệp" : "Hiển thị cho gián điệp"}">${lucideIcon(task.visibleToSpies ? "eye" : "eye-off")}</button>
                    <button type="button" data-spy-task-delete="${escapeHTML(task.id)}" aria-label="Xóa nhiệm vụ">${lucideIcon("trash-2")}</button>
                  </div>
                `).join("")}
              </div>
              <div class="spy-round-box">
                <label>Vòng
                  <select data-spy-round>
                    <option value="1" ${state.round === 1 ? "selected" : ""}>1</option>
                    <option value="2" ${state.round === 2 ? "selected" : ""}>2</option>
                    <option value="3" ${state.round > 2 ? "selected" : ""}>Kết thúc vote</option>
                  </select>
                </label>
                <button class="spy-vote-switch ${state.votingOpen ? "is-on" : ""}" type="button" data-spy-action="${state.votingOpen ? "close-vote" : "open-vote"}" aria-pressed="${state.votingOpen ? "true" : "false"}">
                  <span class="spy-vote-switch-track" aria-hidden="true"><span></span></span>
                  <strong>${state.votingOpen ? `Đang mở vote vòng ${state.round}` : `Đang đóng vote vòng ${state.round}`}</strong>
                </button>
                <label><input type="checkbox" data-spy-tasks-done ${state.tasksDone ? "checked" : ""} disabled> Gián điệp xong nhiệm vụ</label>
                <button type="button" data-spy-action="judge">${lucideIcon("scale")}Chốt kết quả</button>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    function renderGameResults() {
      if (!isHost()) return "";
      const resultByUsername = new Map(gameResults.map(result => [result.username, result]));
      const scorePlayers = state.assignments;
      return `
        <section class="game-menu-panel game-host-results">
          <div class="game-panel-heading"><div><h3>Nhập kết quả</h3><p>Điểm được cộng vào bảng tổng ngay sau khi lưu.</p></div></div>
          <form data-spy-game-results-form>
            <div class="game-result-list">
              ${scorePlayers.map(item => {
                const result = resultByUsername.get(item.username);
                const meta = playerMeta(item.username);
                return `
                  <label class="game-result-row">
                    <img src="${escapeHTML(meta.avatar)}" alt="" ${imgAttrs()}>
                    <strong>${escapeHTML(item.username)}</strong>
                    <span>Điểm<input type="number" name="points-${escapeHTML(item.username)}" min="0" max="100" value="${Number(result?.points || 0)}"></span>
                    <span>Ghi chú<input type="text" name="note-${escapeHTML(item.username)}" maxlength="180" value="${escapeHTML(result?.note || "")}" placeholder="Đội thắng, top 3..."></span>
                  </label>
                `;
              }).join("")}
            </div>
            <button class="game-save-results" type="submit">${lucideIcon("save")} Lưu kết quả</button>
          </form>
        </section>
      `;
    }

    function render() {
      mount.innerHTML = `
        <div class="spy-shell">
          <div class="spy-titlebar">
            <div>
              <span class="eyebrow">Ai Là Gián Điệp?</span>
              <h2>Phòng nhiệm vụ bí mật</h2>
              ${dbError ? `<p class="spy-db-error">${escapeHTML(dbError)}</p>` : ""}
            </div>
            <button class="spy-close" type="button" data-spy-close aria-label="Đóng game">${lucideIcon("x")}</button>
          </div>
          <div class="spy-content">
            ${renderPlayerView()}
            ${isHost() ? `
              <section class="game-host-console">
                <header class="game-host-console-title">
                  <span>${lucideIcon("shield-check")} Công cụ quản lý</span>
                  <h3>Điều khiển game</h3>
                  <p>Các thao tác quản trị và nhập điểm được tách riêng khỏi phần người chơi.</p>
                </header>
                <div class="game-host-console-content">
                  ${renderHostView()}
                  ${renderGameResults()}
                </div>
              </section>
            ` : ""}
          </div>
          <div class="spy-confirm" role="dialog" aria-modal="true" aria-labelledby="spyConfirmTitle" ${confirmNewGameOpen ? "" : "hidden"}>
            <div class="spy-confirm-box">
              <h4 id="spyConfirmTitle">Tạo game mới?</h4>
              <p>Vai trò sẽ được random lại, trạng thái sống/chết và vòng chơi hiện tại sẽ reset.</p>
              <div class="spy-confirm-actions">
                <button class="spy-confirm-cancel" type="button" data-spy-action="cancel-new">Hủy</button>
                <button class="spy-confirm-create" type="button" data-spy-action="new">Tạo mới</button>
              </div>
            </div>
          </div>
        </div>
      `;
      renderLucideIcons();
    }

    window.addEventListener("hue-open-spy-game", async () => {
      if (!sessionToken()) {
        document.getElementById("authLoginOpen")?.click();
        return;
      }
      mount.hidden = false;
      if (!(state.sessionId && await loadSession(state.sessionId))) await loadLatestSession();
      await loadGameResults();
      render();
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    mount.addEventListener("click", async event => {
      if (event.target.closest("[data-spy-close]")) {
        mount.hidden = true;
        document.getElementById("gameMenu")?.removeAttribute("hidden");
        confirmNewGameOpen = false;
        return;
      }
      const action = event.target.closest("[data-spy-action]")?.dataset.spyAction;
      if (action === "confirm-new") confirmNewGameOpen = true;
      if (action === "cancel-new") confirmNewGameOpen = false;
      if (action === "new") {
        draftNewGame();
        confirmNewGameOpen = false;
      }
      if (action === "toggle") {
        if (state.status === "running") await stopCurrentGame();
        else await startCurrentGame();
      }
      if (action === "open-vote") await setVoting(true, Math.min(Number(state.round) || 1, 2));
      if (action === "close-vote") await setVoting(false, Math.min(Number(state.round) || 1, 2));
      if (action === "judge") applyWinLogic();
      const deleteId = event.target.closest("[data-spy-task-delete]")?.dataset.spyTaskDelete;
      const visibilityId = event.target.closest("[data-spy-task-visibility]")?.dataset.spyTaskVisibility;
      const killTarget = event.target.closest("[data-spy-kill-target]")?.dataset.spyKillTarget;
      if (visibilityId) {
        const task = state.missions.find(item => item.id === visibilityId);
        if (!task || !client || !isHost()) return;
        const { data: payload, error } = await client.rpc("spy_game_set_mission_visibility", {
          p_session_token: sessionToken(),
          p_id: visibilityId,
          p_visible: !task.visibleToSpies
        });
        if (error) setDbError("Không cập nhật được trạng thái hiển thị nhiệm vụ.");
        else state = stateFromPayload(payload);
        render();
        return;
      }
      if (action || deleteId || killTarget) {
        if (deleteId && await deleteMission(deleteId)) state.missions = state.missions.filter(task => task.id !== deleteId);
        if (killTarget) {
          const target = assignmentOf(killTarget);
          target.alive = false;
          await persistPlayer(killTarget);
        }
        if (action === "judge") await persistSession();
        render();
      }
    });

    mount.addEventListener("change", async event => {
      const roleName = event.target.dataset.spyRole;
      const aliveName = event.target.dataset.spyAlive;
      const taskTitleId = event.target.dataset.spyTaskTitle;
      const taskDoneId = event.target.dataset.spyTaskDone;
      const voteTarget = event.target.dataset.spyVoteTarget;
      if (roleName) assignmentOf(roleName).role = event.target.value;
      if (aliveName) assignmentOf(aliveName).alive = event.target.checked;
      const task = taskTitleId || taskDoneId ? state.missions.find(task => task.id === (taskTitleId || taskDoneId)) : null;
      const oldTaskTitle = task?.title || "";
      const oldTaskDone = task?.done || false;
      if (taskTitleId && task) task.title = event.target.value.trim();
      if (taskDoneId && task) task.done = event.target.checked;
      if (event.target.matches("[data-spy-round]")) {
        state.round = Number(event.target.value);
        state.voteRound = Math.min(state.round, 2);
        state.votingOpen = false;
        await persistSession();
        await setVoting(false, state.voteRound);
        render();
        return;
      }
      if (voteTarget) {
        const selectedVotes = new Set(state.myVotes || []);
        if (event.target.checked) selectedVotes.add(voteTarget);
        else selectedVotes.delete(voteTarget);
        await castVotes([...selectedVotes].slice(0, 2));
        render();
        return;
      }
      if (taskDoneId) state.tasksDone = state.missions.length > 0 && state.missions.every(mission => mission.done);
      applyWinLogic();
      if (roleName) await persistPlayer(roleName);
      if (aliveName) await persistPlayer(aliveName);
      if (task && !(taskDoneId && state.isDraft) && !(await persistMission(task, !state.isDraft || Boolean(taskDoneId)))) {
        task.title = oldTaskTitle;
        task.done = oldTaskDone;
      }
      if (!state.isDraft && taskDoneId) await persistSession();
      render();
    });

    mount.addEventListener("submit", async event => {
      if (event.target.matches("[data-spy-game-results-form]")) {
        event.preventDefault();
        if (!client || !isHost()) return;
        const form = new FormData(event.target);
        const results = state.assignments.map(item => ({
          username: item.username,
          points: Number(form.get(`points-${item.username}`) || 0),
          note: String(form.get(`note-${item.username}`) || "").trim()
        }));
        const submit = event.target.querySelector("[type='submit']");
        submit.disabled = true;
        const { data: payload, error } = await client.rpc("trip_game_save_results", {
          p_session_token: sessionToken(),
          p_game_key: "spy-game",
          p_results: results
        });
        if (error) setDbError("Không lưu được kết quả.");
        else {
          gameResults = payload?.results || results;
          window.dispatchEvent(new CustomEvent("hue-game-results-change", { detail: payload }));
        }
        render();
        return;
      }
      if (!event.target.matches("[data-spy-task-form]")) return;
      event.preventDefault();
      const input = event.target.elements.title;
      const title = input.value.trim();
      if (!title) return;
      const task = { id: crypto.randomUUID(), title, done: false, order: state.missions.length + 1 };
      await insertMission(task);
      render();
    });

    window.addEventListener("hue-auth-change", async () => {
      if (mount.hidden) return;
      await loadLatestSession();
      render();
    });

    if (client) {
      client
        .channel("spy_game_sessions")
        .on("postgres_changes", { event: "*", schema: "public", table: "spy_game_sessions" }, async payload => {
          if (mount.hidden || !state.sessionId || payload.new?.id !== state.sessionId) return;
          await loadSession(state.sessionId);
          render();
        })
        .subscribe();
    }

    setInterval(async () => {
      if (mount.hidden || !sessionToken()) return;
      if (mount.contains(document.activeElement)) return;
      await loadLatestSession();
      render();
    }, 5000);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !confirmNewGameOpen) return;
      confirmNewGameOpen = false;
      render();
    });
  };

  initSpyGame();

  renderLucideIcons();

});
