# John's automatic iAPS dev builds

This repository builds unmodified `Artificial-Pancreas/iAPS` **dev** code and
uploads it through the project's official **4. Build iAPS** workflow.

The **5. Automatic dev updates** workflow runs at 23 minutes past every hour
(UTC; GitHub may delay scheduled runs). It synchronises `dev` to the exact
upstream commit and requests a build when that commit has not been built
successfully. It avoids duplicate active builds, waits 24 hours before retrying
a failed build automatically, and rebuilds unchanged code after 60 days to keep
a current build available before TestFlight's 90-day expiry.

`main` holds this automation. Keep it as the default branch and do not sync it
with upstream. `dev` is managed automatically and can be replaced when upstream
changes; make personal source changes on another branch. No algorithm or dosing
code is changed by this automation.

## One-time setup

Follow the [official iAPS TestFlight instructions](https://github.com/Artificial-Pancreas/iAPS/blob/main/fastlane/testflight.md).

1. Have an active paid Apple Developer membership.
2. Create a private, empty `JohnKitching/Match-Secrets` repository (or reuse it
   if it already exists). Signing files must not be stored in a public repository.
3. Create an App Store Connect API key as described in those instructions.
4. Add these six **repository secrets** under this repository's Settings →
   Secrets and variables → Actions. Enter values directly into GitHub Secrets.

| Secret | Value |
| --- | --- |
| `TEAMID` | Your Apple Developer team ID |
| `FASTLANE_KEY_ID` | App Store Connect API key ID |
| `FASTLANE_ISSUER_ID` | App Store Connect API issuer ID |
| `FASTLANE_KEY` | Complete downloaded `.p8` private key text |
| `GH_PAT` | GitHub token with access to this repository and private Match-Secrets; the classic token needs `repo` and `workflow` scopes |
| `MATCH_PASSWORD` | Strong encryption password for Match signing files; use its existing password if reusing Match-Secrets |

5. Keep `AUTO_BUILD_BRANCHES` unset. This controller explicitly requests builds;
   enabling push builds would create duplicates. Keep `SCHEDULED_SYNC` unset:
   this controller synchronises the intended commit before building.
6. Leave `SKIP_TESTFLIGHT_UPLOAD` unset or `false` to allow uploads.
7. Run **1. Validate Secrets** with branch **dev**, followed by
   **2. Add Identifiers** with branch **dev**.
8. In the Apple Developer portal, assign the Loop App Group to the iAPS app and
   Watch identifiers as described in the official instructions. Existing Xcode
   signing does not guarantee that the distribution profiles have these assignments.
9. Create the iAPS app record in App Store Connect using the matching bundle ID,
   then add yourself to its TestFlight internal testing group with automatic
   build distribution enabled. Keep your existing bundle ID if it is a custom one:
   configure the optional `APP_IDENTIFIER` repository secret accordingly.
10. Run **5. Automatic dev updates** on **main**. Follow the separate
    **4. Build iAPS** run through its TestFlight upload and Apple's processing.

The controller waits without starting builds while any of the six secrets is
missing. Its Actions summary lists missing secret names without exposing values.
It also waits while `SKIP_TESTFLIGHT_UPLOAD=true`.

The upstream certificate workflow can revoke all distribution certificates when
`ENABLE_NUKE_CERTS=true` or `FORCE_NUKE_CERTS=true`. Leave these unset initially.
If certificate renewal later fails, inspect the logs before enabling revocation,
especially when other apps share your Apple Developer account.

## Manual controls

- **5. Automatic dev updates → Run workflow → main** checks now and can retry
  a failed build immediately. Tick **force** to rebuild unchanged code too.
- **4. Build iAPS → Run workflow → dev** builds the current mirrored dev branch.
- Disable **5. Automatic dev updates** in Actions to pause future automatic checks.
- To choose when new builds install, turn off iAPS automatic updates in TestFlight.

Uploading a build is separate from installing it. Verify the first successful
build is visible to your TestFlight account before relying on the automation.
