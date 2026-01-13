#!/usr/bin/env python3
# fix.py
# Insert cookie gate at top of <head> and scheduler at end of <head>
# for all HTML files in the tree, skipping excluded files/dirs.

import shutil
from pathlib import Path
from bs4 import BeautifulSoup

# Exclude these filenames (case-insensitive)
EXCLUDE_FILES = {"activate.html", "activation.html"}

# Exclude any file whose path contains one of these directory names (case-insensitive)
EXCLUDE_DIRS = {"activate", "provider", "node", "agree", "",}

TOP_COOKIE_GATE = """(function () {
  const cookies = document.cookie.split("; ").map(c => c.trim());
  const accessCookie = cookies.find(c => c.startsWith("access="));
  const accessValue = accessCookie ? accessCookie.split("=")[1] : null;
  if (accessValue !== "1") {
    window.location.replace("/404.html");
  }
})();"""

END_SCHEDULER_BLOCK = """function checkCookie() {
  const cookies = document.cookie.split("; ").map(c => c.trim());
  const accessCookie = cookies.find(c => c.startsWith("access="));
  const accessValue = accessCookie ? accessCookie.split("=")[1] : null;
  if (accessValue !== "1") {
    window.location.replace("/404.html");
  }
}

function scheduleNextCheck() {
  const next = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000;
  setTimeout(() => {
    checkCookie();
    scheduleNextCheck();
  }, next);
}

checkCookie();
scheduleNextCheck();"""

def script_text_equal(a, b):
    if a is None or b is None:
        return False
    na = "\n".join(line.rstrip() for line in a.strip().splitlines())
    nb = "\n".join(line.rstrip() for line in b.strip().splitlines())
    return na == nb

def find_exact_script(soup, code):
    matches = []
    for s in soup.find_all("script"):
        if s.has_attr("src"):
            continue
        txt = s.string if s.string is not None else s.get_text()
        if script_text_equal(txt, code):
            matches.append(s)
    return matches

def ensure_head_exists(soup):
    if soup.head is None:
        head = soup.new_tag("head")
        if soup.html:
            soup.html.insert(0, head)
        else:
            html = soup.new_tag("html")
            soup.insert(0, html)
            html.append(head)
    return soup.head

def insert_top_cookie_gate(soup, head):
    if find_exact_script(soup, TOP_COOKIE_GATE):
        return False
    s = soup.new_tag("script")
    s.string = TOP_COOKIE_GATE
    head.insert(0, s)
    return True

def insert_end_scheduler(soup, head):
    if find_exact_script(soup, END_SCHEDULER_BLOCK):
        return False
    s = soup.new_tag("script")
    s.string = END_SCHEDULER_BLOCK
    head.append(s)
    return True

def process_file(path: Path):
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    head = ensure_head_exists(soup)
    insert_top_cookie_gate(soup, head)
    insert_end_scheduler(soup, head)
    # backup
    backup = path.with_suffix(path.suffix + ".bak")
    shutil.copyfile(path, backup)
    path.write_text(str(soup), encoding="utf-8")
    print(f"Processed {path}")

def should_skip(path: Path) -> bool:
    # Skip excluded filenames
    if path.name.lower() in EXCLUDE_FILES:
        return True
    # Skip if any parent directory matches excluded dirs
    for part in path.parts:
        if part.lower() in EXCLUDE_DIRS:
            return True
    return False

def main():
    here = Path(".")
    for f in here.rglob("*.html"):   # recurse into subdirectories
        if should_skip(f):
            print(f"Skipping {f}")
            continue
        process_file(f)

if __name__ == "__main__":
    main()
