"use strict";

const series = [
  {
    id: "zhang", title: "张宇八套卷",
    keys: ["CBADADCCAB", "ACDBDCBABD", "BBCBAADDCC", "DACBDDABAC",
      "CCDABACBBD", "BCADCCBDAB", "DCAABCBACD", "BACADACBDC"],
  },
  {
    id: "lilin", title: "李林六套卷",
    keys: ["ACDCDBADAB", "CCBBBDDABC", "CCACDBCDDD", "CBDCBCDDDB", "BDDBCCDBCC", "CCCDD-DBDA"],
  },
].map(({ id, title, keys }) => ({
  title,
  papers: keys.map((answers, i) => ({
    id: `${id}-2027-${String(keys.length).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    title, year: 2027, volume: i + 1, keys: [...answers],
  })),
}));
const practicePapers = series.flatMap(item => item.papers);
const defaultPaper = practicePapers[0];
const xiehou = {
  id: "xiehou-2027-01",
  title: "邂逅遗憾模拟卷",
  year: 2027,
  volume: 1,
};
const allPapers = [...practicePapers, xiehou];
const papersById = new Map(allPapers.map(paper => [paper.id, paper]));
const groups = [
  { id: "choice", name: "选择题", first: 1, last: 10 },
  { id: "fill", name: "填空题", first: 11, last: 16 },
  { id: "long", name: "解答题", first: 17, last: 22 },
];
const sections = [
  { id: "practice", name: "选填题精练", art: "hat.webp" },
  { id: "long", name: "大题精啃", art: "swords.webp" },
  { id: "papers", name: "套卷精刷", art: "farewell.webp" },
];
const modes = {
  choice: { name: "在线选择题", route: "practice/choice/1" },
  fill: { name: "填空题", route: "practice/fill/11" },
  long: { name: "解答题", route: "long/review/17" },
  paper: { name: "整卷", route: "papers/review/1" },
};
const routes = {
  "practice/choice": { groups: [groups[0]], mode: "choice" },
  "practice/fill": { groups: [groups[1]], mode: "fill", file: "fill" },
  "long/review": { groups: [groups[2]], mode: "long", file: "long" },
  "papers/review": { groups, mode: "paper", file: "exam" },
};

const storageKey = "mock-paper-studio.v1";
const draftEdition = 2;
const siteName = "2028RayanG数学练习题库";
const content = document.querySelector("#content");
const timerBar = document.querySelector("#timerbar");
const toast = document.querySelector("#toast");
const starCount = document.querySelector("#star-count");
let storageUnavailable = false;
let state = readState();
let toastTimer;

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    const active = saved?.active || null;
    if (active?.mode === "choice" && !active.draft) {
      active.draft = Object.fromEntries(active.answers.map(({ number, answer }) => [number, answer]));
      active.answers = [];
    }
    if (active?.paperId === "lilin-2027-06-05" && active.mode === "choice" &&
        !active.graded && active.draftEdition !== draftEdition) {
      delete active.draft[8];
      active.draftEdition = draftEdition;
    }
    return { questions: saved?.questions || {}, active, history: saved?.history || [] };
  } catch {
    return { questions: {}, active: null, history: [] };
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    storageUnavailable = true;
    return false;
  }
}

function say(message) {
  clearTimeout(toastTimer);
  toast.textContent = storageUnavailable ? message + "。浏览器存储不可用，刷新后记录可能丢失。" : message;
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 3500);
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function link(label, href, glyph, variant = "") {
  return `<a class="button ${variant}" href="${href}">${label}${icon(glyph)}</a>`;
}

function action(label, id, glyph = "", variant = "", data = "") {
  return `<button type="button" class="button ${variant}" data-action="${id}" ${data}>${glyph ? icon(glyph) : ""}${label}</button>`;
}

function pdf(paper, file, label, download = false, variant = "") {
  const names = { exam: "整卷", fill: "填空题", long: "解答题", solutions: "原版解析" };
  const filename = `${paper.year}-${paper.title}-第${paper.volume}套-${names[file]}.pdf`;
  const attributes = download ? `download="${filename}"` : 'target="_blank" rel="noopener"';
  return `<a class="button ${variant}" href="assets/${paper.id}/${file}.pdf" ${attributes}>${icon(download ? "download" : "print")}${label}</a>`;
}

function imagePath(paper, number) {
  return `assets/${paper.id}/q${String(number).padStart(2, "0")}.png`;
}

function enlarge(paper, number) {
  return `<a class="button subtle" href="${imagePath(paper, number)}" target="_blank" rel="noopener">放大题面${icon("up")}</a>`;
}

function questionKey(paper, number) {
  return `${paper.id}:${number}`;
}

function paperLabel(paper) {
  return `${paper.year} · ${paper.title} · 第 ${paper.volume} 套`;
}

function paperForMode(mode) {
  return mode === "paper" ? xiehou : defaultPaper;
}

function runPaper(run) {
  return papersById.get(run?.paperId) || paperForMode(run?.mode);
}

function activeChoices(paper) {
  const run = state.active;
  return run?.mode === "choice" && runPaper(run) === paper ? run : null;
}

function lessonHref(path, paper) {
  return "#" + path + (paper === defaultPaper || paper === xiehou ? "" : "/" + paper.id);
}

function lessonAt(path) {
  const [section, view, rawNumber, id, extra] = path.split("/");
  const route = section + "/" + view;
  if (!Object.hasOwn(routes, route) || extra !== undefined) return null;
  const lesson = routes[route];
  const paper = id ? papersById.get(id) : paperForMode(lesson.mode);
  const number = Number(rawNumber);
  if (!paper || (lesson.mode === "paper") !== (paper === xiehou) ||
      !Number.isInteger(number) || !lesson.groups.some(group => number >= group.first && number <= group.last)) return null;
  return { ...lesson, route, paper, number };
}

function info(paper, number) {
  const marks = state.questions[questionKey(paper, number)] || {};
  if (!paper.keys || number > 10 || paper.keys[number - 1] === "-") return marks;
  const run = activeChoices(paper);
  const attempt = run ? run.answers.find(entry => entry.number === number) : latestSavedAttempt(paper, number);
  return { ...marks, ...attempt };
}

function latestSavedAttempt(paper, number) {
  for (const run of state.history) {
    if (run.mode !== "choice" || runPaper(run) !== paper) continue;
    const attempt = run.answers.findLast(entry => entry.number === number);
    if (attempt) return attempt;
  }
  return null;
}

function numberList(group) {
  return Array.from({ length: group.last - group.first + 1 }, (_, offset) => group.first + offset);
}

function scorableQuestions(paper) {
  return numberList(groups[0]).filter(number => paper.keys[number - 1] !== "-");
}

function starredItems() {
  return groups.flatMap(group => allPapers.flatMap(paper => numberList(group).flatMap(number => {
    const entry = state.questions[questionKey(paper, number)] || {};
    if (!entry.star && !entry.wrong) return [];
    return [{ paper, number, type: group.id, entry, source: paperLabel(paper), image: imagePath(paper, number) }];
  })));
}

function title(name, { back, tail = "", art = "", subtitle = "" } = {}) {
  return `<header class="page-head">
    <div class="breadcrumbs"><a href="#home">首页</a><span aria-hidden="true">/</span>${back ? `<a href="#${back.id}">${back.name}</a><span aria-hidden="true">/</span>` : ""}<span aria-current="page">${name}</span></div>
    <div class="page-head-flex">
      <div><h1>${name}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
      ${tail || (art ? `<img class="page-art" src="assets/art/${art}" width="66" height="66" alt="">` : "")}
    </div>
  </header>`;
}

function home() {
  return `<section class="hero" aria-labelledby="main-title">
    <div>
      <h1 id="main-title" aria-label="${siteName}"><span class="title-latin" lang="en">2028RayanG</span><span class="title-han">数学练习题库</span></h1>
      <div class="hero-actions">
        ${state.active ? link("继续刷题", "#" + (state.active.route || modes[state.active.mode].route), "arrow", "primary") : action("开始刷题", "start", "arrow", "primary", 'data-mode="choice"')}
        ${link("做题记录", "#history", "up", "subtle")}
      </div>
    </div>
    <figure class="poster"><div class="poster-frame"><img class="poster-art" src="assets/art/merry.webp" width="1536" height="1024" fetchpriority="high" alt="月光下的蓝色海浪和远航帆船"></div></figure>
  </section>
  <section aria-labelledby="catalog-title">
    <div class="index-head"><h2 id="catalog-title">练习目录</h2></div>
    <div class="index-grid">${sections.map(section => `
      <a class="index-card" href="#${section.id}">
        <img class="index-art" src="assets/art/${section.art}" alt="" width="52" height="52">
        <h3>${section.name}</h3><span class="index-arrow">${icon("up")}</span>
      </a>`).join("")}</div>
  </section>`;
}

function catalogRow(paper, controls) {
  return `<article class="catalog-row"><span class="volume-index" aria-hidden="true">${String(paper.volume).padStart(2, "0")}</span>
    <h3>第 ${paper.volume} 套</h3><div class="row-actions">${controls}</div></article>`;
}

function catalog(section) {
  const collections = section.id === "papers" ? [{ title: xiehou.title, papers: [xiehou] }] : series;
  const solutions = paper => pdf(paper, "solutions", "下载原版解析", true);
  const controls = paper => {
    if (section.id === "practice") {
      return link("选择题在线刷", lessonHref(modes.choice.route, paper), "arrow", "primary") +
        pdf(paper, "fill", "填空题 PDF") + link("填空题号", lessonHref(modes.fill.route, paper), "grid") + solutions(paper);
    }
    if (section.id === "long") {
      return pdf(paper, "long", "打开打印版", false, "primary") +
        link("题号与计时", lessonHref(modes.long.route, paper), "grid") + solutions(paper);
    }
    return pdf(paper, "exam", "打开整卷 PDF", false, "primary") +
      link("题号与计时", lessonHref(modes.paper.route, paper), "grid") + solutions(paper);
  };
  return `${title(section.name, { art: section.art })}
    <div class="catalog">${collections.map(collection => `<section class="catalog-series">
      <div class="panel-head"><h2>${collection.papers[0].year} · ${collection.title}</h2></div>
      ${collection.papers.map(paper => catalogRow(paper, controls(paper))).join("")}
    </section>`).join("")}</div>`;
}

function starControl(paper, number) {
  const entry = info(paper, number);
  if (entry.wrong) {
    return `<span class="star-locked">${icon("star")}错题已自动标星</span>`;
  }
  return action(entry.star ? "已标星" : "标星", "star", "star", "star-toggle",
    `aria-pressed="${Boolean(entry.star)}" data-paper="${paper.id}" data-number="${number}"`);
}

function questionRail(lesson, route, current) {
  const paper = lesson.paper;
  const run = lesson.mode === "choice" ? activeChoices(paper) : null;
  const draft = run && !run.graded ? run.draft : null;
  const valid = lesson.mode === "choice" ? scorableQuestions(paper) : [];
  const answered = valid.filter(number => draft ? draft[number] : info(paper, number).answer).length;
  return `<aside class="rail" aria-label="题号导航">${lesson.groups.map(group => `<section>
    <h3>${group.name}</h3>
    ${lesson.mode === "choice" ? `<p>已答 ${answered} / ${valid.length}</p>` : ""}
    <div class="tiles">${numberList(group).map(number => {
      const entry = info(paper, number);
      const key = paper.keys?.[number - 1];
      let status = "";
      if (key === "-") status = "invalid";
      else if (draft?.[number] || (entry.answer && entry.correct !== key.includes(entry.answer))) status = "answered";
      else if (entry.answer) status = entry.correct ? "right" : "wrong";
      const mark = entry.star || entry.wrong;
      const labels = { right: "，答对", wrong: "，答错", answered: "，已答", invalid: "，错题，不计分" };
      const label = `第 ${number} 题${labels[status] || ""}${mark ? "，已标星" : ""}`;
      return `<a class="tile ${status}" href="${lessonHref(route + "/" + number, paper)}" aria-label="${label}"${current === number ? ' aria-current="true"' : ""}>${number}${mark ? '<span class="tile-star" aria-hidden="true">★</span>' : ""}</a>`;
    }).join("")}</div>
    ${draft ? action("交卷出分", "grade", "check", "primary grade-button", answered === valid.length ? "" : "disabled") : ""}
  </section>`).join("")}</aside>`;
}

function answerPanel(paper, number) {
  const key = paper.keys[number - 1];
  const run = activeChoices(paper);
  const startButton = !state.active
    ? action("开始刷题", "start", "arrow", "primary", `data-mode="choice" data-paper="${paper.id}"`)
    : "";
  if (key === "-") return `<div class="feedback bad">错题 · 不计分</div>${startButton ? `<div class="lesson-footer">${startButton}</div>` : ""}`;
  const entry = info(paper, number);
  if (entry.answer) {
    const correct = key.includes(entry.answer);
    if (entry.correct !== correct) {
      return `<div class="feedback">旧版题面 · 上次选 ${entry.answer}</div>${startButton ? `<div class="lesson-footer">${startButton}</div>` : ""}`;
    }
    const accepted = [...key].join(" 或 ");
    return `<div class="feedback ${correct ? "good" : "bad"}" role="status">${icon(correct ? "check" : "alert")}
      ${correct ? `答对了 · ${entry.answer}${key.length > 1 ? `（${accepted} 均可）` : ""}` : `你选了 ${entry.answer}，正确答案是 ${accepted}。已自动标星。`}
    </div><div class="lesson-footer">
      ${startButton}
      ${entry.wrong && correct ? action("订正完成，移出错题", "clear-wrong", "check", "subtle", `data-number="${number}" data-paper="${paper.id}"`) : ""}
    </div>`;
  }
  if (startButton) return `<div class="lesson-footer">${startButton}</div>`;
  if (!run) {
    return `<div class="lesson-footer">${link("返回正在计时的练习", "#" + (state.active.route || modes[state.active.mode].route), "back")}</div>`;
  }
  if (!run.since) return '<div class="feedback">继续计时后可作答</div>';
  return `<div class="answers" role="group" aria-label="选择答案">${[..."ABCD"].map(answer => `
    <button type="button" class="answer" data-action="select" data-answer="${answer}" data-number="${number}" data-paper="${paper.id}" aria-pressed="${run.draft[number] === answer}">${answer}</button>`).join("")}</div>`;
}

function scorePanel(run) {
  const correct = run.answers.filter(entry => entry.correct).length;
  return `<div class="score-panel" tabindex="-1" role="status">
    <strong>得分 ${correct * 5} / ${run.answers.length * 5}</strong>
    <span>答对 ${correct} · 答错 ${run.answers.length - correct}</span>
  </div>`;
}

function lessonPage(route, lesson, number) {
  const paper = lesson.paper;
  const section = sections.find(item => item.id === route.split("/")[0]);
  const list = lesson.groups.flatMap(numberList);
  const index = list.indexOf(number);
  const online = lesson.mode === "choice";
  const run = online ? activeChoices(paper) : null;
  const mode = modes[lesson.mode];
  const controls = `<div class="actions">${lesson.file ? pdf(paper, lesson.file, "打开打印版", false, "primary") : ""}
    ${pdf(paper, "solutions", "下载原版解析", true)}
    ${!online && !state.active ? action("开始刷题", "start", "arrow", "", `data-mode="${lesson.mode}" data-paper="${paper.id}"`) : ""}</div>`;
  return `${title(online ? "在线选择题" : mode.name + " · 题号索引", {
    back: section, tail: controls, subtitle: paperLabel(paper)
  })}
    <section class="lesson"><div class="lesson-grid">
      <article class="workspace" aria-labelledby="question-title">
        ${run?.graded ? scorePanel(run) : ""}
        <div class="workspace-head"><h2 id="question-title">第 ${number} 题</h2><div class="actions">${enlarge(paper, number)}${starControl(paper, number)}</div></div>
        <img class="question-image" src="${imagePath(paper, number)}" alt="${paper.title}第 ${paper.volume} 套第 ${number} 题题面">
        ${online ? answerPanel(paper, number) : ""}
        <nav class="lesson-footer" aria-label="翻题">
          ${index > 0 ? link("上一题", lessonHref(route + "/" + list[index - 1], paper), "back", "subtle") : '<span></span>'}
          ${index + 1 < list.length ? link("下一题", lessonHref(route + "/" + list[index + 1], paper), "arrow") : link("返回栏目", "#" + section.id, "arrow")}
        </nav>
      </article>${questionRail(lesson, route, number)}
    </div></section>`;
}

function starPage() {
  const items = starredItems();
  const print = items.length ? action("打印标星合集", "print", "print", "primary") : "";
  const lists = groups.map(group => {
    const matches = items.filter(item => item.type === group.id);
    if (!matches.length) return "";
    return `<section class="star-group"><h2>${group.name} · ${matches.length} 题</h2>${matches.map(({ paper, number, entry, source, image }) =>
      `<details class="star-item"><summary>${source} · 第 ${number} 题<span class="tag">${entry.wrong ? "错题" : "手动标星"}</span></summary>
      <div class="star-detail"><img loading="lazy" class="question-image" src="${image}" alt="第 ${number} 题题面">
      <div class="actions">${enlarge(paper, number)}${starControl(paper, number)}
      ${entry.wrong ? link("返回这道题", lessonHref("practice/choice/" + number, paper), "arrow") : ""}</div></div>
      </details>`).join("")}</section>`;
  }).join("");
  return `${title("我的标星", { tail: print })}
    <div class="stars-view">${lists || `<div class="empty"><h2>暂无标星题</h2>${link("去刷题", "#practice/choice/1", "arrow", "primary")}</div>`}</div>`;
}

function elapsed(run) {
  return run.elapsed + (run.since ? Math.max(0, Date.now() - run.since) : 0);
}

function timeText(ms) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(part => String(part).padStart(2, "0")).join(":");
}

function historyPage() {
  const progress = practicePapers.map(paper => {
    const valid = scorableQuestions(paper);
    const answered = valid.map(number => latestSavedAttempt(paper, number)).filter(Boolean);
    if (!answered.length) return "";
    const correct = answered.filter(entry => entry.correct).length;
    return `<section class="history-paper"><h3>${paperLabel(paper)}</h3>
      <p class="progress-summary">已完成 <strong>${answered.length} / ${valid.length}</strong> · 答对 <strong>${correct}</strong> · 答错 <strong>${answered.length - correct}</strong></p>
      <div class="history-tiles">${answered.map(({ number, answer, correct }) => link(`第 ${number} 题 · ${answer}`,
        lessonHref("practice/choice/" + number, paper), correct ? "check" : "alert")).join("")}</div></section>`;
  }).join("");
  const dateFormat = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${title("做题记录", {
    tail: link("选填题精练", "#practice", "arrow")
  })}
    <div class="catalog">
      <div class="panel-head"><h2>选择题进度</h2></div>
      ${progress || '<p class="progress-summary">暂无作答记录</p>'}
      <div class="panel-head session-head"><h2>刷题计时</h2><span>${state.history.length} 次已结束</span></div>
      ${state.history.length ? `<ol class="history-list">${state.history.map(run => {
        const paper = runPaper(run);
        const right = run.answers.filter(entry => entry.correct).length;
        const hasAnswers = run.answers.length > 0;
        const results = run.graded ? ` · 得分 ${right * 5} / ${run.answers.length * 5}` : "";
        const summary = `<div><strong>${paperLabel(paper)} · ${modes[run.mode].name}</strong><small>${dateFormat.format(run.start)}${results}${hasAnswers ? ` · 答对 ${right} · 答错 ${run.answers.length - right}` : ""}</small></div>
          <span class="history-summary-time"><time datetime="PT${Math.floor(run.elapsed / 1000)}S">${timeText(run.elapsed)}</time>${hasAnswers ? icon("arrow") : ""}</span>`;
        const details = hasAnswers ? `<details><summary class="history-summary">${summary}</summary>
          <div class="history-tiles">${run.answers.map(entry => link(`第 ${entry.number} 题 · ${entry.answer} · ${entry.correct ? "答对" : "答错"}`, lessonHref("practice/choice/" + entry.number, paper), entry.correct ? "check" : "alert")).join("")}</div>
          </details>` : `<div class="history-summary">${summary}</div>`;
        return `<li><div class="history-run">${details}</div>${action("删除", "delete-run", "delete", "subtle remove", `data-run="${run.start}" aria-label="删除 ${dateFormat.format(run.start)} 的刷题记录"`)}</li>`;
      }).join("")}</ol>` : '<p class="progress-summary">暂无计时记录</p>'}
    </div>`;
}

function showTimer() {
  const run = state.active;
  timerBar.hidden = !run;
  if (!run) {
    timerBar.innerHTML = "";
    return;
  }
  timerBar.innerHTML = `<div class="timer-time"><span class="timer-dot${run.since ? "" : " paused"}"></span>
    <span>${run.graded ? "已交卷" : run.since ? "刷题计时中" : "计时已暂停"}</span><time id="elapsed" aria-label="已用时间">${timeText(elapsed(run))}</time></div>
    <div class="actions">${run.graded ? "" : action(run.since ? "暂停" : "继续计时", "pause")}
    ${action("退出不保存", "discard", "", "subtle")}
    ${run.mode !== "choice" || run.graded ? action("结束并保存", "finish", "check", "primary") : ""}</div>`;
}

function render({ navigation = false } = {}) {
  const path = location.hash.slice(1);
  const parts = path.split("/");
  const section = sections.find(item => item.id === parts[0]);
  const lesson = lessonAt(path);
  let pageTitle = siteName;
  if (lesson) {
    if (navigation && state.active?.mode === lesson.mode && runPaper(state.active) === lesson.paper && state.active.route !== path) {
      state.active.route = path;
      save();
    }
    content.innerHTML = lessonPage(lesson.route, lesson, lesson.number);
    pageTitle = `第 ${lesson.number} 题 · ${lesson.paper.title}第 ${lesson.paper.volume} 套`;
  } else if (section) {
    content.innerHTML = catalog(section);
    pageTitle = section.name;
  } else if (path === "stars") {
    content.innerHTML = starPage();
    pageTitle = "我的标星";
  } else if (path === "history") {
    content.innerHTML = historyPage();
    pageTitle = "做题记录";
  } else {
    content.innerHTML = home();
  }
  document.title = pageTitle === siteName ? siteName : `${pageTitle} · ${siteName}`;
  document.querySelectorAll("[data-nav]").forEach(nav => {
    if (nav.dataset.nav === parts[0]) nav.setAttribute("aria-current", "page");
    else nav.removeAttribute("aria-current");
  });
  starCount.textContent = starredItems().length;
  showTimer();
  if (navigation) {
    scrollTo(0, 0);
    content.focus({ preventScroll: true });
  }
}

function start(mode, paperId) {
  if (state.active) return;
  const paper = papersById.get(paperId) || paperForMode(mode);
  const now = Date.now();
  const current = location.hash.slice(1);
  const lesson = lessonAt(current);
  const route = lesson?.mode === mode && lesson.paper === paper ? current : lessonHref(modes[mode].route, paper).slice(1);
  state.active = { mode, paperId: paper.id, route, start: now, since: now, elapsed: 0, answers: [], draft: {}, draftEdition };
  save();
  say("刷题计时已开始");
  if (route === current) render();
  else location.hash = route;
}

function toggleTimer() {
  const run = state.active;
  if (!run || run.graded) return;
  if (run.since) {
    run.elapsed = elapsed(run);
    run.since = null;
  } else {
    run.since = Date.now();
  }
  save();
  render();
  timerBar.querySelector('[data-action="pause"]').focus();
}

function finish() {
  const run = state.active;
  if (!run || (run.mode === "choice" && !run.graded)) return;
  const { draft, ...record } = run;
  state.history.unshift({ ...record, elapsed: elapsed(run), since: null, end: Date.now() });
  state.active = null;
  save();
  say("本次刷题已保存");
  if (location.hash === "#history") render();
  else location.hash = "history";
}

function discard() {
  if (!state.active || !window.confirm("退出本次刷题并放弃做题记录？")) return;
  state.active = null;
  save();
  render();
  say("已退出，本次记录未保存");
}

function deleteRun(start) {
  if (!window.confirm("删除这条做题记录？")) return;
  state.history = state.history.filter(run => run.start !== start);
  save();
  render();
  say("做题记录已删除");
}

function toggleStar(id, number, trigger) {
  const paper = papersById.get(id);
  if (!paper) return;
  const key = questionKey(paper, number);
  const entry = { ...state.questions[key] };
  if (entry.wrong) return;
  entry.star = !entry.star;
  state.questions[key] = entry;
  save();
  if (location.hash === "#stars") render();
  else {
    trigger.outerHTML = starControl(paper, number);
    document.querySelector('.workspace [data-action="star"]').focus();
    const tile = document.querySelector('.tiles [aria-current="true"]');
    if (tile) {
      tile.querySelector(".tile-star")?.remove();
      if (entry.star) tile.insertAdjacentHTML("beforeend", '<span class="tile-star" aria-hidden="true">★</span>');
      const label = tile.getAttribute("aria-label").replace("，已标星", "");
      tile.setAttribute("aria-label", entry.star ? label + "，已标星" : label);
    }
    starCount.textContent = starredItems().length;
  }
  say(entry.star ? "已加入标星题" : "已取消标星");
}

function selectAnswer(id, number, answer) {
  const paper = papersById.get(id);
  const run = activeChoices(paper);
  if (!run?.since || run.graded || !scorableQuestions(paper).includes(number) || !["A", "B", "C", "D"].includes(answer)) return;
  run.draft[number] = answer;
  save();
  render();
  content.querySelector(`.answer[data-answer="${answer}"]`)?.focus({ preventScroll: true });
}

function gradeChoices() {
  const run = state.active;
  if (run?.mode !== "choice" || run.graded) return;
  const paper = runPaper(run);
  const numbers = scorableQuestions(paper);
  if (numbers.some(number => !run.draft[number])) return;
  run.answers = numbers.map(number => {
    const answer = run.draft[number];
    const correct = paper.keys[number - 1].includes(answer);
    if (!correct) {
      const key = questionKey(paper, number);
      state.questions[key] = { ...state.questions[key], wrong: true };
    }
    return { number, answer, correct };
  });
  run.elapsed = elapsed(run);
  run.since = null;
  run.graded = true;
  save();
  render();
  content.querySelector(".score-panel")?.focus();
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const { action: name, mode, answer, paper } = trigger.dataset;
  const number = Number(trigger.dataset.number);
  switch (name) {
    case "start": start(mode, paper); break;
    case "pause": toggleTimer(); break;
    case "finish": finish(); break;
    case "discard": discard(); break;
    case "delete-run": deleteRun(Number(trigger.dataset.run)); break;
    case "star": toggleStar(paper, number, trigger); break;
    case "select": selectAnswer(paper, number, answer); break;
    case "grade": gradeChoices(); break;
    case "clear-wrong": {
      const item = papersById.get(paper);
      const mark = item && state.questions[questionKey(item, number)];
      if (!mark) break;
      mark.wrong = false;
      save();
      render();
      say("订正完成，已移出错题记录");
      break;
    }
    case "print":
      if (!window.printStarred(starredItems())) say("请允许此网站打开打印预览窗口");
      break;
  }
});

document.querySelector(".skip").addEventListener("click", event => {
  event.preventDefault();
  content.focus();
});
window.addEventListener("hashchange", () => {
  render({ navigation: true });
});
window.addEventListener("storage", event => {
  if (event.key === storageKey || event.key === null) {
    state = readState();
    render();
  }
});
setInterval(() => {
  const clock = document.querySelector("#elapsed");
  if (clock && state.active?.since) clock.textContent = timeText(elapsed(state.active));
}, 250);

render();
