"""Builds the privacy policy and terms pages from docs/privacypolicy.md and docs/terms.md.

    python scripts/build-legal-pages.py                     # docs/privacypolicy.html, docs/terms.html
    python scripts/build-legal-pages.py ../privacy-policy   # the hosted copies the app links to

The app links to the hosted copies (github.com/patt-rick/privacy-policy, served from its
main branch), so push that repo after rebuilding.
"""
import html
import pathlib
import re
import sys

DOCS = pathlib.Path(__file__).resolve().parent.parent / "docs"
STYLE = (pathlib.Path(__file__).resolve().parent / "legal-page-style.css").read_text(encoding="utf8")

# docs/ keeps its historical names; the hosted repo serves several apps from one
# GitHub Pages site, so its files are prefixed with the app name.
DOCS_NAMES = {"privacypolicy": "privacypolicy.html", "terms": "terms.html"}
HOSTED_NAMES = {"privacypolicy": "finance-tracker.html", "terms": "finance-tracker-terms.html"}

PAGES = [
    ("privacypolicy", "Privacy Policy", "How Expense Tracker handles your information, including Automatic Logging."),
    ("terms", "Terms of Use", "The terms for using Expense Tracker."),
]


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    text = re.sub(r"(\*\*|__)(.+?)\1", r"<strong>\2</strong>", text)
    text = re.sub(r"\[(.+?)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"(?<![\w/:])([\w.+-]+@[\w-]+\.[\w.]+\w)", r'<a href="mailto:\1">\1</a>', text)
    return text


def slug(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def render_blocks(lines, indent):
    out, in_list = [], False
    for line in lines:
        if line.startswith("- "):
            if not in_list:
                out.append(f"{indent}<ul>")
                in_list = True
            out.append(f"{indent}  <li>{inline(line[2:])}</li>")
            continue
        if in_list:
            out.append(f"{indent}</ul>")
            in_list = False
        if line.startswith("### "):
            out.append(f"{indent}<h3>{inline(line[4:])}</h3>")
        else:
            out.append(f"{indent}<p>{inline(line)}</p>")
    if in_list:
        out.append(f"{indent}</ul>")
    return out


def build(name, title, description, out_dir, names):
    lines = [l.rstrip() for l in (DOCS / f"{name}.md").read_text(encoding="utf8").splitlines()]
    updated = next(l for l in lines if l.startswith("Last updated:")).split(":", 1)[1].strip()

    intro, sections = [], []
    for line in lines[1:]:
        if not line or line.startswith("Last updated:"):
            continue
        if line.startswith("## "):
            sections.append((line[3:], []))
        elif sections:
            sections[-1][1].append(line)
        else:
            intro.append(line)

    other = [p for p in PAGES if p[0] != name][0]
    out = [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '  <meta charset="utf-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
        f"  <title>{title} — Expense Tracker</title>",
        f'  <meta name="description" content="{html.escape(description)}" />',
        '  <meta name="robots" content="index, follow" />',
        '  <meta name="color-scheme" content="light" />',
        f'  <meta property="og:title" content="{title} — Expense Tracker" />',
        f'  <meta property="og:description" content="{html.escape(description)}" />',
        '  <meta property="og:type" content="article" />',
        '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
        '  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" rel="stylesheet" />',
        "  <style>",
        STYLE.rstrip(),
        "  </style>",
        "</head>",
        "<body>",
        "  <main>",
        '    <header class="page-header">',
        '      <a class="wordmark" href="#" aria-label="Expense Tracker">',
        '        <span class="wordmark-mark" aria-hidden="true">E</span>',
        '        <span class="wordmark-text">Expense Tracker</span>',
        "      </a>",
        "",
        f"      <h1>{title}</h1>",
        "",
        f'      <span class="last-updated" aria-label="Last updated {updated}">',
        f"        Last updated — {updated}",
        "      </span>",
        "",
        '      <div class="intro">',
        *render_blocks(intro, "        "),
        "      </div>",
        "    </header>",
        "",
        "    <article>",
    ]
    for heading, body in sections:
        sid = slug(heading)
        out += [
            f'      <section aria-labelledby="{sid}">',
            f'        <h2 id="{sid}">{inline(heading)}</h2>',
            *render_blocks(body, "        "),
            "      </section>",
            "",
        ]
    out += [
        "    </article>",
        "",
        '    <footer class="page-footer">',
        f'      <span class="footer-mark">Expense Tracker</span> &middot; {title} &middot; <a href="{names[other[0]]}">{other[1]}</a>',
        "    </footer>",
        "  </main>",
        "</body>",
        "</html>",
        "",
    ]
    (out_dir / names[name]).write_text("\n".join(out), encoding="utf8")


if __name__ == "__main__":
    hosted = len(sys.argv) > 1
    out_dir = pathlib.Path(sys.argv[1]).resolve() if hosted else DOCS
    names = HOSTED_NAMES if hosted else DOCS_NAMES
    for page in PAGES:
        build(*page, out_dir, names)
    print("Built", ", ".join(str(out_dir / names[p[0]]) for p in PAGES))
