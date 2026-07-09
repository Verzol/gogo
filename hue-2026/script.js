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
        <img src="figures/people/${index + 1}.png" alt="">
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
          <img src="figures/people/${index + 1}.png" alt="">
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
      ? `<img src="${escapeHTML(location.image)}" alt="${escapeHTML(location.name)}">`
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
                  <img class="maps-icon" src="figures/decor/google-maps.png" alt="" aria-hidden="true">
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
    const unread = document.getElementById("chatUnread");
    const confirmDialog = document.getElementById("chatConfirm");
    const deleteCancel = document.getElementById("chatDeleteCancel");
    const deleteConfirm = document.getElementById("chatDeleteConfirm");

    if (!widget || !toggle || !panel || !nameForm || !nameToggle || !nameInput || !status || !messages || !reactionPopover || !replyPreview || !form || !input || !unread || !confirmDialog || !deleteCancel || !deleteConfirm) return;

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
      messages.scrollTop = messages.scrollHeight;
      if (!isMobileChat()) (nameForm.hidden ? input : nameInput).focus();
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
        <img class="chat-message-avatar" src="${escapeHTML(avatar)}" alt="${escapeHTML(message.username)}">
      `;
    };

    const renderMessage = message => {
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

      const shouldStick = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      messages.appendChild(item);
      renderLucideIcons();

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
      (rows || []).reverse().forEach(renderMessage);
      await loadReactions((rows || []).map(row => row.id));
      setMessageCount(rows?.length || 0);
      setStatus(rows?.length ? "" : "Chưa có tin nào. Mở bát đi.", rows?.length ? "" : "empty");
    };

    const startRealtime = () => {
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

    window.addEventListener("hue-auth-change", event => {
      const member = event.detail;
      const displayName = member?.displayName || member?.username || "";
      if (displayName) {
        localStorage.setItem("hueChatName", displayName);
        nameInput.value = displayName;
        setNameFormVisible(false);
        if (client) loadMessages().catch(() => setStatus("Không tải lại được chat.", "error"));
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
      form.querySelector("button").disabled = true;

      const payload = { user_id: getChatAuthorId(), username, body };
      if (selectedReply) {
        payload.reply_to_id = selectedReply.id;
        payload.reply_to_username = selectedReply.username;
        payload.reply_to_body = selectedReply.body;
      }

      const { error } = await client.from(table).insert(payload);
      form.querySelector("button").disabled = false;
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
      form.querySelector("button").disabled = true;
      return;
    }

    client = window.supabase.createClient(config.url, config.anonKey);
    loadMessages()
      .then(startRealtime)
      .catch(() => setStatus("Không nối được Supabase. Kiểm tra URL, anon key và schema.", "error"));
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
        "><img src="${src}" alt="Thành viên ${i + 1}" /></div>
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
            <img src="figures/people/${i + 1}.png" alt="${m.name}">
          </div>
          <div class="crew-name">${m.name}</div>
          ${m.role ? `<div class="crew-role">${m.role}</div>` : ""}
        </div>
      `;
    }).join("");
  }



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
          <img src="figures/people/${index + 1}.png" alt="${escapeHTML(member.name)}">
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
          <img src="figures/people/${index + 1}.png" alt="${escapeHTML(member.name)}">
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
                    <img class="maps-icon" src="figures/decor/google-maps.png" alt="" aria-hidden="true">
                  </a>
                ` : ""}
                ${weatherPlaceKeys.has(place.key) ? `
                  <button class="route-weather-button" type="button" data-weather-key="${escapeHTML(place.key)}" aria-label="Xem thời tiết ${escapeHTML(place.title)}">
                    ${lucideIcon("sun")}
                  </button>
                ` : ""}
                <img src="${escapeHTML(place.image)}" alt="${escapeHTML(place.title)}">
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
        ${dest.image ? `<div class="dest-photo"><img src="${dest.image}" alt="${dest.name}"></div>` : `<div class="dest-photo placeholder"></div>`}
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
          ${f.image ? `<div class="dest-photo food-photo"><img src="${f.image}" alt="${f.name}"></div>` : `<div class="dest-photo food-photo placeholder"></div>`}
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

  const initSpyGame = () => {
    const mount = document.getElementById("spyGame");
    const grid = document.getElementById("gameGrid");
    if (!mount || !grid) return;

    const config = window.HUE_SUPABASE || {};
    const client = config.url && config.anonKey && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;
    const roleLabels = {
      host: "Quản trò",
      villager: "Dân",
      spy: "Gián điệp"
    };
    const roleHints = {
      host: "Quản lý nhiệm vụ, vai trò, trạng thái game.",
      villager: "Không có nhiệm vụ. Mục tiêu là tìm đủ 2 gián điệp.",
      spy: "Có nhiệm vụ riêng. Hoàn thành nhiệm vụ và sống sót qua vote."
    };
    const players = (data.members || []).map((member, index) => ({
      username: member.name,
      displayName: member.name,
      avatar: `figures/people/${index + 1}.png`
    }));

    let dbError = client ? "" : "Chưa cấu hình Supabase.";
    let confirmNewGameOpen = false;
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
      const currentHosts = state?.assignments
        ?.filter(item => item.role === "host")
        .map(item => item.username) || [];
      const defaultHosts = ["gtm", "linh"].filter(username => players.some(player => player.username === username));
      const hosts = new Set(currentHosts.length ? currentHosts : defaultHosts);
      const spies = new Set(randomizeSpies ? shuffle(players.map(player => player.username).filter(username => !hosts.has(username))).slice(0, 2) : []);
      return {
        sessionId,
        isDraft: randomizeSpies || !sessionId,
        status: "stopped",
        round: 1,
        tasksDone: false,
        winner: "",
        missions: state?.missions || [],
        assignments: players.map(player => ({
          username: player.username,
          role: hosts.has(player.username) ? "host" : spies.has(player.username) ? "spy" : "villager",
          alive: true
        })),
        kills: []
      };
    }

    function stateFromRows(session, dbPlayers, missions) {
      return {
        sessionId: session.id,
        isDraft: false,
        status: session.status,
        round: session.round,
        tasksDone: session.tasks_done,
        winner: session.winner || "",
        missions: missions.map(mission => ({
          id: mission.id,
          title: mission.title,
          done: mission.done,
          order: mission.mission_order
        })),
        assignments: players.map(player => {
          const row = dbPlayers.find(item => item.username === player.username);
          return {
            username: player.username,
            role: row?.role || "villager",
            alive: row?.alive ?? true
          };
        }),
        kills: []
      };
    }

    function setDbError(message) {
      dbError = message || "";
    }

    async function loadMissions() {
      if (!client) return [];
      const { data: missions, error } = await client
        .from("spy_game_missions")
        .select("*")
        .order("mission_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        setDbError("Không tải được nhiệm vụ từ database. Kiểm tra migration mới.");
        console.warn("Cannot load spy game missions:", error);
        return [];
      }
      setDbError("");
      return missions || [];
    }

    async function loadSession(sessionId) {
      if (!client || !sessionId) return false;
      const [{ data: sessions, error: sessionError }, { data: dbPlayers, error: playersError }, missions] = await Promise.all([
        client.from("spy_game_sessions").select("*").eq("id", sessionId).limit(1),
        client.from("spy_game_players").select("*").eq("session_id", sessionId),
        loadMissions()
      ]);
      if (sessionError || playersError || !sessions?.[0]) {
        setDbError("Không tải được game từ database.");
        return false;
      }
      state = stateFromRows(sessions[0], dbPlayers || [], missions);
      return true;
    }

    async function loadLatestSession() {
      if (!client) return false;
      const missions = await loadMissions();
      const { data: sessions, error } = await client
        .from("spy_game_sessions")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) {
        setDbError("Không tải được game từ database.");
        return false;
      }
      if (!sessions?.[0]) {
        state = createState("");
        state.missions = missions;
        return false;
      }
      return loadSession(sessions[0].id);
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

      const { error: missionsError } = await client
        .from("spy_game_missions")
        .update({ done: false, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (missionsError) {
        setDbError("Không reset được trạng thái nhiệm vụ.");
        console.warn("Cannot reset spy game missions:", missionsError);
        return;
      }

      const { error: cleanupError } = await client.from("spy_game_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (cleanupError) {
        setDbError("Không xóa được game cũ.");
        console.warn("Cannot delete old spy game sessions:", cleanupError);
        return;
      }

      const { data: session, error: sessionError } = await client
        .from("spy_game_sessions")
        .insert({ status: "running", round: 1, tasks_done: false, winner: null })
        .select("id")
        .single();

      if (sessionError || !session?.id) {
        setDbError("Không tạo được game mới trong database.");
        console.warn("Cannot create spy game session:", sessionError);
        return;
      }

      const { error: playersError } = await client.from("spy_game_players").insert(state.assignments.map(item => ({
        session_id: session.id,
        username: item.username,
        role: item.role,
        alive: true
      })));

      if (playersError) {
        await client.from("spy_game_sessions").delete().eq("id", session.id);
        setDbError("Không lưu được danh sách người chơi.");
        console.warn("Cannot create spy game players:", playersError);
        return;
      }

      state.sessionId = session.id;
      state.isDraft = false;
      state.status = "running";
      state.round = 1;
      state.tasksDone = false;
      state.winner = "";
      state.missions = state.missions.map(mission => ({ ...mission, done: false }));
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
      const { error } = await client
        .from("spy_game_sessions")
        .update({
          status: state.status,
          round: state.round,
          tasks_done: state.tasksDone,
          winner: state.winner || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", state.sessionId);
      if (error) {
        setDbError("Không lưu được trạng thái game.");
        console.warn("Cannot update spy game session:", error);
      }
    }

    async function persistPlayer(username) {
      if (!client || !state.sessionId) return;
      const assignment = assignmentOf(username);
      const { error } = await client
        .from("spy_game_players")
        .update({ role: assignment.role, alive: assignment.alive })
        .eq("session_id", state.sessionId)
        .eq("username", username);
      if (error) {
        setDbError("Không lưu được vai trò người chơi.");
        console.warn("Cannot update spy game player:", error);
      }
    }

    async function persistMission(mission, includeDone = true) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không lưu nhiệm vụ được.");
        return false;
      }
      const payload = { title: mission.title, mission_order: mission.order, updated_at: new Date().toISOString() };
      if (includeDone) payload.done = mission.done;
      const { error } = await client
        .from("spy_game_missions")
        .update(payload)
        .eq("id", mission.id);
      if (error) {
        setDbError("Không lưu được nhiệm vụ.");
        console.warn("Cannot update spy game mission:", error);
        return false;
      }
      return true;
    }

    async function insertMission(mission) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không thêm nhiệm vụ được.");
        return false;
      }
      const { data: inserted, error } = await client
        .from("spy_game_missions")
        .insert({
          title: mission.title,
          done: mission.done,
          mission_order: mission.order
        })
        .select("id")
        .single();
      if (error) {
        setDbError("Không thêm được nhiệm vụ.");
        console.warn("Cannot insert spy game mission:", error);
        return false;
      }
      mission.id = inserted.id;
      return true;
    }

    async function deleteMission(missionId) {
      if (!client) {
        setDbError("Chưa cấu hình Supabase nên không xóa nhiệm vụ được.");
        return false;
      }
      const { error } = await client.from("spy_game_missions").delete().eq("id", missionId);
      if (error) {
        setDbError("Không xóa được nhiệm vụ.");
        console.warn("Cannot delete spy game mission:", error);
        return false;
      }
      return true;
    }

    function currentPlayer() {
      const member = getAuthMember();
      return member?.username || players[0]?.username || "";
    }

    function assignmentOf(username = currentPlayer()) {
      return state.assignments.find(item => item.username === username) || state.assignments[0];
    }

    function isHost() {
      return assignmentOf()?.role === "host";
    }

    function playerMeta(username) {
      return players.find(player => player.username === username) || { username, displayName: username, avatar: "" };
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

    function renderPlayerView() {
      if (state.status !== "running" && !isHost()) {
        return `
          <section class="spy-panel spy-self">
            <div class="spy-paused">
              <span class="spy-kicker">Trạng thái</span>
              <h3>Đang dừng</h3>
              <p>Quản trò chưa bắt đầu game. Vai trò và trạng thái sẽ hiện khi game chạy.</p>
            </div>
            <h4>Luật chơi</h4>
            ${renderRules()}
          </section>
        `;
      }

      const assignment = assignmentOf();
      const meta = playerMeta(assignment.username);
      return `
        <section class="spy-panel spy-self">
          <div class="spy-profile">
            <img src="${escapeHTML(meta.avatar)}" alt="${escapeHTML(meta.displayName)}">
            <div>
              <span class="spy-kicker">Bạn là</span>
              <h3>${escapeHTML(roleLabels[assignment.role])}</h3>
              <p>${escapeHTML(roleHints[assignment.role])}</p>
            </div>
          </div>
          <div class="spy-status-strip">
            <span>${assignment.alive ? "Còn sống" : "Đã bị loại"}</span>
            <span>${statusText()}</span>
          </div>
          ${assignment.role === "spy" ? `
            <div class="spy-mission-card">
              <span>Nhiệm vụ gián điệp</span>
              <div class="spy-mission-list">
                ${state.missions.map(mission => `
                  <div class="spy-mission-item ${mission.done ? "is-done" : ""}">
                    <strong>${escapeHTML(mission.title)}</strong>
                    <em>${mission.done ? "Đã hoàn thành" : "Chưa hoàn thành"}</em>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ""}
          <h4>Luật chơi</h4>
          ${renderRules()}
        </section>
      `;
    }

    function renderHostView() {
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
              <h4>Người chơi</h4>
              <div class="spy-player-list">
                ${state.assignments.map(item => {
                  const meta = playerMeta(item.username);
                  const isPlayerHost = item.role === "host";
                  return `
                    <div class="spy-player-row ${!item.alive && !isPlayerHost ? "is-dead" : ""}">
                      <img src="${escapeHTML(meta.avatar)}" alt="${escapeHTML(meta.displayName)}">
                      <strong>${escapeHTML(meta.displayName)}</strong>
                      <select data-spy-role="${escapeHTML(item.username)}">
                        ${Object.entries(roleLabels).map(([value, label]) => `<option value="${value}" ${item.role === value ? "selected" : ""}>${label}</option>`).join("")}
                      </select>
                      ${isPlayerHost ? `<span class="spy-player-state">Quản trò</span>` : `<label><input type="checkbox" data-spy-alive="${escapeHTML(item.username)}" ${item.alive ? "checked" : ""}> ${item.alive ? "Sống" : "Chết"}</label>`}
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
                <label><input type="checkbox" data-spy-tasks-done ${state.tasksDone ? "checked" : ""} disabled> Gián điệp xong nhiệm vụ</label>
                <button type="button" data-spy-action="judge">${lucideIcon("scale")}Chốt kết quả</button>
              </div>
            </div>
          </div>
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
            ${isHost() ? renderHostView() : ""}
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

    grid.addEventListener("click", async event => {
      const card = event.target.closest("[data-game-key='spy-game']");
      if (!card) return;
      mount.hidden = false;
      if (!(state.sessionId && await loadSession(state.sessionId))) await loadLatestSession();
      render();
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    mount.addEventListener("click", async event => {
      if (event.target.closest("[data-spy-close]")) {
        mount.hidden = true;
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
      if (action === "judge") applyWinLogic();
      const deleteId = event.target.closest("[data-spy-task-delete]")?.dataset.spyTaskDelete;
      if (action || deleteId) {
        if (deleteId && await deleteMission(deleteId)) state.missions = state.missions.filter(task => task.id !== deleteId);
        if (action === "judge") await persistSession();
        render();
      }
    });

    mount.addEventListener("change", async event => {
      const roleName = event.target.dataset.spyRole;
      const aliveName = event.target.dataset.spyAlive;
      const taskTitleId = event.target.dataset.spyTaskTitle;
      const taskDoneId = event.target.dataset.spyTaskDone;
      if (roleName) assignmentOf(roleName).role = event.target.value;
      if (aliveName) assignmentOf(aliveName).alive = event.target.checked;
      const task = taskTitleId || taskDoneId ? state.missions.find(task => task.id === (taskTitleId || taskDoneId)) : null;
      const oldTaskTitle = task?.title || "";
      const oldTaskDone = task?.done || false;
      if (taskTitleId && task) task.title = event.target.value.trim();
      if (taskDoneId && task) task.done = event.target.checked;
      if (event.target.matches("[data-spy-round]")) state.round = Number(event.target.value);
      if (taskDoneId) state.tasksDone = state.missions.length > 0 && state.missions.every(mission => mission.done);
      applyWinLogic();
      if (roleName) await persistPlayer(roleName);
      if (aliveName) await persistPlayer(aliveName);
      if (task && !(taskDoneId && state.isDraft) && !(await persistMission(task, !state.isDraft || Boolean(taskDoneId)))) {
        task.title = oldTaskTitle;
        task.done = oldTaskDone;
      }
      if (!state.isDraft && (taskDoneId || event.target.matches("[data-spy-round]"))) await persistSession();
      render();
    });

    mount.addEventListener("submit", async event => {
      if (!event.target.matches("[data-spy-task-form]")) return;
      event.preventDefault();
      const input = event.target.elements.title;
      const title = input.value.trim();
      if (!title) return;
      const task = { id: crypto.randomUUID(), title, done: false, order: state.missions.length + 1 };
      if (await insertMission(task)) state.missions.push(task);
      render();
    });

    window.addEventListener("hue-auth-change", () => {
      if (!mount.hidden) render();
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

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !confirmNewGameOpen) return;
      confirmNewGameOpen = false;
      render();
    });
  };

  initSpyGame();

  renderLucideIcons();

});
