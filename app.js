const screen = document.getElementById("screen");
const banner = document.getElementById("banner");
const status = document.getElementById("status");

const snippets = window.SNIPPETS || [];

const MAX_LINES = 300;
const TRIM_SLACK = 100;
const SPEEDS = [1, 3, 6, 12, 24];
const DEFAULT_SPEED = 1;
const BANNER_MS = 1800;
const STATUS_MS = 1200;

const BOOT = [
  ["> ssh root@vault.local", 450],
  ["Authenticating...", 700],
  ["Key exchange complete.", 350],
  ["> cd /opt/firmware && make clean && make build", 600],
  ["Compiling modules...", 350],
  [" - core/memory.c", 250],
  [" - drivers/net.c", 250],
  [" - ui/terminal.c", 250],
  ["Linking...", 600],
  ["Build complete. Binary saved to ./dist/os.bin", 400],
  ["> ./launch_vm.sh --image ./dist/os.bin", 500],
  ["[INFO] VM started on 127.0.0.1:2222", 600],
  ["", 300],
  ["PRESS ANY KEY TO START TYPING", 0],
  ["[ENTER]     ACCESS GRANTED", 0],
  ["[ESC]       ACCESS DENIED", 0],
  ["[UP/DOWN]   TYPING SPEED", 0],
  ["", 0],
];

const HANDLED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Enter",
  "Escape",
  "ArrowUp",
  "ArrowDown",
]);

const output = document.createTextNode("");
const cursor = document.createElement("span");
cursor.className = "cursor";
screen.append(output, cursor);

let queue = [];
let lastBlock = -1;
let lineCount = 0;
let speedIndex = DEFAULT_SPEED;
let ready = false;
let skipBoot = false;
let bannerTimer;
let statusTimer;

let wake;

const wait = (ms) =>
  new Promise((resolve) => {
    wake = resolve;
    setTimeout(resolve, ms);
  });

function skip() {
  skipBoot = true;
  if (wake) wake();
}

function trimOutput() {
  const data = output.data;
  let cut = 0;
  for (let i = 0; i < lineCount - MAX_LINES; i++) {
    cut = data.indexOf("\n", cut) + 1;
  }
  output.data = data.slice(cut);
  lineCount = MAX_LINES;
}

function write(text) {
  output.appendData(text);
  lineCount += text.split("\n").length - 1;
  if (lineCount > MAX_LINES + TRIM_SLACK) trimOutput();
}

function tokenize(line) {
  const parts = line.split(/(\s+|[{}()[\];,]|=>)/).filter(Boolean);
  if (parts.length > 1 && /^\s+$/.test(parts[0])) {
    parts.splice(0, 2, parts[0] + parts[1]);
  }
  if (parts.length) {
    parts[parts.length - 1] += "\n";
  } else {
    parts.push("\n");
  }
  return parts;
}

function refill() {
  let index;
  do {
    index = Math.floor(Math.random() * snippets.length);
  } while (index === lastBlock && snippets.length > 1);
  lastBlock = index;
  queue = snippets[index].flatMap(tokenize);
  queue[queue.length - 1] += "\n";
}

function typeChunk() {
  if (snippets.length === 0) return;
  let remaining = 1 + Math.floor(Math.random() * SPEEDS[speedIndex]);
  let text = "";
  while (remaining > 0) {
    if (queue.length === 0) refill();
    const token = queue.shift();
    text += token;
    if (token.trim() !== "") remaining--;
  }
  write(text);
}

function showBanner(kind) {
  banner.textContent = kind === "granted" ? "ACCESS GRANTED" : "ACCESS DENIED";
  banner.className = kind;
  banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    banner.hidden = true;
  }, BANNER_MS);
}

function showStatus(text) {
  status.textContent = text;
  status.classList.add("visible");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove("visible"), STATUS_MS);
}

function changeSpeed(delta) {
  const next = Math.min(SPEEDS.length - 1, Math.max(0, speedIndex + delta));
  speedIndex = next;
  showStatus(`SPEED ${speedIndex + 1}/${SPEEDS.length}`);
}

function isHandledKey(key) {
  return key.length === 1 || HANDLED_KEYS.has(key);
}

function handleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!isHandledKey(e.key)) return;
  e.preventDefault();

  if (!ready) {
    skip();
    return;
  }

  switch (e.key) {
    case "Enter":
      if (!e.repeat) showBanner("granted");
      break;
    case "Escape":
      if (!e.repeat) showBanner("denied");
      break;
    case "ArrowUp":
      if (!e.repeat) changeSpeed(1);
      break;
    case "ArrowDown":
      if (!e.repeat) changeSpeed(-1);
      break;
    default:
      typeChunk();
  }
}

function handlePointer(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!ready) {
    skip();
    return;
  }
  typeChunk();
}

async function boot() {
  for (const [line, delay] of BOOT) {
    write(line + "\n");
    if (!skipBoot && delay > 0) await wait(delay);
  }
  ready = true;
}

document.addEventListener("keydown", handleKey);
document.addEventListener("pointerdown", handlePointer);

boot();
