"use strict";

const zhang = {
  id: "zhang-2027-08-01",
  title: "张宇八套卷",
  keys: "CBADADCCAB",
};
const xiehou = {
  id: "xiehou-2027-01",
  title: "邂逅遗憾模拟卷",
};
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
  "practice/choice": { paper: zhang, groups: [groups[0]], mode: "choice" },
  "practice/fill": { paper: zhang, groups: [groups[1]], mode: "fill", file: "fill" },
  "long/review": { paper: zhang, groups: [groups[2]], mode: "long", file: "long" },
  "papers/review": { paper: xiehou, groups, mode: "paper", file: "exam" },
};

const storageKey = "mock-paper-studio.v1";
const siteName = "2028RayanG数学练习题库";
const content = document.querySelector("#content");
const timerBar = document.querySelector("#timerbar");
const toast = document.querySelector("#toast");
const starCount = document.querySelector("#star-count");
let storageUnavailable = false;
let state = readState();
let selectedAnswer = "";
let retrying = false;
let toastTimer;

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return { questions: saved?.questions || {}, active: saved?.active || null, history: saved?.history || [] };
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
  const filename = `2027-${paper.title}-第1套-${names[file]}.pdf`;
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

function info(paper, number) {
  const marks = state.questions[questionKey(paper, number)] || {};
  if (paper !== zhang || number > 10) return marks;
  const pending = state.active?.answers.findLast(entry => entry.number === number);
  return { ...marks, answer: pending?.answer ?? latestSavedAnswer(number) };
}

function latestSavedAnswer(number) {
  for (const run of state.history) {
    const attempt = run.answers.findLast(entry => entry.number === number);
    if (attempt) return attempt.answer;
  }
  return "";
}

function numberList(group) {
  return Array.from({ length: group.last - group.first + 1 }, (_, offset) => group.first + offset);
}

function starredItems() {
  return groups.flatMap(group => [zhang, xiehou].flatMap(paper => numberList(group).flatMap(number => {
    const entry = info(paper, number);
    if (!entry.star && !entry.wrong) return [];
    return [{ paper, number, type: group.id, entry, source: `2027 · ${paper.title} · 第1套`, image: imagePath(paper, number) }];
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

function catalogRow(paper, type, detail, controls) {
  return `<article class="catalog-row"><span class="volume-index" aria-hidden="true">01</span><div>
    <h3>${type}</h3><p><span class="tag year">2027</span>${type === paper.title ? "" : paper.title + " · "}第 1 套 · ${detail}</p>
  </div><div class="row-actions">${controls}</div></article>`;
}

function catalog(section) {
  let rows;
  if (section.id === "practice") {
    rows = catalogRow(zhang, "选择题", "第 1–10 题", link("在线刷题", "#practice/choice/1", "arrow", "primary")) +
      catalogRow(zhang, "填空题", "第 11–16 题", pdf(zhang, "fill", "打开打印版") + link("题号与计时", "#practice/fill/11", "grid"));
  } else if (section.id === "long") {
    rows = catalogRow(zhang, "解答题", "第 17–22 题", pdf(zhang, "long", "打开打印版", false, "primary") + link("题号与计时", "#long/review/17", "grid"));
  } else {
    rows = catalogRow(xiehou, xiehou.title, "22 题", pdf(xiehou, "exam", "打开整卷 PDF", false, "primary") + link("题号与计时", "#papers/review/1", "grid"));
  }
  const paper = section.id === "papers" ? xiehou : zhang;
  return `${title(section.name, { art: section.art })}
    <section class="catalog">
      <div class="panel-head"><h2>2027 年 · 数学一</h2></div>
      ${rows}
      <div class="actions catalog-solutions">${pdf(paper, "solutions", "下载原版解析", true)}</div>
    </section>`;
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
  return `<aside class="rail" aria-label="题号导航">${lesson.groups.map(group => `<section>
    <h3>${group.name}</h3>
    ${lesson.mode === "choice" ? `<p>已做 ${numberList(group).filter(number => info(zhang, number).answer).length} / 10</p>` : ""}
    <div class="tiles">${numberList(group).map(number => {
      const entry = info(lesson.paper, number);
      const status = entry.answer ? entry.answer === zhang.keys[number - 1] ? "right" : "wrong" : "";
      const mark = entry.star || entry.wrong;
      const label = `第 ${number} 题${status === "right" ? "，答对" : status === "wrong" ? "，答错" : ""}${mark ? "，已标星" : ""}`;
      return `<a class="tile ${status}" href="#${route}/${number}" aria-label="${label}"${current === number ? ' aria-current="true"' : ""}>${number}${mark ? '<span class="tile-star" aria-hidden="true">★</span>' : ""}</a>`;
    }).join("")}</div>
  </section>`).join("")}</aside>`;
}

function answerPanel(number) {
  const entry = info(zhang, number);
  if (entry.answer && !retrying) {
    const correct = entry.answer === zhang.keys[number - 1];
    return `<div class="feedback ${correct ? "good" : "bad"}" role="status">${icon(correct ? "check" : "alert")}
      ${correct ? `答对了 · ${entry.answer}` : `你选了 ${entry.answer}，正确答案是 ${zhang.keys[number - 1]}。已自动标星。`}
    </div><div class="lesson-footer">
      ${action("重做本题", "retry")}
      ${entry.wrong && correct ? action("订正完成，移出错题", "clear-wrong", "check", "subtle", `data-number="${number}"`) : ""}
    </div>`;
  }
  if (!state.active) {
    return `<div class="lesson-footer">${action("开始刷题", "start", "arrow", "primary", 'data-mode="choice"')}</div>`;
  }
  if (state.active.mode !== "choice") {
    return `<div class="feedback">正在计时：${modes[state.active.mode].name}。结束并保存后可开始选择题。</div>`;
  }
  if (!state.active.since) return '<div class="feedback">继续计时后可作答</div>';
  return `<div class="answers" role="group" aria-label="选择答案">${[..."ABCD"].map(answer => `
    <button type="button" class="answer" data-action="select" data-answer="${answer}" aria-pressed="${selectedAnswer === answer}">${answer}</button>`).join("")}</div>
    <div class="lesson-footer">${action("提交答案", "submit", "check", "primary", `data-number="${number}"${selectedAnswer ? "" : " disabled"}`)}</div>`;
}

function lessonPage(route, lesson, number) {
  const paper = lesson.paper;
  const section = sections.find(item => item.id === route.split("/")[0]);
  const list = lesson.groups.flatMap(numberList);
  const index = list.indexOf(number);
  const online = lesson.mode === "choice";
  const mode = modes[lesson.mode];
  const controls = `<div class="actions">${lesson.file ? pdf(paper, lesson.file, "打开打印版", false, "primary") : ""}
    ${pdf(paper, "solutions", "下载原版解析", true)}
    ${!online && !state.active ? action("开始刷题", "start", "arrow", "", `data-mode="${lesson.mode}"`) : ""}</div>`;
  return `${title(online ? "在线选择题" : mode.name + " · 题号索引", {
    back: section, tail: controls, subtitle: `2027 · ${paper.title} · 第 1 套`
  })}
    <section class="lesson"><div class="lesson-grid">
      <article class="workspace" aria-labelledby="question-title">
        <div class="workspace-head"><h2 id="question-title">第 ${number} 题</h2><div class="actions">${enlarge(paper, number)}${starControl(paper, number)}</div></div>
        <img class="question-image" src="${imagePath(paper, number)}" alt="${paper.title}第 1 套第 ${number} 题题面">
        ${online ? answerPanel(number) : ""}
        <nav class="lesson-footer" aria-label="翻题">
          ${index > 0 ? link("上一题", `#${route}/${list[index - 1]}`, "back", "subtle") : '<span></span>'}
          ${index + 1 < list.length ? link("下一题", `#${route}/${list[index + 1]}`, "arrow") : link("返回栏目", "#" + section.id, "arrow")}
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
      ${entry.wrong ? link("返回这道题", "#practice/choice/" + number, "arrow") : ""}</div></div>
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
  const answered = numberList(groups[0]).map(number => ({ number, answer: latestSavedAnswer(number) })).filter(entry => entry.answer);
  const correct = answered.filter(({ number, answer }) => answer === zhang.keys[number - 1]).length;
  const dateFormat = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${title("做题记录", {
    tail: link("回到选择题", "#practice/choice/1", "arrow")
  })}
    <div class="catalog">
      <div class="panel-head"><h2>选择题进度</h2><span>2027 · 张宇八套卷</span></div>
      <p class="progress-summary">已完成 <strong>${answered.length} / 10</strong> · 答对 <strong>${correct}</strong> · 答错 <strong>${answered.length - correct}</strong></p>
      ${answered.length ? `<div class="history-tiles">${answered.map(({ number, answer }) => link(`第 ${number} 题 · ${answer}`,
        `#practice/choice/${number}`, answer === zhang.keys[number - 1] ? "check" : "alert")).join("")}</div>` : ""}
      <div class="panel-head session-head"><h2>刷题计时</h2><span>${state.history.length} 次已结束</span></div>
      ${state.history.length ? `<ol class="history-list">${state.history.map(run => {
        const right = run.answers.filter(entry => entry.correct).length;
        const hasAnswers = run.answers.length > 0;
        const summary = `<div><strong>${modes[run.mode].name}刷题</strong><small>${dateFormat.format(run.start)}${hasAnswers ? ` · 作答 ${run.answers.length} 次 · 答对 ${right} 次 · 答错 ${run.answers.length - right} 次` : ""}</small></div>
          <span class="history-summary-time"><time datetime="PT${Math.floor(run.elapsed / 1000)}S">${timeText(run.elapsed)}</time>${hasAnswers ? icon("arrow") : ""}</span>`;
        const details = hasAnswers ? `<details><summary class="history-summary">${summary}</summary>
          <div class="history-tiles">${run.answers.map(entry => link(`第 ${entry.number} 题 · ${entry.answer} · ${entry.correct ? "答对" : "答错"}`, "#practice/choice/" + entry.number, entry.correct ? "check" : "alert")).join("")}</div>
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
    <span>${run.since ? "刷题计时中" : "计时已暂停"}</span><time id="elapsed" aria-label="已用时间">${timeText(elapsed(run))}</time></div>
    <div class="actions">${action(run.since ? "暂停" : "继续计时", "pause")}
    ${action("退出不保存", "discard", "", "subtle")}
    ${action("结束并保存", "finish", "check", "primary")}</div>`;
}

function render({ navigation = false } = {}) {
  const path = location.hash.slice(1);
  const parts = path.split("/");
  const section = sections.find(item => item.id === parts[0]);
  const route = parts.slice(0, 2).join("/");
  const lesson = Object.hasOwn(routes, route) ? routes[route] : null;
  const number = Number(parts[2]);
  let pageTitle = siteName;
  if (lesson && lesson.groups.some(group => number >= group.first && number <= group.last) && Number.isInteger(number)) {
    if (navigation && state.active?.mode === lesson.mode && state.active.route !== path) {
      state.active.route = path;
      save();
    }
    content.innerHTML = lessonPage(route, lesson, number);
    pageTitle = `第 ${number} 题 · ${modes[lesson.mode].name}`;
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

function resetAnswerDraft() {
  selectedAnswer = "";
  retrying = false;
}

function start(mode) {
  if (state.active) return;
  const now = Date.now();
  const current = location.hash.slice(1);
  const currentMode = routes[current.split("/").slice(0, 2).join("/")]?.mode;
  const route = currentMode === mode ? current : modes[mode].route;
  state.active = { mode, route, start: now, since: now, elapsed: 0, answers: [] };
  save();
  say("刷题计时已开始");
  if (route === current) render();
  else location.hash = route;
}

function toggleTimer() {
  const run = state.active;
  if (!run) return;
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
  if (!run) return;
  state.history.unshift({ ...run, elapsed: elapsed(run), since: null, end: Date.now() });
  state.active = null;
  resetAnswerDraft();
  save();
  say("本次刷题已保存");
  if (location.hash === "#history") render();
  else location.hash = "history";
}

function discard() {
  if (!state.active || !window.confirm("退出本次刷题并放弃做题记录？")) return;
  state.active = null;
  resetAnswerDraft();
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
  const paper = id === zhang.id ? zhang : xiehou;
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

function submit(number) {
  if (state.active?.mode !== "choice" || !state.active.since || !selectedAnswer) return;
  const key = questionKey(zhang, number);
  const correct = selectedAnswer === zhang.keys[number - 1];
  if (!correct) state.questions[key] = { ...state.questions[key], wrong: true };
  state.active.answers.push({ number, answer: selectedAnswer, correct });
  save();
  resetAnswerDraft();
  render();
  content.querySelector(".feedback")?.setAttribute("tabindex", "-1");
  content.querySelector(".feedback")?.focus({ preventScroll: true });
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const { action: name, mode, answer, paper } = trigger.dataset;
  const number = Number(trigger.dataset.number);
  switch (name) {
    case "start": start(mode); break;
    case "pause": toggleTimer(); break;
    case "finish": finish(); break;
    case "discard": discard(); break;
    case "delete-run": deleteRun(Number(trigger.dataset.run)); break;
    case "star": toggleStar(paper, number, trigger); break;
    case "select":
      selectedAnswer = answer;
      content.querySelectorAll(".answer").forEach(button => button.setAttribute("aria-pressed", button.dataset.answer === answer));
      content.querySelector('[data-action="submit"]').disabled = false;
      break;
    case "submit": submit(number); break;
    case "retry":
      retrying = true;
      render();
      content.querySelector(".answer, .workspace [data-action='start']")?.focus();
      break;
    case "clear-wrong":
      state.questions[questionKey(zhang, number)].wrong = false;
      save();
      render();
      say("订正完成，已移出错题记录");
      break;
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
  resetAnswerDraft();
  render({ navigation: true });
});
window.addEventListener("storage", event => {
  if (event.key === storageKey || event.key === null) {
    state = readState();
    resetAnswerDraft();
    render();
  }
});
setInterval(() => {
  const clock = document.querySelector("#elapsed");
  if (clock && state.active?.since) clock.textContent = timeText(elapsed(state.active));
}, 250);

render();
