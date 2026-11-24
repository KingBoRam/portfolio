(function () {
  const D = window.PORTFOLIO;
  const app = document.getElementById("app");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // ==단어== → 핑크 하이라이트, **문장** → 굵게 강조, 줄바꿈 → <br>
  const rich = (s) =>
    esc(s)
      .replace(/==(.+?)==/g, '<mark class="hl">$1</mark>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="em">$1</strong>')
      .replace(/\n/g, "<br />");
  const pad = (n) => String(n).padStart(2, "0");
  const chips = (list) => `<ul class="slots">${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;

  // 프로젝트는 서비스 단위로 묶어서 보여줌 (services가 없으면 작업 하나를 서비스 하나로)
  const SERVICES =
    D.services ||
    D.projects.map((p) => ({ slug: p.slug, name: p.title, desc: p.summary, period: p.period, works: [p.slug] }));
  const worksOf = (s) => s.works.map((slug) => D.projects.find((p) => p.slug === slug)).filter(Boolean);
  // 카드 안에서는 서비스 이름이 중복되니 작업 제목 앞의 "WattPlus " 같은 이름을 뗌
  const shortTitle = (t) => t.replace(/^Watt\w+(\s+Biz)?\s+/, "");
  // 서비스 로고: image가 없으면 이름 첫 글자 타일
  const logo = (s) =>
    s.image
      ? `<span class="svc-logo"><img src="${esc(s.image)}" alt="${esc(s.name)}" onload="this.naturalWidth > this.naturalHeight * 2 && this.classList.add('wide')" /></span>`
      : `<span class="svc-logo empty">${esc(s.name.charAt(0))}</span>`;

  const SECTIONS = [
    ["about", "ABOUT"],
    ["project", "PROJECTS"],
    ["skill", "SKILLS"],
    ["experience", "CAREER"],
  ];

  /* ───────── 왼쪽 고정 프로필 ───────── */
  function renderSide() {
    const p = D.profile;
    document.getElementById("side").innerHTML = `
      <div class="side-inner">
        <div class="player px">
          <div class="win-bar">
            <span>♥ KIM BO RAM</span>
            <span class="win-ctrl">
              <button type="button" data-win="min" aria-label="최소화">–</button>
              <button type="button" data-win="max" class="hint" aria-label="최대화" title="크게 보기">□</button>
              <button type="button" data-win="close" aria-label="닫기">×</button>
            </span>
          </div>
          <a class="player-stage" href="#/" data-section="top" aria-label="맨 위로">
            <span class="spark s1">✦</span><span class="spark s2">✧</span><span class="spark s3">✦</span>
            <img class="player-char" src="assets/avatar.png" alt="김보람 캐릭터" />
            <div class="ground"></div>
          </a>
        </div>
        <button type="button" class="win-reopen" data-win="open" hidden>▶ KIM BO RAM 다시 열기</button>

        <div class="side-profile">
          <span class="badge-pixel">${esc(p.role.toUpperCase())}</span>
          <h1>${p.headline
            .split("\n")
            .map((line, i) => `<span class="line-${i + 1}">${rich(line)}</span>`)
            .join("<br />")}</h1>
          <p class="side-intro">${esc(p.intro)}</p>
        </div>

        <dl class="side-info">
          ${(p.info || [])
            .map(
              (it) => `
            <div>
              <dt>${esc(it.label)}</dt>
              <dd>${
                it.href
                  ? `<a href="${esc(it.href)}"${it.href.startsWith("http") ? ` target="_blank" rel="noopener"` : ""}>${esc(it.value)}</a>`
                  : esc(it.value)
              }</dd>
            </div>`
            )
            .join("")}
        </dl>

        <nav class="menu" id="menu">
          ${SECTIONS.map(([id, label]) => `<a href="#/" data-section="${id}" data-id="${id}">${label}</a>`).join("")}
        </nav>
      </div>`;
  }

  // □ 최대화: 원래 카드의 아래 끝 위치를 그대로 유지하도록 무대 높이를 계산 (아래 내용이 밀리지 않게)
  function fitMaxStage(side, player) {
    const stage = player.querySelector(".player-stage");
    const bottom = player.getBoundingClientRect().bottom - side.getBoundingClientRect().top + side.scrollTop;
    const bar = player.querySelector(".win-bar").offsetHeight;
    side.style.setProperty("--max-stage", Math.max(bottom - bar - 1, stage.offsetHeight) + "px");
  }

  window.addEventListener("resize", () => {
    const side = document.getElementById("side");
    if (!side.classList.contains("is-max")) return;
    side.classList.remove("is-max");
    fitMaxStage(side, side.querySelector(".player"));
    side.classList.add("is-max");
  });

  // 레이아웃은 바로 최종 상태로 바꾸고, 화면에는 원래 카드 영역에서 바깥으로 펼쳐지듯 보여줌 (clip-path)
  const insetBetween = (inner, outer) =>
    `inset(${inner.top - outer.top}px ${outer.right - inner.right}px ${outer.bottom - inner.bottom}px ${inner.left - outer.left}px)`;
  const WIN_ANIM = { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" };
  const BG_RATIO = 1278 / 1231; // stage-bg.png 세로/가로
  const BG_Y = 0.82; // CSS background-position 세로 82%와 동일

  // 무대(target) 안에서, rect 크기의 무대일 때와 똑같이 보이도록 배경 크기·위치를 px로 계산
  function bgFrame(rect, target) {
    const w = rect.width;
    const y = rect.top - target.top + (rect.height - w * BG_RATIO) * BG_Y;
    return { backgroundSize: `${w}px auto`, backgroundPosition: `${rect.left - target.left}px ${y}px` };
  }

  // 창(clip)과 배경 그림을 from → to 무대 크기로 함께 움직임
  function animateWindow(player, stage, fromPlayer, toPlayer, fromStage, toStage, box, boxStage) {
    const clip = (r) => (r === box ? "inset(0px 0px 0px 0px)" : insetBetween(r, box));
    const opts = { ...WIN_ANIM, fill: "forwards" };
    const a = player.animate([{ clipPath: clip(fromPlayer) }, { clipPath: clip(toPlayer) }], opts);
    stage.animate([bgFrame(fromStage, boxStage), bgFrame(toStage, boxStage)], opts);
    // 타이틀바도 창 가장자리를 따라 위치·폭이 함께 바뀌게 (끝에 툭 나타나지 않도록)
    const bar = player.querySelector(".win-bar");
    const barFrame = (r) => ({ transform: `translate(${r.left - box.left}px, ${r.top - box.top}px)`, width: `${r.width}px` });
    bar.animate([barFrame(fromPlayer), barFrame(toPlayer)], opts);
    return a;
  }

  function maximizeWindow(side, player, btn) {
    const stage = player.querySelector(".player-stage");
    const ref = side.querySelector(".side-profile");
    const before = ref.getBoundingClientRect().top;
    const from = player.getBoundingClientRect();
    const fromStage = stage.getBoundingClientRect();
    fitMaxStage(side, player);
    side.classList.add("is-max");
    // 남은 오차(테두리 등)만큼 보정해 아래 내용이 정확히 제자리에 있게
    const diff = before - ref.getBoundingClientRect().top;
    if (diff) {
      const cur = parseFloat(side.style.getPropertyValue("--max-stage"));
      side.style.setProperty("--max-stage", cur + diff + "px");
    }
    const to = player.getBoundingClientRect();
    const toStage = stage.getBoundingClientRect();
    const a = animateWindow(player, stage, from, to, fromStage, toStage, to, toStage);
    a.onfinish = () => player.getAnimations({ subtree: true }).forEach((x) => x.cancel());
    setTimeout(() => a.onfinish?.(), WIN_ANIM.duration + 60); // 애니메이션이 멈춰 있어도 정리되도록
    btn.textContent = "❐";
  }

  function restoreWindow(side, player, btn) {
    const stage = player.querySelector(".player-stage");
    const from = player.getBoundingClientRect();
    const fromStage = stage.getBoundingClientRect();
    side.classList.remove("is-max");
    const to = player.getBoundingClientRect();
    const toStage = stage.getBoundingClientRect();
    side.classList.add("is-max");
    const a = animateWindow(player, stage, from, to, fromStage, toStage, from, fromStage);
    let done = false;
    a.onfinish = () => {
      if (done) return;
      done = true;
      side.classList.remove("is-max");
      player.getAnimations({ subtree: true }).forEach((x) => x.cancel());
      // 기본 카드 테두리는 갑자기 생기지 않고 부드럽게 나타나게
      const border = getComputedStyle(player).boxShadow;
      if (border && border !== "none") {
        player.animate([{ boxShadow: border.replace(/rgba?\([^)]*\)/g,"rgba(24, 23, 26, 0)") }, { boxShadow: border }], { duration: 220, easing: "ease-out" });
      }
    };
    setTimeout(() => a.onfinish?.(), WIN_ANIM.duration + 60); // 애니메이션이 멈춰 있어도 원래 크기로 돌아가도록
    btn.textContent = "□";
  }

  // 플레이어 창 버튼: – 접기 / □ 왼쪽 패널 위쪽을 꽉 채우기 / × 닫기
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-win]");
    if (!btn) return;
    const side = document.getElementById("side");
    const player = side.querySelector(".player");
    const reopen = side.querySelector(".win-reopen");
    const action = btn.dataset.win;
    if (action === "max") {
      btn.classList.remove("hint"); // 한 번 눌러보면 깜빡임 안내는 끄기
      if (player.classList.contains("is-min")) {
        player.classList.remove("is-min");
        player.classList.remove("anim");
      }
      if (side.classList.contains("is-max")) restoreWindow(side, player, btn);
      else maximizeWindow(side, player, btn);
    } else if (action === "min") {
      side.classList.remove("is-max");
      player.classList.add("anim");
      player.classList.toggle("is-min");
    } else if (action === "close") {
      side.classList.remove("is-max");
      player.hidden = true;
      reopen.hidden = false;
    } else if (action === "open") {
      player.classList.remove("is-min");
      player.hidden = false;
      reopen.hidden = true;
    }
    if (action !== "max") side.querySelector('[data-win="max"]').textContent = "□";
  });

  function renderFooter() {
    document.getElementById("footer").innerHTML = `
      <div class="footer-inner">
        <p class="continue">CONTACT</p>
        <p class="footer-msg">같이 일하고 싶으시다면 편하게 연락 주세요!</p>
        <div class="footer-links">
          <a class="pbtn pink" href="mailto:${esc(D.profile.email)}">메일 보내기</a>
          <a class="pbtn ghost" href="${esc(D.profile.github)}" target="_blank" rel="noopener">GitHub</a>
        </div>
        <p class="footer-copy">© ${new Date().getFullYear()} ${esc(D.profile.name)}</p>
      </div>`;
  }

  const heading = (tag, title, sub) => `
    <div class="sec-head reveal">
      <span class="sec-tag">▶ ${tag}</span>
      <h2>${title}</h2>
      ${sub ? `<p>${sub}</p>` : ""}
    </div>`;

  // 섹션 제목·설명은 data.js의 sections에서 가져옴
  const sectionHead = (tag, key) => {
    const s = (D.sections && D.sections[key]) || {};
    return heading(tag, esc(s.title || ""), s.sub ? esc(s.sub) : "");
  };

  /* ───────── 오른쪽: 홈 ───────── */
  function renderHome() {
    app.innerHTML = `
      <section id="about">
        ${sectionHead("ABOUT", "about")}
        <div class="values">
          ${D.values
            .map(
              (v, i) => `
            <div class="value px reveal">
              <div class="value-top"><span class="value-no">0${i + 1}</span></div>
              <h3>${esc(v.title)}</h3>
              <p>${esc(v.desc)}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <section id="project">
        ${sectionHead("PROJECTS", "project")}
        <div class="quests">
          ${SERVICES.map((s, i) => {
            const works = worksOf(s);
            return `
            <a class="quest svc px reveal" href="#/project/${s.slug}">
              <div class="quest-bar">
                <span>PROJECT ${pad(i + 1)}</span>
                <span>${works.length} WORK${works.length > 1 ? "S" : ""}</span>
              </div>
              <div class="quest-body">
                <div class="svc-head">
                  ${logo(s)}
                  <div>
                    <h3>${esc(s.name)}</h3>
                    <p>${esc(s.desc)}</p>
                  </div>
                </div>
                <ul class="svc-works">
                  ${works
                    .map(
                      (w) =>
                        `<li><span>${esc(shortTitle(w.title))}</span>${
                          w.metric ? `<em>${esc(w.metric.before)} → ${esc(w.metric.after)}</em>` : ""
                        }</li>`
                    )
                    .join("")}
                </ul>
                <div class="quest-foot">
                  <span>${esc(s.period)}</span>
                  <span class="more">자세히 보기 →</span>
                </div>
              </div>
            </a>`;
          }).join("")}
        </div>
      </section>

      <section id="skill">
        ${sectionHead("SKILLS", "skill")}
        <div class="px box reveal">
          ${D.skills.map((s) => `<div class="skill-row"><h4>${esc(s.group)}</h4>${chips(s.items)}</div>`).join("")}
        </div>
      </section>

      <section id="experience">
        ${sectionHead("CAREER", "experience")}
        <div class="px box career reveal">
          <span class="edu-label">CAREER</span>
          ${D.career
            .map(
              (c) => `
          <div class="career-item">
            <div class="career-head">
              <div>
                <h3>${esc(c.company)}</h3>
                <p>${esc(c.team)} · ${esc(c.desc)}</p>
              </div>
              <span class="period-tag">${esc(c.period)}</span>
            </div>
            ${(c.highlights || []).length ? `<ul class="bullets">${c.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
          </div>`
            )
            .join("")}
          ${
            (D.education || []).length
              ? `<div class="edu-part">
            <span class="edu-label">EDUCATION</span>
            ${D.education.map((e) => `<div class="edu-row"><h4>${esc(e.name)}</h4><span>${esc(e.detail)}</span></div>`).join("")}
          </div>`
              : ""
          }
        </div>
      </section>
`;
  }

  /* ───────── 오른쪽: 프로젝트(서비스) 상세 ───────── */
  // 고려한 점 / 문제 해결 카드 묶음 (목록이 비면 출력 안 함)
  function cardPart(list, num, title, tagA, tagB) {
    if (!list || !list.length) return "";
    return `<div class="work-part">
                  <h3 class="d-title reveal"><span>${num}</span>${title}</h3>
                  <div class="problems">
                    ${list
                      .map(
                        (pr) => `
                      <div class="problem px reveal">
                        <h3>${esc(pr.title)}</h3>
                        <div class="pf"><span class="tag bug">${tagA}</span><p>${rich(pr.problem)}</p></div>
                        <div class="pf"><span class="tag fix">${tagB}</span><p>${rich(pr.solution)}</p></div>
                      </div>`
                      )
                      .join("")}
                  </div>
                </div>`;
  }

  function workSection(w, i, total) {
    let no = 2; // 01 개요, 02 담당 업무 다음부터 번호
    const next = (list) => (list && list.length ? pad(++no) : "");
    return `
        <section class="work" id="work-${w.slug}">
          <div class="work-head reveal">
            ${total > 1 ? `<span class="work-no">WORK ${pad(i + 1)}</span>` : ""}
            <h2>${esc(shortTitle(w.title))}</h2>
            <p>${esc(w.summary)}</p>
            <dl class="detail-meta">
              <div><dt>PERIOD</dt><dd>${esc(w.period)}</dd></div>
              <div><dt>ROLE</dt><dd>${esc(w.role)}</dd></div>
              ${w.members ? `<div><dt>MEMBERS</dt><dd>${esc(w.members)}명</dd></div>` : ""}
            </dl>
          </div>
          ${
            w.metric
              ? `<div class="levelup px reveal">
                  <span class="lv-tag">RESULT</span>
                  <span class="lv-label">${esc(w.metric.label)}</span>
                  <div class="lv-row">
                    <span class="before">${esc(w.metric.before)}</span>
                    <span class="arrow">▶</span>
                    <span class="after">${esc(w.metric.after)}</span>
                  </div>
                </div>`
              : ""
          }
          <div class="work-part reveal">
            <h3 class="d-title"><span>01</span>개요</h3>
            <p class="prose">${rich(w.overview)}</p>
          </div>
          <div class="work-part reveal">
            <h3 class="d-title"><span>02</span>담당 업무</h3>
            <ul class="bullets">${w.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          </div>
          ${cardPart(w.considerations, next(w.considerations), "고려한 점", "WHY", "HOW")}
          ${cardPart(w.problems, next(w.problems), "문제 해결", "BUG", "FIX")}
          ${
            w.learnings.length
              ? `<div class="work-part reveal">
                  <h3 class="d-title"><span>${pad(++no)}</span>배운 점</h3>
                  <ul class="exp">${w.learnings.map((l) => `<li><span>LEARNED</span><p>${esc(l)}</p></li>`).join("")}</ul>
                </div>`
              : ""
          }
        </section>`;
  }

  // 화면을 그린 뒤 특정 작업으로 스크롤했으면 true
  function renderProject(slug) {
    let idx = SERVICES.findIndex((s) => s.slug === slug);
    let workSlug = null;
    // 예전 작업 주소(#/project/push-batch 등)로 들어오면 그 작업이 속한 서비스를 보여줌
    if (idx < 0) {
      idx = SERVICES.findIndex((s) => s.works.includes(slug));
      if (idx >= 0) workSlug = slug;
    }
    if (idx < 0) {
      app.innerHTML = `<section class="notfound"><p class="go-text">404</p><h2>페이지를 찾을 수 없어요</h2><a class="pbtn dark" href="#/">홈으로</a></section>`;
      return false;
    }
    const s = SERVICES[idx];
    const works = worksOf(s);
    const tags = s.tags || [...new Set(works.flatMap((w) => w.tags || []))];
    const prev = SERVICES[idx - 1];
    const next = SERVICES[idx + 1];

    app.innerHTML = `
      <article class="detail">
        <a class="back" href="#/" data-section="project">← 프로젝트 목록</a>

        <header class="detail-head px reveal">
          <div class="quest-bar">
            <span>PROJECT ${pad(idx + 1)}</span>
            <span>${works.length} WORK${works.length > 1 ? "S" : ""}</span>
          </div>
          <div class="detail-head-body">
            <div class="svc-head big">
              ${logo(s)}
              <div>
                <h1>${esc(s.name)}</h1>
                <p>${esc(s.desc)}</p>
              </div>
            </div>
            <dl class="detail-meta">
              <div><dt>PERIOD</dt><dd>${esc(s.period)}</dd></div>
            </dl>
            ${chips(tags)}
            ${
              works.length > 1
                ? `<ol class="work-index">${works
                    .map(
                      (w, i) =>
                        `<li><button type="button" data-work="${w.slug}"><span>${pad(i + 1)}</span>${esc(shortTitle(w.title))}</button></li>`
                    )
                    .join("")}</ol>`
                : ""
            }
          </div>
        </header>

        ${works.map((w, i) => workSection(w, i, works.length)).join("")}

        <nav class="pager">
          ${prev ? `<a class="px" href="#/project/${prev.slug}"><span>← 이전 프로젝트</span>${esc(prev.name)}</a>` : "<span></span>"}
          ${next ? `<a class="px right" href="#/project/${next.slug}"><span>다음 프로젝트 →</span>${esc(next.name)}</a>` : "<span></span>"}
        </nav>
      </article>`;

    if (!workSlug) return false;
    requestAnimationFrame(() => document.getElementById(`work-${workSlug}`)?.scrollIntoView());
    return true;
  }

  /* ───────── 스크롤 효과 ───────── */
  let revealObserver;
  function observeReveal() {
    revealObserver?.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObserver.unobserve(e.target);
          }
        }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  }

  // 현재 보고 있는 섹션을 왼쪽 메뉴에 표시
  function setActive(id) {
    document.querySelectorAll("#menu a").forEach((a) => a.classList.toggle("active", a.dataset.id === id));
  }

  let spyObserver;
  function observeSections() {
    spyObserver?.disconnect();
    const sections = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) {
      setActive("project"); // 상세 페이지에서는 PROJECTS 표시
      return;
    }
    spyObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    sections.forEach((s) => spyObserver.observe(s));
    setActive("");
  }

  /* ───────── 라우팅 ───────── */
  let pendingSection = null;

  function route() {
    const m = (location.hash || "#/").match(/^#\/project\/([\w-]+)/);
    if (m) {
      if (!renderProject(m[1])) window.scrollTo(0, 0);
    } else {
      renderHome();
      if (pendingSection) {
        document.getElementById(pendingSection)?.scrollIntoView();
        pendingSection = null;
      } else {
        window.scrollTo(0, 0);
      }
    }
    observeReveal();
    observeSections();
  }

  // 상세 페이지의 작업 목차: 해당 작업으로 스크롤
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-work]");
    if (b) document.getElementById(`work-${b.dataset.work}`)?.scrollIntoView({ behavior: "smooth" });
  });

  // 섹션 링크: 홈이면 스크롤, 상세 페이지면 홈으로 이동 후 스크롤
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-section]");
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.section;
    if (location.hash.startsWith("#/project/")) {
      pendingSection = id === "top" ? null : id;
      location.hash = "#/";
    } else if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  });

  renderSide();
  renderFooter();
  window.addEventListener("hashchange", route);
  route();
})();
