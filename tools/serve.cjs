const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".ttf": "font/ttf",
};
const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }
  const file = path.resolve(
    root,
    "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
  );
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403).end();
    return;
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const headers = {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Accept-Ranges": "bytes",
    };
    const range = request.headers.range;
    let start = 0,
      end = stat.size - 1,
      status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        response
          .writeHead(416, { "Content-Range": "bytes */" + stat.size })
          .end();
        return;
      }
      start = match[1]
        ? Number(match[1])
        : Math.max(0, stat.size - Number(match[2]));
      end =
        match[1] && match[2]
          ? Math.min(stat.size - 1, Number(match[2]))
          : stat.size - 1;
      if (start > end || start >= stat.size) {
        response
          .writeHead(416, { "Content-Range": "bytes */" + stat.size })
          .end();
        return;
      }
      status = 206;
      headers["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
    }
    headers["Content-Length"] = end - start + 1;
    response.writeHead(status, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = fs.createReadStream(file, { start, end });
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
});
server.listen(8805, "127.0.0.1", () =>
  console.log("DentAI preview http://127.0.0.1:8805"),
);
