# 🗑️ Reclaim - Cache Directory Cleaner

A powerful CLI tool to recursively scan and clean cache directories for developers. Reclaim helps you free up disk space by identifying and removing common cache folders like `node_modules`, `dist`, `.next`, and many more.

## ✨ Features

- 🔍 **Smart Scanning** - Recursively finds cache directories across your projects
- 📊 **Size Calculation** - Shows exactly how much space each directory uses
- 🎯 **Selective Deletion** - Choose exactly which directories to remove
- 🚀 **Fast & Efficient** - Built with Bun for maximum performance
- 🎨 **Beautiful Interface** - Clean CLI experience powered by @clack/prompts
- 🛡️ **Safe Operations** - Confirmation prompts prevent accidental deletions

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd reclaim

# Install dependencies
bun install
```

### Usage

```bash
# Scan current directory
bun run index.ts

# Scan specific directory
bun run index.ts clean /path/to/directory

# Or using the built version
bun run dist/index.js
```

## 📖 Commands

### `clean` (default)
Scan and clean cache directories in the specified path.

```bash
bun run index.ts clean [directory]
```

**Options:**
- `directory` - Path to scan (defaults to current directory if not provided)

**Example:**
```bash
# Scan current directory
bun run index.ts clean

# Scan specific directory
bun run index.ts clean ~/Projects

# Scan parent directory
bun run index.ts clean ..
```

## 🛠️ Development

### Prerequisites
- [Bun](https://bun.com) v1.2.19 or higher
- TypeScript knowledge for contributions

### Project Structure

```
reclaim/
├── commands/           # Command implementations
│   ├── base-command.ts    # Abstract command interface
│   ├── clean-command.ts   # Clean command implementation
│   └── index.ts          # Command registry
├── libs/              # Core business logic
│   ├── cache-scanner.ts  # Directory scanning utilities
│   └── file-operations.ts # File system operations
├── index.ts           # Main entry point
├── package.json       # Project configuration
└── tsconfig.json      # TypeScript configuration
```

### Available Scripts

```bash
# Development
bun run dev            # Run with file watching
bun run start          # Run the CLI

# Building
bun run build          # Build for production

# Installation
bun run install-global # Link globally for system-wide usage
```

### Building the Project

```bash
# Build the project
bun run build

# The built files will be in ./dist/
# You can then run: bun run dist/index.js
```

### Global Installation

To use `reclaim` from anywhere on your system:

```bash
# Link the package globally
bun run install-global

# Now you can use it globally (after adding to PATH)
reclaim clean ~/Projects
```

### Adding New Commands

1. Create a new command class in `commands/`:

```typescript
// commands/my-command.ts
import { BaseCommand, type CommandContext } from './base-command.js';

export class MyCommand extends BaseCommand {
  name = 'my-command';
  description = 'Description of my command';

  async execute(context: CommandContext): Promise<void> {
    // Implementation here
  }
}
```

2. Register the command in `commands/index.ts`:

```typescript
import { MyCommand } from './my-command.js';

export const commands: BaseCommand[] = [
  new CleanCommand(),
  new MyCommand(), // Add your command here
];
```

### Code Style & Architecture

- **Modular Design** - Business logic separated into `libs/`
- **Command Pattern** - Each command is a separate class
- **TypeScript** - Fully typed for better development experience
- **@clack/prompts** - Consistent, beautiful CLI interface
- **Error Handling** - Graceful error handling throughout

### Supported Cache Directories

The tool automatically detects these common cache directories:

- `node_modules` (Node.js)
- `dist`, `build`, `out` (Build outputs)
- `.next` (Next.js)
- `.nuxt` (Nuxt.js)
- `target` (Rust)
- `.cache`, `.parcel-cache` (Various caches)
- `.webpack` (Webpack)
- `coverage`, `.nyc_output` (Test coverage)
- `.jest` (Jest)
- `tmp`, `temp`, `.tmp`, `.temp` (Temporary files)
- `logs`, `*.log` (Log files)
- `.DS_Store`, `Thumbs.db` (System files)

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes following the existing code style
4. Test your changes: `bun run build && bun run start`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin my-feature`
7. Submit a pull request

## 🔧 Technical Details

- **Runtime**: Bun v1.2.19+
- **Language**: TypeScript
- **CLI Framework**: @clack/prompts
- **Architecture**: Command pattern with modular libs
- **Build Target**: Bun native

## 📝 License

MIT License - see LICENSE file for details.

---

This project was created using `bun init` and enhanced with a modular architecture for maintainability and extensibility.
