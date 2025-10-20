# Claude Code CLI Internet Access Report

**Generated:** 2025-10-20
**Environment:** Claude Code CLI running on Linux

## Executive Summary

Claude Code CLI has **restricted internet access** operating on a **whitelist-based system**. Access is primarily limited to:
- Package registries (npm, PyPI)
- Code repositories (GitHub, Bitbucket, PyPI website)
- Anthropic domains
- Web search functionality (abstracted through WebSearch tool)

Most general websites, documentation sites, and browser-based downloads (like Playwright) are **blocked**.

---

## Test Results by Category

### 1. WebSearch Tool

| Feature | Status | Notes |
|---------|--------|-------|
| Web search | ✅ WORKS | Can search any query and return results from across the web |

**Conclusion:** WebSearch tool has full access to web search, likely proxied through Anthropic's backend.

---

### 2. WebFetch Tool - Developer Platforms

| Domain | Status | Response |
|--------|--------|----------|
| github.com | ✅ WORKS | 200 OK - Full access |
| gitlab.com | ⚠️ REDIRECT | Redirects to about.gitlab.com (blocked) |
| bitbucket.org | ✅ WORKS | 200 OK - Full access |
| pypi.org | ✅ WORKS | 200 OK - Full access |
| www.npmjs.com | ❌ BLOCKED | 403 Forbidden |
| stackoverflow.com | ❌ BLOCKED | 403 Forbidden |
| developer.mozilla.org | ❌ BLOCKED | 403 Forbidden |
| docs.python.org | ❌ BLOCKED | 403 Forbidden |
| www.rust-lang.org | ❌ BLOCKED | SSL handshake failure |

---

### 3. WebFetch Tool - General Websites

| Domain | Status | Response |
|--------|--------|----------|
| www.google.com | ❌ BLOCKED | 403 Forbidden |
| www.bing.com | ❌ BLOCKED | 403 Forbidden |
| www.wikipedia.org | ❌ BLOCKED | 403 Forbidden |
| www.reddit.com | ❌ BLOCKED | Unable to fetch |
| news.ycombinator.com | ❌ BLOCKED | 403 Forbidden |
| www.youtube.com | ❌ BLOCKED | Unable to fetch |

---

### 4. WebFetch Tool - AI/Tech Companies

| Domain | Status | Response |
|--------|--------|----------|
| www.anthropic.com | ✅ WORKS | 200 OK - Full access |
| openai.com | ❌ BLOCKED | 403 Forbidden |
| huggingface.co | ❌ BLOCKED | 403 Forbidden |
| arxiv.org | ❌ BLOCKED | 403 Forbidden |

---

### 5. Direct Downloads (curl/wget)

| Domain/Resource | Status | Response |
|----------------|--------|----------|
| www.google.com | ❌ BLOCKED | Envoy proxy: 200 → Final: 403 |
| github.com | ✅ WORKS | 200 OK |
| registry.npmjs.org | ✅ WORKS | 200 OK |
| pypi.org/simple/ | ✅ WORKS | 200 OK |
| cdn.playwright.dev | ❌ BLOCKED | Envoy proxy: 200 → Final: 403 |
| crates.io | ❌ BLOCKED | 403 from CloudFront |
| raw.githubusercontent.com | ⚠️ REDIRECT | 301 to github.com |

**Pattern observed:** Requests pass through an Envoy proxy that returns 200, but blocked domains return 403 at the final destination.

---

### 6. Package Manager Installation

| Tool | Status | Test Details |
|------|--------|--------------|
| npm install | ✅ WORKS | Successfully installed `lodash` package |
| pip install | ✅ WORKS | Successfully installed `requests` package |
| Playwright browser downloads | ❌ BLOCKED | All CDN URLs return 403 |

**Playwright Download Attempts (all failed with 403):**
- `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1194/chromium-linux.zip`
- `https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/chromium/1194/chromium-linux.zip`
- `https://cdn.playwright.dev/builds/chromium/1194/chromium-linux.zip`

---

## Analysis & Findings

### Whitelist Categories

Based on testing, the following categories appear to be **whitelisted**:

1. **Package Registries**
   - npm registry (registry.npmjs.org)
   - PyPI (pypi.org/simple/)
   - Package downloads from these registries

2. **Code Repositories**
   - GitHub (github.com, raw.githubusercontent.com)
   - Bitbucket (bitbucket.org)
   - PyPI website (pypi.org)

3. **Anthropic Domains**
   - anthropic.com
   - Likely other Anthropic-owned domains

4. **Web Search Abstraction**
   - WebSearch tool (backend implementation unknown)

### Blocked Categories

The following categories are **blocked**:

1. **Search Engines**
   - Google, Bing, DuckDuckGo (direct access)

2. **General Websites**
   - Wikipedia, Reddit, YouTube, HackerNews

3. **Documentation Sites**
   - MDN (developer.mozilla.org)
   - Python docs (docs.python.org)
   - Rust docs (rust-lang.org)

4. **Other Package/Code Sites**
   - npm website (www.npmjs.com) - registry works but website blocked
   - crates.io
   - Stack Overflow

5. **Browser Binary Downloads**
   - Playwright CDNs
   - Other browser download sources

6. **AI/Tech Companies (except Anthropic)**
   - OpenAI
   - HuggingFace
   - arXiv

---

## Comparison: Claude Code CLI vs Claude.ai Web

| Feature | Claude Code CLI | Claude.ai Web (presumed) |
|---------|----------------|--------------------------|
| Internet access model | Whitelist-based, restrictive | Likely less restrictive |
| Browser automation | ❌ Blocked (Playwright downloads) | ✅ Likely available |
| General website access | ❌ Mostly blocked | ✅ Likely available |
| Package installations | ✅ Works | N/A (different use case) |
| Local file system access | ✅ Full access | ❌ Sandboxed |
| Security model | More restrictive network, full local access | More open network, no local access |

**Hypothesis:** The CLI has stricter network controls because it has direct access to the user's file system and terminal, requiring a different security model than the web version which is fully sandboxed.

---

## Architectural Notes

### Envoy Proxy Layer

All HTTP requests appear to pass through an **Envoy proxy** that:
1. Initially responds with HTTP 200 OK
2. Then forwards to the actual destination
3. Returns 403 if the destination is not whitelisted

This explains why curl shows multiple HTTP responses:
```
HTTP/1.1 200 OK          ← Envoy proxy
date: Mon, 20 Oct 2025 20:38:48 GMT
server: envoy

HTTP/2 403               ← Final destination (blocked)
content-type: text/plain
```

---

## Recommendations

### For Users

1. **Use WebSearch tool** for general web information instead of trying to fetch websites directly
2. **Package installations work** - npm and pip can download packages normally
3. **GitHub works** - You can fetch from GitHub repositories directly
4. **Playwright is not usable** - Browser automation requiring browser downloads will not work
5. **Documentation sites are blocked** - Copy documentation URLs and use WebSearch or ask Claude directly

### For Development

If you need to:
- **Search the web:** Use WebSearch tool
- **Fetch code repositories:** GitHub and Bitbucket work
- **Install packages:** npm and pip work normally
- **Access documentation:** Use WebSearch to search for it, or ask Claude directly
- **Browser automation:** Not possible due to browser download restrictions

---

## Conclusion

Claude Code CLI operates with a **carefully controlled internet whitelist** focused on:
- Enabling core development workflows (package installation, code repos)
- Maintaining security given CLI's local file system access
- Providing web search abstraction through WebSearch tool

This is a different security model than the web version, trading broader internet access for direct local system access.

**Key Takeaway:** While Playwright scripts cannot run due to blocked browser downloads, most development workflows (package installation, code fetching, web searching) work through alternative means.
