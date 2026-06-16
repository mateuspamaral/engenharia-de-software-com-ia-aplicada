import express from 'express';
import { getDb } from './database.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('.'));

// Helper to get day of year fraction
function getYearFraction(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 0;
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear / 365;
}

const normalize = (val, min, max) => (val - min) / ((max - min) || 1);

app.get('/api/users', async (req, res) => {
    try {
        const db = await getDb();
        const users = await db.all('SELECT * FROM users');
        const transactions = await db.all('SELECT * FROM transactions');

        // Group transactions by user
        const userPurchases = {};
        transactions.forEach(t => {
            if (!userPurchases[t.user_id]) userPurchases[t.user_id] = [];
            // Map db schema to frontend schema expected by the worker
            userPurchases[t.user_id].push({
                id: t.id,
                name: t.product_name,
                category: t.category,
                price: t.price,
                quantity: t.quantity,
                total_amount: t.total_amount,
                payment_method: t.payment_method,
                returns: t.returns,
                date: t.date
            });
        });

        const usersWithPurchases = users.map(u => ({
            id: u.id,
            name: u.name,
            age: u.age,
            gender: u.gender,
            churn: u.churn,
            purchases: userPurchases[u.id] || []
        }));

        res.json(usersWithPurchases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const db = await getDb();
        const products = await db.all(`
            SELECT 
                product_name as name, 
                category, 
                AVG(price) as price 
            FROM transactions 
            GROUP BY product_name, category
        `);
        // We add IDs
        const productsWithIds = products.map((p, i) => ({
            id: i + 1,
            name: p.name,
            category: p.category,
            price: p.price
        }));
        res.json(productsWithIds);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/history/:customerId', async (req, res) => {
    try {
        const db = await getDb();
        const customerId = parseInt(req.params.customerId);
        const history = await db.all('SELECT * FROM transactions WHERE user_id = ?', [customerId]);
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/training-data', async (req, res) => {
    try {
        const db = await getDb();
        // Calculate min/max and distinct values
        const limits = await db.get(`
            SELECT 
                MIN(age) as minAge, MAX(age) as maxAge
            FROM users
        `);
        const limitsTx = await db.get(`
            SELECT
                MIN(price) as minPrice, MAX(price) as maxPrice,
                MIN(quantity) as minQty, MAX(quantity) as maxQty,
                MIN(total_amount) as minTotal, MAX(total_amount) as maxTotal
            FROM transactions
        `);
        const { minAge, maxAge } = limits;
        const { minPrice, maxPrice, minQty, maxQty, minTotal, maxTotal } = limitsTx;

        const categoriesRows = await db.all('SELECT DISTINCT category FROM transactions ORDER BY category');
        const categories = categoriesRows.map(r => r.category);
        const categoriesIndex = Object.fromEntries(categories.map((c, i) => [c, i]));

        const genderRows = await db.all('SELECT DISTINCT gender FROM users ORDER BY gender');
        const genders = genderRows.map(r => r.gender);
        const gendersIndex = Object.fromEntries(genders.map((g, i) => [g, i]));

        const paymentRows = await db.all('SELECT DISTINCT payment_method FROM transactions ORDER BY payment_method');
        const payments = paymentRows.map(r => r.payment_method);
        const paymentsIndex = Object.fromEntries(payments.map((p, i) => [p, i]));

        const oneHot = (index, length) => {
            const arr = new Array(length).fill(0);
            if (index >= 0 && index < length) arr[index] = 1;
            return arr;
        };

        const users = await db.all('SELECT * FROM users');
        const transactions = await db.all('SELECT * FROM transactions');

        // Pre-compute user vectors
        const usersData = users.map(u => {
            const ageNorm = normalize(u.age, minAge, maxAge);
            const genderOh = oneHot(gendersIndex[u.gender], genders.length);
            const churn = u.churn || 0;
            const vector = [ageNorm, churn, ...genderOh];
            return {
                ...u,
                vector,
                purchases: []
            };
        });

        const usersMap = Object.fromEntries(usersData.map(u => [u.id, u]));

        // Calculate average values for each product to build product vector
        const productsMap = {};
        transactions.forEach(t => {
            if (!productsMap[t.product_name]) {
                productsMap[t.product_name] = {
                    name: t.product_name,
                    category: t.category,
                    priceSum: 0, quantitySum: 0, totalSum: 0,
                    returnsSum: 0, count: 0,
                    dates: [], payments: []
                };
            }
            const p = productsMap[t.product_name];
            p.priceSum += t.price;
            p.quantitySum += t.quantity;
            p.totalSum += t.total_amount;
            p.returnsSum += t.returns || 0;
            p.count += 1;
            p.dates.push(getYearFraction(t.date));
            p.payments.push(t.payment_method);

            // push to user purchases for the worker format
            if (usersMap[t.user_id]) {
                usersMap[t.user_id].purchases.push(t);
            }
        });

        // Compute product vectors
        const productsData = Object.values(productsMap).map(p => {
            const price = p.priceSum / p.count;
            const quantity = p.quantitySum / p.count;
            const total = p.totalSum / p.count;
            const returns = p.returnsSum / p.count > 0.5 ? 1 : 0; // binary majority
            const dateAvg = p.dates.reduce((a, b) => a + b, 0) / p.count;
            
            // most frequent payment method
            const paymentCounts = {};
            let maxP = p.payments[0];
            p.payments.forEach(pay => {
                paymentCounts[pay] = (paymentCounts[pay] || 0) + 1;
                if (paymentCounts[pay] > paymentCounts[maxP]) maxP = pay;
            });

            const priceNorm = normalize(price, minPrice, maxPrice);
            const qtyNorm = normalize(quantity, minQty, maxQty);
            const totalNorm = normalize(total, minTotal, maxTotal);
            const categoryOh = oneHot(categoriesIndex[p.category], categories.length);
            const paymentOh = oneHot(paymentsIndex[maxP], payments.length);

            const vector = [
                priceNorm, qtyNorm, totalNorm, dateAvg, returns,
                ...categoryOh, ...paymentOh
            ];

            return {
                name: p.name,
                category: p.category,
                price: price,
                vector
            };
        });

        res.json({
            users: Object.values(usersMap),
            products: productsData,
            userVectorDim: usersData[0].vector.length,
            productVectorDim: productsData[0].vector.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    // Ensure db is initialized and seeded on startup
    await getDb();
});
