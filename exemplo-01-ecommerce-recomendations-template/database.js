import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';

dotenv.config();

let db;

export async function getDb() {
    if (db) return db;
    db = await open({
        filename: process.env.DB_PATH || './database.sqlite',
        driver: sqlite3.Database
    });
    await initDb();
    return db;
}

async function initDb() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            age INTEGER,
            gender TEXT,
            churn INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT,
            category TEXT,
            product_name TEXT,
            price REAL,
            quantity INTEGER,
            total_amount REAL,
            payment_method TEXT,
            returns INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    const { count } = await db.get('SELECT COUNT(*) as count FROM users');
    if (count === 0) {
        console.log('Database empty. Seeding from CSV...');
        await seedDatabase();
        console.log('Seeding complete.');
    }
}

async function seedDatabase() {
    const csvPath = process.env.CSV_PATH || './data/ecommerce_customer_data_large_com_produtos.csv';
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at ${csvPath}`);
        return;
    }

    return new Promise((resolve, reject) => {
        const nativeDb = db.getDatabaseInstance();
        nativeDb.serialize(() => {
            nativeDb.run('BEGIN TRANSACTION;');
            
            const stmtUser = nativeDb.prepare('INSERT OR IGNORE INTO users (id, name, age, gender, churn) VALUES (?, ?, ?, ?, ?)');
            const stmtTransaction = nativeDb.prepare('INSERT INTO transactions (user_id, date, category, product_name, price, quantity, total_amount, payment_method, returns) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    const userId = parseInt(row['Customer ID']);
                    const name = row['Customer Name'] || row['CustomerName'];
                    const age = parseInt(row['Customer Age'] || row['Age'] || 0);
                    const gender = row['Gender'];
                    const churn = parseInt(row['Churn'] || 0);

                    const date = row['Purchase Date'];
                    const category = row['Product Category'];
                    const productName = row['nome do produto'];
                    const price = parseFloat(row['Product Price']);
                    const quantity = parseInt(row['Quantity']);
                    const totalAmount = parseFloat(row['Total Purchase Amount']);
                    const paymentMethod = row['Payment Method'];
                    const returns = row['Returns'] ? parseFloat(row['Returns']) : 0;

                    stmtUser.run(userId, name, age, gender, churn);
                    stmtTransaction.run(userId, date, category, productName, price, quantity, totalAmount, paymentMethod, returns);
                })
                .on('end', () => {
                    stmtUser.finalize();
                    stmtTransaction.finalize();
                    nativeDb.run('COMMIT;', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                })
                .on('error', reject);
        });
    });
}

