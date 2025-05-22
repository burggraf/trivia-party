#!/bin/bash

echo "iOS Secrets Preparation & GitHub CLI Script Generator"
echo "----------------------------------------------------"
echo "This script will:"
echo "1. Help you Base64 encode your .p12 certificate and .mobileprovision file."
echo "2. Ask for your .p12 password and Apple Team ID."
echo "3. Ask for your GitHub repository (owner/repo)."
echo "4. Generate a new script named 'set_github_ios_secrets.sh' with commands to set these secrets using the GitHub CLI."
echo ""
echo "Prerequisites:"
echo "- You must have the GitHub CLI ('gh') installed and authenticated (run 'gh auth login')."
echo "- You must have already downloaded your .p12 certificate and .mobileprovision file."
echo ""

# --- GitHub Repository ---
read -p "Enter your GitHub repository (e.g., owner/repo_name): " GITHUB_REPO
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository cannot be empty."
    exit 1
fi

# --- Certificate (.p12) ---
read -p "Enter the full path to your .p12 certificate file: " P12_PATH
if [ ! -f "$P12_PATH" ]; then
    echo "Error: .p12 file not found at $P12_PATH"
    exit 1
fi

# --- .p12 Password ---
read -s -p "Enter the password for your .p12 certificate file: " P12_PASSWORD
echo "" # Newline after password input
if [ -z "$P12_PASSWORD" ]; then
    echo "Error: .p12 password cannot be empty."
    exit 1
fi

# --- Provisioning Profile (.mobileprovision) ---
read -p "Enter the full path to your .mobileprovision file: " MOBILEPROVISION_PATH
if [ ! -f "$MOBILEPROVISION_PATH" ]; then
    echo "Error: .mobileprovision file not found at $MOBILEPROVISION_PATH"
    exit 1
fi

# --- Apple Team ID ---
read -p "Enter your 10-character Apple Developer Team ID: " APPLE_TEAM_ID
if [ -z "$APPLE_TEAM_ID" ]; then
    echo "Error: Apple Team ID cannot be empty."
    exit 1
fi

# --- Base64 Encoding ---
echo "Encoding files..."
IOS_CERTIFICATE_BASE64=$(base64 -i "$P12_PATH")
if [ -z "$IOS_CERTIFICATE_BASE64" ]; then
    echo "Error: Failed to Base64 encode the .p12 file."
    exit 1
fi

IOS_PROVISIONING_PROFILE_BASE64=$(base64 -i "$MOBILEPROVISION_PATH")
if [ -z "$IOS_PROVISIONING_PROFILE_BASE64" ]; then
    echo "Error: Failed to Base64 encode the .mobileprovision file."
    exit 1
fi

# --- Generate the output script ---
OUTPUT_SCRIPT_NAME="set_github_ios_secrets.sh"
echo "Generating '$OUTPUT_SCRIPT_NAME'..."

cat > "$OUTPUT_SCRIPT_NAME" << EOF
#!/bin/bash

echo "This script will set iOS secrets for the GitHub repository: $GITHUB_REPO"
echo "Make sure you have the GitHub CLI ('gh') installed and are authenticated."
echo "Review the commands before proceeding."
echo ""
read -p "Do you want to proceed? (y/N): " CONFIRM_EXECUTION
if [[ ! "\$CONFIRM_EXECUTION" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Setting IOS_CERTIFICATE_BASE64..."
gh secret set IOS_CERTIFICATE_BASE64 -b"$IOS_CERTIFICATE_BASE64" -R "$GITHUB_REPO"

echo "Setting IOS_CERTIFICATE_PASSWORD..."
gh secret set IOS_CERTIFICATE_PASSWORD -b"$P12_PASSWORD" -R "$GITHUB_REPO"

echo "Setting IOS_PROVISIONING_PROFILE_BASE64..."
gh secret set IOS_PROVISIONING_PROFILE_BASE64 -b"$IOS_PROVISIONING_PROFILE_BASE64" -R "$GITHUB_REPO"

echo "Setting APPLE_TEAM_ID..."
gh secret set APPLE_TEAM_ID -b"$APPLE_TEAM_ID" -R "$GITHUB_REPO"

echo ""
echo "All secrets have been processed for repository '$GITHUB_REPO'."
echo "Please verify them in your GitHub repository settings (Secrets and variables > Actions)."
EOF

chmod +x "$OUTPUT_SCRIPT_NAME"

echo ""
echo "----------------------------------------------------"
echo "SUCCESS: '$OUTPUT_SCRIPT_NAME' has been generated in the current directory."
echo ""
echo "Next Steps:"
echo "1. Review the contents of '$OUTPUT_SCRIPT_NAME' to ensure the commands are correct."
echo "2. Run the generated script: ./$OUTPUT_SCRIPT_NAME"
echo "   It will prompt for confirmation before setting the secrets."
echo "----------------------------------------------------"

