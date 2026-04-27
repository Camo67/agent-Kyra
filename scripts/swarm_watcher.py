#!/usr/bin/env python3
"""File-based swarm coordinator for Kyra's two-machine workflow."""

from __future__ import annotations

import argparse
import contextlib
import dataclasses
import datetime as dt
import os
import platform
import shlex
import subprocess
import sys
import time
from pathlib import Path


TASK_ROLES = {
    "RESEARCH": {"WINDOWS_CODEX"},
    "LEAD_RESEARCH": {"WINDOWS_CODEX"},
    "BROWSER": {"WINDOWS_CODEX"},
    "CODE": {"LINUX_KYRA"},
    "PROTOTYPE": {"LINUX_KYRA"},
    "OUTREACH": {"LINUX_KYRA"},
}

DEFAULT_INTERVAL_SECONDS = 10
DEFAULT_OUTPUT_LIMIT = 4000


@dataclasses.dataclass(frozen=True)
class TaskBlock:
    task_type: str
    line_number: int
    line: str
    block: tuple[str, ...]

    @property
    def has_completion(self) -> bool:
        return any("[COMPLETED:" in line or "[FAILED:" in line for line in self.block)

    @property
    def in_progress_roles(self) -> tuple[str, ...]:
        roles: list[str] = []
        for line in self.block:
            marker = "[IN_PROGRESS:"
            start = line.find(marker)
            if start == -1:
                continue
            start += len(marker)
            end = line.find("]", start)
            if end != -1:
                roles.append(line[start:end].strip())
        return tuple(roles)


class StreamLock:
    """Tiny cross-platform lock using atomic lock-file creation."""

    def __init__(self, stream_path: Path, timeout: float = 5.0, stale_after: float = 120.0):
        self.lock_path = stream_path.with_suffix(stream_path.suffix + ".lock")
        self.timeout = timeout
        self.stale_after = stale_after
        self.fd: int | None = None

    def __enter__(self) -> "StreamLock":
        deadline = time.monotonic() + self.timeout
        while True:
            try:
                self.fd = os.open(self.lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                os.write(self.fd, f"{os.getpid()}\n".encode("utf-8"))
                return self
            except FileExistsError:
                self._remove_stale_lock()
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Timed out waiting for lock {self.lock_path}") from None
                time.sleep(0.2)

    def __exit__(self, exc_type, exc, tb) -> None:
        if self.fd is not None:
            os.close(self.fd)
        with contextlib.suppress(FileNotFoundError):
            self.lock_path.unlink()

    def _remove_stale_lock(self) -> None:
        try:
            age = time.time() - self.lock_path.stat().st_mtime
        except FileNotFoundError:
            return
        if age > self.stale_after:
            with contextlib.suppress(FileNotFoundError):
                self.lock_path.unlink()


def utc_now() -> str:
    return (
        dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    )


def default_role() -> str:
    if os.name == "nt" or platform.system().lower().startswith("win"):
        return "WINDOWS_CODEX"
    return "LINUX_KYRA"


def default_stream_path() -> Path:
    env_path = os.environ.get("COMM_STREAM_PATH")
    if env_path:
        return Path(env_path).expanduser()
    return Path(__file__).resolve().parents[1] / "COMM_STREAM.md"


def ensure_stream(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with StreamLock(path):
        if path.exists():
            return
        path.write_text(
            "# COMM_STREAM\n\n"
            "Shared coordination log for the Kyra AI stack swarm.\n\n"
            "---\n\n"
            f"{utc_now()} [SYSTEM]\n"
            "Initialized swarm communication stream. No active tasks.\n",
            encoding="utf-8",
        )


def parse_task_type(line: str) -> str | None:
    marker = "[TASK:"
    stripped = line.lstrip()
    if not stripped.startswith(marker):
        return None
    start = len(marker)
    end = stripped.find("]", start)
    if end == -1:
        return None
    return stripped[start:end].strip().upper().replace(" ", "_")


def read_task_blocks(path: Path) -> list[TaskBlock]:
    lines = path.read_text(encoding="utf-8").splitlines()
    task_starts: list[tuple[int, str]] = []
    in_fenced_block = False
    for index, line in enumerate(lines):
        if line.lstrip().startswith("```"):
            in_fenced_block = not in_fenced_block
            continue
        if in_fenced_block:
            continue
        task_type = parse_task_type(line)
        if task_type:
            task_starts.append((index, task_type))

    blocks: list[TaskBlock] = []
    for offset, (start, task_type) in enumerate(task_starts):
        end = task_starts[offset + 1][0] if offset + 1 < len(task_starts) else len(lines)
        blocks.append(
            TaskBlock(
                task_type=task_type,
                line_number=start + 1,
                line=lines[start],
                block=tuple(lines[start:end]),
            )
        )
    return blocks


def append_entry(path: Path, role: str, status: str, body: str) -> None:
    entry = f"\n{utc_now()} [{status}: {role}]\n{body.rstrip()}\n"
    with StreamLock(path):
        append_entry_unlocked(path, entry)


def append_entry_unlocked(path: Path, entry: str) -> None:
    with path.open("a", encoding="utf-8") as stream:
        stream.write(entry)


def claimable_task(path: Path, role: str) -> TaskBlock | None:
    with StreamLock(path):
        blocks = read_task_blocks(path)
        for task in reversed(blocks):
            if task.has_completion:
                continue
            allowed_roles = TASK_ROLES.get(task.task_type)
            if allowed_roles and role not in allowed_roles:
                continue
            in_progress = task.in_progress_roles
            if any(active_role != role for active_role in in_progress):
                continue
            if role in in_progress:
                return task
            append_entry_unlocked(
                path,
                f"\n{utc_now()} [IN_PROGRESS: {role}]\n"
                f"Claimed line {task.line_number}: {task.line}\n",
            )
            return task
    return None


def run_command(command: str, task: TaskBlock, role: str, path: Path, output_limit: int) -> int:
    env = os.environ.copy()
    env.update(
        {
            "COMM_STREAM_PATH": str(path),
            "SWARM_ROLE": role,
            "SWARM_TASK_TYPE": task.task_type,
            "SWARM_TASK_LINE": task.line,
        }
    )

    result = subprocess.run(
        command,
        shell=True,
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )
    output = "\n".join(part for part in (result.stdout.strip(), result.stderr.strip()) if part)
    if len(output) > output_limit:
        output = output[:output_limit] + "\n...[truncated]"

    status = "COMPLETED" if result.returncode == 0 else "FAILED"
    append_entry(
        path,
        role,
        status,
        f"Task: {task.line}\n"
        f"Command: {command}\n"
        f"Exit code: {result.returncode}\n"
        f"Output:\n```text\n{output or '(no output)'}\n```",
    )
    return result.returncode


def command_for_display(command: str | None) -> str:
    if not command:
        return "(no command configured)"
    return command if os.name == "nt" else shlex.join(["sh", "-c", command])


def watch(args: argparse.Namespace) -> int:
    path = args.stream.expanduser().resolve()
    role = args.role.upper()
    ensure_stream(path)
    print(f"Watching {path} as {role}")
    print(f"Command: {command_for_display(args.command)}")

    while True:
        task = claimable_task(path, role)
        if task:
            print(f"Claimed {task.task_type} task on line {task.line_number}: {task.line}")
            if args.command:
                return_code = run_command(args.command, task, role, path, args.output_limit)
                if args.once:
                    return return_code
            elif args.once:
                return 0
        elif args.once:
            print("No claimable task found.")
            return 0

        time.sleep(args.interval)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Watch COMM_STREAM.md and claim tasks for the current swarm role."
    )
    parser.add_argument(
        "--stream",
        type=Path,
        default=default_stream_path(),
        help="Path to COMM_STREAM.md. Defaults to COMM_STREAM_PATH or the repo root.",
    )
    parser.add_argument(
        "--role",
        default=os.environ.get("SWARM_ROLE", default_role()),
        help="Role tag to use, for example WINDOWS_CODEX or LINUX_KYRA.",
    )
    parser.add_argument(
        "--command",
        help="Shell command to run after claiming a task. Task details are passed via env vars.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL_SECONDS,
        help="Seconds between checks.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Check once, then exit.",
    )
    parser.add_argument(
        "--output-limit",
        type=int,
        default=DEFAULT_OUTPUT_LIMIT,
        help="Maximum command output characters to append to the stream.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return watch(args)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 130
    except TimeoutError as exc:
        print(f"Lock error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
