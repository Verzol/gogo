// ============================================================
// Render everything from TRIP_DATA (see data.js) into the DOM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const data = TRIP_DATA;
  const locationData = data.locations || {};

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
            ${location.mapsUrl ? `
              <a class="maps-button" href="${escapeHTML(location.mapsUrl)}" target="_blank" rel="noopener noreferrer">
                <img class="maps-icon" src="figures/decor/google-maps.png" alt="" aria-hidden="true">
                <span>Mở trong Google Maps</span>
              </a>
            ` : ""}
          </span>
        </span>
      </span>
    `;
  };

  // ---- Nav toggle (mobile) ----
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  navLinks.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => navLinks.classList.remove("open"))
  );

  // ---- Hero ----
  document.getElementById("heroSubtitle").textContent = data.subtitle;
  document.getElementById("heroDate").textContent = data.dateRange;
  document.getElementById("heroIntro").textContent = data.intro;

  // ---- Hero Stickers (Images 1.png - 10.png) ----
  // Bố cục cố định — dồn 10 mặt người thành cụm collage ở NỬA PHẢI hero, xen kẽ
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



  // ---- Timeline (Horizontal Scrapbook Style) ----
  const daysList = document.getElementById("daysList");
  if (daysList && data.days) {
    let timelineHTML = `<div class="timeline-horizontal">`;
    
    // The horizontal track with stops
    timelineHTML += `<div class="timeline-track-container">
      <div class="timeline-track-line"></div>
      <div class="timeline-stops">
        ${data.days.map((d, index) => `
          <div class="timeline-stop ${index === 0 ? 'active' : ''}" data-day="${index}">
            <div class="stop-dot"></div>
            <div class="stop-label">Ngày ${d.day}</div>
          </div>
        `).join("")}
      </div>
    </div>`;

    // The detail panels
    timelineHTML += `<div class="timeline-details-container">
      ${data.days.map((d, index) => `
        <div class="timeline-detail-panel ${index === 0 ? 'active' : ''}" id="day-panel-${index}">
          <div class="day-card">
            <h3>${d.title}</h3>
            <div class="day-date">${d.date}</div>
            <div class="day-blocks-list">
              ${d.blocks.map(b => `
                <div class="time-row">
                  <div class="time-tag">${b.time}</div>
                  <div>
                    <div class="time-activity">${b.activity}</div>
                    ${b.note ? `<div class="time-note">${b.note}</div>` : ""}
                    ${blockLocationKeys(b).length ? `<div class="location-peeks">${blockLocationKeys(b).map(renderLocationPeek).join("")}</div>` : ""}
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
    
    stops.forEach(stop => {
      stop.addEventListener("click", () => {
        // Remove active class
        stops.forEach(s => s.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));
        
        // Add active class to clicked
        stop.classList.add("active");
        const dayIndex = stop.getAttribute("data-day");
        document.getElementById(`day-panel-${dayIndex}`).classList.add("active");
      });
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
        <div class="dest-card food-card" style="--i: ${randomRot}">
          <h3>${f.name}</h3>
          <p class="food-address">📍 ${f.address}</p>
          <p>${f.desc}</p>
          ${f.note ? `<span class="food-note">${f.note}</span>` : ""}
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
