(() => {
  const types = new Map([
    ["choice", "选择题"],
    ["fill", "填空题"],
    ["long", "解答题"],
  ]);
  const readyMessage = "starred-print-ready";
  const itemsMessage = "starred-print-items";
  const messageOrigin = location.protocol === "file:" ? "null" : location.origin;
  const targetOrigin = messageOrigin === "null" ? "*" : messageOrigin;

  function openPreview(items) {
    if (!items.length) return false;

    const questions = items.map((item) => ({
      ...item,
      image: new URL(item.image, document.baseURI).href,
    }));
    const preview = window.open(new URL("./print.html", document.baseURI).href, "_blank");
    if (!preview) return false;

    function sendQuestions(event) {
      if (event.source !== preview || event.origin !== messageOrigin || event.data !== readyMessage) return;
      preview.postMessage({ type: itemsMessage, questions }, targetOrigin);
    }
    // Keep the preview reloadable while its originating tab is open.
    window.addEventListener("message", sendQuestions);
    const checkClosed = window.setInterval(() => {
      if (!preview.closed) return;
      window.removeEventListener("message", sendQuestions);
      window.clearInterval(checkClosed);
    }, 1000);
    return true;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeQuestion(item) {
    const question = element("article", `print-question print-question-${item.type}`);
    question.append(element("p", "print-source", `${item.source} · 原卷第 ${item.number} 题`));
    const image = element("img", "print-question-image");
    image.alt = `原卷第 ${item.number} 题题面`;
    image.src = item.image;
    question.append(image);
    if (item.type === "long") question.append(element("div", "print-writing-space"));
    return { question, image };
  }

  const paper = document.querySelector("#print-content");
  if (!paper) {
    window.printStarred = openPreview;
    return;
  }

  const status = document.querySelector("#print-status");
  const printButton = document.querySelector("#print-now");
  const runPrint = () => window.print();
  document.querySelector("#print-close").addEventListener("click", () => window.close());
  printButton.addEventListener("click", runPrint);

  async function renderQuestions(items) {
    const masthead = element("header", "print-masthead");
    masthead.append(
      element("p", "print-eyebrow", "套卷研习室 · 数学一"),
      element("h1", "print-title", "标星题合集"),
      element("p", "print-summary", `共 ${items.length} 题`),
    );
    paper.append(masthead);

    const imageLoads = [];
    for (const [type, label] of types) {
      const group = items.filter((item) => item.type === type);
      if (!group.length) continue;

      const section = element("section", "print-group");
      const heading = element("h2", "print-group-heading", label);
      for (const [index, item] of group.entries()) {
        const { question, image } = makeQuestion(item);
        if (index === 0) question.prepend(heading);
        section.append(question);
        imageLoads.push(image.decode());
      }
      paper.append(section);
    }

    const [loads] = await Promise.all([Promise.allSettled(imageLoads), document.fonts.ready]);
    paper.setAttribute("aria-busy", "false");
    if (loads.some((load) => load.status === "rejected")) {
      status.textContent = "有题面加载失败。请刷新此页，或返回后重新打开打印预览。";
      return;
    }
    status.textContent = `A4 · ${items.length} 题`;
    printButton.disabled = false;
    runPrint();
  }

  function receiveQuestions(event) {
    if (event.source !== window.opener || event.origin !== messageOrigin || event.data?.type !== itemsMessage) return;
    window.removeEventListener("message", receiveQuestions);
    window.clearTimeout(waitForOpener);
    renderQuestions(event.data.questions);
  }

  function showOpenHint() {
    paper.setAttribute("aria-busy", "false");
    status.textContent = "请回到「我的标星」，重新打开打印预览。";
  }

  if (!window.opener) {
    showOpenHint();
    return;
  }
  const waitForOpener = window.setTimeout(showOpenHint, 5000);
  window.addEventListener("message", receiveQuestions);
  window.opener.postMessage(readyMessage, targetOrigin);
})();
