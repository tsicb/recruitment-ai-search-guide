(() => {
  const state = { gates: [], measures: [], matrix: [], glossary: [] };

  const strengthMark = { 3: "◎", 2: "○", 1: "△" };
  const strengthLabel = { 3: "強く関係", 2: "関係", 1: "間接的に関係" };

  async function loadJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} の読み込みに失敗しました`);
    return response.json();
  }

  async function boot() {
    try {
      const [gates, measures, matrix, glossary] = await Promise.all([
        loadJSON("data/gates.json"),
        loadJSON("data/measures.json"),
        loadJSON("data/matrix.json"),
        loadJSON("data/glossary.json")
      ]);

      state.gates = gates;
      state.measures = measures;
      state.matrix = matrix;
      state.glossary = glossary;

      renderGates();
      renderMeasures();
      renderMatrix();
      renderGlossary();
      setupNavigation();
      setupDrawer();
      setupMobileMenu();
    } catch (error) {
      console.error(error);
      document.querySelectorAll("#gates-grid, #measures-grid, #matrix-container, #glossary-grid")
        .forEach(el => el.innerHTML = '<p class="load-error">コンテンツを読み込めませんでした。ページを再読み込みしてください。</p>');
    }
  }

  function renderGates() {
    const root = document.getElementById("gates-grid");
    root.innerHTML = state.gates
      .slice()
      .sort((a,b) => a.order - b.order)
      .map(gate => `
        <article class="gate-card">
          <span class="gate-number">${gate.order}</span>
          <span class="gate-en">${escapeHTML(gate.english)}</span>
          <h3>${escapeHTML(gate.label)}</h3>
          <p class="gate-question">AIがここで知りたいこと</p>
          <p>${escapeHTML(gate.aiQuestion)}</p>
          <p>${escapeHTML(gate.short)}</p>
        </article>
      `).join("");
  }

  function renderMeasures() {
    const root = document.getElementById("measures-grid");
    root.innerHTML = state.measures.map(measure => `
      <article class="measure-card">
        <strong>${escapeHTML(measure.ja)}</strong>
        <span class="gate-en">${escapeHTML(measure.label)}</span>
        <p>${escapeHTML(measure.purpose)}</p>
        <small>例：${escapeHTML(measure.examples)}</small>
      </article>
    `).join("");
  }

  function renderMatrix() {
    const root = document.getElementById("matrix-container");

    const header = state.measures.map(measure =>
      `<th scope="col"><span>${escapeHTML(measure.ja)}</span><br><small>${escapeHTML(measure.label)}</small></th>`
    ).join("");

    const rows = state.gates
      .slice()
      .sort((a,b) => a.order - b.order)
      .map(gate => {
        const cells = state.measures.map(measure => {
          const item = state.matrix.find(x => x.gate === gate.id && x.measure === measure.id);
          if (!item) return "<td>－</td>";

          const mark = strengthMark[item.strength] || "－";
          return `
            <td>
              <button
                class="heat-button heat-${item.strength}"
                type="button"
                data-gate="${gate.id}"
                data-measure="${measure.id}"
                title="${escapeAttribute(item.why)}"
                aria-label="${escapeAttribute(gate.label)} × ${escapeAttribute(measure.ja)}：${strengthLabel[item.strength]}"
              >${mark}</button>
            </td>
          `;
        }).join("");

        return `
          <tr>
            <th class="row-head" scope="row">
              <strong>${gate.order}. ${escapeHTML(gate.label)}</strong><br>
              <small>${escapeHTML(gate.english)}</small>
            </th>
            ${cells}
          </tr>
        `;
      }).join("");

    root.innerHTML = `
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="row-head" scope="col">AI側の関門</th>
            ${header}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    root.querySelectorAll(".heat-button").forEach(button => {
      button.addEventListener("click", () => openMatrixDetail(button.dataset.gate, button.dataset.measure));
    });
  }

  function openMatrixDetail(gateId, measureId) {
    const gate = state.gates.find(x => x.id === gateId);
    const measure = state.measures.find(x => x.id === measureId);
    const item = state.matrix.find(x => x.gate === gateId && x.measure === measureId);
    if (!gate || !measure || !item) return;

    const content = document.getElementById("drawer-content");
    content.innerHTML = `
      <span class="drawer-kicker">${strengthMark[item.strength]} ${strengthLabel[item.strength]}</span>
      <h3 class="drawer-title" id="drawer-title">${escapeHTML(gate.label)} × ${escapeHTML(measure.ja)}</h3>

      <div class="drawer-block">
        <h4>AIがここで知りたいこと</h4>
        <p>${escapeHTML(gate.aiQuestion)}</p>
      </div>

      <div class="drawer-block">
        <h4>なぜこの施策が関係する？</h4>
        <p>${escapeHTML(item.why)}</p>
      </div>

      <div class="drawer-block">
        <h4>採用サイトでは？</h4>
        <p>${escapeHTML(gate.recruitmentMeaning)}</p>
      </div>

      <div class="drawer-block">
        <h4>この施策群の代表例</h4>
        <p>${escapeHTML(measure.examples)}</p>
      </div>

      <div class="drawer-block">
        <h4>良い例・惜しい例</h4>
        <div class="drawer-examples">
          <div class="drawer-example good"><strong>明確：</strong> ${escapeHTML(gate.goodExample)}</div>
          <div class="drawer-example bad"><strong>惜しい：</strong> ${escapeHTML(gate.badExample)}</div>
        </div>
      </div>

      <div class="drawer-block">
        <h4>英語ラベル</h4>
        <p>${escapeHTML(gate.english)} / ${escapeHTML(measure.label)}</p>
      </div>
    `;

    openDrawer();
  }

  function renderGlossary() {
    const root = document.getElementById("glossary-grid");
    root.innerHTML = state.glossary.map(item => `
      <article class="glossary-item">
        <h3>${escapeHTML(item.ja)} <span class="gate-en">${escapeHTML(item.term)}</span></h3>
        <p>${escapeHTML(item.desc)}</p>
      </article>
    `).join("");
  }

  function setupNavigation() {
    const navLinks = [...document.querySelectorAll(".global-nav a")];
    const sections = navLinks
      .map(link => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    }, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, .1, .25, .5]
    });

    sections.forEach(section => observer.observe(section));
  }

  function setupMobileMenu() {
    const button = document.getElementById("mobile-menu-button");
    const sidebar = document.getElementById("sidebar");

    button.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "閉じる" : "メニュー";
    });

    sidebar.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "メニュー";
      });
    });
  }

  function setupDrawer() {
    const close = document.getElementById("drawer-close");
    const backdrop = document.getElementById("drawer-backdrop");

    close.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function openDrawer() {
    const drawer = document.getElementById("detail-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    backdrop.hidden = false;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.getElementById("drawer-close").focus();
  }

  function closeDrawer() {
    const drawer = document.getElementById("detail-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value = "") {
    return escapeHTML(value).replaceAll("\n", " ");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();