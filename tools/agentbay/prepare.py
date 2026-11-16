"""Build a private ZIP from the hash-pinned official ETCAD learning archive.

Uses the host's libarchive; never executes vendor files. No vendor bytes go in Git.
"""
import argparse
import ctypes as C
import ctypes.util
import hashlib
import json
from pathlib import Path, PurePosixPath
import urllib.request
import zipfile

URL = "https://download.etsystem.cn/ET_PSV.rar"
RAR_SHA = "28b001a8edf9e21385bc833ed448390c02547195a7facea6e3fff6a4f856a77e"
EXE_SHA = "a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba"
APP_INVENTORY_SHA = "f5784b07f648b7605e96c979666e1d586d878910de91eede411e3599466a0d9e"
PREFIX = "ET_PSV/ET_学习版/"


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory_digest(files):
    canonical = json.dumps(files, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def relative_name(name):
    name = name.replace("\\", "/")
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or ":" in name or "\x00" in name:
        raise ValueError("Unsafe archive path")
    return path


def extract(archive, root):
    library = ctypes.util.find_library("archive")
    if not library:
        raise RuntimeError("libarchive is required (Ubuntu: libarchive13)")
    lib = C.CDLL(library)
    signatures = [
        ("archive_read_new", [], C.c_void_p),
        ("archive_read_support_format_all", [C.c_void_p], C.c_int),
        ("archive_read_support_filter_all", [C.c_void_p], C.c_int),
        ("archive_read_open_filename", [C.c_void_p, C.c_char_p, C.c_size_t], C.c_int),
        ("archive_read_next_header", [C.c_void_p, C.POINTER(C.c_void_p)], C.c_int),
        ("archive_entry_pathname", [C.c_void_p], C.c_char_p),
        ("archive_entry_filetype", [C.c_void_p], C.c_uint),
        ("archive_read_data", [C.c_void_p, C.c_void_p, C.c_size_t], C.c_ssize_t),
        ("archive_error_string", [C.c_void_p], C.c_char_p),
        ("archive_read_free", [C.c_void_p], C.c_int),
    ]
    for name, args, result in signatures:
        fn = getattr(lib, name)
        fn.argtypes, fn.restype = args, result
    handle = lib.archive_read_new()
    entry, buffer, total, count = C.c_void_p(), C.create_string_buffer(65536), 0, 0
    try:
        lib.archive_read_support_format_all(handle)
        lib.archive_read_support_filter_all(handle)
        if lib.archive_read_open_filename(handle, str(archive).encode(), 65536) != 0:
            raise RuntimeError("Cannot open pinned RAR")
        while True:
            rc = lib.archive_read_next_header(handle, C.byref(entry))
            if rc == 1:
                break
            if rc < 0:
                raise RuntimeError(str(lib.archive_error_string(handle)))
            name = lib.archive_entry_pathname(entry).decode("utf-8", errors="strict")
            path = root / relative_name(name)
            kind = lib.archive_entry_filetype(entry)
            if kind == 0o040000:
                path.mkdir(parents=True, exist_ok=True)
                continue
            if kind != 0o100000:
                raise ValueError("Only regular files and directories are admitted")
            count += 1
            if count > 2000:
                raise ValueError("Archive contains too many files")
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as stream:
                while True:
                    size = lib.archive_read_data(handle, buffer, len(buffer))
                    if size == 0:
                        break
                    if size < 0:
                        raise RuntimeError("RAR extraction failed")
                    total += size
                    if total > 512 * 1024 * 1024:
                        raise ValueError("Archive exceeds extraction limit")
                    stream.write(buffer.raw[:size])
    finally:
        lib.archive_read_free(handle)
    return count


def prepare(out, archive=None):
    out = Path(out).resolve()
    out.mkdir(parents=True, exist_ok=False, mode=0o700)
    archive = Path(archive).resolve() if archive else out / "ET_PSV.rar"
    if not archive.exists():
        with urllib.request.urlopen(URL, timeout=60) as response, archive.open("xb") as stream:
            size = 0
            while chunk := response.read(65536):
                size += len(chunk)
                if size > 32 * 1024 * 1024:
                    raise ValueError("Download exceeds pinned sample size limit")
                stream.write(chunk)
    if digest(archive) != RAR_SHA:
        raise ValueError("Official archive SHA-256 changed; refusing deployment")
    extracted = out / "extracted"
    extracted.mkdir(mode=0o700)
    count = extract(archive, extracted)
    app = extracted / PREFIX
    if digest(app / "ETCOM_PSV.exe") != EXE_SHA:
        raise ValueError("Original EXE SHA-256 mismatch")
    files = [
        {"path": path.relative_to(app).as_posix(), "bytes": path.stat().st_size,
         "sha256": digest(path)}
        for path in sorted(app.rglob("*")) if path.is_file()
    ]
    if inventory_digest(files) != APP_INVENTORY_SHA:
        raise ValueError("Application files differ from the independently recorded official inventory")
    manifest = {"source_url": URL, "archive_sha256": RAR_SHA,
                "exe_sha256": EXE_SHA, "original_archive_files": count, "files": files}
    payload = out / "et-learning-private.zip"
    with zipfile.ZipFile(payload, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for record in files:
            info = zipfile.ZipInfo(record["path"], date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, (app / record["path"]).read_bytes())
        info = zipfile.ZipInfo("ETCAD-REA-MANIFEST.json", date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        package.writestr(info, json.dumps(manifest, ensure_ascii=False, indent=2))
    payload.chmod(0o600)
    receipt = {"payload_sha256": digest(payload), "payload_bytes": payload.stat().st_size,
               "original_archive_files": count, "app_files": len(files),
               "original_exe_sha256": EXE_SHA, "source_archive_sha256": RAR_SHA,
               "note": "Private repack; every application file is unmodified. No app was executed."}
    (out / "payload.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="New private directory outside the repository")
    parser.add_argument("--archive", help="Optional existing official ET_PSV.rar")
    args = parser.parse_args()
    print(json.dumps(prepare(args.out, args.archive), ensure_ascii=False, indent=2))
