from pathlib import Path

from app.audio import probe_mp3, read_id3


def _write_mp3(tmp_path: Path, frames: int = 20) -> Path:
    frame = b"\xff\xfb\x90\x00" + bytes(413)
    path = tmp_path / "silent.mp3"
    path.write_bytes(frame * frames)
    return path


def test_probe_duration(tmp_path):
    path = _write_mp3(tmp_path)
    result = probe_mp3(str(path))
    assert result["frames"] == 20
    assert result["duration"] and result["duration"] > 0


def test_probe_missing_file(tmp_path):
    result = probe_mp3(str(tmp_path / "nope.mp3"))
    assert result["duration"] is None


def test_id3_read_missing_file(tmp_path):
    assert read_id3(str(tmp_path / "nope.mp3")) == {}
