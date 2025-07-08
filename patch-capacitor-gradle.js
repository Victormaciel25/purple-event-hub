import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'android/capacitor-cordova-android-plugins/build.gradle',
  'android/app/build.gradle',
  'node_modules/@capacitor/android/capacitor/build.gradle',
  'node_modules/@capacitor/android/capacitor/build.gradle.kts',
];

let patched = false;

for (const filePath of filesToPatch) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) continue;

  let contents = fs.readFileSync(fullPath, 'utf8');

  const updated = contents
    // Para arquivos `.gradle`
    .replace(/JavaVersion\.VERSION_\d+/g, 'JavaVersion.VERSION_17')
    .replace(/sourceCompatibility\s*=\s*JavaVersion\.VERSION_\d+/g, 'sourceCompatibility = JavaVersion.VERSION_17')
    .replace(/targetCompatibility\s*=\s*JavaVersion\.VERSION_\d+/g, 'targetCompatibility = JavaVersion.VERSION_17')
    // Para arquivos `.gradle.kts`
    .replace(/JavaVersion\.toVersion\("\d+"\)/g, 'JavaVersion.toVersion("17")')
    .replace(/sourceCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'sourceCompatibility = JavaVersion.toVersion("17")')
    .replace(/targetCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'targetCompatibility = JavaVersion.toVersion("17")');

  if (contents !== updated) {
    fs.writeFileSync(fullPath, updated);
    console.log(`✅ Patch aplicado: ${filePath}`);
    patched = true;
  }
}

if (!patched) {
  console.log('❌ Nenhum arquivo foi alterado. Talvez já estejam com Java 17.');
}
