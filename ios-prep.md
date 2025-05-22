# iOS Deployment Preparation Guide for Trivia Party

This guide outlines the steps required to configure the Trivia Party application for iOS deployment, including generating necessary Apple certificates and provisioning profiles, and setting up GitHub Actions secrets for automated builds.

## Prerequisites

1.  **Apple Developer Program Membership**: You must have an active membership in the Apple Developer Program.
2.  **Xcode**: Xcode must be installed on your macOS machine.
3.  **GitHub CLI (`gh`)**: The GitHub CLI should be installed and authenticated (`gh auth login`) on your local machine to use the helper script for setting secrets.
4.  **Project Cloned**: Ensure you have the latest version of the Trivia Party project cloned to your local machine.

## Step 1: Configure Your App in the Apple Developer Portal

### A. Create an App ID (Bundle Identifier)

An App ID uniquely identifies your application.

1.  Navigate to [developer.apple.com](https://developer.apple.com) and log in to your Account.
2.  Go to **Certificates, Identifiers & Profiles > Identifiers**.
3.  Click the `+` button to add a new Identifier.
    *   Select **App IDs** and click Continue.
    *   Select type **App** and click Continue.
    *   **Description**: Enter a name for your app (e.g., "Trivia Party").
    *   **Bundle ID**: Choose **Explicit** and enter a unique reverse-domain style string (e.g., `com.yourcompanyname.triviaparty`).
        *   **IMPORTANT**: This Bundle ID **must** exactly match the `bundle.identifier` value in your `src-tauri/tauri.conf.json` file.
    *   **Capabilities**: Select any capabilities your app requires (e.g., Push Notifications, Sign in with Apple). You can modify these later.
4.  Click **Continue**, then **Register**.

### B. Create a Distribution Certificate

This certificate verifies your identity as a developer.

1.  In **Certificates, Identifiers & Profiles**, go to **Certificates**.
2.  Click the `+` button.
3.  Under "Software", select **Apple Distribution** (or "iOS Distribution (App Store and Ad Hoc)" if the naming is older). Click **Continue**.
4.  **Create a Certificate Signing Request (CSR) on your Mac**:
    *   Open **Keychain Access** (Applications > Utilities).
    *   Go to **Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority...**
    *   **User Email Address**: Enter your Apple ID email.
    *   **Common Name**: Enter your name or company name.
    *   **CA Email Address**: Leave blank.
    *   Select **Saved to disk**. Click **Continue**.
    *   Save the `CertificateSigningRequest.certSigningRequest` file (e.g., to your Desktop).
5.  **Upload CSR to Apple Developer Portal**:
    *   Back on the Apple Developer portal, click "Choose File..." and upload the `.certSigningRequest` file you just created.
    *   Click **Continue**.
6.  **Download and Install Certificate**:
    *   Download the generated certificate (e.g., `distribution.cer`).
    *   Double-click the downloaded `.cer` file on your Mac. This will install it into your Keychain Access (usually in the "login" keychain).

### C. Export the .p12 Certificate File

The `.p12` file bundles your distribution certificate with its private key.

1.  In **Keychain Access**, find the certificate you just installed. It should be listed under "My Certificates" or "Certificates" and will have your name and "Apple Distribution" (or similar) in its name.
2.  Click the disclosure triangle to expand it and see the associated private key.
3.  Select **both** the certificate and its private key (hold Command and click each one).
4.  Right-click (or go to **File > Export Items...**).
5.  Choose **Personal Information Exchange (.p12)** as the file format.
6.  Save the file (e.g., `TriviaParty_DistCert.p12`).
7.  **IMPORTANT**: You will be prompted to create a password for this `.p12` file. **Create a strong password and remember it.** This password will be used as the `IOS_CERTIFICATE_PASSWORD` GitHub secret.

### D. Create a Distribution Provisioning Profile

This profile ties your App ID and Distribution Certificate together, authorizing your app for distribution (e.g., on the App Store or for Ad Hoc testing).

1.  In **Certificates, Identifiers & Profiles**, go to **Profiles**.
2.  Click the `+` button.
3.  Under "Distribution", select **App Store**. Click **Continue**. (For testing on specific devices before App Store submission, you would choose "Ad Hoc").
4.  **App ID**: Select the App ID you created in Step 1A from the dropdown menu. Click **Continue**.
5.  **Certificate**: Select the Distribution Certificate you created in Step 1B (it should be the most recent one). Click **Continue**.
6.  **Provisioning Profile Name**: Give it a descriptive name (e.g., "Trivia Party App Store Profile").
7.  Click **Generate**.
8.  Download the `.mobileprovision` file (e.g., `TriviaParty_AppStore.mobileprovision`).

### E. Find Your Apple Team ID

1.  Navigate to [developer.apple.com](https://developer.apple.com) and log in to your Account.
2.  Go to **Membership**.
3.  Your **Team ID** (a 10-character alphanumeric string) will be listed there. Copy this ID.

## Step 2: Configure Your Tauri Project

### A. Update `tauri.conf.json`

Open `src-tauri/tauri.conf.json` (or `Tauri.toml` / `tauri.conf.json5` if you use those) in your project:

1.  **Bundle Identifier**: Ensure `tauri > bundle > identifier` is set to the **exact same** Bundle ID you created in the Apple Developer Portal (Step 1A).
    ```json
    {
      "tauri": {
        "bundle": {
          "identifier": "com.yourcompanyname.triviaparty" // MUST MATCH APP ID
        },
        "ios": {
          "developmentTeam": "YOUR_APPLE_TEAM_ID" // See below
        }
      }
    }
    ```
2.  **Development Team ID**: Set `tauri > ios > developmentTeam` to your **Apple Team ID** (found in Step 1E).

### B. Initialize Tauri iOS Project (if not done)

If you haven't done this before, or if the `src-tauri/gen/apple` directory doesn't exist or is incomplete:

1.  Open your terminal in the project root.
2.  Run the command: `npx tauri ios init`
3.  This will generate the necessary Xcode project files under `src-tauri/gen/apple/`.

### C. Commit iOS Project Files

**Crucial**: The `src-tauri/gen/apple/` directory (containing the Xcode project) **must be committed to your Git repository**. The GitHub Actions workflow relies on these files being present.

```bash
git add src-tauri/gen/apple/
git commit -m "Add generated Tauri iOS project files"
git push
```

## Step 3: Prepare and Set GitHub Secrets

GitHub Actions secrets are used to securely store sensitive information like your certificate password and encoded certificate/profile files.

We use a helper script `prepare_ios_secrets.sh` located in the root of this project to simplify this process.

### A. Run `prepare_ios_secrets.sh`

1.  Open your terminal in the project root.
2.  Make the script executable (if you haven't already):
    ```bash
    chmod +x prepare_ios_secrets.sh
    ```
3.  Run the script:
    ```bash
    ./prepare_ios_secrets.sh
    ```
4.  The script will prompt you for:
    *   **Your GitHub repository** (e.g., `your-username/trivia-party`).
    *   **The full path to your downloaded `.p12` certificate file** (from Step 1C).
    *   **The password for your `.p12` file** (the one you created in Step 1C).
    *   **The full path to your downloaded `.mobileprovision` file** (from Step 1D).
    *   **Your 10-character Apple Developer Team ID** (from Step 1E).

### B. Review and Run the Generated Script

1.  After `prepare_ios_secrets.sh` finishes, it will create a new script named `set_github_ios_secrets.sh` in your project root.
2.  **IMPORTANT**: Open `set_github_ios_secrets.sh` with a text editor and **carefully review its contents**. It contains `gh secret set` commands that will set secrets in your GitHub repository. Ensure the repository name and the structure of the commands look correct.
3.  If everything looks good, make the generated script executable and run it:
    ```bash
    chmod +x set_github_ios_secrets.sh
    ./set_github_ios_secrets.sh
    ```
4.  This script will prompt for confirmation before setting the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):
    *   `IOS_CERTIFICATE_BASE64`
    *   `IOS_CERTIFICATE_PASSWORD`
    *   `IOS_PROVISIONING_PROFILE_BASE64`
    *   `APPLE_TEAM_ID`

## Step 4: Triggering the iOS Build Workflow

Once all the above steps are completed and the secrets are set in GitHub:

1.  The `tauri-ios-build.yml` workflow is configured to run on pushes to the `main` branch or can be triggered manually.
2.  To trigger manually:
    *   Go to your GitHub repository.
    *   Click on the **Actions** tab.
    *   In the left sidebar, find and click on **"Tauri iOS Build"**.
    *   Click the **"Run workflow"** button, select the branch, and click **"Run workflow"**.
3.  Monitor the workflow run for any errors. If issues arise, check the workflow logs for details. Common issues relate to incorrect bundle identifiers, team IDs, or problems with the certificate/provisioning profile setup.

## Troubleshooting

*   **Bundle ID Mismatch**: Ensure the `tauri.bundle.identifier` in `tauri.conf.json` *exactly* matches the Bundle ID of your App ID on the Apple Developer portal.
*   **Certificate/Profile Issues**: Double-check that you are using the correct Distribution Certificate and App Store Provisioning Profile. Ensure the certificate was correctly imported into your keychain before exporting the .p12 file.
*   **Xcode Version**: Ensure your macOS runner in GitHub Actions (and your local machine) has a compatible version of Xcode installed.
*   **Tauri CLI Version**: Ensure you are using a version of `@tauri-apps/cli` that supports mobile builds (v2.0.0-beta or later).

By following these steps, you should be able to successfully configure your Trivia Party application for iOS deployment and automate the build process using GitHub Actions.
