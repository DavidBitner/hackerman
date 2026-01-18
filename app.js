const terminal = document.getElementById("terminal");
let codeSnippets = [];
let currentChunks = [];
let cursor = document.createElement("span");
cursor.classList.add("cursor");

let currentIndent = 0;
let pendingIndent = false;

const bootText = `
> git clone https://github.com/dvdbt/os-firmware
> cd os-firmware
> make clean && make build
Compiling modules...
 - core/memory.c
 - drivers/net.c
 - ui/terminal.c
Linking...
Build complete. Binary saved to ./dist/os.bin
Launching VM...
$ ./launch_vm.sh --image ./dist/os.bin
[INFO] VM started on 127.0.0.1:2222
`;

function printBootText() {
  terminal.textContent = bootText;
  terminal.appendChild(cursor);
}

function chunkLine(line) {
  const tokens = line
    .split(/(\s+|\{|\}|\(|\)|;|=>)/)
    .filter((token) => token !== "");
  const chunks = [];

  while (tokens.length) {
    let n = Math.floor(Math.random() * 3) + 1;
    chunks.push(tokens.splice(0, n).join(""));
  }

  return chunks;
}

function calculateIndent(line) {
  const closeBraces = (line.match(/\}/g) || []).length;
  currentIndent = Math.max(0, currentIndent - closeBraces);

  const indent = "  ".repeat(currentIndent);

  const openBraces = (line.match(/\{/g) || []).length;
  currentIndent += openBraces;

  return indent;
}

function printNextChunk() {
  if (currentChunks.length === 0) {
    const line = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    currentChunks = chunkLine(line);
    pendingIndent = true;
  }

  const chunk = currentChunks.shift();
  if (chunk !== undefined) {
    let toPrint = chunk;

    if (pendingIndent) {
      const fullLine = chunk + currentChunks.join("");
      const indent = calculateIndent(fullLine);
      toPrint = indent + chunk;
      pendingIndent = false;
    }

    const lineEnd = currentChunks.length === 0 ? "\n" : "";

    // Otimização de performance: usa nós de texto em vez de recriar todo o HTML
    cursor.remove();
    const textNode = document.createTextNode(toPrint + lineEnd);
    terminal.appendChild(textNode);
    terminal.appendChild(cursor);

    // Garante rolagem automática
    window.scrollTo(0, document.body.scrollHeight);
  }
}

// Função unificada para tratar teclado e toque
const handleInteraction = (e) => {
  // Opcional: previne zoom duplo em alguns celulares
  // e.preventDefault();
  printNextChunk();
};

// Event Listeners para PC e Mobile
document.addEventListener("keydown", handleInteraction);
document.addEventListener("click", handleInteraction);
document.addEventListener("touchstart", handleInteraction);

fetch("gibberish.json")
  .then((res) => res.json())
  .then((data) => {
    codeSnippets = data;
    printBootText();
  })
  .catch((err) => {
    console.error("Failed to load gibberish.json", err);
  });
