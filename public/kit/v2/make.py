#!/usr/bin/env python3
"""Build Deck Kit 2.

  python3 make.py            writes kit.js and kit.css from src/
  python3 make.py inline IN.html OUT.html
                             writes a standalone copy of a deck with the
                             engine folded in (for claude.ai previews,
                             OneNote, or a USB stick)
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")

def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()

def build():
    tools_html = read("tools-kit1.html").strip()
    engine = "".join(read("engine%d.js" % i) for i in (1, 2, 3, 4, 6))
    tools = ("\n/* ---------- Kit 1 calculator and protractor ---------- */\n"
             "var TOOLS_HTML = " + json.dumps(tools_html) + ";\n"
             "function initToolsKit1(){\n" + read("tools-kit1.js") + "\n}\n")
    js = ("/* Woodcroft Deck Kit 2. Built by make.py from src/. Edit src/, then run make.py. */\n"
          + read("katex.min.js") + "\n" + engine + tools + read("engine5.js") + "\n})();\n")
    css = read("kit.base.css") + "\n/* ---------- Kit 1 calculator and protractor ---------- */\n" + read("tools-kit1.css")
    for text, name in ((js, "kit.js"), (css, "kit.css")):
        if "\u2014" in text:
            raise SystemExit("em dash found in " + name)
    with open(os.path.join(HERE, "kit.js"), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(HERE, "kit.css"), "w", encoding="utf-8") as f:
        f.write(css)
    print("kit.js %d KB, kit.css %d KB" % (len(js) // 1024, len(css) // 1024))
    return js, css

def inline(src, out):
    js, css = build()
    html = open(src, encoding="utf-8").read()
    html = re.sub(r'<link[^>]+href="[^"]*kit\.css"[^>]*>', lambda m: "<style>" + css + "</style>", html)
    html = re.sub(r'<script[^>]+src="[^"]*kit\.js"[^>]*></script>', lambda m: "<script>" + js.replace("</script", "<\\/script") + "</script>", html)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", out, len(html) // 1024, "KB")

if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "inline":
        inline(sys.argv[2], sys.argv[3])
    else:
        build()
