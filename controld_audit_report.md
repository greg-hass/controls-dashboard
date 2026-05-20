# Control D API Usage Audit

Date: 2026-05-20  
Repository: `/Users/greg/Projects/Control D Dashboard`  
Requested source: https://docs.controld.com/reference/get-started

## Executive Summary

Original audit score: **6.2 / 10**  
Post-remediation estimate: **8.2 / 10**

The codebase has a reasonably complete Control D API wrapper for a personal dashboard: it covers account data, profiles, filters, services, custom rules, rule folders, default rules, devices, access IPs, analytics metadata, proxies, IP info, and network status. Read-only endpoint coverage is broad and generally tracks the public reference.

The main risks are concentrated in write operations. Several mutation methods still send JSON where the Control D reference documents form-encoded fields, and a few routes do not match the current documented paths. These issues will make some management actions fail against the live API even though the UI and type layer suggest support exists.

## Implementation Follow-up

Status as of 2026-05-20:

| Finding | Status | Verification |
| --- | --- | --- |
| Single filter modify route | Fixed | `updateFilter()` now calls `/profiles/{profile_id}/filters/filter/{filter}` and has a fetch-level contract test. |
| Global profile options route | Fixed | `getProfileOptions()` now calls `/profiles/options` and has a fetch-level contract test. |
| Profile option update body | Fixed | `updateProfileOption()` now sends form fields `status` and optional `value`. |
| Device activity route | Fixed | `getDeviceActivity()` delegates to documented `GET /access?device_id=...`. |
| Default rule update body | Fixed | `updateDefaultRule()` now sends form fields `do`, `status`, and optional `via`. |
| Profile create/update body | Fixed | Profile writes now use form bodies with mapped Control D fields. |
| Rule folder create/update body | Fixed | Rule folder writes now use form fields `name`, `do`, `status`, and `via`. |
| Batch filter body shape | Fixed | `batchUpdateFilters()` sends the documented `filters` array field as serialized form data. |
| Device create icon mapping | Fixed | device payload mapping includes `icon`/`type` to Control D `icon`. |
| Custom rule redirect mapping | Fixed | dashboard `redirect` now maps to Control D `do=3`. |
| Contract tests | Fixed | Placeholder helper tests were replaced with request-level fetch contract tests. |
| Non-fatal diagnostics | Fixed | optional service/category, device activity, and rule-folder failures now append `apiWarnings`. |
| Request timeout | Fixed | API requests now use `AbortController` with a configurable default timeout. |
| Split raw API DTOs from UI models | Deferred | Larger refactor remains recommended. |

The detailed findings below preserve the original audit trail. Items marked fixed above have been remediated in the current codebase.

## Scores

| Dimension | Score | Rationale |
| --- | ---: | --- |
| Completeness | 7.0 / 10 | Most dashboard-relevant API categories are represented. Missing organization, billing, mobile config, and some documented account-level knobs is acceptable for the app scope, but some implemented surfaces are incomplete or unused. |
| Accuracy | 5.5 / 10 | Many GET endpoints are correct, and service/custom-rule/device writes mostly use documented form fields. Profile options, single filter modify, profile create/update, rule folder writes, default-rule writes, and device activity lookup diverge from the docs. |
| Robustness | 5.5 / 10 | Response extraction is intentionally flexible, but failures are frequently swallowed, requests have no timeout/retry/backoff, token state is persisted in plaintext, and unimplemented/incorrect endpoints can degrade silently. |
| Maintainability | 6.8 / 10 | Central API client, payload helpers, and tests are good foundations. The client still mixes documented Control D fields with dashboard-specific statuses/actions, which makes future API drift harder to spot. |

## Documentation Baseline Used

The public reference currently documents:

- Bearer-token authentication across protected endpoints.
- `GET /users` for account data.
- `GET /profiles`, `POST /profiles`, `PUT /profiles/{profile_id}`, `DELETE /profiles/{profile_id}`.
- `GET /profiles/options` and `PUT /profiles/{profile_id}/options/{name}`.
- `GET /profiles/{profile_id}/filters`, `GET /profiles/{profile_id}/filters/external`, `PUT /profiles/{profile_id}/filters/filter/{filter}`, and `PUT /profiles/{profile_id}/filters`.
- `GET /profiles/{profile_id}/services` and `PUT /profiles/{profile_id}/services/{service}`.
- `GET /profiles/{profile_id}/groups`, `POST /profiles/{profile_id}/groups`, `PUT /profiles/{profile_id}/groups/{folder}`, `DELETE /profiles/{profile_id}/groups/{folder}`.
- `GET /profiles/{profile_id}/rules/{folder_id}`, `POST /profiles/{profile_id}/rules`, `PUT /profiles/{profile_id}/rules`, `DELETE /profiles/{profile_id}/rules/{hostname}`.
- `GET /profiles/{profile_id}/default`, `PUT /profiles/{profile_id}/default`.
- `GET /proxies`.
- `GET /devices`, `POST /devices`, `GET /devices/types`, `PUT /devices/{device_id}`, `DELETE /devices/{device_id}`.
- `GET /access?device_id=...`, `POST /access`, `DELETE /access`.
- `GET /services/categories`, `GET /services/categories/{category}`.
- `GET /analytics/levels`, `GET /analytics/endpoints`.
- `GET /ip`, `GET /network`.

Reference pages used include the Control D API docs for [devices](https://docs.controld.com/reference/get_devices), [device modify](https://docs.controld.com/reference/put_devices-device-id), [profiles](https://docs.controld.com/reference/get_profiles), [profile modify](https://docs.controld.com/reference/put_profiles-profile-id), [filters](https://docs.controld.com/reference/put_profiles-profile-id-filters-filter-filter), [batch filters](https://docs.controld.com/reference/put_profiles-profile-id-filters), [services](https://docs.controld.com/reference/put_profiles-profile-id-services-service), [custom rules](https://docs.controld.com/reference/post_profiles-profile-id-rules), [default rules](https://docs.controld.com/reference/put_profiles-profile-id-default), [access](https://docs.controld.com/reference/get_access), and [misc/network endpoints](https://docs.controld.com/reference/get_network).

## Endpoint Inventory

| App method / usage | Local location | Documented endpoint | Status |
| --- | --- | --- | --- |
| `getUser()` | `app/src/services/api.ts:141` | `GET /users` | Accurate |
| `getProfiles()` | `app/src/services/api.ts:146` | `GET /profiles` | Accurate |
| `getProfile(pk)` | `app/src/services/api.ts:150` | Not visible in current nav; likely supported but not documented in reviewed pages | Needs verification |
| `createProfile()` | `app/src/services/api.ts:154` | `POST /profiles` with form data `name`, optional `clone_profile_id` | Incorrect body format |
| `updateProfile()` | `app/src/services/api.ts:161` | `PUT /profiles/{profile_id}` with form data `name`, `disable_ttl`, `lock_status`, etc. | Incorrect body format |
| `deleteProfile()` | `app/src/services/api.ts:168` | `DELETE /profiles/{profile_id}` | Accurate |
| `getProfileOptions(pk)` | `app/src/services/api.ts:175` | `GET /profiles/options` | Incorrect route |
| `updateProfileOption()` | `app/src/services/api.ts:179` | `PUT /profiles/{profile_id}/options/{name}` with form data `status`, optional `value` | Incorrect body format and missing `status` |
| `getNativeFilters()` | `app/src/services/api.ts:187` | `GET /profiles/{profile_id}/filters` | Accurate |
| `getExternalFilters()` | `app/src/services/api.ts:191` | `GET /profiles/{profile_id}/filters/external` | Accurate |
| `updateFilter()` | `app/src/services/api.ts:195` | `PUT /profiles/{profile_id}/filters/filter/{filter}` with form data `status` | Incorrect route |
| `batchUpdateFilters()` | `app/src/services/api.ts:202` | `PUT /profiles/{profile_id}/filters` with body param `filters` array of objects | Likely incorrect body shape |
| `getServiceCategories()` | `app/src/services/api.ts:210` | `GET /services/categories` | Accurate |
| `getServicesByCategory()` | `app/src/services/api.ts:214` | `GET /services/categories/{category}` | Accurate |
| `getDeviceActivity()` | `app/src/services/api.ts:222` | No documented `GET /devices/{id}/activity`; documented equivalent is `GET /access?device_id=...` | Incorrect/undocumented route |
| `getProfileServices()` | `app/src/services/api.ts:226` | `GET /profiles/{profile_id}/services` | Accurate |
| `updateService()` | `app/src/services/api.ts:230` | `PUT /profiles/{profile_id}/services/{service}` with `do`, `status`, `via`, `via_v6` form fields | Mostly accurate |
| `getCustomRules()` | `app/src/services/api.ts:247` | `GET /profiles/{profile_id}/rules/{folder_id}`, omit folder for root | Accurate |
| `createCustomRule()` | `app/src/services/api.ts:254` | `POST /profiles/{profile_id}/rules` with form fields | Mostly accurate |
| `updateCustomRule()` | `app/src/services/api.ts:261` | `PUT /profiles/{profile_id}/rules` with form fields | Mostly accurate |
| `deleteCustomRule()` | `app/src/services/api.ts:268` | `DELETE /profiles/{profile_id}/rules/{hostname}` | Accurate |
| `getRuleFolders()` | `app/src/services/api.ts:275` | `GET /profiles/{profile_id}/groups` | Accurate |
| `createRuleFolder()` | `app/src/services/api.ts:279` | `POST /profiles/{profile_id}/groups` with form fields `name`, `do`, `status`, optional `via` | Incorrect body format |
| `updateRuleFolder()` | `app/src/services/api.ts:286` | `PUT /profiles/{profile_id}/groups/{folder}` with form fields | Incorrect body format |
| `deleteRuleFolder()` | `app/src/services/api.ts:293` | `DELETE /profiles/{profile_id}/groups/{folder}` | Accurate route |
| `getDefaultRule()` | `app/src/services/api.ts:300` | `GET /profiles/{profile_id}/default` | Accurate |
| `updateDefaultRule()` | `app/src/services/api.ts:304` | `PUT /profiles/{profile_id}/default` with form fields `do`, `via`, `status` | Incorrect body shape |
| `getDevices()` | `app/src/services/api.ts:312` | `GET /devices` | Accurate |
| `getDevice(pk)` | `app/src/services/api.ts:316` | Not visible in current nav; modify/delete imply `device_id` route exists | Needs verification |
| `createDevice()` | `app/src/services/api.ts:320` | `POST /devices` with form fields | Partially accurate, but missing required `icon` and possibly `client_count/profile_id` depending caller |
| `updateDevice()` | `app/src/services/api.ts:327` | `PUT /devices/{device_id}` with form fields | Accurate for mapped subset |
| Scheduler `callControlD()` | `app/server/control-d-server.mjs:96` | `PUT /devices/{device_id}` with form field `status` | Accurate |
| `getDeviceTypes()` | `app/src/services/api.ts:348` | `GET /devices/types` | Accurate |
| `getAccessIPs()` | `app/src/services/api.ts:353` | `GET /access?device_id=...` | Accurate |
| `learnIP()` | `app/src/services/api.ts:357` | `POST /access` with `device_id`, `ips[]` | Accurate |
| `deleteAccessIP()` | `app/src/services/api.ts:364` | `DELETE /access` | Likely accurate, but docs do not expose detailed params in scraped page |
| `getAnalyticsLevels()` | `app/src/services/api.ts:372` | `GET /analytics/levels` | Accurate |
| `getStorageRegions()` | `app/src/services/api.ts:376` | `GET /analytics/endpoints` | Accurate |
| `getProxies()` | `app/src/services/api.ts:380` | `GET /proxies` | Accurate |
| `getIP()` | `app/src/services/api.ts:385` | `GET /ip` | Accurate |
| `getNetworkStats()` | `app/src/services/api.ts:389` | `GET /network` | Accurate |

## Findings

### Critical Severity

No critical issues found. I did not see evidence of a mutation that would obviously damage user data while targeting the wrong Control D resource. The most serious items below are high severity because they break live functionality or create misleading dashboard state.

### High Severity

1. **Single filter updates use the wrong documented URL.**

   Evidence: `updateFilter()` calls `/profiles/${pk}/filters/${filter}` in `app/src/services/api.ts:195`. The current reference documents `PUT /profiles/{profile_id}/filters/filter/{filter}` with form field `status`.

   Impact: Native/external filter toggles in the UI can fail with 404 or no-op behavior against the live API.

   Remediation:
   - Change the URL to `/profiles/${pk}/filters/filter/${encodeURIComponent(filter)}`.
   - Keep using `application/x-www-form-urlencoded` with `status`.
   - Add a unit test asserting the exact path and body.

2. **Profile options list route is incorrect.**

   Evidence: `getProfileOptions(pk)` calls `/profiles/${pk}/options` in `app/src/services/api.ts:175`. The docs list options at `GET /profiles/options`; only mutation is profile-scoped at `PUT /profiles/{profile_id}/options/{name}`.

   Impact: any feature relying on available profile option metadata will fail or appear empty.

   Remediation:
   - Replace `getProfileOptions(pk)` with `getProfileOptions()` using `/profiles/options`.
   - If profile-specific effective option state is needed, verify whether Control D exposes it in profile payloads or another endpoint before implementing.

3. **Profile option updates send JSON and omit required `status`.**

   Evidence: `updateProfileOption()` sends `JSON.stringify({ value })` in `app/src/services/api.ts:179`. The reference requires form data `status` and optional `value`.

   Impact: profile option toggles cannot be reliably enabled/disabled.

   Remediation:
   - Change signature to accept `{ status: 0 | 1, value?: string | number }`.
   - Send `buildControlDFormBody({ status, value })`.
   - Add tests for enabling, disabling, and value-bearing options.

4. **Device activity uses an undocumented endpoint instead of `/access`.**

   Evidence: `getDeviceActivity()` calls `/devices/${deviceId}/activity` in `app/src/services/api.ts:222`; `loadDeviceActivitySummaries()` depends on it in `app/src/store/dataSlice.ts:160`. The reference documents `GET /access` with required query param `device_id`.

   Impact: activity badges, last-seen timestamps, and known-IP counts may never populate in live mode. The code catches errors silently at `app/src/store/dataSlice.ts:168`, so the user may not know the activity request is broken.

   Remediation:
   - Replace `getDeviceActivity()` implementation with `return this.getAccessIPs(deviceId)`, or remove it and call `getAccessIPs()` directly.
   - Preserve `extractAccessEntries()` because the docs show little response detail and the flexible parser is useful.
   - Surface non-fatal activity load failures in debug logs or a status diagnostic.

5. **Default-rule updates use dashboard `action` JSON instead of documented Control D form fields.**

   Evidence: `updateDefaultRule()` sends `JSON.stringify({ action })` in `app/src/services/api.ts:304`. The docs require `do`, `status`, and optional `via`.

   Impact: changing the default rule will fail or be ignored.

   Remediation:
   - Change to `updateDefaultRule(pk, payload: { do: number; status: number; via?: string })`.
   - Map dashboard actions through the same `do` vocabulary used for services/custom rules: `0 = BLOCK`, `1 = BYPASS`, `2 = SPOOF`, `3 = REDIRECT`.
   - Send form data.

### Medium Severity

6. **Profile create/update use JSON instead of documented form data.**

   Evidence: `createProfile()` and `updateProfile()` send JSON in `app/src/services/api.ts:154` and `app/src/services/api.ts:161`. The docs list form fields for both.

   Impact: creating, renaming, disabling, or locking profiles can fail even though the wrapper exposes methods.

   Remediation:
   - Introduce `toControlDProfilePayload()` mapping `name`, `clone_profile_id`, `disable_ttl`, `lock_status`, `lock_message`, `password`.
   - Send `buildControlDFormBody(...)`.
   - Avoid passing the whole app `Profile` object because it includes nested display data not accepted by the API.

7. **Rule folder create/update use JSON instead of documented form data.**

   Evidence: `createRuleFolder()` and `updateRuleFolder()` send JSON in `app/src/services/api.ts:279` and `app/src/services/api.ts:286`. The docs require form fields `name`, `do`, `status`, and optional `via`.

   Impact: folder creation/update may fail, and inherited rule behavior may not be set.

   Remediation:
   - Add `toControlDRuleFolderPayload(folder)` that maps `name`, `do`, `status`, `via`.
   - Send form-encoded bodies.
   - Validate `do` and `status` before submitting.

8. **Batch filter updates likely use the wrong body shape.**

   Evidence: `batchUpdateFilters()` sends arbitrary filter keys as form fields in `app/src/services/api.ts:202`. The docs describe a body parameter named `filters`, an array of objects.

   Impact: bulk filter updates may fail or partially apply depending on undocumented server tolerance.

   Remediation:
   - Confirm the exact expected object shape via the reference example or a controlled request.
   - Prefer `JSON.stringify({ filters: [...] })` only if the docs/example confirms JSON; otherwise form-encode the documented field as Control D expects.
   - Add integration-style mocked tests for a multi-filter payload.

9. **Device creation can omit required documented fields.**

   Evidence: `toControlDDevicePayload()` maps only `name`, `client_count`, `profile_id`, and `status` in `app/src/services/api.ts:56`; `createDevice()` uses that payload at `app/src/services/api.ts:320`. The docs require `name`, `client_count`, `profile_id`, and `icon`.

   Impact: creating a device through this wrapper will fail unless callers happen to supply fields not currently mapped.

   Remediation:
   - Map `icon`/`type` to documented `icon`.
   - For create, validate presence of `name`, `client_count`, `profile_id`, and `icon` before sending.
   - Consider separate `CreateDeviceInput` and `UpdateDeviceInput` types to reflect different required fields.

10. **Service/custom-rule redirect/spoof mapping is ambiguous.**

   Evidence: `toControlDServiceRulePayload()` maps dashboard status `3` to `do: 3` in `app/src/services/api.ts:39`, while `toControlDCustomRulePayload()` maps any non-block/non-bypass action to `do: 2` in `app/src/services/api.ts:68`. The docs distinguish `2 = SPOOF` and `3 = REDIRECT`.

   Impact: a dashboard action named `redirect` can create a SPOOF rule for custom rules, which is materially different from proxy redirection.

   Remediation:
   - Split `CustomRule.action` into `block | bypass | spoof | redirect`, or infer from whether `via` is an IP/hostname versus proxy identifier only after validation.
   - Preserve `via_v6` for spoof rules; currently `toControlDCustomRulePayload()` does not send it.
   - Make labels in the UI match the Control D vocabulary.

11. **Delete learned IP request details are under-specified.**

   Evidence: `deleteAccessIP()` sends form data `device_id` and `ips[]` in `app/src/services/api.ts:364`. The scraped docs page confirms `DELETE /access` but does not show query/body params.

   Impact: this may be correct by analogy with `POST /access`, but it should be verified before relying on it.

   Remediation:
   - Verify against Control D’s live docs example or a test token.
   - Add a test asserting whichever body/query format is confirmed.

### Low Severity

12. **Response handling assumes JSON for every API response.**

   Evidence: `request()` throws if `response.json()` fails in `app/src/services/api.ts:126`.

   Impact: if Control D returns an empty 204-style response or HTML error page during outages, errors become less diagnosable. Current docs generally show 200 JSON responses, so this is low severity.

   Remediation:
   - Parse by content type.
   - Include HTTP status, endpoint, and a short body excerpt in thrown errors.

13. **The production proxy forwards only a minimal header set.**

   Evidence: `proxyControlD()` forwards Authorization, Accept, and Content-Type in `app/server/control-d-server.mjs:185`.

   Impact: this is adequate for current docs but could lose future required headers or request IDs. It also does not implement request timeouts.

   Remediation:
   - Add an `AbortController` timeout.
   - Consider forwarding a generated request ID internally for logs.
   - Keep the explicit allowlist rather than proxying all client headers.

14. **Silent partial loading hides real API drift.**

   Evidence: service category loads catch and skip failures at `app/src/store/dataSlice.ts:141`; device activity failures are swallowed at `app/src/store/dataSlice.ts:163`; rule folder loading is downgraded to an empty response at `app/src/store/dataSlice.ts:429`.

   Impact: the dashboard can look valid while missing Control D data.

   Remediation:
   - Track non-fatal load warnings separately from fatal errors.
   - Expose a diagnostics panel or console debug output in live mode.

15. **Types mix API fields and dashboard view-model fields.**

   Evidence: `Service.status` is documented in-code as a dashboard status while `do` carries the Control D API value in `app/src/types/controld.ts`; normalizers translate in `app/src/services/controldData.ts:44`.

   Impact: future contributors can easily send display-state values as API fields.

   Remediation:
   - Introduce raw API DTO types, request payload types, and UI view-model types.
   - Keep mapping functions at the API boundary.

## Positive Findings

- The API client centralizes token injection, `Accept: application/json`, and form encoding in one place (`app/src/services/api.ts:98`).
- Device update and scheduler pause/restore use the documented `PUT /devices/{device_id}` `status` field correctly (`app/src/services/api.ts:327`, `app/server/control-d-server.mjs:96`).
- Services and custom rules largely use the documented `do/status/via/hostnames[]` form vocabulary.
- Response extraction is flexible enough to handle arrays, keyed objects, and nested collection keys (`app/src/store/dataSlice.ts:36`).
- There are targeted tests for several previously risky payload mappings (`app/src/services/api.test.ts`).

## Recommended Remediation Plan

1. Fix broken routes first:
   - `updateFilter()` -> `/profiles/{profile_id}/filters/filter/{filter}`.
   - `getProfileOptions()` -> `/profiles/options`.
   - `getDeviceActivity()` -> `/access?device_id=...` or direct `getAccessIPs()`.

2. Convert remaining JSON mutations to documented Control D form payloads:
   - Profiles create/update.
   - Profile option update.
   - Rule folder create/update.
   - Default rule update.

3. Split request types from UI models:
   - `CreateProfileInput`, `UpdateProfileInput`.
   - `CreateDeviceInput`, `UpdateDeviceInput`.
   - `ServiceRulePayload`, `CustomRulePayload`, `DefaultRulePayload`.

4. Add API contract tests:
   - Mock `fetch` and assert method, URL, content type, and serialized body for every mutation.
   - Include regression tests for single filter modify and default rule modify.

5. Improve diagnostics:
   - Add non-fatal warnings for partial background loads.
   - Include endpoint/status/body excerpts in API errors.
   - Add request timeout handling in both the browser client path and the Node proxy path.

6. Verify uncertain endpoints:
   - `GET /profiles/{pk}` and `GET /devices/{pk}` are plausible but not visible in the scraped current nav.
   - `DELETE /access` parameter format needs confirmation.
   - Batch filter body shape needs confirmation from an example or live request.

## Final Assessment

This dashboard is close to a solid Control D client for common family/personal workflows, especially read-only overview pages and simple device/service/custom-rule changes. The accuracy score is held back by mutation drift from the published reference. Fixing the documented route/body mismatches would likely raise the overall score from **6.2** to around **8.0**, and adding contract tests plus clearer API DTOs would push maintainability and robustness higher.
