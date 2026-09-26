(() => {
  const state = {
    gates: [],
    measures: [],
    matrix: [],
    mode: "map",
    lastTrigger: null
  };

  const marks = { 3: "◎", 2: "○", 1: "△" };
  const strengthLabels = { 3: "強く関係", 2: "関係", 1: "間接的に関係" };

  async function loadJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} の読み込みに失敗しました`);
    return response.json();
  }

  async function boot() {
    try {
      [state.gates, state.measures, state.matrix] = await Promise.all([
        loadJSON("data/gates.json"),
        loadJSON("data/measures.json"),
        loadJSON("data/matrix.json")
      ]);

      setupTabs();
      setupDrawer();
      setupInfoButtons();
      render();
    } catch (error) {
      console.error(error);
      document.getElementById("map-grid").innerHTML =
        '<p style="grid-column:1/-1;padding:30px">コンテンツを読み込めませんでした。ページを再読み込みしてください。</p>';
    }
  }

  function setupTabs() {
    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.mode;
        document.querySelectorAll("[data-mode]").forEach(tab => {
          const active = tab.dataset.mode === state.mode;
          tab.classList.toggle("active", active);
          tab.setAttribute("aria-selected", String(active));
        });
        render();
      });
    });
  }

  function render() {
    renderCaption();
    renderGrid();
    document.getElementById("legend").style.display = state.mode === "map" ? "flex" : "none";
  }

  function renderCaption() {
    const root = document.getElementById("mode-caption");
    const captions = {
      ai: "<strong>AI側の視点：</strong> Web上の情報を使うとき、AIにとって何が分かる必要があるのか。行の位置は関係マップと同じです。",
      site: "<strong>サイト側の施策：</strong> 情報発信側が整えられる5つの施策群。列の位置は関係マップと同じです。",
      map: "<strong>関係マップ：</strong> 6つのAI視点と5つのLLMO施策群の関係を俯瞰します。セルを押すと、その交点を詳しく見られます。"
    };
    root.innerHTML = captions[state.mode];
  }

  function renderGrid() {
    const root = document.getElementById("map-grid");
    root.className = `map-grid mode-${state.mode}`;

    if (state.mode === "ai") root.innerHTML = renderAIMode();
    if (state.mode === "site") root.innerHTML = renderSiteMode();
    if (state.mode === "map") root.innerHTML = renderMapMode();

    bindGridEvents();
  }

  function renderCorner() {
    return `
      <div class="grid-corner">
        <span>縦 × 横</span>
        <strong>AIの視点 × LLMO施策</strong>
      </div>
    `;
  }

  function renderColumnHeaders({ muted = false } = {}) {
    return state.measures.map((measure, index) => `
      <button
        type="button"
        class="col-head"
        style="grid-column:${index + 2};grid-row:1"
        data-measure-detail="${measure.id}"
        aria-label="${escapeAttr(measure.ja)}施策の説明を見る"
      >
        <strong>${escapeHTML(measure.ja)}</strong>
        <small>${escapeHTML(measure.label)}</small>
      </button>
    `).join("");
  }

  function renderRowHeaders() {
    return state.gates
      .slice()
      .sort((a,b) => a.order - b.order)
      .map(gate => `
        <button
          type="button"
          class="row-head"
          style="grid-column:1;grid-row:${gate.order + 1}"
          data-gate-detail="${gate.id}"
          aria-label="${escapeAttr(gate.label)}の説明を見る"
        >
          <strong>${escapeHTML(gate.label)}</strong>
          <small>${escapeHTML(gate.english)}</small>
          <span class="mini-question">${escapeHTML(gate.aiQuestion)}</span>
        </button>
      `).join("");
  }

  function renderMapMode() {
    const cells = state.gates
      .slice()
      .sort((a,b) => a.order - b.order)
      .map(gate => state.measures.map((measure, index) => {
        const item = state.matrix.find(x => x.gate === gate.id && x.measure === measure.id);
        return `
          <button
            type="button"
            class="map-cell heat-${item.strength}"
            style="grid-column:${index + 2};grid-row:${gate.order + 1}"
            data-cell-gate="${gate.id}"
            data-cell-measure="${measure.id}"
            data-tip="${escapeAttr(item.why)}"
            aria-label="${escapeAttr(gate.label)} × ${escapeAttr(measure.ja)}：${strengthLabels[item.strength]}"
          >${marks[item.strength]}</button>
        `;
      }).join("")).join("");

    return renderCorner() + renderColumnHeaders() + renderRowHeaders() + cells;
  }

  function renderAIMode() {
    const panels = state.gates
      .slice()
      .sort((a,b) => a.order - b.order)
      .map(gate => `
        <div class="ai-row-panel" style="grid-row:${gate.order + 1}">
          <div class="ai-quote">「${escapeHTML(gate.aiQuestion)}」</div>
          <p>${escapeHTML(gate.short)}</p>
          <button type="button" data-gate-detail="${gate.id}">詳しく見る →</button>
        </div>
      `).join("");

    return renderCorner() + renderColumnHeaders() + renderRowHeaders() + panels;
  }

  function renderSiteMode() {
    const panels = state.measures.map((measure, index) => `
      <article
        class="site-column-panel"
        style="grid-column:${index + 2};grid-row:2/8"
      >
        <strong>${escapeHTML(measure.purpose)}</strong>
        <p>${escapeHTML(measure.ja)}の代表例</p>
        <ul>
          ${measure.examples.slice(0,5).map(example => `<li>${escapeHTML(example)}</li>`).join("")}
        </ul>
        <button type="button" data-measure-detail="${measure.id}">詳しく見る →</button>
      </article>
    `).join("");

    return renderCorner() + renderColumnHeaders() + renderRowHeaders() + panels;
  }

  function bindGridEvents() {
    document.querySelectorAll("[data-cell-gate]").forEach(button => {
      button.addEventListener("click", () => {
        state.lastTrigger = button;
        openCellDetail(button.dataset.cellGate, button.dataset.cellMeasure);
      });
    });

    document.querySelectorAll("[data-gate-detail]").forEach(button => {
      button.addEventListener("click", () => {
        state.lastTrigger = button;
        openGateDetail(button.dataset.gateDetail);
      });
    });

    document.querySelectorAll("[data-measure-detail]").forEach(button => {
      button.addEventListener("click", () => {
        state.lastTrigger = button;
        openMeasureDetail(button.dataset.measureDetail);
      });
    });
  }

  function openCellDetail(gateId, measureId) {
    const gate = state.gates.find(x => x.id === gateId);
    const measure = state.measures.find(x => x.id === measureId);
    const item = state.matrix.find(x => x.gate === gateId && x.measure === measureId);
    if (!gate || !measure || !item) return;

    setDrawerContent(`
      <span class="drawer-kicker">${marks[item.strength]} ${strengthLabels[item.strength]} ・ ${escapeHTML(gate.english)} × ${escapeHTML(measure.label)}</span>
      <h3 class="drawer-title" id="drawer-title">${escapeHTML(gate.label)} × ${escapeHTML(measure.ja)}</h3>
      <div class="drawer-lead">AI：「${escapeHTML(gate.aiQuestion)}」</div>

      <div class="drawer-block">
        <h4>なぜこの施策が関係する？</h4>
        <p>${escapeHTML(item.why)}</p>
      </div>

      <div class="drawer-block">
        <h4>採用サイトなら</h4>
        <p>${escapeHTML(gate.recruitmentMeaning)}</p>
      </div>

      <div class="drawer-block">
        <h4>${escapeHTML(measure.ja)}施策の代表例</h4>
        <ul>${measure.examples.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>
      </div>

      <div class="drawer-block">
        <h4>良い例・惜しい例</h4>
        <div class="drawer-examples">
          <div class="drawer-example good"><strong>明確：</strong> ${escapeHTML(gate.goodExample)}</div>
          <div class="drawer-example bad"><strong>惜しい：</strong> ${escapeHTML(gate.badExample)}</div>
        </div>
      </div>

      <div class="drawer-block">
        <h4>似ている視点との違い</h4>
        <div class="drawer-contrast">
          <strong>${escapeHTML(gate.contrastTitle)}</strong>
          <p>${escapeHTML(gate.contrast)}</p>
        </div>
      </div>
    `);
    openDrawer();
  }

  function openGateDetail(gateId) {
    const gate = state.gates.find(x => x.id === gateId);
    if (!gate) return;

    setDrawerContent(`
      <span class="drawer-kicker">AIが情報を使うときの視点 ・ ${escapeHTML(gate.english)}</span>
      <h3 class="drawer-title" id="drawer-title">${escapeHTML(gate.label)}</h3>
      <div class="drawer-lead">AI：「${escapeHTML(gate.aiQuestion)}」</div>

      <div class="drawer-block">
        <h4>ひとことで</h4>
        <p>${escapeHTML(gate.short)}</p>
      </div>
      <div class="drawer-block">
        <h4>採用サイトでは</h4>
        <p>${escapeHTML(gate.recruitmentMeaning)}</p>
      </div>
      <div class="drawer-block">
        <h4>良い例・惜しい例</h4>
        <div class="drawer-examples">
          <div class="drawer-example good"><strong>明確：</strong> ${escapeHTML(gate.goodExample)}</div>
          <div class="drawer-example bad"><strong>惜しい：</strong> ${escapeHTML(gate.badExample)}</div>
        </div>
      </div>
      <div class="drawer-block">
        <h4>似ている視点との違い</h4>
        <div class="drawer-contrast">
          <strong>${escapeHTML(gate.contrastTitle)}</strong>
          <p>${escapeHTML(gate.contrast)}</p>
        </div>
      </div>
    `);
    openDrawer();
  }

  function openMeasureDetail(measureId) {
    const measure = state.measures.find(x => x.id === measureId);
    if (!measure) return;

    const related = state.matrix
      .filter(x => x.measure === measureId)
      .sort((a,b) => b.strength - a.strength)
      .map(item => {
        const gate = state.gates.find(x => x.id === item.gate);
        return `<li><strong>${marks[item.strength]} ${escapeHTML(gate.label)}</strong> — ${escapeHTML(item.why)}</li>`;
      }).join("");

    setDrawerContent(`
      <span class="drawer-kicker">サイト側のLLMO施策 ・ ${escapeHTML(measure.label)}</span>
      <h3 class="drawer-title" id="drawer-title">${escapeHTML(measure.ja)}</h3>
      <div class="drawer-lead">${escapeHTML(measure.purpose)}</div>

      <div class="drawer-block">
        <h4>代表的な施策</h4>
        <ul>${measure.examples.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>
      </div>

      <div class="drawer-block">
        <h4>6つのAI視点との関係</h4>
        <ul>${related}</ul>
      </div>
    `);
    openDrawer();
  }

  function setupInfoButtons() {
    document.querySelectorAll("[data-open-info]").forEach(button => {
      button.addEventListener("click", () => {
        state.lastTrigger = button;
        openInfo(button.dataset.openInfo);
      });
    });
  }

  function openInfo(type) {
    const templates = {
      about: `
        <span class="drawer-kicker">このページの役割</span>
        <h3 class="drawer-title" id="drawer-title">AI側の視点とLLMO施策を、一枚の地図で見る</h3>
        <div class="drawer-block">
          <p>このページはAI検索を一から説明する総合教材ではありません。AIがWeb上の情報を利用するときの視点と、情報発信側が整えられるLLMO施策の関係を俯瞰することに絞っています。</p>
        </div>
        <div class="drawer-block">
          <h4>マップの見方</h4>
          <p>「AIが見ていること」「サイト側の施策」「関係マップ」を切り替えても、6行×5列の位置関係は変わりません。同じ地図を違う角度から見る設計です。</p>
        </div>
      `,
      recruitment: `
        <span class="drawer-kicker">このマップでいう採用サイト</span>
        <h3 class="drawer-title" id="drawer-title">「求人票」より広い、働くことの情報資産</h3>
        <p>個別求人ページだけではなく、企業が仕事・職場・キャリアについてWeb上に公開する情報全体を対象にします。</p>
        <div class="drawer-block">
          <div class="info-tree">採用サイト
├ 求人情報
│  ├ 募集要項
│  └ 給与・休日・勤務地
├ 会社・職場情報
│  ├ 制度・文化
│  └ 社員・働き方
├ キャリア情報
│  ├ 職種解説
│  └ キャリアパス
└ 仕事・働き方の記事
   ├ 固定残業代とは？
   ├ 倉庫作業の選び方
   ├ 派遣で働く際のポイント
   └ 未経験職種の探し方</div>
        </div>
        <div class="drawer-block">
          <h4>なぜ記事コンテンツも含める？</h4>
          <p>「求人を探している人」だけでなく、「まず仕事について知りたい人」の情報探索にも答えられれば、求人名や会社名を知らない段階から接点を作れるためです。</p>
        </div>
      `,
      model: `
        <span class="drawer-kicker">説明モデル</span>
        <h3 class="drawer-title" id="drawer-title">6つの視点は、厳密な処理順ではありません</h3>
        <p>Findable、Understandable、Relevantなどは、AI内部の公式な6段階処理を意味しません。複雑な検索・取得・評価・生成を、情報発信側から理解しやすく整理した視点です。</p>
        <div class="drawer-block">
          <h4>◎○△について</h4>
          <p>検索各社のランキング係数や公式スコアではありません。「この施策が、この視点をどの程度直接的に支えるか」を理解するための関係マップです。</p>
        </div>
      `
    };
    setDrawerContent(templates[type] || templates.about);
    openDrawer();
  }

  function setDrawerContent(html) {
    document.getElementById("drawer-content").innerHTML = html;
  }

  function setupDrawer() {
    const drawer = document.getElementById("detail-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    const close = document.getElementById("drawer-close");

    close.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
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
    if (state.lastTrigger && typeof state.lastTrigger.focus === "function") {
      state.lastTrigger.focus();
    }
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value = "") {
    return escapeHTML(value).replaceAll("\n", " ");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();