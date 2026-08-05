# macOS signing & notarization (kill “app is damaged”)

Apple only trusts apps from the internet if they are:

1. Signed with a **Developer ID Application** certificate  
2. **Notarized** by Apple  
3. Ticket **stapled** to the DMG  

There is **no free workaround** that works for all downloaders. Ad‑hoc signing and `xattr` only help on one machine. Browser downloads always get quarantine unless notarized.

Cost: [Apple Developer Program](https://developer.apple.com/programs/) — **$99 / year**.

## One-time setup on a Mac

### 1. Enroll

https://developer.apple.com/programs/enroll/

### 2. Create a Certificate Signing Request (CSR)

Keychain Access → Certificate Assistant → **Request a Certificate From a Certificate Authority**  
Save the `.certSigningRequest` to disk.

### 3. Create **Developer ID Application** cert

1. https://developer.apple.com/account/resources/certificates/list  
2. **+** → **Developer ID Application** (not “Apple Development”)  
3. Upload CSR → download `.cer` → double‑click to install in **login** keychain  

Only the Account Holder can create Developer ID certs.

### 4. Export `.p12` for CI

1. Keychain Access → **My Certificates**  
2. Expand the cert → right‑click the **private key** → **Export**  
3. Format: `.p12`, set a strong password  
4. Encode for GitHub:

```bash
openssl base64 -A -in DeveloperID.p12 -out certificate-base64.txt
```

### 5. App-specific password (notarization)

https://appleid.apple.com → Sign-In and Security → **App-Specific Passwords**  
Create one named e.g. `solana-cli-gui-ci`.

### 6. Team ID

https://developer.apple.com/account → Membership details → **Team ID** (10 characters).

### 7. Signing identity string

```bash
security find-identity -v -p codesigning
```

Copy the line that looks like:

```text
Developer ID Application: Your Name (XXXXXXXXXX)
```

## GitHub secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → New repository secret:

| Secret | Value |
|--------|--------|
| `APPLE_CERTIFICATE` | entire contents of `certificate-base64.txt` |
| `APPLE_CERTIFICATE_PASSWORD` | password you set when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_PASSWORD` | app-specific password (not your login password) |
| `APPLE_TEAM_ID` | 10-character Team ID |

## Publish a clean release

```bash
# bump version in package.json, tauri.conf.json, Cargo.toml if needed
git tag v0.1.1
git push origin v0.1.1
```

The **Release** workflow will fail until all secrets are set (by design). After secrets are present, Actions builds a signed + notarized arm64 DMG and uploads it to the GitHub Release.

Users can then open the DMG normally — no `xattr`, no “damaged” dialog.

## Local verify (optional)

With the cert in your login keychain:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
bun run tauri:build
```

Then:

```bash
spctl -a -vvv -t install "src-tauri/target/release/bundle/macos/solana cli.app"
```

You want `accepted` / source=Notarized Developer ID.
