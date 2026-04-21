const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(process.cwd(), 'test-results.json');
const REPORT_FILE = path.join(process.cwd(), 'TEST_REPORT.md');

async function generateReport() {
    try {
        if (!fs.existsSync(RESULTS_FILE)) {
            console.error('❌ test-results.json not found. Run "npm run test:report" again.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
        const { numPassedTests, numFailedTests, numTotalTests, testResults, startTime } = data;
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const status = numFailedTests === 0 ? '🟢 RÉUSSI' : '🔴 ÉCHEC';

        let markdown = `# 📊 Rapport de Test Automatique (BMS API)\n\n`;
        markdown += `> Généré automatiquement le : ${new Date().toLocaleString()}\n\n`;

        markdown += `## 📋 Résumé Global\n`;
        markdown += `| Statut | Réussis | Échoués | Total | Durée |\n`;
        markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;
        markdown += `| ${status} | ${numPassedTests} | ${numFailedTests} | ${numTotalTests} | ${duration}s |\n\n`;

        markdown += `## 🛠️ Détail des Suites de Tests\n\n`;

        testResults.forEach(suite => {
            const suiteName = path.basename(suite.name);
            const suiteStatus = suite.status === 'passed' ? '✅' : '❌';
            markdown += `### ${suiteStatus} ${suiteName}\n`;
            
            markdown += `| Test | Statut | Durée |\n`;
            markdown += `| :--- | :--- | :--- |\n`;
            
            suite.assertionResults.forEach(test => {
                const testStatus = test.status === 'passed' ? '✓' : '✗';
                markdown += `| ${test.title} | ${testStatus} | ${test.duration}ms |\n`;
            });
            markdown += `\n`;
        });

        markdown += `---\n`;
        markdown += `*Note: Ce rapport a été généré via la commande \`npm run test:report\`.*\n`;

        fs.writeFileSync(REPORT_FILE, markdown);
        console.log(`\n🎉 Rapport généré avec succès dans : ${REPORT_FILE}\n`);

        // Cleanup
        if (fs.existsSync(RESULTS_FILE)) {
            fs.unlinkSync(RESULTS_FILE);
        }

    } catch (error) {
        console.error('❌ Erreur lors de la génération du rapport :', error.message);
        process.exit(1);
    }
}

generateReport();
