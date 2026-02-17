#!/usr/bin/env python3
"""Fetch latest arXiv papers on statistical genetics and related topics."""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ARXIV_API = "http://export.arxiv.org/api/query"

KEYWORDS = [
    "statistical genetics",
    "genetic epidemiology",
    "multi-omics",
    "QTL",
    "single-cell",
    "cell-free",
    "liquid biopsy",
]

CATEGORIES = ["q-bio.GN", "q-bio.QM", "stat.AP", "stat.ML", "stat.ME", "stat.CO"]

ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"


def build_query(include_categories: bool = True) -> str:
    """Build arXiv search query combining keywords and optional category filter."""
    keyword_parts = []
    for kw in KEYWORDS:
        keyword_parts.append(f'ti:"{kw}"')
        keyword_parts.append(f'abs:"{kw}"')
    keyword_clause = " OR ".join(keyword_parts)

    if not include_categories:
        return keyword_clause

    cat_clause = " OR ".join(f"cat:{c}" for c in CATEGORIES)
    return f"({keyword_clause}) AND ({cat_clause})"


def fetch_papers(query: str, max_results: int = 30) -> list[dict]:
    """Query arXiv API and return parsed paper entries."""
    params = urllib.parse.urlencode({
        "search_query": query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    })
    url = f"{ARXIV_API}?{params}"
    print(f"Fetching: {url}")

    req = urllib.request.Request(url, headers={"User-Agent": "arXiv-feed-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()

    root = ET.fromstring(data)
    papers = []

    for entry in root.findall(f"{ATOM_NS}entry"):
        title = entry.findtext(f"{ATOM_NS}title", "").strip().replace("\n", " ")
        # Skip arXiv API error entries
        if not title or title.startswith("Error"):
            continue

        abstract = entry.findtext(f"{ATOM_NS}summary", "").strip().replace("\n", " ")
        published = entry.findtext(f"{ATOM_NS}published", "")

        authors = [
            a.findtext(f"{ATOM_NS}name", "")
            for a in entry.findall(f"{ATOM_NS}author")
        ]

        # Extract arXiv ID and links
        arxiv_id = entry.findtext(f"{ATOM_NS}id", "")
        if "abs/" in arxiv_id:
            arxiv_id = arxiv_id.split("abs/")[-1]

        pdf_url = ""
        abs_url = ""
        for link in entry.findall(f"{ATOM_NS}link"):
            if link.get("title") == "pdf":
                pdf_url = link.get("href", "")
            elif link.get("rel") == "alternate":
                abs_url = link.get("href", "")

        categories = [
            cat.get("term", "")
            for cat in entry.findall(f"{ARXIV_NS}primary_category")
        ]
        categories += [
            cat.get("term", "")
            for cat in entry.findall(f"{ATOM_NS}category")
            if cat.get("term", "") not in categories
        ]

        papers.append({
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "published": published[:10],  # YYYY-MM-DD
            "arxiv_id": arxiv_id,
            "abs_url": abs_url,
            "pdf_url": pdf_url,
            "categories": categories,
        })

    return papers


def main():
    import os

    # Try with category filter first
    papers = fetch_papers(build_query(include_categories=True))
    print(f"Found {len(papers)} papers with category filter")

    # Fall back to keyword-only if too few results
    if len(papers) < 5:
        print("Too few results, broadening search...")
        papers = fetch_papers(build_query(include_categories=False))
        print(f"Found {len(papers)} papers without category filter")

    output = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "papers": papers,
    }

    # Write to arxiv/papers.json relative to repo root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    out_path = os.path.join(repo_root, "arxiv", "papers.json")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(papers)} papers to {out_path}")


if __name__ == "__main__":
    main()
