# hackerman

A retro green-phosphor terminal that types code as you press keys. No build step, no dependencies.

## Usage

Open `index.html` in a browser, or serve the folder with any static server.

| Input                 | Action                      |
| --------------------- | --------------------------- |
| Any key / click / tap | Type the next chunk of code |
| `Enter`               | Show **ACCESS GRANTED**     |
| `Esc`                 | Show **ACCESS DENIED**      |
| `↑` / `↓`             | Raise / lower typing speed  |

Browser shortcuts such as `Ctrl+R`, `F5` and `F12` keep working.

## Project layout

- `index.html` – page shell
- `style.css` – glow, scanlines, vignette and flicker
- `app.js` – boot sequence, typing logic and input handling
- `snippets.js` – the code blocks that get typed; add your own as arrays of lines

## License

See [LICENSE](LICENSE).
