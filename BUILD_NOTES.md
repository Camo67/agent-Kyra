# Agent Kyra Build Notes

This build is for Agent Kyra. Kyra uses MemPalace together with Obsidian as one memory subsystem among many, but Agent Kyra remains the main project and orchestration layer.

## Key requirements

- Python 3.9+
- Node.js 16+
- `ruff>=0.5.3` for the native Ruff server

## Memory stack

- `Obsidian` is the long-term knowledge vault.
- `MemPalace` is used as a searchable memory tool within Kyra's overall architecture.
- Kyra also integrates local LLMs, automation, and external services, so memory is only one part of the system.

## Setup

```bash
npm install
cp local.env .env
# Edit .env with your environment settings
npm run start
```

For Python tooling and development:

```bash
python -m pip install -e ".[dev]"
python -m pip install "ruff>=0.5.3"
```

## Notes

- This repo is centered on Agent Kyra.
- The MemPalace code under `mempalace/` is a supporting memory tool, not the primary product.
- `BUILD_NOTES.md` documents environment and build details for Kyra development.

## References

- Kyra root documentation: `KYRA_README.md`
- Legacy MemPalace docs: `README-MEMPALACE-LEGACY.md`
- Ruff native server discussion: https://github.com/astral-sh/ruff/discussions/15991
