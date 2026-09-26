"""Write a 512×512 PNG app icon without extra dependencies."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def png(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        row = y * width
        for x in range(width):
            raw.extend(pixels[row + x])

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def rounded_rect(x: int, y: int, w: int, h: int, r: int, px: int, py: int) -> bool:
    if px < x or py < y or px >= x + w or py >= y + h:
        return False
    cx = min(max(px, x + r), x + w - 1 - r)
    cy = min(max(py, y + r), y + h - 1 - r)
    if (px - cx) ** 2 + (py - cy) ** 2 <= r * r:
        return True
    if x + r <= px < x + w - r or y + r <= py < y + h - r:
        return True
    return False


def main() -> None:
    size = 512
    pixels: list[tuple[int, int, int, int]] = []
    for y in range(size):
        for x in range(size):
            # transparent padding
            if not rounded_rect(16, 16, 480, 480, 96, x, y):
                pixels.append((0, 0, 0, 0))
                continue
            t = (x + y) / (2 * size)
            fill = (
                lerp(18, 36, t),
                lerp(58, 92, t),
                lerp(72, 108, t),
                255,
            )
            pixels.append(fill)

    # document card
    for y in range(size):
        for x in range(size):
            if rounded_rect(132, 88, 248, 320, 28, x, y):
                pixels[y * size + x] = (244, 246, 243, 255)
            elif rounded_rect(156, 148, 200, 18, 6, x, y):
                pixels[y * size + x] = (47, 110, 92, 255)
            elif rounded_rect(156, 192, 168, 14, 6, x, y):
                pixels[y * size + x] = (168, 186, 176, 255)
            elif rounded_rect(156, 226, 188, 14, 6, x, y):
                pixels[y * size + x] = (168, 186, 176, 255)
            elif rounded_rect(156, 260, 148, 14, 6, x, y):
                pixels[y * size + x] = (168, 186, 176, 255)

    # magnifying glass
    cx, cy, r = 348, 348, 54
    for y in range(size):
        for x in range(size):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if 38 * 38 <= d2 <= r * r:
                pixels[y * size + x] = (232, 196, 92, 255)
            handle_x = x - 392
            handle_y = y - 392
            if 0 <= handle_x + handle_y <= 70 and abs(handle_x - handle_y) < 16:
                if x > 360 and y > 360:
                    pixels[y * size + x] = (232, 196, 92, 255)

    out = Path(__file__).resolve().parents[1] / "resources" / "icon.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(png(size, size, pixels))
    print(out)


if __name__ == "__main__":
    main()
