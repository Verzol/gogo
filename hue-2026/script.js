// ============================================================
// Render everything from TRIP_DATA (see data.js) into the DOM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
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

  const renderOutfitPeek = outfit => {
    if (!outfit) return "";

    const outfitItems = String(outfit)
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean);

    return `
      <span class="location-peek outfit-peek" tabindex="0">
        <span class="location-chip outfit-chip">
          <span class="outfit-icon" aria-hidden="true">👕</span>
          Dresscode
        </span>
        <span class="location-card outfit-card" role="tooltip">
          <span class="location-photo outfit-photo" aria-hidden="true">👕</span>
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
                  <span aria-hidden="true">☀️</span>
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
      0: ["☀️", "Trời quang"],
      1: ["🌤️", "Ít mây"],
      2: ["⛅", "Mây rải rác"],
      3: ["☁️", "Nhiều mây"],
      45: ["🌫️", "Sương mù"],
      48: ["🌫️", "Sương mù đóng băng"],
      51: ["🌦️", "Mưa phùn nhẹ"],
      53: ["🌦️", "Mưa phùn"],
      55: ["🌧️", "Mưa phùn dày"],
      61: ["🌧️", "Mưa nhẹ"],
      63: ["🌧️", "Mưa vừa"],
      65: ["🌧️", "Mưa to"],
      80: ["🌦️", "Mưa rào nhẹ"],
      81: ["🌧️", "Mưa rào"],
      82: ["⛈️", "Mưa rào mạnh"],
      95: ["⛈️", "Giông"],
      96: ["⛈️", "Giông kèm mưa đá"],
      99: ["⛈️", "Giông mạnh"]
    };
    return table[code] || ["🌡️", "Không rõ"];
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

    const getUserId = () => {
      const saved = localStorage.getItem("hueChatUserId");
      if (saved) return saved;
      const generated = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("hueChatUserId", generated);
      return generated;
    };

    const currentUserId = getUserId();
    const savedName = localStorage.getItem("hueChatName") || "";
    nameInput.value = savedName;
    nameForm.hidden = Boolean(savedName);
    nameToggle.hidden = !savedName;

    const cleanName = value => String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const cleanBody = value => String(value || "").trim().slice(0, 500);
    const memberAvatarByName = new Map((data.members || []).map((member, index) => [
      cleanName(member.name),
      `figures/people/${index + 1}.png`
    ]));
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

    const setOpen = open => {
      widget.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (!open) return;
      messages.scrollTop = messages.scrollHeight;
      (nameForm.hidden ? input : nameInput).focus();
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
        <button type="button" class="chat-reply-cancel" aria-label="Bỏ reply">×</button>
      `;
      input.focus();
    };

    const setConfirmOpen = open => {
      confirmDialog.hidden = !open;
      if (open) deleteConfirm.focus();
    };

    const softDeleteMessage = message => {
      const username = cleanName(localStorage.getItem("hueChatName"));
      if (!message || message.username !== username) return;
      client
        .from(table)
        .update({ body: "", reply_to_id: null, reply_to_username: null, reply_to_body: null })
        .eq("id", message.id)
        .eq("username", username)
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
        <button class="chat-reaction-add" type="button" data-reaction-bar-menu="${escapeHTML(messageId)}" aria-label="Thêm reaction">＋</button>
      `;
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
        setStatus("Mỗi tin nhắn tối đa 5 loại reaction.", "error");
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

    const renderChatAvatar = username => {
      const avatar = memberAvatarByName.get(cleanName(username));
      if (!avatar) return "";
      return `
        <img class="chat-message-avatar" src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}">
      `;
    };

    const renderMessage = message => {
      if (!message?.id || knownIds.has(message.id)) return;
      knownIds.add(message.id);

      const ownName = cleanName(localStorage.getItem("hueChatName"));
      const isDeleted = !String(message.body || "").trim();
      const item = document.createElement("article");
      item.className = "chat-message";
      if (ownName && message.username === ownName) item.classList.add("is-mine");
      if (isDeleted) item.classList.add("is-deleted");
      item.dataset.id = message.id;
      item.innerHTML = `
        ${renderChatAvatar(message.username)}
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
          ${ownName && message.username === ownName && !isDeleted ? `
            <button class="chat-delete-button" type="button" data-delete-id="${escapeHTML(message.id)}" aria-label="Xóa tin nhắn">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1M4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
              </svg>
              <span class="sr-only">Xóa</span>
            </button>
          ` : ""}
          <button class="chat-reply-button" type="button" data-reply-id="${escapeHTML(message.id)}" aria-label="Reply tin nhắn">↩</button>
          <button class="chat-react-button" type="button" data-reaction-menu="${escapeHTML(message.id)}" aria-label="React tin nhắn">＋</button>
        </div>
      `;
      messageById.set(message.id, {
        id: message.id,
        username: message.username,
        body: message.body
      });

      const shouldStick = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      messages.appendChild(item);

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
        .select("id, username, body, created_at, reply_to_id, reply_to_username, reply_to_body")
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
      const username = cleanName(nameInput.value || localStorage.getItem("hueChatName"));
      const body = cleanBody(input.value);

      if (!username) {
        setStatus("Nhập Biệt danh trước đã.", "error");
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

      const payload = { username, body };
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

    nameToggle.addEventListener("click", () => setNameFormVisible(true));
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
        if (!message || message.username !== username) return;
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
        const [icon, label] = weatherInfo(daily.weather_code[index]);
        const rainProb = daily.precipitation_probability_max[index] ?? 0;
        const rainHours = daily.precipitation_hours[index] ?? 0;
        const rainMm = Number(daily.precipitation_sum[index] ?? 0).toFixed(1);
        const wind = Math.round(daily.wind_speed_10m_max[index]);
        const gust = Math.round(daily.wind_gusts_10m_max[index]);
        const uv = Math.round(daily.uv_index_max[index] ?? 0);
        return `
          <article class="weather-day">
            <div class="weather-day-main">
              <div class="weather-day-icon">${icon}</div>
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
        const [icon, label] = weatherInfo(hourly.weather_code[index]);
        groups[date] ||= [];
        groups[date].push(`
          <div class="weather-hour-row">
            <time>${hour}</time>
            <strong>${icon} ${Math.round(hourly.temperature_2m[index])}°C</strong>
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
                    <span aria-hidden="true">☀️</span>
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
            <p class="food-address">📍 ${f.address}</p>
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
      <div class="game-card" style="--i: ${randomRot}">
        <div class="game-meta">
          <span>${g.occasion}</span>
        </div>
        <h3>${g.name}</h3>
        <p>${g.teaser}</p>
      </div>
    `;
  }).join("");


});
