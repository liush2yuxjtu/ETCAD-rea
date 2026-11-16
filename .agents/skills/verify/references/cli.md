# CLI verification example

1. Identify the public CLI executable/entrypoint.
2. Launch it exactly as a user would.
3. Exercise the changed command/flag and capture stdout/stderr plus exit status.
4. Exercise one adjacent boundary input.
5. If interactive, use a real PTY/tmux session and capture the pane.
6. Report only what the running CLI demonstrated.
