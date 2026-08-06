#!/usr/bin/env python3
"""Re-export raster-wrapped SVGs as webp.

The legacy icon art in public/images/services/*.svg are raster-wrapped
vectors (AI/Illustrator exports): each embeds a base64 raster that the SVG
just re-wraps (~33% base64 encoding tax, plus full raster weight).

This decodes the embedded raster and writes `<stem>.webp` next to the SVG.
ServiceImage prefers the webp when present; the SVG remains as fallback.
True vector SVGs (no embedded raster) are left untouched.

Usage:
  python scripts/export-webp.py                  # audit + convert everything
  python scripts/export-webp.py --quality 80
"""
from __future__ import annotations

import argparse
import base64
import binascii
import io
import re
from pathlib import Path

from PIL import Image, ImageOps

SERVICES_DIR = Path("apps/customer/public/images/services")
BASE64_RE = re.compile(rb"base64,([A-Za-z0-9+/=]+)")
MAX_EDGE = 1024  # icon art is displayed <= ~640px; keep headroom


def embedded_rasters(svg: bytes) -> list[bytes]:
    """Decode every base64 raster embedded in the SVG, largest first."""
    chunks: list[bytes] = []
    for m in BASE64_RE.finditer(svg):
        raw = m.group(1)
        if len(raw) < 1000:  # skip tiny fragments / data-uri noise
            continue
        try:
            data = base64.b64decode(raw, validate=True)
        except (binascii.Error, ValueError):
            continue
        # Must be a decodable image (PNG/JPEG/GIF/WebP), not random bytes
        try:
            with Image.open(io.BytesIO(data)) as probe:
                probe.verify()
        except Exception:
            continue
        chunks.append(data)
    chunks.sort(key=len, reverse=True)
    return chunks


def convert(svg_path: Path, quality: int) -> Path | None:
    rasters = embedded_rasters(svg_path.read_bytes())
    if not rasters:
        return None

    with Image.open(io.BytesIO(rasters[0])) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        if max(im.size) > MAX_EDGE:
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

        out = svg_path.with_suffix(".webp")
        im.save(out, "WEBP", quality=quality, method=6)
        return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quality", type=int, default=82, help="webp quality (default 82)")
    parser.add_argument("--dry-run", action="store_true", help="audit only, write nothing")
    args = parser.parse_args()

    svgs = sorted(SERVICES_DIR.glob("*.svg"))
    converted: list[tuple[str, int, int]] = []
    skipped = 0

    for svg in svgs:
        out = convert(svg, args.quality)
        if out is None:
            skipped += 1
            print(f"vector (untouched): {svg.name}")
        else:
            before = svg.stat().st_size
            after = out.stat().st_size if out.exists() and not args.dry_run else 0
            pct = 100 * after / before if after else 0
            converted.append((out.name, before, after))
            print(f"webp: {svg.name} -> {out.name} ({after / 1024:.0f}KB, {pct:.0f}% of svg)")

    total_before = sum(b for _, b, _ in converted)
    total_after = sum(a for _, _, a in converted)
    print(f"\n{len(converted)} raster(s) converted, {skipped} vector(s) skipped")
    if converted:
        print(f"total: {total_before / 1024 / 1024:.1f}MB -> {total_after / 1024 / 1024:.1f}MB "
              f"({100 * total_after / total_before:.0f}% retained)")


if __name__ == "__main__":
    main()
