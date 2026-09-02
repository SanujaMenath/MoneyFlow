# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] - 2026-09-02

### Highlights
- **Real-Time Cloud Synchronization & Transaction Management**: End-to-end database sync orchestration between local SQLite and Supabase with optimistic updates and conflict resolution.
- **Server & Local Pagination**: Scalable transaction list pagination across Desktop and Mobile with user-scoped queries.
- **ThemeContext & Color Tokens**: Full dark/light/system theme management system across the Mobile application with dynamic styling hooks.
- **Fair Split Algorithm & Date Handling**: Exact split calculations with rounding remainder reconciliation and leap year/month-end recurring period clamping.
- **Android & Desktop Icon Redesign**: Comprehensive adaptive icon suite across all density buckets and play store assets.

### Features
- **Transaction Sync System**: Added `syncService.ts` and enhanced SQLite `db.ts` with `schema_version` bootstrapping, updated_at tracking, and parent transaction tracking.
- **Pagination Support**: Implemented page-based pagination controls on Desktop and scroll-based pagination on Mobile.
- **Theme Management**: Introduced `ThemeContext` and `useThemeColors` hook on Mobile with complete light, dark, and system theme support.
- **Split Transaction Engine**: Added `computeSplits` with guaranteed integer-cent remainder reconciliation to eliminate rounding disparities.
- **Advanced Date Utilities**: Added `clampToMonthEnd` and `addPeriod` to properly handle recurring transaction intervals across varying month lengths and leap years.
- **Internationalization Support**: Added English and Sinhala locale dictionaries with language switcher on Desktop.
- **Database Schema Upgrades**:
  - `006_fix_rls_update_check.sql`: Tightened Row Level Security (RLS) UPDATE policies.
  - `007_transactions_updated_at_parent.sql`: Added auto-updating `updated_at` trigger and `parent_transaction_id` hierarchy.

### Improvements
- **Mobile UI & Styling**: Refactored `TransactionsScreen`, `DashboardScreen`, `AnalyticsDonut`, `CategoryBarChart`, `DatePicker`, and `SavingsGoalCard` to consume dynamic theme tokens via `makeStyles`.
- **Navigation & Headers**: Added styled header with back navigation on mobile `add.tsx` and refined root stack screen options.
- **Web Confirmation Prompts**: Improved user prompts and alerts for transaction deletion and stopping recurring transactions on web exports.
- **Asset Refresh**: Updated Android mipmap launcher icons (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), adaptive launcher XMLs, and store icons.
- **CI/CD Pipeline**: Parallelized lint and typechecking across project workspaces in GitHub Actions with optimized artifact packaging.

### Bug Fixes
- Fixed potential 1-cent discrepancy in percentage splits by adding rounding remainder to the primary participant.
- Fixed date calculation edge cases where monthly recurring transactions on the 29th, 30th, or 31st skipped months without month-end clamping.
- Corrected RLS UPDATE check constraint on Supabase to ensure mutations verify user ownership.

### Security
- Enforced strict Supabase RLS policies for transaction updates preventing cross-user modifications.

---

## [1.5.0] - 2026-07-05

### Highlights
- Monorepo stabilization with cross-platform build fixes and unified workspace dependency management.

### Features
- **User Profile Management**: Added user profile view, avatar handling, and profile editing services.
- **Collaboration Features**: Added shared lists, member invitations, and shared transaction tracking.

### Improvements
- Restructured CI workflow for root `npm ci`, cross-platform Rollup dependencies on Linux, and Android APK signing.
- Added root `.env.example` with Supabase and E2E environment definitions.

### Bug Fixes
- Fixed mobile `FlatList` footer wrapper and refresh control typing.
- Added ESLint ignore patterns for generated build outputs.

---

## [1.2.0] - 2026-06-29

### Highlights
- Production hardening, environment variable isolation, and mobile feature parity.

### Features
- **Mobile Feature Parity**: Full feature alignment between Mobile and Desktop including savings goals, analytics charts, and currency selector.
- **Daily Recurring Frequency**: Added daily recurring intervals with background process automation.

### Improvements
- Replaced hardcoded Supabase configuration with environment variables.
- Dynamic date handling in desktop navigation layout.

### Bug Fixes
- Fixed dynamic `require()` in mobile transaction screen.
- Fixed mobile auth redirect URL resolution.
- Added user_id filters to delete and update operations.

---

## [1.1.0] - 2026-04-07

### Highlights
- Branding update and transaction control enhancements.

### Features
- Stop recurring transaction controls.
- Application icons and branding assets.

---

## [1.0.0] - 2026-04-05

### Highlights
- Initial release of MoneyFlow desktop and mobile personal finance tracker.
