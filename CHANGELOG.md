# [1.2.0](https://github.com/kobenguyent/PrismSQL/compare/v1.1.0...v1.2.0) (2026-05-22)


### Bug Fixes

* address code review — JSX data-tooltip ampersand, release workflow comment ([681ab84](https://github.com/kobenguyent/PrismSQL/commit/681ab84530b4621aa966906422b72a2ed79f8dc6))


### Features

* a11y theme fixes, flash screen, version injection, privacy info, docs ([e85ac51](https://github.com/kobenguyent/PrismSQL/commit/e85ac514df1ce0e96009a2cae3e9710b0357527d))

# [1.1.0](https://github.com/kobenguyent/PrismSQL/compare/v1.0.0...v1.1.0) (2026-05-22)


### Bug Fixes

* code review issues - safe pop, use hook for theme, fix openSavedQuery connectionId ([16a75a1](https://github.com/kobenguyent/PrismSQL/commit/16a75a1652b065daa0748ad7622c4498d4fb51c2))
* qualify table name with database when schema is absent (information_schema) ([190038d](https://github.com/kobenguyent/PrismSQL/commit/190038def1ae0b33fd354df7082e3d27ad9dd75c))


### Features

* themes, saved queries, SQL autocomplete, single-row horizontal view ([4d4c053](https://github.com/kobenguyent/PrismSQL/commit/4d4c053b96183a72a4284c00c070210514ab211c))

# 1.0.0 (2026-05-22)


### Bug Fixes

* add CSC_FOR_PULL_REQUEST to enable ad-hoc signing in macOS PR builds ([386db98](https://github.com/kobenguyent/PrismSQL/commit/386db98fd2b7460419f1a9ae50cce26caf9e44d6))
* add GH_TOKEN env var to build step in CI workflow ([1292392](https://github.com/kobenguyent/PrismSQL/commit/1292392f0e48048932dd0f1f0c94161269342ea9))
* address code review - dialect-aware SQL, identifier quoting, procedure stubs, Postgres specificName, getProcedures tests ([38d90b6](https://github.com/kobenguyent/PrismSQL/commit/38d90b681963b9c4e1715e56cd7f7e95e0dcc5ef))
* address code review issues - procedure tab, unused params ([2351e2e](https://github.com/kobenguyent/PrismSQL/commit/2351e2edf83dcbe56923c9680c1641c5056ea564))
* call enableMapSet() for Immer Set support; show name-required error inline in modal ([0dcd6de](https://github.com/kobenguyent/PrismSQL/commit/0dcd6de983ea9335bfafc31ccb6045ac1fede18e))
* disable macOS code signing and document Gatekeeper workaround ([985950b](https://github.com/kobenguyent/PrismSQL/commit/985950bf5c180335b9a9140379cf824b1c933e0f))
* encrypt passwords with safeStorage, add dep to handleSave, add xattr note ([a03f3fb](https://github.com/kobenguyent/PrismSQL/commit/a03f3fb9ffac5646aa64ad39a81763709613d550))
* set CSC_FOR_PULL_REQUEST to true only for macOS, empty string otherwise ([597ac9e](https://github.com/kobenguyent/PrismSQL/commit/597ac9e42173dc0ee83fe7ff26ca3a612bfa5f81))
* store passwords, surface connect errors, add macOS xattr note ([695b0fd](https://github.com/kobenguyent/PrismSQL/commit/695b0fdeb613e1e0fe6b65ce7eb21cdf069f5f59))
* switch MySQL adapter to pool, add per-column filters, add semantic-release ([e3cfedf](https://github.com/kobenguyent/PrismSQL/commit/e3cfedf91cc2c7a62ea16a546e509a406737c448))
* use ad-hoc signing for macOS to resolve "damaged app" Gatekeeper error ([41c65b8](https://github.com/kobenguyent/PrismSQL/commit/41c65b8d9f17035de0f450485fa760832c4a7365))


### Features

* add procedures support, search in sidebar, click-to-open-results ([4975085](https://github.com/kobenguyent/PrismSQL/commit/49750855375b2ae5070cd72becb85d1dd02254c1))
