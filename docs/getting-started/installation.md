# Installation

Follow this guide to prepare a development environment for the Learning Catalyst desktop app.

## Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 18 LTS or later | Electron and Vite rely on modern Node.js features. |
| npm 9 or later | Bundled with Node.js; upgrade with `npm install -g npm` if needed. |
| Git | Required to clone the repository and manage updates. |
| macOS, Windows, or Linux | All major platforms are supported. Linux users should ensure `libX11`, `libxcb`, and `libxkbfile` are installed for Electron. |

Optional but recommended:
- **API keys** for the AI providers you intend to use (OpenAI, Anthropic, etc.).
- **Qdrant vector database** binaries if you plan to run the local knowledge base (use `npm run setup:qdrant`).

## Install Dependencies

```bash
# Clone the project
git clone <repository-url>
cd learning-catalyst

# Install JavaScript dependencies
npm install
```

> If you run into native module build errors, execute `npm run rebuild` after installation.

## Verify Tooling

```bash
# Static analysis and unit tests
npm run lint
npm run type-check
npm run test:renderer
```

Successful runs confirm the toolchain is configured correctly. Proceed to the [Quickstart](./quickstart.md) to launch the application.
