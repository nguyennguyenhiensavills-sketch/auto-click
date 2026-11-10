// requires: npm install express
const express = require("express");
const path = require("path");
const { execFileSync } = require("child_process");

const PS = ["-NoProfile", "-NonInteractive", "-Command"];

function doClick(x, y) {
  if (x !== undefined && y !== undefined) {
    execFileSync(
      "powershell",
      [
        ...PS,
        `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`,
      ],
      { timeout: 2000 },
    );
  }
  // Single-quoted C# string avoids heredoc — execution policy does not apply to -Command
  execFileSync(
    "powershell",
    [
      ...PS,
      `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class AC { [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int c, int e); }'; [AC]::mouse_event(2,0,0,0,0); [AC]::mouse_event(4,0,0,0,0)`,
    ],
    { timeout: 2000 },
  );
}

function doMove(x, y, durationMs) {
  execFileSync(
    "powershell",
    [
      ...PS,
      `Add-Type -AssemblyName System.Windows.Forms; $s = [System.Windows.Forms.Cursor]::Position; $n = [Math]::Max(1, [int](${durationMs} / 16)); $d = [int](${durationMs} / $n); for ($i = 1; $i -le $n; $i++) { $nx = [int]($s.X + (${x} - $s.X) * $i / $n); $ny = [int]($s.Y + (${y} - $s.Y) * $i / $n); [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($nx, $ny); if ($d -gt 0) { Start-Sleep -Milliseconds $d } }`,
    ],
    { timeout: durationMs + 5000 },
  );
}

function getMousePosition() {
  const out = execFileSync(
    "powershell",
    [
      ...PS,
      `Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; Write-Output "$($p.X),$($p.Y)"`,
    ],
    { timeout: 2000 },
  )
    .toString()
    .trim();
  const [px, py] = out.split(",").map(Number);
  return { x: px, y: py };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let clickInterval = null;
let clickPos = null;
let returnPos = null;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/position/click", (req, res) => {
  clickPos = getMousePosition();
  const now = new Date().toLocaleString();

  console.log(
    `[${now}] [ClickButton] Position captured: (${clickPos.x}, ${clickPos.y})`,
  );
  res.json({
    message: `ClickButton set to (${clickPos.x}, ${clickPos.y})`,
    x: clickPos.x,
    y: clickPos.y,
  });
});

app.post("/position/return", (req, res) => {
  returnPos = getMousePosition();
  const now = new Date().toLocaleString();

  console.log(
    `[${now}] [ReturnButton] Position captured: (${returnPos.x}, ${returnPos.y})`,
  );
  res.json({
    message: `ReturnButton set to (${returnPos.x}, ${returnPos.y})`,
    x: returnPos.x,
    y: returnPos.y,
  });
});

app.post("/clicker/start", (req, res) => {
  const { intervalMs = 5000, returnDelayMs = 0 } = req.body;
  const now = new Date().toLocaleString();
  console.log(`[${now}] [Start] Clicking starts in 3 seconds`);
  if (clickInterval) {
    clearInterval(clickInterval);
    clickInterval = null;
  }
  setTimeout(() => {
    clickInterval = setInterval(() => {
      try {
        const cx = clickPos ? clickPos.x : undefined;
        const cy = clickPos ? clickPos.y : undefined;
        const now = new Date().toLocaleString();
        doClick(cx, cy);
        if (returnPos && returnDelayMs > 0) {
          const rx = returnPos.x;
          const ry = returnPos.y;
          setTimeout(() => {
            try {
              doMove(rx, ry, 200);
            } catch (_) {}
          }, returnDelayMs);
        }
      } catch (_) {}
    }, intervalMs);
  }, 3000);
  res.json({ message: "Clicking starts in 3 seconds" });
});

app.post("/clicker/stop", (req, res) => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] [Stop] Clicking stopped`);
  if (clickInterval) {
    clearInterval(clickInterval);
    clickInterval = null;
  }
  res.json({ message: "Auto-click stopped" });
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});
