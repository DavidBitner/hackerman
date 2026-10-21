const screen = document.getElementById("screen");
const banner = document.getElementById("banner");
const status = document.getElementById("status");
const windowEl = document.getElementById("window");
const windowTitle = document.getElementById("window-title");
const windowBody = document.getElementById("window-body");
const controls = document.getElementById("controls");
const autoButton = document.getElementById("btn-auto");
const fullButton = document.getElementById("btn-full");

const snippets = window.SNIPPETS || [];
const programs = window.PROGRAMS || [];

const MAX_LINES = 300;
const TRIM_SLACK = 100;
const SPEEDS = [1, 3, 6, 12, 24];
const DEFAULT_SPEED = 1;
const BANNER_MS = 1800;
const STATUS_MS = 1200;
const CONTROLS_MS = 2500;
const AUTO_MS = 90;
const PROGRAM_TICK_MS = 90;
const EVENT_CHANCE = 1 / 180;

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
  ["[ENTER]      ACCESS GRANTED", 0],
  ["[ESC]        ACCESS DENIED", 0],
  ["[TAB]        RUN PROGRAM", 0],
  ["[F2]         AUTO-TYPE", 0],
  ["[ALT+ENTER]  FULLSCREEN", 0],
  ["[UP/DOWN]    TYPING SPEED", 0],
  ["", 0],
];

const HANDLED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Enter",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "F2",
]);

const output = document.createTextNode("");
const cursor = document.createElement("span");
cursor.className = "cursor";
screen.append(output, cursor);

let queue = [];
let lastBlock = -1;
let lastProgram = -1;
let lineCount = 0;
let speedIndex = DEFAULT_SPEED;
let ready = false;
let skipBoot = false;
let bannerTimer;
let statusTimer;
let controlsTimer;
let programTimer = null;
let autoTimer = null;
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

function pickIndex(length, last) {
  let index;
  do {
    index = Math.floor(Math.random() * length);
  } while (index === last && length > 1);
  return index;
}

function refill() {
  lastBlock = pickIndex(snippets.length, lastBlock);
  queue = snippets[lastBlock].flatMap(tokenize);
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

function closeProgram() {
  clearInterval(programTimer);
  programTimer = null;
  windowEl.hidden = true;
}

function openProgram() {
  if (programTimer || programs.length === 0) return;
  lastProgram = pickIndex(programs.length, lastProgram);
  const program = programs[lastProgram];
  const state = {};
  const start = performance.now();
  let maxLines = 0;

  windowTitle.textContent = program.title;
  windowEl.style.top = `${42 + Math.random() * 16}%`;
  windowEl.style.left = `${48 + Math.random() * 4}%`;
  windowBody.style.minHeight = "0";
  windowEl.hidden = false;

  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed > program.duration + program.hold) {
      closeProgram();
      return;
    }
    const lines = program.render(Math.min(elapsed, program.duration), state);
    maxLines = Math.max(maxLines, lines.length);
    windowBody.style.minHeight = `${maxLines * 1.4}em`;
    windowBody.textContent = lines.join("\n");
  };

  tick();
  programTimer = setInterval(tick, PROGRAM_TICK_MS);
}

function press() {
  typeChunk();
  if (Math.random() < EVENT_CHANCE) openProgram();
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

function revealControls() {
  controls.classList.add("visible");
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(
    () => controls.classList.remove("visible"),
    CONTROLS_MS,
  );
}

function changeSpeed(delta) {
  speedIndex = Math.min(SPEEDS.length - 1, Math.max(0, speedIndex + delta));
  showStatus(`SPEED ${speedIndex + 1}/${SPEEDS.length}`);
}

function toggleAuto() {
  if (!ready) return;
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  } else {
    autoTimer = setInterval(press, AUTO_MS);
  }
  autoButton.setAttribute("aria-pressed", String(Boolean(autoTimer)));
  showStatus(`AUTO-TYPE ${autoTimer ? "ON" : "OFF"}`);
}

function toggleFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (root.requestFullscreen) {
    root.requestFullscreen().catch(() => {});
  }
}

function isHandledKey(key) {
  return key.length === 1 || HANDLED_KEYS.has(key);
}

function handleKey(e) {
  if (e.altKey && e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!e.repeat) toggleFullscreen();
    return;
  }
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
    case "Tab":
      if (!e.repeat) openProgram();
      break;
    case "F2":
      if (!e.repeat) toggleAuto();
      break;
    default:
      press();
  }
}

function handlePointer(e) {
  revealControls();
  if (e.target.closest("#controls")) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!ready) {
    skip();
    return;
  }
  press();
}

async function boot() {
  for (const [line, delay] of BOOT) {
    write(line + "\n");
    if (!skipBoot && delay > 0) await wait(delay);
  }
  ready = true;
}

autoButton.addEventListener("click", () => {
  toggleAuto();
  autoButton.blur();
});

fullButton.addEventListener("click", () => {
  toggleFullscreen();
  fullButton.blur();
});

document.addEventListener("fullscreenchange", () => {
  fullButton.setAttribute(
    "aria-pressed",
    String(Boolean(document.fullscreenElement)),
  );
});

if (!document.documentElement.requestFullscreen) fullButton.hidden = true;

document.addEventListener("keydown", handleKey);
document.addEventListener("pointerdown", handlePointer);
document.addEventListener("pointermove", revealControls);

boot();
