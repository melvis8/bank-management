require('dotenv').config();
const { initializeDatabase, getPool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log('Initialisation de la connexion à la base de données...');
        await initializeDatabase();
        const pool = getPool();
        const client = await pool.connect();

        console.log('\n--- Génération de 5 Utilisateurs ---');
        const password = 'Password123!';
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const usersData = [
            { user_id: 'USR001', first_name: 'Alice', last_name: 'Zambo', email: 'alice@example.com', phone: '237600000001', balance: 5000 },
            { user_id: 'USR002', first_name: 'Bob', last_name: 'Ndi', email: 'bob@example.com', phone: '237600000002', balance: 10000 },
            { user_id: 'USR003', first_name: 'Charlie', last_name: 'Talla', email: 'charlie@example.com', phone: '237600000003', balance: 2500 },
            { user_id: 'USR004', first_name: 'David', last_name: 'Kotto', email: 'david@example.com', phone: '237600000004', balance: 15000 },
            { user_id: 'USR005', first_name: 'Eve', last_name: 'Biloa', email: 'eve@example.com', phone: '237600000005', balance: 300 }
        ];

        const insertedUsers = [];

        for (const u of usersData) {
            const exist = await client.query('SELECT * FROM users WHERE email = $1 OR user_id = $2', [u.email, u.user_id]);
            if (exist.rows.length === 0) {
                const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(100000 + Math.random() * 900000);
                const account_number = `ACC-${date}-${random}`;

                const result = await client.query(
                    `INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone, account_number, balance)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [u.user_id, u.first_name, u.last_name, u.email, password_hash, u.phone, account_number, u.balance]
                );
                insertedUsers.push(result.rows[0]);
                console.log(`Créé : ${u.email} | ID: ${u.user_id} | Solde: ${u.balance} XAF`);
            } else {
                insertedUsers.push(exist.rows[0]);
                console.log(`ℹSaut : ${u.email} existe déjà.`);
            }
        }

        console.log('\n--- Génération de Transactions ---');
        let txCount = 0;

        for (let i = 0; i < insertedUsers.length; i++) {
            const current = insertedUsers[i];

            await client.query(
                `INSERT INTO transactions (user_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)`,
                [current.id, 'deposit', 500, 'completed', 'Dépôt initial de test']
            );
            txCount++;

            if (current.balance >= 100) {
                await client.query(
                    `INSERT INTO transactions (user_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)`,
                    [current.id, 'withdraw', 100, 'completed', 'Retrait de test']
                );
                txCount++;
            }
        }

        console.log(` Créé ${txCount} transactions de test.`);

        client.release();
        console.log('\n Remplissage de la base de données terminé !');
        console.log('\n Pour charger la base de données, lancez : node seed.js');
        process.exit(0);
    } catch (error) {
        console.error(' Échec du remplissage :', error);
        process.exit(1);
    }
};

seedData();
