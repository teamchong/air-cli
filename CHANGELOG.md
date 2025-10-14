## [2.1.1](https://github.com/teamchong/air-cli/compare/v2.1.0...v2.1.1) (2025-10-14)

### Bug Fixes

- remove duplicate checkmarks from console and network commands ([a1fcb18](https://github.com/teamchong/air-cli/commit/a1fcb187afa2126fe2afdd2cedfacac2aa2be6cd))

# [2.1.0](https://github.com/teamchong/air-cli/compare/v2.0.0...v2.1.0) (2025-10-13)

### Features

- add stealth mode flags to bypass bot detection ([c7c362a](https://github.com/teamchong/air-cli/commit/c7c362a65dffbb4b8f33165667117c5718ec993d))

# [2.0.0](https://github.com/teamchong/air-cli/compare/v1.0.1...v2.0.0) (2025-10-08)

### Bug Fixes

- add CLI imports to test files and limit test concurrency ([17f550e](https://github.com/teamchong/air-cli/commit/17f550ed5d840edeb3aeaf14638966148ed648ba))
- add container-friendly Chrome flags for CI ([fabb80b](https://github.com/teamchong/air-cli/commit/fabb80b535604495454eb229d62aa2bee025d443))
- add flush() to persist debounced saves before command exit ([51b6d20](https://github.com/teamchong/air-cli/commit/51b6d200913f5d9d97638fbbb64f09238e896897))
- add intelligent field suggestions and improve error handling ([89e024b](https://github.com/teamchong/air-cli/commit/89e024b92b84fdbe6c127c9b6c8d3c462913990c))
- add Linux/Windows browser paths for CI container support ([fce8c10](https://github.com/teamchong/air-cli/commit/fce8c104bbd27af1432269875f78dd1ce8721033))
- add missing beforeEach/afterEach imports to upload.test.ts ([886c3a0](https://github.com/teamchong/air-cli/commit/886c3a0d293225e90734b260e09f32c03c42a41e))
- align Prettier and ESLint configs to prevent CI failures ([ca942ee](https://github.com/teamchong/air-cli/commit/ca942ee81c0d5922d6af65365f4ec054bfe8fc3a))
- allow inline to take precedence over file in exec command ([6fb11b4](https://github.com/teamchong/air-cli/commit/6fb11b42c0ad5b411a2341aa057d48623c92f106))
- await async getPageId calls in console and network commands ([683f96a](https://github.com/teamchong/air-cli/commit/683f96aae64b8a2ddd02c8b81274acacdba716aa))
- change default build to use Bun and add ws dependency ([a859373](https://github.com/teamchong/air-cli/commit/a859373511b85e04e0f237cf23bbd00260a9448c))
- **ci:** add unzip installation to test jobs ([5d4d2d0](https://github.com/teamchong/air-cli/commit/5d4d2d0b7983239a8ecf82fc3556e065afdb2195))
- **ci:** capture test exit code before Chrome cleanup ([fe9cf58](https://github.com/teamchong/air-cli/commit/fe9cf5811f2e3d4b24acb2680a12f8ccac7711df))
- **ci:** ignore Bun exit code temporarily to see test output ([2724890](https://github.com/teamchong/air-cli/commit/2724890f39d1e4e53dff1dc5f826271c820c7261))
- **ci:** install Playwright browsers before tests ([35cb420](https://github.com/teamchong/air-cli/commit/35cb420e383cc32d4e836a7908606c738eb21e02))
- **ci:** parse test output instead of relying on exit code ([f22ae98](https://github.com/teamchong/air-cli/commit/f22ae98c5caaa6cbaf886d9e3a07e1a32506ba3c))
- **ci:** reduce test shards and add cleanup delays ([292ae6f](https://github.com/teamchong/air-cli/commit/292ae6f94274ac0214fe3fd712a4272bf54a9252))
- **ci:** remove pkill cleanup that was causing SIGKILL ([d68667e](https://github.com/teamchong/air-cli/commit/d68667e2353c9abfda35eeaee969a14507c0aad4))
- **ci:** run test shards in parallel jobs to prevent OOM ([c617bfd](https://github.com/teamchong/air-cli/commit/c617bfddedb70e0d15c55a0b605a9ad3f6a50033))
- **ci:** skip cleanup hooks in CI environment ([cd5fe44](https://github.com/teamchong/air-cli/commit/cd5fe4416a86450463c2790f64a79592362425a3))
- closeTestTab now uses clean environment from TabManager ([811796c](https://github.com/teamchong/air-cli/commit/811796c76138243ee2fde1da2966791e1738f2d0))
- complete edge case fixes for enhanced commands ([69abd46](https://github.com/teamchong/air-cli/commit/69abd4698ad9d34ce088a3469fab034dc162616b))
- complete Vitest to Bun test migration ([0db5b17](https://github.com/teamchong/air-cli/commit/0db5b170452fe8dcaa532ce0fd431a76351df981))
- console command now captures all messages by default ([ee37107](https://github.com/teamchong/air-cli/commit/ee3710703b0a80b010c2ddfe3e5db21f4c4fe66f))
- correct exec stdin test syntax ([6d45de8](https://github.com/teamchong/air-cli/commit/6d45de8294975cdeaa738e15055fdd96559ca373))
- disable eslint unused-vars for JXA type definitions ([3a73b51](https://github.com/teamchong/air-cli/commit/3a73b512d418732a967bcdd13888d6668506d012))
- dynamically resolve Playwright chromium path on Linux ([bec88d2](https://github.com/teamchong/air-cli/commit/bec88d29831676ea084719efebaee0af7b9968f3))
- eliminate Chrome memory leak in tests by avoiding navigate ([a9e5e43](https://github.com/teamchong/air-cli/commit/a9e5e4316231e1f57d82392fcc02dca489948914))
- improve Calendar JXA access and add macOS permissions docs ([6db242c](https://github.com/teamchong/air-cli/commit/6db242c4bc0e95cf9d326caf7b73ae3cc70e0f7a))
- improve error display and summary messages ([02a54f8](https://github.com/teamchong/air-cli/commit/02a54f8322f23c7f1d4d23c0cc5d87acc0286628))
- improve exec command inline script handling ([652d2f6](https://github.com/teamchong/air-cli/commit/652d2f6a21a2e87c2b10a64ffc6ec953c1cca0a8))
- improve exec command object result handling ([47244ef](https://github.com/teamchong/air-cli/commit/47244ef83b6e837c45049bd67f089da317f35f62))
- improve ref selector generation for combobox and searchbox elements ([1215296](https://github.com/teamchong/air-cli/commit/1215296dd54c2378c64680f81b88e251b53a8403))
- improve test tab cleanup and prevent memory leaks ([9da47bc](https://github.com/teamchong/air-cli/commit/9da47bc9a0bff159484103e2fa10826af1b8a2d2))
- install unzip in CI container for setup-bun action ([602fc10](https://github.com/teamchong/air-cli/commit/602fc10499ed999f15e5d3f27e5f19186f7e7ef8))
- launch Chrome in CI environment ([873f11e](https://github.com/teamchong/air-cli/commit/873f11e1c9401cbe82530b40749f211e2c6bbb2c))
- move test output files to /tmp and add missing upload timeout ([067f833](https://github.com/teamchong/air-cli/commit/067f83302e91935140ff4694f6400c5a5b772d67))
- move verbose logs to stderr for clean stdout ([06abad1](https://github.com/teamchong/air-cli/commit/06abad102d02f5f62043775f7699f46d1a193a0c))
- prevent memory leaks in console and network commands ([aab352d](https://github.com/teamchong/air-cli/commit/aab352dfc3122cc039d9533b696b13aac0b63176))
- **release:** remove redundant quality checks from release workflow ([f64601a](https://github.com/teamchong/air-cli/commit/f64601a743e3da74db4793a82a986e11666ae1c4))
- remove async from synchronous beforeEach hook in context tests ([2666336](https://github.com/teamchong/air-cli/commit/266633669ce50d0d779d721402ad7c76054cb290))
- remove unused dependency 'why-is-node-running' from package.json and bun.lock ([333acc4](https://github.com/teamchong/air-cli/commit/333acc4677a8b1591c1bbd813c21ee4a1f40080c))
- replace fragile temp files with permanent fixture ([5aae959](https://github.com/teamchong/air-cli/commit/5aae959ef42a02534387d95355ed3477bdeb2c55))
- resolve all ESLint errors and add lint to pre-commit ([c6c714a](https://github.com/teamchong/air-cli/commit/c6c714aa3356d7b3c72650d4fde94c891752660a))
- resolve all ESLint formatting errors for CI ([e4bc0b9](https://github.com/teamchong/air-cli/commit/e4bc0b933b9dbbea625554c2735d43307e3038bd))
- resolve CI test timeouts with sharded execution ([fe8f4f0](https://github.com/teamchong/air-cli/commit/fe8f4f0a8a04be96ae3c56b584235265b05e8de8))
- resolve remaining edge cases in enhanced commands ([0dc0d3d](https://github.com/teamchong/air-cli/commit/0dc0d3d78fa8e3ff69610ee01945d38c74273ef8))
- resolve test environment pollution causing 4 test failures ([ece14b2](https://github.com/teamchong/air-cli/commit/ece14b2f1e6c1fca8132f60a227e2e2e860317fa))
- resolve test failures and improve command compatibility ([1d0838d](https://github.com/teamchong/air-cli/commit/1d0838d7b5eef06f693886bd2f41cfb0349285cd))
- resolve test timeout issues and update error assertions ([f65ac89](https://github.com/teamchong/air-cli/commit/f65ac893d250b95a42fb1a1000af7530448c63e2))
- resolve upload test failures by using repo .tmp/ directory ([0f90610](https://github.com/teamchong/air-cli/commit/0f906106596cf4cffe63a4783228d02448bd55bc))
- resolve upload test failures using CDP file upload API ([c95e950](https://github.com/teamchong/air-cli/commit/c95e950e807939f0464c3bddc95de111fc507b50))
- setup TypeScript typecheck for Bun compatibility ([10d7b53](https://github.com/teamchong/air-cli/commit/10d7b53eed5582c5cbdd9bbf21ec48a60da4dc6d))
- simplify test configuration and remove complex sharding ([b3a73b7](https://github.com/teamchong/air-cli/commit/b3a73b74c13ff334ea22803520082e694d536347))
- unskip 2 tests (browser-config and network) ([49119d6](https://github.com/teamchong/air-cli/commit/49119d6df574f088ecb20862504a9d4ebe1d7425))
- update tests to match current implementations ([9686bfd](https://github.com/teamchong/air-cli/commit/9686bfddc31443e3ef84b841726b309b78df6d64))
- use Playwright's dynamic chromium path instead of hardcoded version ([0c82bb3](https://github.com/teamchong/air-cli/commit/0c82bb37f3c4a0afa7049b035c0d9028e3a114d2))

### Code Refactoring

- rename playwright-cli to air-cli - Agentic Information Retrieval ([c2d6a45](https://github.com/teamchong/air-cli/commit/c2d6a452e76bab62e6c46757a6c59c30f2fa7d4a))

### Features

- add default test environment variables in bunfig.toml ([b0cef42](https://github.com/teamchong/air-cli/commit/b0cef42dcdf36dfa626be8478815f58df306bf3c))
- add native macOS app automation support ([3b13bb5](https://github.com/teamchong/air-cli/commit/3b13bb559dc21a2019ca8b4ced29ddcc21715d5a))
- add persistent action history and improve text-based element selection ([9479d21](https://github.com/teamchong/air-cli/commit/9479d21d3c50d26ac82798781308e40d3bc1e9f3))
- add tab health validation and enhanced error diagnostics ([c520cd6](https://github.com/teamchong/air-cli/commit/c520cd67b86ea6968c8348efbfc0df13fdde4633))
- comprehensive test suite stability improvements ([906d6b8](https://github.com/teamchong/air-cli/commit/906d6b86ee6ec77515b06c329a123fa87238a53e))
- configure bunfig.toml preload and add .env.test ([c14494a](https://github.com/teamchong/air-cli/commit/c14494ae31f2766ac1536436c357bdbcbe57dcdf))
- implement comprehensive LLM-friendly enhancements ([d0eab82](https://github.com/teamchong/air-cli/commit/d0eab829fcd1a819335b9dbda429de0c259ea4bf))
- improve troubleshooting - open command reuses existing tabs ([d37ca68](https://github.com/teamchong/air-cli/commit/d37ca685f88c4de436e91dfff58c2799894110a2))
- migrate from Node.js/Vitest to Bun runtime ([bc00cc2](https://github.com/teamchong/air-cli/commit/bc00cc246aba120a9d053de26a2569247c7faa6d))

### Performance Improvements

- add test sharding to handle Chrome backpressure ([92a14f2](https://github.com/teamchong/air-cli/commit/92a14f2c0a5ac1ff3cc0518a9808063b1e08714b))
- replace fs with Bun native file I/O for 3-5x performance gain ([bc305be](https://github.com/teamchong/air-cli/commit/bc305be8a1cce7092489b615fe65e23893c5b6ed))

### BREAKING CHANGES

- Repository and binary renamed from playwright-cli/pw to air-cli/air

## Changes

### Project Identity

- **Name**: playwright-cli → air-cli
- **Binary**: pw → air
- **Description**: Now emphasizes Agentic Information Retrieval paradigm
- **Philosophy**: Take back control of information diet from Big Tech algorithms

### Files Updated

- package.json: name, bin, description, keywords
- Build scripts: Use bin/ folder for artifacts instead of root
- .gitignore: Ignore bin/ folder, updated session file patterns
- README.md: Comprehensive rewrite with Agentic IR philosophy
- CLAUDE.md: Updated project overview with Agentic IR context
- install.sh: Use air binary, bin/ folder, AIR-CLI markers

### Architecture Changes

- Build artifacts now in bin/ folder (cleaner root)
- Binary path: bin/air (was pw in root)
- Install markers: AIR-CLI (was PLAYWRIGHT-CLI)
- Backward compatibility in install.sh for old markers

### What is Agentic IR?

Unlike traditional IR systems that filter content using opaque algorithms
optimized for engagement, Agentic IR gives users control by:

- Direct browser access to platforms (Facebook, Twitter, news)
- LLM-powered content analysis based on user's preferences
- Proactive curation (like Perplexity/NotebookLM for all platforms)

Your AI agent. Your rules. Not Meta's.
