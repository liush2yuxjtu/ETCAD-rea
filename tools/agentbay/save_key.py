"""Enter an AgentBay key privately in a terminal; never put it in chat or argv."""
import argparse
import getpass
import os
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path, help="New private file outside Git")
    args = parser.parse_args()
    if not sys.stdin.isatty():
        raise SystemExit("Use an interactive terminal; refusing input that might be echoed.")
    if args.file.exists():
        raise SystemExit("Key file already exists; choose a new file for a rotated key.")
    key = getpass.getpass("AgentBay API Key (hidden): ").strip()
    if not key or any(char.isspace() for char in key):
        raise SystemExit("Expected one non-empty API key without whitespace.")
    args.file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with os.fdopen(os.open(args.file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as stream:
        stream.write(key + "\n")
    print("Private key file saved. Restart the local MCP client; the key was not printed.")


if __name__ == "__main__":
    main()
