// server-test.js - Servidor de prueba
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SCRAPINGBEE_API_KEY;

app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        apiKeyExists: !!API_KEY,
        apiKeyLength: API_KEY ? API_KEY.length : 0,
        apiKeyStart: API_KEY ? API_KEY.substring(0, 10) + '...' : 'NO EXISTE',
        port: PORT
    });
});

// Test ScrapingBee connection
app.get('/test-scrapingbee', async (req, res) => {
    try {
        if (!API_KEY) {
            return res.status(500).json({ error: 'API_KEY no está configurada' });
        }

        const axios = require('axios');
        
        console.log('Intentando conectar a ScrapingBee...');
        console.log('API Key existe:', !!API_KEY);
        
        const response = await axios.get('https://api.scrapingbee.com/api/v1/', {
            params: {
                api_key: API_KEY,
                url: 'https://www.google.com',
                render_javascript: false
            },
            timeout: 10000
        });

        res.json({
            success: true,
            message: 'Conexión a ScrapingBee exitosa',
            statusCode: response.status
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: error.message,
            details: 'Fallo en conexión a ScrapingBee'
        });
    }
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════╗
║   SERVIDOR DE PRUEBA ACTIVO    ║
╚════════════════════════════════╝

✅ Puerto: ${PORT}
✅ API Key Existe: ${!!API_KEY}
✅ API Key Longitud: ${API_KEY ? API_KEY.length : 0}

Rutas:
  GET /health
  GET /test-scrapingbee
    `);
});

module.exports = app;
