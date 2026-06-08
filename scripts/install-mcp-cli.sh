#!/usr/bin/env bash
# Install gridviewspec-mcp into the user environment (~/.local/bin by default).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-python3}"
EDITABLE="${EDITABLE:-1}"

if [[ "${EDITABLE}" == "1" ]]; then
  SPEC="-e ${ROOT}[mcp]"
else
  SPEC="django-grid-view[mcp]"
fi

if command -v pipx >/dev/null 2>&1; then
  echo "Installing with pipx …"
  # shellcheck disable=SC2086
  pipx install ${SPEC} --force
  CLI="$(command -v gridviewspec-mcp)"
else
  echo "Installing with pip --user …"
  # shellcheck disable=SC2086
  "${PYTHON}" -m pip install --user ${SPEC}
  CLI="${HOME}/.local/bin/gridviewspec-mcp"
fi

if [[ ! -x "${CLI}" ]]; then
  echo "error: gridviewspec-mcp not found after install" >&2
  exit 1
fi

"${CLI}" --help >/dev/null
echo
echo "OK: ${CLI}"
echo
echo "MCP client (.mcp.json) example:"
cat <<EOF
{
  "mcpServers": {
    "gridviewspec-mcp": {
      "command": "${CLI}",
      "args": []
    }
  }
}
EOF
echo
echo "Terminal PATH (optional): export PATH=\"${HOME}/.local/bin:\${PATH}\""
