"""Minimal, dependency-free MP3 analysis.

``probe_mp3`` walks MPEG audio frames to estimate duration;
``read_id3`` extracts basic text frames from an ID3v2 tag.
Both operate on local files only and never execute anything.
"""

from __future__ import annotations

import struct

# MPEG-1/2 Layer III bitrate table (kbps), index 0..14
_BITRATES: dict[int, list[int]] = {
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
_SAMPLE_RATES: dict[int, list[int]] = {
    1: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
}
_SAMPLES_PER_FRAME = 1152


def _read_id3_size(data: bytes) -> int:
    """Synchsafe integer size of an ID3v2 tag."""
    if len(data) < 10 or data[:3] != b"ID3":
        return 0
    size = 0
    for byte in data[6:10]:
        size = (size << 7) | (byte & 0x7F)
    return size + 10


def read_id3(path: str) -> dict[str, str]:
    """Extract TIT2/TPE1/TALB/TCON from an ID3v2 tag, if present."""
    out: dict[str, str] = {}
    try:
        with open(path, "rb") as handle:
            head = handle.read(10)
            tag_size = _read_id3_size(head)
            if not tag_size:
                return out
            body = handle.read(tag_size - 10)
    except OSError:
        return out

    version = body[1] if len(body) > 3 else 3
    offset = 0
    while offset + 10 <= len(body):
        frame_id = body[offset : offset + 4]
        if version == 4:
            frame_size = int.from_bytes(body[offset + 4 : offset + 8], "big") & 0x0FFFFFFF
        else:
            frame_size = struct.unpack(">I", body[offset + 4 : offset + 8])[0]
        if frame_size <= 0 or offset + 10 + frame_size > len(body):
            break
        payload = body[offset + 10 : offset + 10 + frame_size]
        name = frame_id.decode("latin-1", "ignore")
        if name in ("TIT2", "TPE1", "TALB", "TCON") and payload:
            encoding = payload[0]
            text = payload[1:]
            try:
                if encoding == 1:
                    text = text.decode("utf-16", "ignore")
                elif encoding == 2:
                    text = text.decode("utf-16-be", "ignore")
                else:
                    text = text.decode("latin-1", "ignore")
            except Exception:
                text = ""
            if text:
                out[name] = text.split("\x00")[0].strip()
        offset += 10 + frame_size
    return out


def probe_mp3(path: str) -> dict[str, float | int | None]:
    """Estimate duration (seconds) and frame count of an MP3 file."""
    result: dict[str, float | int | None] = {
        "duration": None,
        "frames": 0,
        "bitrate": None,
        "sample_rate": None,
    }
    try:
        with open(path, "rb") as handle:
            tag_size = _read_id3_size(handle.read(10))
            handle.seek(tag_size)
            frames = 0
            bitrate = 0
            sample_rate = 0
            while True:
                chunk = handle.read(4)
                if len(chunk) < 4:
                    break
                if chunk[0] == 0xFF and (chunk[1] & 0xE0) == 0xE0:
                    version_bits = (chunk[1] >> 3) & 0x03
                    layer_bits = (chunk[1] >> 1) & 0x03
                    if version_bits == 0x01 or layer_bits != 0x01:
                        handle.seek(1, 1)
                        continue
                    version = 1 if version_bits == 0x03 else 2
                    br_index = (chunk[2] >> 4) & 0x0F
                    sr_index = (chunk[2] >> 2) & 0x03
                    padding = (chunk[2] >> 1) & 0x01
                    if br_index in (0, 15) or sr_index == 3:
                        handle.seek(1, 1)
                        continue
                    bitrate = _BITRATES.get(version, _BITRATES[2])[br_index] * 1000
                    sample_rate = _SAMPLE_RATES[version][sr_index]
                    frame_len = int(
                        (144 * bitrate / sample_rate) + padding
                    )
                    if frame_len <= 0:
                        handle.seek(1, 1)
                        continue
                    frames += 1
                    handle.seek(frame_len - 4, 1)
                else:
                    handle.seek(1, 1)
                if frames > 200_000:  # sanity bound
                    break
        if frames and bitrate and sample_rate:
            result["frames"] = frames
            result["duration"] = round(frames * _SAMPLES_PER_FRAME / sample_rate, 2)
            result["bitrate"] = bitrate // 1000
            result["sample_rate"] = sample_rate
    except OSError:
        pass
    return result
