"""Exercise the actual local MCP boundary and payload guards, without a cloud account.

These checks cannot establish that ETCAD runs on Windows. They deliberately remove
the API key from the child and preserve a BLOCKED native acceptance verdict.
"""
import argparse
import inspect
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

from cloud import Desktop, EXE_SHA, SDK_VERSION, TOOLS, powershell_command
from prepare import relative_name


def run(payload, output):
    checks = []
    from agentbay import AgentBay, Computer, Session, CreateSessionParams, LifecyclePolicy
    from agentbay._sync.filesystem import FileSystem
    import importlib.metadata
    assert importlib.metadata.version("wuying-agentbay-sdk") == SDK_VERSION
    contract = [(AgentBay, "create", ("params",)), (AgentBay, "delete", ("session",)),
                (Computer, "start_app", ("start_cmd", "work_directory")),
                (Computer, "click_mouse", ("x", "y", "button")),
                (Computer, "drag_mouse", ("from_x", "from_y", "to_x", "to_y")),
                (Computer, "press_keys", ("keys",)), (Computer, "input_text", ("text",)),
                (Computer, "screenshot", ()), (Computer, "beta_take_screenshot", ("format",)),
                (Computer, "list_root_windows", ()), (Session, "call_mcp_tool", ("tool_name", "args")),
                (Session, "list_mcp_tools", ("image_id",)),
                (FileSystem, "create_directory", ("path",)),
                (FileSystem, "write_file", ("path", "content")),
                (FileSystem, "upload_file", ("local_path", "remote_path", "wait_timeout")),
                (FileSystem, "read_file", ("path", "format"))]
    for cls, method, parameters in contract:
        signature = inspect.signature(getattr(cls, method))
        assert set(parameters) <= signature.parameters.keys(), (method, signature)
    params = CreateSessionParams(image_id="windows_latest",
             lifecycle_policy=LifecyclePolicy(idle_release_timeout=5, max_runtime=30))
    assert params.lifecycle_policy.max_runtime == 30 and not params.lifecycle_policy.manual_release
    checks.append({"check": "installed SDK contracts and finite cloud lifecycle", "passed": True})

    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        desktop = Desktop(payload, base / "payload-check", "cn-hangzhou", "windows_latest")
        receipt = desktop.validate_payload()
        assert receipt["original_exe_sha256"] == EXE_SHA and receipt["app_files"] == 242
        checks.append({"check": "real private payload: every file and original EXE hash", "passed": True, **receipt})
        tampered = base / "tampered.zip"
        with zipfile.ZipFile(payload) as source, zipfile.ZipFile(tampered, "w") as dest:
            for name in source.namelist():
                data = source.read(name)
                dest.writestr(name, data + b"changed" if name == "ETCOM_PSV.exe" else data)
        altered = Desktop(tampered, base / "tamper-check", "cn-hangzhou", "windows_latest")
        try:
            altered.validate_payload()
        except ValueError:
            pass
        else:
            raise AssertionError("Modified original EXE was admitted")
        for path in ("../escape.exe", "C:/escape.exe", "/absolute", "dir\\..\\escape"):
            try:
                relative_name(path)
            except ValueError:
                continue
            raise AssertionError("Unsafe archive name was admitted")
        try:
            powershell_command("x" * 4000)
        except ValueError:
            pass
        else:
            raise AssertionError("Oversized Windows command was admitted")
        checks.append({"check": "reject tampered EXE, traversal and Windows command overflow", "passed": True})

        selected_key = base / "explicit-key"
        selected_key.write_text("example-key-for-local-redaction-check\n")
        selected_key.chmod(0o600)
        prior_key = os.environ.pop("AGENTBAY_API_KEY", None)
        try:
            private = Desktop(payload, base / "key-check", "cn-hangzhou", "windows_latest", selected_key)
            assert private.plan()["api_key_present"] is True
            private.record("redaction", {"text": "example-key-for-local-redaction-check https://private.example/?token=example"})
            logged = (private.out / "001-redaction.json").read_text()
            assert "example-key-for-local-redaction-check" not in logged and "token=example" not in logged
        finally:
            if prior_key is not None:
                os.environ["AGENTBAY_API_KEY"] = prior_key
        rejected_input = base / "must-not-exist"
        entry = subprocess.run([sys.executable, str(Path(__file__).with_name("save_key.py")),
            "--file", str(rejected_input)], input="not-a-real-key\n", text=True, capture_output=True, timeout=5)
        assert entry.returncode != 0 and not rejected_input.exists()
        checks.append({"check": "explicit private key file, redacted evidence, refuse non-terminal key entry", "passed": True})

        requests = [
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
                "protocolVersion": "2025-03-26", "capabilities": {},
                "clientInfo": {"name": "etcad-bridge-check", "version": "0.1.0"}}},
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "cloud_plan", "arguments": {}}},
            {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "cloud_create", "arguments": {}}},
            {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "desktop_click", "arguments": {"x": -1, "y": 0}}},
            {"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "cloud_stop", "arguments": {}}},
        ]
        env = {k: v for k, v in os.environ.items() if k != "AGENTBAY_API_KEY"}
        process = subprocess.run([sys.executable, str(Path(__file__).with_name("cloud.py")),
            "--serve", "--payload", str(payload), "--run-dir", str(base / "protocol")],
            input="".join(json.dumps(r) + "\n" for r in requests), text=True,
            capture_output=True, timeout=30, env=env)
        assert process.returncode == 0, process.stderr
        replies = [json.loads(line) for line in process.stdout.splitlines()]
        by_id = {reply["id"]: reply["result"] for reply in replies}
        assert by_id[1]["serverInfo"]["name"] == "etcad-agentbay-windows"
        assert len(by_id[2]["tools"]) == len(TOOLS)
        plan = json.loads(by_id[3]["content"][0]["text"])
        assert plan["api_key_present"] is False and plan["verdict"] == "BLOCKED"
        assert by_id[4]["isError"] and "AGENTBAY_API_KEY" in by_id[4]["content"][0]["text"]
        assert by_id[5]["isError"] and "coordinate" in by_id[5]["content"][0]["text"]
        assert json.loads(by_id[6]["content"][0]["text"])["stage"] == "NO_OWNED_SESSION"
        checks.append({"check": "real stdio initialize/list/plan/missing-key guard/input guard/EOF", "passed": True,
                       "tool_count": len(TOOLS), "exit_code": process.returncode})
        # Retain real protocol messages, never a fake Windows response.
        output.mkdir(parents=True, exist_ok=True)
        (output / "mcp-requests.json").write_text(json.dumps(requests, indent=2) + "\n")
        (output / "mcp-responses.json").write_text(json.dumps(replies, ensure_ascii=False, indent=2) + "\n")
    report = {"verdict": "BLOCKED", "scope": "Original ETCAD native Windows acceptance",
              "reason": "No AgentBay API key / authorized Windows session attached",
              "supporting_checks": checks, "cloud_sessions_created": 0, "cloud_charges_incurred": 0,
              "native_gui": "NOT_RUN", "save_reopen": "NOT_RUN"}
    (output / "kit-checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(run(args.payload, args.out), ensure_ascii=False, indent=2))
