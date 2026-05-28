require('dotenv').config({ path: '.env.local' });

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Connexion Neon PostgreSQL ──

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.connect()
    .then(() => console.log('✅ Connected to Neon PostgreSQL'))
    .catch(err => console.error('❌ Database connection error:', err));

// ── Création des tables PostgreSQL ──

async function initDB() {
    try {

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nom TEXT,
                email TEXT UNIQUE,
                mot_de_passe TEXT,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS taches (
                id SERIAL PRIMARY KEY,
                titre TEXT,
                description TEXT,
                priorite TEXT,
                echeance TEXT,
                assigne_a TEXT,
                statut TEXT,
                labels TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const result = await pool.query(
            'SELECT COUNT(*) FROM users'
        );

        if (parseInt(result.rows[0].count) === 0) {

            await pool.query(`
                INSERT INTO users (nom, email, mot_de_passe, role)
                VALUES
                ('Karim Alaoui', 'test@securetask.ma', 'password123', 'Lead Securite'),
                ('Ahmad', 'ahmad@securetask.ma', 'password123', 'Ingenieur SSI'),
                ('Sara', 'sara@securetask.ma', 'password123', 'Ingenieur SSI'),
                ('Laila', 'laila@securetask.ma', 'password123', 'Observateur')
            `);

            console.log('✅ Utilisateurs initiaux créés !');
        }

    } catch (error) {
        console.error('❌ Erreur init DB :', error);
    }
}

initDB();

// ── Routes API ──

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'connexion.html'));
});

// ── LOGIN ──

app.post('/api/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (user && user.mot_de_passe === password) {

            return res.json({
                success: true,
                user: {
                    id: user.id,
                    nom: user.nom,
                    email: user.email,
                    role: user.role
                }
            });
        }

        res.status(401).json({
            success: false,
            message: 'Email ou mot de passe incorrect'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// ── REGISTER ──

app.post('/api/register', async (req, res) => {

    try {

        const { nom, email, password } = req.body;

        if (!nom || !email || !password) {

            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont obligatoires.'
            });
        }

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: 'Mot de passe trop court.'
            });
        }

        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {

            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé.'
            });
        }

        await pool.query(
            'INSERT INTO users (nom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4)',
            [nom, email, password, 'Utilisateur']
        );

        res.json({
            success: true,
            message: 'Compte créé avec succès.'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// ── TACHES ──

app.get('/api/taches', async (req, res) => {

    try {

        const result = await pool.query(
            'SELECT * FROM taches ORDER BY created_at DESC'
        );

        res.json(result.rows);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

app.post('/api/taches', async (req, res) => {

    try {

        const {
            titre,
            description,
            priorite,
            echeance,
            assigneA,
            statut,
            labels
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO taches
            (titre, description, priorite, echeance, assigne_a, statut, labels)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            `,
            [
                titre,
                description || '',
                priorite || 'Moyenne',
                echeance,
                assigneA || 'Non assigne',
                statut || 'A faire',
                (labels || []).join(', ')
            ]
        );

        res.json({
            success: true,
            id: result.rows[0].id
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.put('/api/taches/:id', async (req, res) => {

    try {

        await pool.query(
            'UPDATE taches SET statut = $1 WHERE id = $2',
            [req.body.statut, req.params.id]
        );

        res.json({
            success: true
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/taches/:id', async (req, res) => {

    try {

        await pool.query(
            'DELETE FROM taches WHERE id = $1',
            [req.params.id]
        );

        res.json({
            success: true
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ── USERS ──

app.get('/api/users', async (req, res) => {

    try {

        const result = await pool.query(
            'SELECT id, nom, email, role FROM users'
        );

        res.json(result.rows);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

// ── PORT ──

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`✅ SecureTask démarré sur le port ${PORT}`);
});