# macOS Permissions for Native App Automation

The `air app` command requires specific macOS permissions to access native applications like Mail, Calendar, and Finder.

## Required Permissions

### 1. Accessibility Permission
Required for: UI automation, getting element trees

**Grant permission:**
1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the lock icon to make changes
3. Find `bun` or `Terminal` (whichever runs air-cli)
4. Toggle it **ON**

### 2. Automation Permission
Required for: Controlling applications via AppleScript/JXA

**Grant permission:**
1. Open **System Settings** → **Privacy & Security** → **Automation**
2. Find `bun` or `Terminal`
3. Toggle **ON** for applications you want to control (Mail, Calendar, etc.)

### 3. Full Disk Access (For Mail.app)
Required for: Reading Mail.app messages

**Grant permission:**
1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the lock icon to make changes
3. Click **+** button
4. Navigate to `/usr/local/bin/bun` (or wherever bun is installed)
5. Add and toggle **ON**

**Note:** Terminal.app already has Full Disk Access by default in most macOS versions.

## Testing Permissions

### Test 1: Check if app is running (No special permissions)
```bash
air app Mail
# Should output: "Mail is running" or "Mail is not running"
```

### Test 2: Launch/Quit apps (Requires Automation)
```bash
air app Safari --launch
air app Safari --quit
```

### Test 3: Get UI tree (Requires Accessibility + Automation)
```bash
air app Finder --tree --json
```

### Test 4: Access Mail messages (Requires Full Disk Access + Automation)
```bash
air app Mail --action mail-unread
```

### Test 5: Calendar events (Requires Automation)
```bash
air app Calendar --action calendar-today
```

## Troubleshooting

### "Operation timed out"
- Grant Full Disk Access to `bun` or Terminal.app
- Make sure Mail.app is actually running
- Try with a different app (Calendar usually works without Full Disk Access)

### "Application isn't running"
- Launch the app first: `air app Mail --launch`
- Or manually open the app from Finder/Spotlight

### Permissions not prompting
- Try running once from Terminal directly (not through an IDE)
- Reset permissions: `tccutil reset All` (requires reboot)

## Alternative: Use Terminal as Wrapper

If bun permissions are problematic, wrap the command:

```bash
# Create alias in ~/.zshrc or ~/.bashrc
alias air-native="osascript -e 'tell application \"Terminal\" to do script \"bun run air-cli app\"'"
```

Terminal.app typically has fewer permission issues.

## CI/Automation Note

For CI/automation, use `--json` flag to get machine-readable output and handle permission errors gracefully:

```bash
result=$(air app Mail --action mail-unread --json 2>&1)
if echo "$result" | grep -q '"success":false'; then
    echo "Permission denied or Mail not accessible"
    exit 1
fi
```
