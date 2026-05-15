// server.js - Backend para scraping con ScrapingBee
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Variables globales
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

// ============ RUTAS ============

/**
 * GET /health - Verificar que servidor está vivo
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor de scraping funcionando',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/scrape-url
 * Scrape de una URL completa con ScrapingBee
 * 
 * Body:
 * {
 *   "url": "https://www.ubereats.com/...",
 *   "platform": "uber" | "didi" | "rappi"
 * }
 */
app.post('/api/scrape-url', async (req, res) => {
    try {
        const { url, platform } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL es requerida' });
        }

        if (!SCRAPINGBEE_API_KEY) {
            return res.status(500).json({ 
                error: 'API Key de ScrapingBee no configurada',
                hint: 'Configura SCRAPINGBEE_API_KEY en variables de entorno'
            });
        }

        console.log(`[${new Date().toISOString()}] Scrapeando: ${url}`);

        // Llamar a ScrapingBee
        const response = await axios.get('https://api.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: url,
                render_javascript: true,
                wait_browser: 'networkidle2',
                premium_proxy: 'true'
            },
            timeout: 30000
        });

        const html = response.data;
        
        // Procesar HTML y extraer datos
        const $ = cheerio.load(html);
        
        // Extraer productos según plataforma
        const products = extractProducts($, platform);
        const restaurantInfo = extractRestaurantInfo($, platform);

        res.json({
            success: true,
            platform: platform,
            url: url,
            restaurant: restaurantInfo,
            products: products,
            productCount: products.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`Error scrapeando:`, error.message);
        
        res.status(500).json({
            error: 'Error al scrapear',
            message: error.message,
            hint: 'Verifica que la URL sea correcta y que ScrapingBee esté configurado'
        });
    }
});

/**
 * POST /api/scrape-restaurant
 * Scrape específico de restaurante
 * 
 * Body:
 * {
 *   "restaurantUrl": "URL completa",
 *   "platform": "uber" | "didi" | "rappi"
 * }
 */
app.post('/api/scrape-restaurant', async (req, res) => {
    try {
        const { restaurantUrl, platform } = req.body;

        if (!restaurantUrl) {
            return res.status(400).json({ error: 'restaurantUrl es requerida' });
        }

        console.log(`[${new Date().toISOString()}] Scrapeando restaurante: ${restaurantUrl}`);

        // Llamar a ScrapingBee
        const response = await axios.get('https://api.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: restaurantUrl,
                render_javascript: true,
                wait_browser: 'networkidle2',
                premium_proxy: 'true',
                timeout: 30000
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extraer datos del restaurante
        const restaurantData = {
            name: extractName($, platform),
            address: extractAddress($, platform),
            phone: extractPhone($, platform),
            rating: extractRating($, platform),
            deliveryTime: extractDeliveryTime($, platform),
            deliveryFee: extractDeliveryFee($, platform),
            minimumOrder: extractMinimumOrder($, platform),
            products: extractProducts($, platform),
            hours: extractHours($, platform)
        };

        res.json({
            success: true,
            platform: platform,
            data: restaurantData,
            productCount: restaurantData.products.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Error al scrapear restaurante',
            message: error.message
        });
    }
});

/**
 * POST /api/scrape-competitors
 * Buscar competidores similares
 * 
 * Body:
 * {
 *   "searchQuery": "Tacos Mexicali",
 *   "platform": "uber" | "didi" | "rappi",
 *   "limit": 5
 * }
 */
app.post('/api/scrape-competitors', async (req, res) => {
    try {
        const { searchQuery, platform, limit = 5 } = req.body;

        if (!searchQuery) {
            return res.status(400).json({ error: 'searchQuery es requerida' });
        }

        const searchUrl = buildSearchUrl(searchQuery, platform);
        console.log(`[${new Date().toISOString()}] Buscando competencia: ${searchUrl}`);

        // Scrape de búsqueda
        const response = await axios.get('https://api.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: searchUrl,
                render_javascript: true,
                wait_browser: 'networkidle2',
                premium_proxy: 'true'
            },
            timeout: 30000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extraer competidores
        const competitors = extractCompetitors($, platform, limit);

        res.json({
            success: true,
            platform: platform,
            searchQuery: searchQuery,
            competitors: competitors,
            competitorCount: competitors.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Error al buscar competencia',
            message: error.message
        });
    }
});

// ============ FUNCIONES DE EXTRACCIÓN ============

function extractName($, platform) {
    // Implementación básica - ajustar según estructura HTML real
    if (platform === 'uber') {
        return $('[data-testid="restaurant-name"]').text() || 'Nombre no encontrado';
    } else if (platform === 'didi') {
        return $('h1').first().text() || 'Nombre no encontrado';
    } else if (platform === 'rappi') {
        return $('[class*="RestaurantHeader"]').find('h1').text() || 'Nombre no encontrado';
    }
    return 'Nombre no encontrado';
}

function extractAddress($, platform) {
    if (platform === 'uber') {
        return $('[data-testid="restaurant-address"]').text() || 'Dirección no encontrada';
    }
    return $('[class*="address"]').text() || 'Dirección no encontrada';
}

function extractPhone($, platform) {
    const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/;
    const text = $.text();
    const match = text.match(phoneRegex);
    return match ? match[0] : 'Teléfono no encontrado';
}

function extractRating($, platform) {
    const ratingText = $('[class*="rating"]').text();
    const ratingMatch = ratingText.match(/\d+\.?\d*/);
    return ratingMatch ? parseFloat(ratingMatch[0]) : null;
}

function extractDeliveryTime($, platform) {
    const timeText = $('[class*="delivery"]').text();
    const match = timeText.match(/(\d+)\s*(min|minutos)/i);
    return match ? match[1] + ' min' : 'No especificado';
}

function extractDeliveryFee($, platform) {
    const feeText = $('[class*="fee"]').text();
    const match = feeText.match(/\$\d+\.?\d*/);
    return match ? match[0] : 'Gratis';
}

function extractMinimumOrder($, platform) {
    const minText = $('[class*="minimum"]').text();
    const match = minText.match(/\$\d+\.?\d*/);
    return match ? match[0] : 'No especificado';
}

function extractHours($, platform) {
    // Implementación básica
    return 'Disponible';
}

function extractProducts($, platform) {
    const products = [];
    
    // Selectores genéricos para productos
    $('[class*="MenuItem"], [class*="Product"], [class*="Item"]').each((i, el) => {
        const name = $(el).find('[class*="name"], h3, h4').text().trim();
        const priceText = $(el).find('[class*="price"]').text();
        const priceMatch = priceText.match(/\$[\d.]+/);
        const price = priceMatch ? priceMatch[0] : null;
        const description = $(el).find('[class*="description"]').text().trim();

        if (name && price) {
            products.push({
                name: name,
                price: price,
                description: description || null,
                platform: platform
            });
        }
    });

    return products;
}

function extractRestaurantInfo($, platform) {
    return {
        name: extractName($, platform),
        address: extractAddress($, platform),
        phone: extractPhone($, platform),
        rating: extractRating($, platform),
        platform: platform
    };
}

function extractCompetitors($, platform, limit) {
    const competitors = [];
    
    // Selectores para resultados de búsqueda
    $('[class*="SearchResult"], [class*="RestaurantItem"]').slice(0, limit).each((i, el) => {
        const name = $(el).find('[class*="name"], h3').text().trim();
        const rating = $(el).find('[class*="rating"]').text();
        const address = $(el).find('[class*="address"]').text();
        const price = $(el).find('[class*="price"]').text();
        const link = $(el).find('a').attr('href');

        if (name) {
            competitors.push({
                id: 'comp_' + Date.now() + i,
                name: name,
                rating: rating || 'N/A',
                address: address || 'No especificada',
                price: price || 'Variable',
                link: link || null,
                platform: platform
            });
        }
    });

    return competitors;
}

function buildSearchUrl(query, platform) {
    switch(platform) {
        case 'uber':
            return `https://www.ubereats.com/search?q=${encodeURIComponent(query)}`;
        case 'didi':
            return `https://www.didi.io/es-MX/search?q=${encodeURIComponent(query)}`;
        case 'rappi':
            return `https://www.rappi.com/search?query=${encodeURIComponent(query)}`;
        default:
            return `https://www.ubereats.com/search?q=${encodeURIComponent(query)}`;
    }
}

// ============ MANEJO DE ERRORES ============

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

// ============ INICIAR SERVIDOR ============

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   SERVIDOR DE SCRAPING - ScrapingBee      ║
╚════════════════════════════════════════════╝

✅ Puerto: ${PORT}
✅ Ambiente: ${process.env.NODE_ENV || 'development'}
✅ API Key configurada: ${SCRAPINGBEE_API_KEY ? '✓' : '✗'}

📍 Rutas disponibles:
  GET  /health
  POST /api/scrape-url
  POST /api/scrape-restaurant
  POST /api/scrape-competitors

🚀 Servidor listo para conexiones...
    `);
});

module.exports = app;
