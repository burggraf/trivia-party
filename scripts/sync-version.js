import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define project root relative to the script location
const projectRoot = path.join(__dirname, '..');

// Paths to the files
const packageJsonPath = path.join(projectRoot, 'package.json');
const tauriConfPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');

try {
    // Read package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(packageJsonContent);
    const newVersion = packageData.version;

    if (!newVersion) {
        throw new Error('Version not found in package.json');
    }

    console.log(`Syncing version to: ${newVersion}`);

    // Update tauri.conf.json
    const tauriConfContent = fs.readFileSync(tauriConfPath, 'utf8');
    const tauriConfData = JSON.parse(tauriConfContent);
    if (tauriConfData.version !== newVersion) {
        tauriConfData.version = newVersion;
        // Preserve original formatting as much as possible
        const updatedTauriConfContent = JSON.stringify(tauriConfData, null, 2) + '\n'; // Add trailing newline
        fs.writeFileSync(tauriConfPath, updatedTauriConfContent, 'utf8');
        console.log(`Updated version in ${path.basename(tauriConfPath)}`);
    } else {
        console.log(`${path.basename(tauriConfPath)} already up-to-date.`);
    }

    // Update Cargo.toml
    let cargoTomlContent = fs.readFileSync(cargoTomlPath, 'utf8');
    const versionRegex = /^version\s*=\s*".*"$/m; // Match 'version = "..."' at the start of a line
    const currentVersionMatch = cargoTomlContent.match(versionRegex);

    if (currentVersionMatch && currentVersionMatch[0] !== `version = "${newVersion}"`) {
         cargoTomlContent = cargoTomlContent.replace(versionRegex, `version = "${newVersion}"`);
         fs.writeFileSync(cargoTomlPath, cargoTomlContent, 'utf8');
         console.log(`Updated version in ${path.basename(cargoTomlPath)}`);
    } else if (!currentVersionMatch) {
         console.warn(`Could not find version line matching pattern in ${path.basename(cargoTomlPath)}.`);
    }
     else {
        console.log(`${path.basename(cargoTomlPath)} already up-to-date.`);
    }

    console.log('Version synchronization complete.');

} catch (error) {
    console.error('Error syncing versions:', error);
    process.exit(1);
}