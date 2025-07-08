
import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'android/capacitor-cordova-android-plugins/build.gradle',
  'android/app/build.gradle',
  'node_modules/@capacitor/android/capacitor/build.gradle',
  'node_modules/@capacitor/android/capacitor/build.gradle.kts',
  'node_modules/@capacitor/geolocation/android/build.gradle',
];

let patched = false;

for (const filePath of filesToPatch) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
    continue;
  }

  let contents = fs.readFileSync(fullPath, 'utf8');

  const updated = contents
    // Para arquivos `.gradle`
    .replace(/JavaVersion\.VERSION_\d+/g, 'JavaVersion.VERSION_17')
    .replace(/sourceCompatibility\s*=\s*JavaVersion\.VERSION_\d+/g, 'sourceCompatibility = JavaVersion.VERSION_17')
    .replace(/targetCompatibility\s*=\s*JavaVersion\.VERSION_\d+/g, 'targetCompatibility = JavaVersion.VERSION_17')
    .replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 35')
    .replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 35')
    // Para arquivos `.gradle.kts`
    .replace(/JavaVersion\.toVersion\("\d+"\)/g, 'JavaVersion.toVersion("17")')
    .replace(/sourceCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'sourceCompatibility = JavaVersion.toVersion("17")')
    .replace(/targetCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'targetCompatibility = JavaVersion.toVersion("17")')
    // Força Java 17 em toolchains específicos
    .replace(/javaLanguageVersion\s*=\s*JavaLanguageVersion\.of\(\d+\)/g, 'javaLanguageVersion = JavaLanguageVersion.of(17)')
    .replace(/languageVersion\s*=\s*JavaLanguageVersion\.of\(\d+\)/g, 'languageVersion = JavaLanguageVersion.of(17)');

  if (contents !== updated) {
    fs.writeFileSync(fullPath, updated);
    console.log(`✅ Patch aplicado: ${filePath}`);
    patched = true;
  }
}

if (!patched) {
  console.log('❌ Nenhum arquivo foi alterado. Talvez já estejam com Java 17.');
} else {
  console.log('🔧 Patch concluído. Todos os arquivos agora usam Java 17.');
}
