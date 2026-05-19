const { Pool } = require('pg');

// ── Connexion Neon PostgreSQL ──
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ── Initialisation des tables + données de départ ──
async function initDB() {
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

    const count = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) === 0) {
        await pool.query(`
            INSERT INTO users (nom, email, mot_de_passe, role) VALUES
            ('Karim Alaoui', 'test@securetask.ma',  'password123', 'Lead Securite'),
            ('Ahmad',        'ahmad@securetask.ma', 'password123', 'Ingenieur SSI'),
            ('Sara',         'sara@securetask.ma',  'password123', 'Ingenieur SSI'),
            ('Laila',        'laila@securetask.ma', 'password123', 'Observateur')
        `);
        console.log('✅ Utilisateurs initiaux créés');
    }
}

// Initialisation unique (mise en cache entre les invocations Vercel)
const dbReady = initDB().catch(err => console.error('❌ initDB error:', err));

module.exports = async (req, res) => {
    // Attendre que la DB soit prête
    await dbReady;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url    = req.url;
    const method = req.method;

    try {

        // ── LOGIN ──
        if (url.includes('/login') && method === 'POST') {
            const { email, password } = req.body;
            const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            const user   = result.rows[0];

            if (user && user.mot_de_passe === password) {
                return res.json({
                    success: true,
                    user: { id: user.id, nom: user.nom, email: user.email, role: user.role }
                });
            }
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
        }

        // ── REGISTER ──
        if (url.includes('/register') && method === 'POST') {
            const { nom, email, password, role } = req.body;

            if (!nom || !email || !password || !role) {
                return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Mot de passe trop court (6 caractères min).' });
            }

            const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
            }

            await pool.query(
                'INSERT INTO users (nom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4)',
                [nom, email, password, role]
            );
            return res.json({ success: true, message: 'Compte créé avec succès.' });
        }

        // ── GET TÂCHES ──
        if (url.includes('/taches') && method === 'GET' && !url.match(/\/taches\/\d+/)) {
            const result = await pool.query('SELECT * FROM taches ORDER BY created_at DESC');
            return res.json(result.rows);
        }

        // ── CREATE TÂCHE ──
        if (url.includes('/taches') && method === 'POST') {
            const { titre, description, priorite, echeance, assigneA, statut, labels } = req.body;
            const result = await pool.query(
                `INSERT INTO taches (titre, description, priorite, echeance, assigne_a, statut, labels)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [
                    titre,
                    description || '',
                    priorite    || 'Moyenne',
                    echeance    || '',
                    assigneA    || 'Non assigne',
                    statut      || 'A faire',
                    (labels || []).join(', ')
                ]
            );
            return res.json({ success: true, id: result.rows[0].id });
        }

        // ── UPDATE TÂCHE ──
        if (url.match(/\/taches\/\d+/) && method === 'PUT') {
            const id = url.split('/').pop();
            await pool.query('UPDATE taches SET statut = $1 WHERE id = $2', [req.body.statut, id]);
            return res.json({ success: true });
        }

        // ── DELETE TÂCHE ──
        if (url.match(/\/taches\/\d+/) && method === 'DELETE') {
            const id = url.split('/').pop();
            await pool.query('DELETE FROM taches WHERE id = $1', [id]);
            return res.json({ success: true });
        }

        // ── GET USERS ──
        if (url.includes('/users') && method === 'GET') {
            const result = await pool.query('SELECT id, nom, email, role FROM users');
            return res.json(result.rows);
        }

        return res.status(404).json({ error: 'Route non trouvée' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};