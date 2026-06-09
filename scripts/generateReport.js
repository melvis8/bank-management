const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(process.cwd(), 'test-results.json');
const COVERAGE_FILE = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const REPORT_FILE = path.join(process.cwd(), 'TEST_REPORT.html');

function generateHtmlReport() {
    try {
        if (!fs.existsSync(RESULTS_FILE)) {
            console.error('❌ test-results.json not found. Run "npm run test:report" again.');
            process.exit(1);
        }

        const resultsData = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
        let coverageData = null;

        if (fs.existsSync(COVERAGE_FILE)) {
            coverageData = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
        }

        const {
            numPassedTests = 0,
            numFailedTests = 0,
            numTotalTests = 0,
            testResults = [],
            startTime
        } = resultsData;

        const duration = startTime ? ((Date.now() - startTime) / 1000).toFixed(2) : '0.00';
        const isSuccess = numFailedTests === 0;

        // Extract coverage details
        const totalCoverage = coverageData ? coverageData.total : null;
        const fileCoverage = coverageData ? Object.entries(coverageData).filter(([key]) => key !== 'total') : [];

        // Build HTML
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bank Management API - Test Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(17, 24, 39, 0.7);
            --card-border: rgba(255, 255, 255, 0.08);
            --accent-success: #10b981;
            --accent-error: #ef4444;
            --accent-warning: #f59e0b;
            --accent-blue: #3b82f6;
            --text-main: #f3f4f6;
            --text-secondary: #9ca3af;
            --text-muted: #6b7280;
            --glow-success: rgba(16, 185, 129, 0.15);
            --glow-error: rgba(239, 68, 68, 0.15);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            padding: 2.5rem 1.5rem;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
            background-attachment: fixed;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* Header section */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 1.5rem;
        }

        .title-area h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.25rem;
            font-weight: 800;
            background: linear-gradient(135deg, #3b82f6, #10b981);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .title-area p {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .status-badge {
            padding: 0.75rem 1.5rem;
            border-radius: 50px;
            font-weight: 700;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 4px 20px var(--glow-success);
        }

        .status-badge.success {
            background-color: rgba(16, 185, 129, 0.15);
            color: var(--accent-success);
            border: 1px solid rgba(16, 185, 129, 0.3);
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
        }

        .status-badge.failure {
            background-color: rgba(239, 68, 68, 0.15);
            color: var(--accent-error);
            border: 1px solid rgba(239, 68, 68, 0.3);
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
        }

        /* Grid metrics */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }

        .metric-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 1.5rem;
            backdrop-filter: blur(12px);
            transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .metric-card:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.15);
        }

        .metric-card .label {
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .metric-card .value {
            font-family: 'Outfit', sans-serif;
            font-size: 2.25rem;
            font-weight: 700;
            color: var(--text-main);
        }

        .metric-card.success .value {
            color: var(--accent-success);
        }
        
        .metric-card.error .value {
            color: var(--accent-error);
        }

        /* Coverage section */
        .section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .coverage-container {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 2rem;
            margin-bottom: 2.5rem;
            backdrop-filter: blur(12px);
        }

        .coverage-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 2rem;
        }

        .coverage-donut {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .coverage-donut svg {
            width: 120px;
            height: 120px;
            transform: rotate(-90deg);
        }

        .coverage-donut circle {
            fill: none;
            stroke-width: 10;
        }

        .coverage-donut circle.bg {
            stroke: rgba(255, 255, 255, 0.05);
        }

        .coverage-donut circle.val {
            stroke: var(--accent-success);
            stroke-linecap: round;
            transition: stroke-dasharray 0.5s ease;
        }

        .coverage-donut circle.val.low {
            stroke: var(--accent-error);
        }
        
        .coverage-donut circle.val.med {
            stroke: var(--accent-warning);
        }

        .donut-text {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
            margin-top: 0.75rem;
        }

        .donut-label {
            color: var(--text-secondary);
            font-size: 0.85rem;
            margin-top: 0.25rem;
        }

        /* Table files */
        .table-wrapper {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 1rem;
            border-bottom: 1px solid var(--card-border);
            font-weight: 600;
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-size: 0.95rem;
        }

        tr:last-child td {
            border-bottom: none;
        }

        .file-name {
            font-weight: 500;
            color: var(--text-main);
        }

        .file-path {
            font-size: 0.8rem;
            color: var(--text-muted);
            display: block;
            margin-top: 0.25rem;
        }

        .bar-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .progress-bar-bg {
            flex-grow: 1;
            height: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            overflow: hidden;
            max-width: 120px;
        }

        .progress-bar-fill {
            height: 100%;
            border-radius: 10px;
        }

        .progress-bar-fill.high { background-color: var(--accent-success); }
        .progress-bar-fill.med { background-color: var(--accent-warning); }
        .progress-bar-fill.low { background-color: var(--accent-error); }

        .pct-val {
            font-weight: 600;
            font-size: 0.9rem;
            min-width: 45px;
        }

        .pct-val.high { color: var(--accent-success); }
        .pct-val.med { color: var(--accent-warning); }
        .pct-val.low { color: var(--accent-error); }

        /* Test suite list */
        .suites-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .suite-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            overflow: hidden;
            backdrop-filter: blur(12px);
        }

        .suite-header {
            padding: 1.25rem 1.5rem;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid var(--card-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .suite-title-area {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .suite-status-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: bold;
        }

        .suite-status-icon.passed {
            background-color: rgba(16, 185, 129, 0.1);
            color: var(--accent-success);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .suite-status-icon.failed {
            background-color: rgba(239, 68, 68, 0.1);
            color: var(--accent-error);
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .suite-name {
            font-family: 'Outfit', sans-serif;
            font-size: 1.15rem;
            font-weight: 600;
        }

        .suite-meta {
            color: var(--text-secondary);
            font-size: 0.85rem;
            display: flex;
            gap: 1rem;
        }

        .tests-list {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .test-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.015);
            border-radius: 8px;
            border-left: 3px solid transparent;
        }

        .test-row.passed {
            border-left-color: var(--accent-success);
        }

        .test-row.failed {
            border-left-color: var(--accent-error);
        }

        .test-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .test-title {
            font-size: 0.95rem;
            font-weight: 500;
        }

        .test-status-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.05em;
        }

        .test-status-label.passed { color: var(--accent-success); }
        .test-status-label.failed { color: var(--accent-error); }

        .test-duration {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .failure-message {
            margin-top: 0.5rem;
            padding: 1rem;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 6px;
            color: #fca5a5;
            font-family: monospace;
            font-size: 0.85rem;
            white-space: pre-wrap;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="title-area">
                <h1>Bank Management API - Test Dashboard</h1>
                <p>Test report automatically generated on ${new Date().toLocaleString()}</p>
            </div>
            <div class="status-badge ${isSuccess ? 'success' : 'failure'}">
                <span>${isSuccess ? '🟢 Success' : '🔴 Failed'}</span>
            </div>
        </header>

        <!-- Global statistics -->
        <div class="metrics-grid">
            <div class="metric-card ${isSuccess ? 'success' : 'error'}">
                <div class="label">Test Status</div>
                <div class="value">${isSuccess ? 'PASS' : 'FAIL'}</div>
            </div>
            <div class="metric-card">
                <div class="label">Total Tests</div>
                <div class="value">${numTotalTests}</div>
            </div>
            <div class="metric-card success">
                <div class="label">Passed</div>
                <div class="value">${numPassedTests}</div>
            </div>
            <div class="metric-card ${numFailedTests > 0 ? 'error' : ''}">
                <div class="label">Failed</div>
                <div class="value">${numFailedTests}</div>
            </div>
            <div class="metric-card">
                <div class="label">Duration</div>
                <div class="value">${duration}s</div>
            </div>
        </div>

        <!-- Coverage summary -->
        ${totalCoverage ? `
        <h2 class="section-title">📊 Code Coverage Metrics</h2>
        <div class="coverage-container">
            <div class="coverage-overview">
                ${['statements', 'branches', 'functions', 'lines'].map(type => {
                    const data = totalCoverage[type];
                    const pct = data ? data.pct : 0;
                    const r = 50;
                    const c = Math.PI * r * 2;
                    const strokeDash = c - (pct / 100) * c;
                    const level = pct >= 90 ? 'high' : (pct >= 75 ? 'med' : 'low');
                    return `
                    <div class="coverage-donut">
                        <svg>
                            <circle class="bg" cx="60" cy="60" r="${r}"></circle>
                            <circle class="val ${level}" cx="60" cy="60" r="${r}" 
                                    stroke-dasharray="${c}" stroke-dashoffset="${strokeDash}"></circle>
                        </svg>
                        <div class="donut-text">${pct}%</div>
                        <div class="donut-label">${type.toUpperCase()}</div>
                    </div>
                    `;
                }).join('')}
            </div>

            <!-- Table breakdown -->
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Statements</th>
                            <th>Branches</th>
                            <th>Functions</th>
                            <th>Lines</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fileCoverage.map(([filepath, stats]) => {
                            const filename = path.basename(filepath);
                            const relativePath = path.relative(process.cwd(), filepath);
                            
                            const getLevel = (pct) => pct >= 90 ? 'high' : (pct >= 75 ? 'med' : 'low');
                            
                            return `
                            <tr>
                                <td>
                                    <span class="file-name">${filename}</span>
                                    <span class="file-path">${relativePath}</span>
                                </td>
                                ${['statements', 'branches', 'functions', 'lines'].map(type => {
                                    const pct = stats[type] ? stats[type].pct : 0;
                                    const lvl = getLevel(pct);
                                    return `
                                    <td>
                                        <div class="bar-container">
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill ${lvl}" style="width: ${pct}%"></div>
                                            </div>
                                            <span class="pct-val ${lvl}">${pct}%</span>
                                        </div>
                                    </td>
                                    `;
                                }).join('')}
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- Test Suites -->
        <h2 class="section-title">🛠️ Test Suites & Assertions</h2>
        <div class="suites-container">
            ${testResults.map(suite => {
                const suiteName = path.basename(suite.name);
                const passedCount = suite.assertionResults.filter(t => t.status === 'passed').length;
                const totalCount = suite.assertionResults.length;
                const isSuitePassed = suite.status === 'passed';

                return `
                <div class="suite-card">
                    <div class="suite-header">
                        <div class="suite-title-area">
                            <div class="suite-status-icon ${isSuitePassed ? 'passed' : 'failed'}">
                                ${isSuitePassed ? '✓' : '✗'}
                            </div>
                            <span class="suite-name">${suiteName}</span>
                        </div>
                        <div class="suite-meta">
                            <span>${passedCount} / ${totalCount} Passed</span>
                        </div>
                    </div>
                    <div class="tests-list">
                        ${suite.assertionResults.map(test => {
                            const isTestPassed = test.status === 'passed';
                            return `
                            <div>
                                <div class="test-row ${isTestPassed ? 'passed' : 'failed'}">
                                    <div class="test-info">
                                        <span class="test-status-label ${isTestPassed ? 'passed' : 'failed'}">
                                            ${isTestPassed ? 'PASS' : 'FAIL'}
                                        </span>
                                        <span class="test-title">${test.title}</span>
                                    </div>
                                    <span class="test-duration">${test.duration ? test.duration.toFixed(0) : 0}ms</span>
                                </div>
                                ${test.failureMessages && test.failureMessages.length > 0 ? `
                                <div class="failure-message">${test.failureMessages.join('\\n')}</div>
                                ` : ''}
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
</body>
</html>
`;

        fs.writeFileSync(REPORT_FILE, html);
        console.log(`\n🎉 Premium HTML Report generated successfully: ${REPORT_FILE}\n`);

        // Cleanup
        if (fs.existsSync(RESULTS_FILE)) {
            fs.unlinkSync(RESULTS_FILE);
        }

    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

generateHtmlReport();
