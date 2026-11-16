"""Local stdio MCP bridge to one short-lived AgentBay Windows desktop.

No listening port. Use AGENTBAY_API_KEY or an explicitly selected private file. Windows actions use the
official SDK's real MCP calls; this bridge never invents a native-GUI PASS.
"""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import ntpath
import os
from pathlib import Path
import re
import secrets
import sys
import urllib.request
import zipfile

from prepare import APP_INVENTORY_SHA, EXE_SHA, RAR_SHA, digest, inventory_digest, relative_name

SDK_VERSION = "0.22.3"
REGIONS = ("cn-hangzhou", "ap-southeast-1", "us-east-1")
HERE = Path(__file__).resolve().parent


def utc():
    return datetime.now(timezone.utc).isoformat()


def ps_literal(value):
    return "'" + value.replace("'", "''") + "'"


def powershell_command(script):
    encoded = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    command = "powershell.exe -NoProfile -NonInteractive -EncodedCommand " + encoded
    if len(command) > 7800:
        raise ValueError("PowerShell command exceeds the Windows cmd limit; use a reviewed .ps1 file")
    return command


def tool(name, description, properties=None, required=None):
    return {"name": name, "description": description, "inputSchema": {
        "type": "object", "properties": properties or {},
        "required": required or [], "additionalProperties": False}}


INT = {"type": "integer", "minimum": 0, "maximum": 32768}
TEXT = {"type": "string"}
TOOLS = [
    tool("cloud_plan", "Read readiness and cost notes. Does not create a session."),
    tool("cloud_create", "Create ONE billable Windows session, idle release 5 min, maximum 30 min. No paid plan upgrade."),
    tool("cloud_deploy", "Upload the private official package, verify every file, launch the unchanged original EXE."),
    tool("desktop_screenshot", "Capture actual Windows desktop pixels; save PNG and return image. Not a GUI PASS."),
    tool("desktop_windows", "List real Windows desktop windows and process IDs."),
    tool("desktop_click", "Real native mouse click.", {"x": INT, "y": INT,
         "button": {"type": "string", "enum": ["left", "right", "double_left"]}}, ["x", "y"]),
    tool("desktop_drag", "Real native mouse drag.", {k: INT for k in ("from_x", "from_y", "to_x", "to_y")},
         ["from_x", "from_y", "to_x", "to_y"]),
    tool("desktop_keys", "Press native Windows keys; use the current SDK key names.",
         {"keys": {"type": "array", "items": TEXT, "minItems": 1, "maxItems": 10}}, ["keys"]),
    tool("desktop_type", "Type Unicode text into the active native control.",
         {"text": {"type": "string", "maxLength": 4000}}, ["text"]),
    tool("windows_powershell", "Run a bounded diagnostic command inside this Windows session; keep original EXE unchanged.",
         {"script": {"type": "string", "maxLength": 2400}}, ["script"]),
    tool("collect_project", "Read a saved file beneath this run's app directory into private local evidence; record SHA-256.",
         {"path": TEXT}, ["path"]),
    tool("cloud_stop", "Delete this bridge's session and save its cleanup receipt."),
]


class Desktop:
    def __init__(self, payload, run_dir, region, image, key_file=None):
        self.payload = Path(payload).resolve() if payload else None
        base = Path(run_dir).resolve()
        base.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.out = base / ("run-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + secrets.token_hex(3))
        self.out.mkdir(mode=0o700)
        self.out.chmod(0o700)
        self.region, self.image = region, image
        self.client = self.session = self.remote_app = None
        self.sequence = 0
        self.key = os.environ.get("AGENTBAY_API_KEY", "")
        if not self.key and key_file and Path(key_file).exists():
            selected = Path(key_file)
            if os.name != "nt" and selected.stat().st_mode & 0o077:
                raise ValueError("The explicitly selected key file must have mode 600")
            self.key = selected.read_text(encoding="utf-8").strip()
        self._write("acceptance.json", {"verdict": "BLOCKED", "reason": "Native acceptance has not been driven",
                    "required": ["new", "open", "edit", "measure_check", "save", "reopen", "edge_case"],
                    "observations": {}})

    def clean(self, value):
        if isinstance(value, str):
            if self.key:
                value = value.replace(self.key, "[API KEY REDACTED]")
            return re.sub(r"https?://[^\s<>\"]+", "[PRIVATE URL REDACTED]", value)
        if isinstance(value, dict):
            return {k: self.clean(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self.clean(v) for v in value]
        return value

    def _write(self, name, data):
        path = self.out / name
        path.write_text(json.dumps(self.clean(data), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        path.chmod(0o600)

    def record(self, operation, data):
        self.sequence += 1
        self._write(f"{self.sequence:03d}-{operation}.json", {"utc": utc(), **data})

    def result(self, operation, result, args=None):
        data = {k: getattr(result, k) for k in (
            "success", "request_id", "error_message", "exit_code", "stdout", "stderr") if hasattr(result, k)}
        self.record(operation, {"arguments": args or {}, "response": data})
        if getattr(result, "success", None) is not True:
            raise RuntimeError(self.clean(data.get("error_message") or f"{operation} failed"))
        return data

    def plan(self):
        try:
            version = importlib.metadata.version("wuying-agentbay-sdk")
        except importlib.metadata.PackageNotFoundError:
            version = None
        return {"verdict": "BLOCKED", "native_gui": "NOT_RUN", "sdk_installed": version,
                "sdk_required": SDK_VERSION, "api_key_present": bool(self.key),
                "payload_present": bool(self.payload and self.payload.is_file()),
                "region": self.region, "requested_image": self.image,
                "lifecycle_minutes": {"idle_release_timeout": 5, "max_runtime": 30},
                "billing": "CPU/memory are usage-billed even on Basic. No subscription purchase by this tool.",
                "session_id": getattr(self.session, "session_id", None),
                "evidence_directory": str(self.out),
                "note": "windows_latest is mutable. Record Windows build; prefer a fixed authorized image for repeat runs."}

    def validate_payload(self):
        if not self.payload or not self.payload.is_file():
            raise ValueError("Prepare the private official payload before creating a billable session")
        with zipfile.ZipFile(self.payload) as package:
            names = package.namelist()
            for name in names:
                relative_name(name)
            if len(names) != len(set(names)) or sum(i.file_size for i in package.infolist()) > 512 * 1024 * 1024:
                raise ValueError("Unsafe or oversized payload")
            manifest = json.loads(package.read("ETCAD-REA-MANIFEST.json"))
            if manifest["archive_sha256"] != RAR_SHA or manifest["exe_sha256"] != EXE_SHA:
                raise ValueError("Payload has an unrecognized source identity")
            if inventory_digest(manifest["files"]) != APP_INVENTORY_SHA:
                raise ValueError("Payload inventory differs from the pinned original application files")
            if set(names) != {f["path"] for f in manifest["files"]} | {"ETCAD-REA-MANIFEST.json"}:
                raise ValueError("Payload differs from its file inventory")
            for item in manifest["files"]:
                data = package.read(item["path"])
                if len(data) != item["bytes"] or hashlib.sha256(data).hexdigest() != item["sha256"]:
                    raise ValueError("Payload file mismatch")
            if hashlib.sha256(package.read("ETCOM_PSV.exe")).hexdigest() != EXE_SHA:
                raise ValueError("Original EXE changed")
        return {"payload_sha256": digest(self.payload), "app_files": len(manifest["files"]),
                "original_exe_sha256": EXE_SHA, "original_archive_sha256": RAR_SHA}

    def create(self):
        if self.session:
            raise RuntimeError("This bridge already owns a session")
        if not self.key:
            raise RuntimeError("BLOCKED: set AGENTBAY_API_KEY as a private environment secret; do not paste it in chat")
        if importlib.metadata.version("wuying-agentbay-sdk") != SDK_VERSION:
            raise RuntimeError("Install the pinned SDK from tools/agentbay/requirements.txt")
        identity = self.validate_payload()
        os.environ["AGENTBAY_LOG_LEVEL"] = "CRITICAL"
        previous_cwd = Path.cwd()
        try:
            os.chdir(self.out)  # SDK's import-time log file stays in the private run.
            from agentbay import AgentBay, Config, CreateSessionParams, LifecyclePolicy
            from loguru import logger
        finally:
            os.chdir(previous_cwd)
        logger.remove()  # SDK stdout must never contaminate MCP or disclose signed URLs.
        self.client = AgentBay(api_key=self.key, cfg=Config(region_id=self.region), env_file=os.devnull)
        params = CreateSessionParams(image_id=self.image,
            labels={"project": "ETCAD-rea", "purpose": "native-acceptance"},
            lifecycle_policy=LifecyclePolicy(idle_release_timeout=5, max_runtime=30))
        result = self.client.create(params)
        # Own the handle before any evidence/connection calls can fail, so EOF cleanup still runs.
        self.session = getattr(result, "session", None)
        self.result("create", result)
        if not self.session:
            raise RuntimeError("Service returned success without a session")
        self._write("session.json", {"session_id": self.session.session_id, "region": self.region,
                    "requested_image": self.image, "created_utc": utc(), **identity})
        if self.session.resource_url:
            connection = self.out / "connect-private.txt"
            connection.write_text(self.session.resource_url + "\n", encoding="utf-8")
            connection.chmod(0o600)
        catalog = self.session.list_mcp_tools(image_id=self.image)
        self.session.mcpTools = catalog.tools
        observed_tools = [{"name": t.name, "server": t.server} for t in catalog.tools]
        self.record("windows-mcp-catalog", {"request_id": catalog.request_id, "tools": observed_tools})
        return {"session_id": self.session.session_id, "stage": "CREATED", **identity,
                "connection_file": str(self.out / "connect-private.txt") if self.session.resource_url else None,
                "native_gui": "NOT_RUN", "observed_windows_mcp_tools": observed_tools}

    def require_session(self):
        if not self.session:
            raise RuntimeError("No owned session. Call cloud_create first.")
        return self.session

    def ps(self, script):
        result = self.require_session().command.execute_command(powershell_command(script), timeout_ms=50000)
        return self.result("powershell", result, {"script": script})

    def deploy(self):
        session = self.require_session()
        if self.remote_app:
            raise RuntimeError("Already deployed. Use the current app and preserve its evidence.")
        identity = self.validate_payload()
        # Abort early if the service returned a non-Windows image. No Wine substitution.
        self.ps("if ($env:OS -ne 'Windows_NT') { throw 'Expected native Windows' }; [Environment]::OSVersion.VersionString")
        transfer = session.file_system.get_file_transfer_context_path()
        if not transfer or not ntpath.isabs(transfer) or '"' in transfer:
            raise RuntimeError("Windows file-transfer context unavailable; no alternate public upload is used")
        root = ntpath.join(transfer, "etcad-" + self.out.name)
        self.result("mkdir", session.file_system.create_directory(root))
        archive = ntpath.join(root, "et-learning-private.zip")
        script_path = ntpath.join(root, "Deploy-Learning.ps1")
        self.result("upload", session.file_system.upload_file(str(self.payload), archive, wait_timeout=120))
        self.result("write-bootstrap", session.file_system.write_file(script_path,
                    (HERE / "Deploy-Learning.ps1").read_text(encoding="utf-8")))
        command = f'powershell.exe -NoProfile -NonInteractive -File "{script_path}" -Archive "{archive}" -ExpectedArchiveSha256 {identity["payload_sha256"]}'
        deployed = session.command.execute_command(command, timeout_ms=50000)
        self.result("deploy", deployed)
        receipt = json.loads(deployed.stdout or deployed.output)
        if receipt.get("exe_sha256") != EXE_SHA or receipt.get("checked_files") != identity["app_files"]:
            raise RuntimeError("Native deployment receipt has the wrong file identity")
        self.remote_app = receipt["app_directory"]
        self._write("windows-host.json", receipt)
        self.result("launch-original", session.computer.start_app('"' + receipt["exe"] + '"', self.remote_app))
        return {"stage": "LAUNCH_REQUESTED", "native_gui": "NOT_VERIFIED", "host": receipt,
                "next": "Capture the actual desktop, inspect launch errors, then drive acceptance."}

    def screenshot(self):
        session = self.require_session()
        if session.link_url:
            shot = session.computer.beta_take_screenshot(format="png")
            self.result("screenshot", shot)
            data, mime = shot.data, shot.mime_type or "image/png"
        else:
            shot = session.computer.screenshot()
            self.result("screenshot", shot)
            if not isinstance(shot.data, str) or not shot.data.startswith("https://"):
                raise RuntimeError("Screenshot did not return an HTTPS image URL")
            with urllib.request.urlopen(shot.data, timeout=30) as response:
                data, mime = response.read(16 * 1024 * 1024 + 1), response.headers.get_content_type()
        if len(data) > 16 * 1024 * 1024 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("Expected a bounded PNG screenshot")
        name = f"{self.sequence:03d}-desktop.png"
        (self.out / name).write_bytes(data)
        self._write(f"{self.sequence:03d}-desktop-hash.json", {"sha256": hashlib.sha256(data).hexdigest(), "file": name})
        return {"content": [{"type": "text", "text": json.dumps({"saved": str(self.out / name), "native_gui": "REQUIRES_REVIEW"})},
                            {"type": "image", "mimeType": mime, "data": base64.b64encode(data).decode("ascii")} ]}

    def collect(self, path):
        if not self.remote_app or ntpath.commonpath([ntpath.normcase(ntpath.abspath(path)),
                ntpath.normcase(self.remote_app)]) != ntpath.normcase(self.remote_app):
            raise ValueError("Only files inside this run's app directory can be collected")
        result = self.require_session().file_system.read_file(path, format="bytes")
        self.result("collect-project", result, {"path": path})
        data = result.content
        if not isinstance(data, bytes) or len(data) > 32 * 1024 * 1024:
            raise ValueError("Project export is not a bounded binary file")
        name = f"{self.sequence:03d}-" + ntpath.basename(path)
        (self.out / name).write_bytes(data)
        receipt = {"remote_path": path, "local_file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        self._write(f"{self.sequence:03d}-file-hash.json", receipt)
        return receipt

    def stop(self):
        if not self.session:
            return {"stage": "NO_OWNED_SESSION"}
        sid = self.session.session_id
        result = self.client.delete(self.session)
        data = self.result("delete", result)
        self.session = None
        self._write("cleanup.json", {"session_id": sid, "utc": utc(), **data})
        return {"stage": "DELETED", "session_id": sid, **data}

    def call(self, name, args):
        definition = next((t for t in TOOLS if t["name"] == name), None)
        if definition is None or not isinstance(args, dict):
            raise ValueError("Unknown tool or invalid arguments")
        schema = definition["inputSchema"]
        if set(args) - schema["properties"].keys() or any(k not in args for k in schema["required"]):
            raise ValueError("Unexpected or missing tool arguments")
        for key, value in args.items():
            spec = schema["properties"][key]
            if spec["type"] == "integer" and (type(value) is not int or not 0 <= value <= 32768):
                raise ValueError("Invalid screen coordinate")
            if spec["type"] == "string" and (not isinstance(value, str) or len(value) > spec.get("maxLength", 8000)):
                raise ValueError("Invalid text argument")
            if "enum" in spec and value not in spec["enum"]:
                raise ValueError("Invalid mouse button")
            if spec["type"] == "array" and (not isinstance(value, list) or not 1 <= len(value) <= 10
                    or any(not isinstance(v, str) for v in value)):
                raise ValueError("Invalid key list")
        simple = {"cloud_plan": self.plan, "cloud_create": self.create, "cloud_deploy": self.deploy,
                  "desktop_screenshot": self.screenshot, "cloud_stop": self.stop}
        if name in simple:
            return simple[name]()
        if name == "windows_powershell":
            return self.ps(args["script"])
        if name == "collect_project":
            return self.collect(args["path"])
        computer = self.require_session().computer
        if name == "desktop_windows":
            result = computer.list_root_windows()
            data = self.result(name, result)
            data["windows"] = [{k: getattr(w, k, None) for k in ("window_id", "title", "pid", "pname",
                               "absolute_upper_left_x", "absolute_upper_left_y", "width", "height")}
                               for w in result.windows]
            self.record("window-inventory", data)
            return data
        methods = {"desktop_click": computer.click_mouse, "desktop_drag": computer.drag_mouse,
                   "desktop_keys": computer.press_keys, "desktop_type": computer.input_text}
        return self.result(name, methods[name](**args), args)


def serve(desktop):
    for line in sys.stdin:
        if len(line) > 1024 * 1024:
            raise ValueError("MCP request exceeds size limit")
        request = json.loads(line)
        if "id" not in request:
            continue
        method, params = request.get("method"), request.get("params", {})
        try:
            if method == "initialize":
                result = {"protocolVersion": "2025-03-26", "capabilities": {"tools": {}},
                          "serverInfo": {"name": "etcad-agentbay-windows", "version": "0.1.0"}}
            elif method == "tools/list":
                result = {"tools": TOOLS}
            elif method == "tools/call":
                data = desktop.call(params["name"], params.get("arguments", {}))
                result = data if "content" in data else {"content": [{"type": "text", "text": json.dumps(desktop.clean(data), ensure_ascii=False)}]}
            elif method == "ping":
                result = {}
            else:
                raise ValueError("Unsupported method")
        except Exception as exc:
            message = desktop.clean(str(exc))
            desktop.record("blocked", {"method": method, "error": message})
            result = {"isError": True, "content": [{"type": "text", "text": message}]}
        print(json.dumps({"jsonrpc": "2.0", "id": request["id"], "result": result}, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", help="Private ZIP from prepare.py")
    parser.add_argument("--run-dir", required=True, help="Private evidence parent directory, outside Git; a fresh run is created")
    parser.add_argument("--region", choices=REGIONS, default="cn-hangzhou")
    parser.add_argument("--image", default="windows_latest", help="Windows image ID available to your account")
    parser.add_argument("--key-file", help="Optional explicitly selected private key file; never searched automatically")
    parser.add_argument("--serve", action="store_true", help="Run local stdio MCP; EOF deletes the owned session")
    args = parser.parse_args()
    desktop = Desktop(args.payload, args.run_dir, args.region, args.image, args.key_file)
    try:
        if args.serve:
            serve(desktop)
        else:
            print(json.dumps(desktop.plan(), ensure_ascii=False, indent=2))
    finally:
        if desktop.session:
            try:
                desktop.stop()
            except Exception as exc:
                desktop.record("cleanup-failed", {"session_id": desktop.session.session_id,
                               "error": desktop.clean(str(exc)), "action": "Delete this session in the AgentBay console"})
                print("Cleanup failed; use the session ID in private evidence to release it in AgentBay console.", file=sys.stderr)


if __name__ == "__main__":
    main()
