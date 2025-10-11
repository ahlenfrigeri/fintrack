// check-security.js
// Execute: node check-security.js
// Este script verifica se a segurança foi configurada corretamente

const fs = require('fs');
const path = require('path');

console.log('🔒 Verificando configuração de segurança...\n');

let errors = 0;
let warnings = 0;

// 1. Verificar se .env existe
console.log('📋 Verificando arquivos...');
if (fs.existsSync('.env')) {
    console.log('  ✅ .env encontrado');
} else {
    console.log('  ❌ .env NÃO encontrado - CRIE O ARQUIVO!');
    errors++;
}

// 2. Verificar se .env.example existe
if (fs.existsSync('.env.example')) {
    console.log('  ✅ .env.example encontrado');
} else {
    console.log('  ⚠️  .env.example não encontrado - recomendado para documentação');
    warnings++;
}

// 3. Verificar .gitignore
if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env')) {
        console.log('  ✅ .env está no .gitignore');
    } else {
        console.log('  ❌ .env NÃO está no .gitignore - ADICIONE AGORA!');
        errors++;
    }
} else {
    console.log('  ❌ .gitignore não encontrado');
    errors++;
}

// 4. Verificar firebase.js
console.log('\n🔥 Verificando Firebase...');
const firebasePath = path.join('src', 'firebase.js');
if (fs.existsSync(firebasePath)) {
    const firebaseContent = fs.readFileSync(firebasePath, 'utf8');

    if (firebaseContent.includes('process.env.REACT_APP_FIREBASE')) {
        console.log('  ✅ firebase.js está usando variáveis de ambiente');
    } else {
        console.log('  ❌ firebase.js NÃO está usando variáveis de ambiente');
        errors++;
    }

    // Verificar se tem credenciais hardcoded
    if (firebaseContent.includes('AIzaSy') && !firebaseContent.includes('process.env')) {
        console.log('  ❌ PERIGO: Credenciais hardcoded encontradas no firebase.js');
        errors++;
    }
} else {
    console.log('  ❌ src/firebase.js não encontrado');
    errors++;
}

// 5. Verificar se .env tem as variáveis corretas
console.log('\n🔑 Verificando variáveis de ambiente...');
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_AUTH_DOMAIN',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_STORAGE_BUCKET',
        'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
        'REACT_APP_FIREBASE_APP_ID'
    ];

    requiredVars.forEach(varName => {
        if (envContent.includes(varName)) {
            console.log(`  ✅ ${varName} encontrado`);
        } else {
            console.log(`  ❌ ${varName} NÃO encontrado`);
            errors++;
        }
    });
}

// 6. Verificar se .env está no git (não deveria estar!)
console.log('\n📦 Verificando Git...');
const { execSync } = require('child_process');
try {
    const gitFiles = execSync('git ls-files .env', { encoding: 'utf8' });
    if (gitFiles.trim()) {
        console.log('  ❌ PERIGO: .env está sendo rastreado pelo Git!');
        console.log('  Execute: git rm --cached .env && git commit -m "Remove .env"');
        errors++;
    } else {
        console.log('  ✅ .env não está sendo rastreado pelo Git');
    }
} catch (error) {
    console.log('  ⚠️  Não foi possível verificar Git (talvez não seja um repo git)');
    warnings++;
}

// 7. Verificar histórico do Git
try {
    const gitLog = execSync('git log --all --full-history --source --oneline -- "*firebase.js"', { encoding: 'utf8' });
    if (gitLog.includes('AIzaSy')) {
        console.log('  ⚠️  Possíveis credenciais no histórico do Git');
        console.log('  Considere rotacionar as credenciais do Firebase');
        warnings++;
    }
} catch (error) {
    // Git log pode falhar se não houver histórico
}

// Resumo final
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO DA VERIFICAÇÃO\n');

if (errors === 0 && warnings === 0) {
    console.log('✅ Tudo configurado corretamente!');
    console.log('🎉 Sua aplicação está segura!\n');
} else {
    if (errors > 0) {
        console.log(`❌ ${errors} erro(s) crítico(s) encontrado(s)`);
        console.log('   Corrija estes problemas IMEDIATAMENTE!\n');
    }
    if (warnings > 0) {
        console.log(`⚠️  ${warnings} aviso(s) encontrado(s)`);
        console.log('   Recomendado corrigir quando possível\n');
    }
}

console.log('📚 Para mais informações, consulte o guia de segurança.');
console.log('='.repeat(50) + '\n');

// Retorna código de saída apropriado
process.exit(errors > 0 ? 1 : 0);