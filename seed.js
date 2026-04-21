require('dotenv').config();
const { initializeDatabase, getPool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log('Initialisation de la connexion à la base de données...');
        await initializeDatabase();
        const pool = getPool();
        const client = await pool.connect();

        console.log('\n--- Génération de 5 Étudiants ---');
        const password = 'Password123!';
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const studentsData = [
            { student_id: 'STUD001', first_name: 'Alice', last_name: 'Nguema', email: 'alice@example.com', phone: '237600000001', balance: 5000 },
            { student_id: 'STUD002', first_name: 'Bob', last_name: 'Moussa', email: 'bob@example.com', phone: '237600000002', balance: 10000 },
            { student_id: 'STUD003', first_name: 'Charlie', last_name: 'Etoundi', email: 'charlie@example.com', phone: '237600000003', balance: 2500 },
            { student_id: 'STUD004', first_name: 'David', last_name: 'Bekono', email: 'david@example.com', phone: '237600000004', balance: 15000 },
            { student_id: 'STUD005', first_name: 'Eve', last_name: 'Onana', email: 'eve@example.com', phone: '237600000005', balance: 300 }
        ];

        const insertedStudents = [];

        for (const s of studentsData) {
            const exist = await client.query('SELECT * FROM students WHERE email = $1 OR student_id = $2', [s.email, s.student_id]);
            if (exist.rows.length === 0) {
                const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(100000 + Math.random() * 900000);
                const account_number = `BMS-${date}-${random}`;

                const result = await client.query(
                    `INSERT INTO students (student_id, first_name, last_name, email, password_hash, phone, account_number, balance)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [s.student_id, s.first_name, s.last_name, s.email, password_hash, s.phone, account_number, s.balance]
                );
                insertedStudents.push(result.rows[0]);
                console.log(`✅ Créé : ${s.email} | Matricule: ${s.student_id} | Solde: ${s.balance} XAF`);
            } else {
                insertedStudents.push(exist.rows[0]);
                console.log(`ℹ️  Saut : ${s.email} existe déjà.`);
            }
        }

        console.log('\n--- Génération de Transactions ---');
        let txCount = 0;
        
        for (let i = 0; i < insertedStudents.length; i++) {
            const current = insertedStudents[i];

            // 1. Dépôt de test (doit être >= 100)
            await client.query(
                `INSERT INTO transactions (student_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)`,
                [current.id, 'deposit', 500, 'completed', 'Dépôt initial de test']
            );
            txCount++;

            // 2. Retrait de test (doit être >= 100)
            if (current.balance >= 100) {
                await client.query(
                    `INSERT INTO transactions (student_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)`,
                    [current.id, 'withdraw', 100, 'completed', 'Retrait de test']
                );
                txCount++;
            }
        }
        
        console.log(`✅ Créé ${txCount} transactions de test.`);

        client.release();
        console.log('\n🎉 Remplissage de la base de données terminé !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Échec du remplissage :', error);
        process.exit(1);
    }
};

seedData();
