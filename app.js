const terminal = document.getElementById("terminal");
let codeSnippets = [];
let currentChunks = [];
let cursor = document.createElement("span");
cursor.classList.add("cursor");

// Track indentation state
let currentIndent = 0;
let pendingIndent = false;

// Boot screen
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

// Split a line into chunks (words or partials)
function chunkLine(line) {
  // Split keeping whitespace and code symbols
  const tokens = line.split(/(\s+|\{|\}|\(|\)|;|=>)/).filter(token => token !== '');
  const chunks = [];

  while (tokens.length) {
    let n = Math.floor(Math.random() * 3) + 1; // grab 1–3 tokens
    chunks.push(tokens.splice(0, n).join(""));
  }

  return chunks;
}

// Calculate indentation for a complete line
function calculateIndent(line) {
  // Count closing braces that would decrease indentation
  const closeBraces = (line.match(/\}/g) || []).length;
  currentIndent = Math.max(0, currentIndent - closeBraces);

  // Calculate the indent for this line
  const indent = '  '.repeat(currentIndent);

  // Count opening braces that would increase indentation for next line
  const openBraces = (line.match(/\{/g) || []).length;
  currentIndent += openBraces;

  return indent;
}

// Handle keypress: show next chunk
function printNextChunk() {
  if (currentChunks.length === 0) {
    const line = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    currentChunks = chunkLine(line);
    pendingIndent = true; // We need to indent the next chunk
  }

  const chunk = currentChunks.shift();
  if (chunk !== undefined) {
    let toPrint = chunk;

    if (pendingIndent) {
      const fullLine = chunk + currentChunks.join('');
      const indent = calculateIndent(fullLine);
      toPrint = indent + chunk;
      pendingIndent = false;
    }

    const lineEnd = currentChunks.length === 0 ? "\n" : "";

    cursor.remove();
    terminal.textContent += toPrint + lineEnd;
    terminal.appendChild(cursor);
    window.scrollTo(0, document.body.scrollHeight);
  }
}

document.addEventListener("keydown", () => {
  printNextChunk();
});

// Load gibberish.json
fetch('gibberish.json')
  .then(res => res.json())
  .then(data => {
    codeSnippets = data;
    printBootText();
  })
  .catch(err => {
    console.error("Failed to load gibberish.json", err);
  });