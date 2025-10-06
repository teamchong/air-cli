# Playwright CLI Installer for Windows
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

Write-Host "🎭 Playwright CLI Installer for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Bun
try {
    $bunVersion = bun --version 2>$null
    Write-Host "✅ Bun found: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Bun is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Bun from https://bun.sh" -ForegroundColor Yellow
    exit 1
}

# Set installation paths based on OS
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $INSTALL_DIR = "$env:LOCALAPPDATA\Programs\air-cli"
    $CLAUDE_DIR = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$env:USERPROFILE\.claude" }
    $BINARY_NAME = "air.exe"
} else {
    # Unix/macOS paths
    $INSTALL_DIR = "$HOME/.local/bin"
    $CLAUDE_DIR = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$HOME/.claude" }
    $BINARY_NAME = "air"
}

# Create directories
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $CLAUDE_DIR | Out-Null

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
& bun install
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Build the binary
Write-Host "🔨 Building playwright CLI..." -ForegroundColor Yellow
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    & bun run build:windows
    $binaryPath = Join-Path $SCRIPT_DIR $BINARY_NAME
} else {
    & bun run build
    $binaryPath = Join-Path $SCRIPT_DIR $BINARY_NAME
}
if (-not (Test-Path $binaryPath)) {
    Write-Host "❌ Build failed - binary not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build complete" -ForegroundColor Green

# Stop any running instances before installation
$runningProcesses = Get-Process -Name "air" -ErrorAction SilentlyContinue
if ($runningProcesses) {
    Write-Host "  Stopping running air instances..." -ForegroundColor Yellow
    Stop-Process -Name "air" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# Install binary
Write-Host "📦 Installing to $INSTALL_DIR..." -ForegroundColor Yellow
Copy-Item $binaryPath -Destination $INSTALL_DIR -Force
Write-Host "✅ Binary installed" -ForegroundColor Green

# Test installation
Write-Host ""
Write-Host "🧪 Testing installation..." -ForegroundColor Yellow
$binaryInstalled = Join-Path $INSTALL_DIR $BINARY_NAME
try {
    $versionOutput = & $binaryInstalled --version 2>$null
    if ($versionOutput) {
        Write-Host "✅ air binary works (version: $versionOutput)" -ForegroundColor Green
    } else {
        # Try help command as fallback
        $helpOutput = & $binaryInstalled help 2>$null
        if ($helpOutput) {
            Write-Host "✅ air binary works" -ForegroundColor Green
        } else {
            Write-Host "⚠️  air binary may have issues - please test manually" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  air binary may have issues - please test manually" -ForegroundColor Yellow
}

# Update CLAUDE.md
Write-Host ""
Write-Host "📝 Updating CLAUDE.md with Playwright CLI instructions..." -ForegroundColor Yellow
# Claude Code looks for CLAUDE.md in ~/.claude/CLAUDE.md (or Windows equivalent)
$CLAUDE_MD = Join-Path $CLAUDE_DIR "CLAUDE.md"

if (Test-Path $CLAUDE_MD) {
    # Backup existing file
    Copy-Item $CLAUDE_MD "$CLAUDE_MD.backup" -Force
    
    # Read content
    $content = Get-Content $CLAUDE_MD -Raw
    
    # Check if section exists and remove it if found
    if ($content -match '<!-- BEGIN PLAYWRIGHT-CLI -->') {
        $content = $content -replace '(?s)\n*<!-- BEGIN PLAYWRIGHT-CLI -->.*?<!-- END PLAYWRIGHT-CLI -->\n*', ''
    }
    
    # Trim trailing newlines
    $content = $content.TrimEnd()
    
    # Check if content is empty and add appropriate spacing
    if ([string]::IsNullOrWhiteSpace($content)) {
        # File is empty or only whitespace, no need for leading newlines
        $content = "<!-- BEGIN PLAYWRIGHT-CLI -->`n"
    } else {
        # File has content, add 2 newlines for spacing
        $content += "`n`n<!-- BEGIN PLAYWRIGHT-CLI -->`n"
    }
    
    $instructionsPath = Join-Path $SCRIPT_DIR "CLAUDE_INSTRUCTIONS.md"
    if (Test-Path $instructionsPath) {
        $instructions = Get-Content $instructionsPath -Raw
        $content += $instructions
    } else {
        # Fallback minimal content if file not found
        $content += "## Playwright CLI`nBrowser automation tool. Run 'air --help' for documentation."
    }

    $content += "`n<!-- END PLAYWRIGHT-CLI -->"

    # Write back with a trailing newline
    Set-Content -Path $CLAUDE_MD -Value $content
    Write-Host "✅ Updated CLAUDE.md" -ForegroundColor Green
} else {
    # Create new file from CLAUDE_INSTRUCTIONS.md
    $content = "<!-- BEGIN PLAYWRIGHT-CLI -->`n"

    $instructionsPath = Join-Path $SCRIPT_DIR "CLAUDE_INSTRUCTIONS.md"
    if (Test-Path $instructionsPath) {
        $instructions = Get-Content $instructionsPath -Raw
        $content += $instructions
    } else {
        # Fallback minimal content if file not found
        $content += "## Playwright CLI`nBrowser automation tool. Run 'air --help' for documentation."
    }

    $content += "`n<!-- END PLAYWRIGHT-CLI -->"

    # Write back with a trailing newline
    Set-Content -Path $CLAUDE_MD -Value $content
    Write-Host "✅ Created CLAUDE.md" -ForegroundColor Green
}

# Add to PATH if needed
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$INSTALL_DIR*") {
    Write-Host ""
    Write-Host "⚠️  Adding $INSTALL_DIR to PATH..." -ForegroundColor Yellow
    $newPath = "$userPath;$INSTALL_DIR"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$INSTALL_DIR"
    Write-Host "✅ Added to PATH (restart terminal to apply)" -ForegroundColor Green
} else {
    Write-Host "✅ Already in PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Run 'air' to see all available commands" -ForegroundColor Cyan
Write-Host "Note: You may need to restart your terminal for PATH changes to take effect" -ForegroundColor Yellow