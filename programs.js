window.PROGRAMS = (() => {
  const int = (max) => Math.floor(Math.random() * max);
  const clamp = (value, min = 0, max = 1) =>
    Math.max(min, Math.min(max, value));
  const hex = (n, len) => n.toString(16).toUpperCase().padStart(len, "0");
  const pct = (fraction) =>
    `${String(Math.round(clamp(fraction) * 100)).padStart(3)}%`;
  const ip = () => `${10 + int(200)}.${int(256)}.${int(256)}.${1 + int(254)}`;
  const byteRow = () =>
    Array.from({ length: 8 }, () => hex(int(256), 2)).join(" ");
  const junk = (length) =>
    Array.from(
      { length },
      () => "abcdefghijklmnopqrstuvwxyz0123456789.:;#@%&"[int(42)],
    ).join("");
  const bar = (fraction, width = 20) => {
    const filled = Math.round(clamp(fraction) * width);
    return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
  };

  const DECRYPT_MS = 5000;
  const MEMSCAN_MS = 4500;
  const TRACE_MS = 5500;
  const MONITOR_MS = 5000;
  const TRANSFER_MS = 6500;

  return [
    {
      title: "DECRYPT.EXE",
      duration: DECRYPT_MS,
      hold: 1000,
      render(t, state) {
        const p = t / DECRYPT_MS;
        state.rows = state.rows || [];
        state.key =
          state.key ||
          Array.from({ length: 4 }, () => hex(int(65536), 4)).join("-");
        if (p < 1) {
          state.rows.push(`${hex(int(0xffffff), 6)}  ${byteRow()}`);
          if (state.rows.length > 7) state.rows.shift();
        }
        return [
          "TARGET  vault.local:22",
          "CIPHER  AES-256-CBC",
          "",
          `${bar(p, 24)} ${pct(p)}`,
          "",
          ...state.rows,
          "",
          p < 1 ? "BRUTEFORCING..." : `KEY FOUND  ${state.key}`,
        ];
      },
    },
    {
      title: "MEMSCAN.EXE",
      duration: MEMSCAN_MS,
      hold: 800,
      render(t, state) {
        const p = t / MEMSCAN_MS;
        state.rows = state.rows || [];
        state.addr = state.addr ?? int(0xff0000);
        if (p < 1) {
          state.addr += 8;
          state.rows.push(`${hex(state.addr, 6)}  ${byteRow()}  ${junk(8)}`);
          if (state.rows.length > 9) state.rows.shift();
        }
        return [
          "SCANNING 0x000000-0xFFFFFF",
          "",
          ...state.rows,
          "",
          `SCANNED ${Math.round(p * 4096)} MB   HITS ${Math.floor(p * 7)}`,
        ];
      },
    },
    {
      title: "TRACE.EXE",
      duration: TRACE_MS,
      hold: 1200,
      render(t, state) {
        state.hops = state.hops || [];
        const target = Math.min(8, Math.floor(t / 650) + 1);
        while (state.hops.length < target) {
          const n = state.hops.length + 1;
          const ms = (n * 3.1 + Math.random() * 4).toFixed(1);
          state.hops.push(
            `${String(n).padStart(2)}  ${ip().padEnd(16)}${ms} ms`,
          );
        }
        const locked = state.hops.length === 8;
        return [
          "TRACING vault.local",
          "",
          ...state.hops,
          "",
          locked ? "ROUTE LOCKED  TARGET ACQUIRED" : "TRACING...",
        ];
      },
    },
    {
      title: "SYSMON.EXE",
      duration: MONITOR_MS,
      hold: 600,
      render(t, state) {
        state.tick = (state.tick || 0) + 1;
        state.values = state.values || {
          CPU0: 0.4,
          CPU1: 0.5,
          CPU2: 0.3,
          CPU3: 0.6,
          "MEM ": 0.55,
          "NET ": 0.2,
        };
        for (const key of Object.keys(state.values)) {
          state.values[key] = clamp(
            state.values[key] + (Math.random() - 0.5) * 0.3,
            0.05,
            0.98,
          );
        }
        if (state.tick % 8 === 1) {
          state.procs = 200 + int(40);
          state.load = (1 + Math.random() * 2).toFixed(2);
        }
        return [
          ...Object.entries(state.values).map(
            ([key, value]) => `${key} ${bar(value, 20)} ${pct(value)}`,
          ),
          "",
          `PROCS ${state.procs}   LOAD ${state.load}`,
        ];
      },
    },
    {
      title: "UPLOAD.EXE",
      duration: TRANSFER_MS,
      hold: 1000,
      render(t, state) {
        state.tick = (state.tick || 0) + 1;
        const files = [
          ["payload.bin", 0, 4000],
          ["keys.db", 600, 4700],
          ["archive.tar", 1200, 5200],
        ];
        if (state.tick % 6 === 1) {
          state.speeds = files.map(
            () => `${(2 + Math.random() * 6).toFixed(1)}MB/s`,
          );
        }
        const rows = files.map(([name, delay, length], i) => {
          const p = clamp((t - delay) / length);
          const speed = p >= 1 ? "DONE" : state.speeds[i];
          return `${name.padEnd(12)} ${bar(p, 10)} ${pct(p)}  ${speed}`;
        });
        const finished = t >= TRANSFER_MS;
        return [
          "UPLOADING TO vault.local",
          "",
          ...rows,
          "",
          finished ? "TRANSFER COMPLETE" : "TRANSFERRING...",
        ];
      },
    },
  ];
})();
