// ============================================================
// Render everything from TRIP_DATA (see data.js) into the DOM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const data = TRIP_DATA;

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
  // Bố cục cố định (không random vị trí) — chia làm 2 dải viền trái/phải quanh
  // content box, tránh đè lên cổng thành + không lấn vào vùng chữ.
  const heroStickers = document.getElementById("heroStickers");
  if (heroStickers) {
    const positions = [
      // Dải trái, bám theo mái cổng thành, from nhỏ (xa) -> to (gần)
      { top: '10%',  left: '4%',  scale: 0.55, z: 8,  shadow: 0.12 },
      { top: '24%',  left: '11%', scale: 0.68, z: 9,  shadow: 0.16 },
      { top: '40%',  left: '3%',  scale: 0.8,  z: 10, shadow: 0.2  },
      { top: '56%',  left: '10%', scale: 0.95, z: 12, shadow: 0.26 },
      { top: '74%',  left: '2%',  scale: 1.05, z: 14, shadow: 0.3  },

      // Dải phải, quanh khinh khí cầu + hoa sen, tránh đè hero-content-box
      { top: '6%',   left: '86%', scale: 0.55, z: 8,  shadow: 0.12 },
      { top: '20%',  left: '92%', scale: 0.7,  z: 9,  shadow: 0.16 },
      { top: '58%',  left: '94%', scale: 0.85, z: 10, shadow: 0.2  },
      { top: '76%',  left: '88%', scale: 1.0,  z: 13, shadow: 0.28 },
      { top: '90%',  left: '95%', scale: 0.9,  z: 12, shadow: 0.24 }
    ];

    const stickersArray = Array.from({ length: 10 }, (_, i) => `figures/${i + 1}.png`);

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
            <img src="figures/${i + 1}.png" alt="${m.name}">
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
        <div class="dest-card" style="--i: ${randomRot}">
          <h3>${f.name}</h3>
          <p style="font-size:0.85rem; color:var(--ink-soft); margin-bottom:8px;">📍 ${f.address}</p>
          <p>${f.desc}</p>
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