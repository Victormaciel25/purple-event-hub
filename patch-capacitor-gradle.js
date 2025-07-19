
import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'android/capacitor-cordova-android-plugins/build.gradle',
  'android/app/build.gradle',
  'android/app/capacitor.build.gradle', // Adiciona este arquivo
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
    .replace(/sourceCompatibility\s+JavaVersion\.VERSION_\d+/g, 'sourceCompatibility JavaVersion.VERSION_17')
    .replace(/targetCompatibility\s+JavaVersion\.VERSION_\d+/g, 'targetCompatibility JavaVersion.VERSION_17')
    .replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 35')
    .replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 35')
    // Para arquivos `.gradle.kts`
    .replace(/JavaVersion\.toVersion\("\d+"\)/g, 'JavaVersion.toVersion("17")')
    .replace(/sourceCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'sourceCompatibility = JavaVersion.toVersion("17")')
    .replace(/targetCompatibility\s*=\s*JavaVersion\.toVersion\("\d+"\)/g, 'targetCompatibility = JavaVersion.toVersion("17")')
    // Força Java 17 em toolchains específicos - mais agressivo
    .replace(/javaLanguageVersion\s*=\s*JavaLanguageVersion\.of\(\d+\)/g, 'javaLanguageVersion = JavaLanguageVersion.of(17)')
    .replace(/languageVersion\s*=\s*JavaLanguageVersion\.of\(\d+\)/g, 'languageVersion = JavaLanguageVersion.of(17)')
    // Corrige compileOptions específicos
    .replace(/compileOptions\s*\{[^}]*sourceCompatibility\s*[^\n]*\n[^}]*targetCompatibility\s*[^}]*\}/g, 
      'compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }')
    // Força toolchain Java 17 onde encontrar configurações de toolchain
    .replace(/java\s*\{[^}]*toolchain\s*\{[^}]*languageVersion\s*=\s*JavaLanguageVersion\.of\(\d+\)[^}]*\}[^}]*\}/g,
      'java {\n        toolchain {\n            languageVersion = JavaLanguageVersion.of(17)\n        }\n    }')
    // Substitui qualquer versão do Java por 17 (incluindo 21)
    .replace(/VERSION_21/g, 'VERSION_17')
    .replace(/VERSION_11/g, 'VERSION_17')
    .replace(/VERSION_8/g, 'VERSION_17');

  if (contents !== updated) {
    fs.writeFileSync(fullPath, updated);
    console.log(`✅ Patch aplicado: ${filePath}`);
    patched = true;
  }
}

// Patch adicional para o build.gradle do geolocation especificamente
const geolocationBuildGradle = path.resolve('node_modules/@capacitor/geolocation/android/build.gradle');
if (fs.existsSync(geolocationBuildGradle)) {
  let contents = fs.readFileSync(geolocationBuildGradle, 'utf8');
  
  // Força uma configuração específica para o geolocation
  const forceJava17Config = `
android {
    compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 35
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    defaultConfig {
        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 23
        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 35
    }
}
`;

  // Se não contém a configuração android, adiciona
  if (!contents.includes('android {') && !contents.includes('compileOptions')) {
    contents = contents + '\n' + forceJava17Config;
    fs.writeFileSync(geolocationBuildGradle, contents);
    console.log(`✅ Configuração Java 17 forçada para: ${geolocationBuildGradle}`);
    patched = true;
  }
}

if (!patched) {
  console.log('❌ Nenhum arquivo foi alterado. Talvez já estejam com Java 17.');
} else {
  console.log('🔧 Patch concluído. Todos os arquivos agora usam Java 17.');
}
