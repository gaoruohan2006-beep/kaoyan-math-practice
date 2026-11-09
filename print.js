(() => {
  const types = ["choice", "fill", "long"];
  const readyMessage = "starred-print-ready";
  const itemsMessage = "starred-print-items";
  const messageOrigin = location.protocol === "file:" ? "null" : location.origin;
  const targetOrigin = messageOrigin === "null" ? "*" : messageOrigin;

  function openPreview(items) {
    if (!items.length) return false;

    const questions = items.map(({ number, type, image, label }) => ({
      number,
      type,
      label,
      image: new URL(image, document.baseURI).href,
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
    const question = element("article", "print-question");
    if (item.label) question.append(element("p", "print-question-label", item.label));
    const image = element("img", "print-question-image");
    image.alt = `原卷第 ${item.number} 题题面`;
    image.src = item.image;
    question.append(image);
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
    const generatedAt = new Date();
    const date = element("time", "print-time", new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "long",
      timeStyle: "short",
      hour12: false,
    }).format(generatedAt));
    date.dateTime = generatedAt.toISOString();
    masthead.append(element("h1", "print-title", "标星题汇总"), date);
    paper.append(masthead);

    const imageLoads = [];
    for (const type of types) {
      for (const item of items.filter((entry) => entry.type === type)) {
        const { question, image } = makeQuestion(item);
        paper.append(question);
        imageLoads.push(image.decode());
      }
    }

    const [loads] = await Promise.all([Promise.allSettled(imageLoads), document.fonts.ready]);
    paper.setAttribute("aria-busy", "false");
    if (loads.some((load) => load.status === "rejected")) {
      status.textContent = "有题面加载失败。请刷新此页，或返回后重新打开打印预览。";
      return;
    }
    status.textContent = "";
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
