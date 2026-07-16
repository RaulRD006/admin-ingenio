import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
const { Pool } = require('pg');
declare var process: any;
const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ==========================================
// 1. CONFIGURACIÓN DE BASE DE DATOS (NUBE Y LOCAL)
// ==========================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/cortadores',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// ==========================================
// 2. PERMISOS CORS PARA EVITAR BLOQUEOS
// ==========================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return next(); // <--- Le agregamos 'return' aquí para quitar la advertencia
});

// ==========================================
// RUTAS PARA CORTADORES 
// ==========================================
app.get('/api/cortadores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cortadores ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cortadores:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/cortadores/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, edad, sexo, localidad, id_grupo, es_foraneo } = req.body;

  try {
    const query = `
      UPDATE cortadores 
      SET nombre_completo = $1, edad = $2, sexo = $3, localidad = $4, id_grupo = $5, es_foraneo = $6
      WHERE id = $7
    `;
    const values = [nombre_completo, edad, sexo, localidad, id_grupo, es_foraneo, id];
    
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Cortador no encontrado en la base de datos' });
    } else {
      res.json({ message: 'Cortador actualizado con éxito' });
    }
  } catch (error) {
    console.error('Error al actualizar el cortador:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar' });
  }
});

// ==========================================
// RUTAS PARA TU TABLA REAL DE LOCALIDADES
// ==========================================
app.get('/api/localidades', async (req, res) => {
  try {
    // Usamos id_localidad que es tu columna real
    const result = await pool.query('SELECT * FROM localidades ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching localidades:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/localidades', async (req, res) => {
  const { nombre, es_foranea } = req.body;
  try {
    const query = 'INSERT INTO localidades (nombre, es_foranea) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [nombre, es_foranea]);
    
    return res.json(result.rows[0]); 
  
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: `La localidad "${nombre}" ya está registrada.` });
    }
    
    console.error('Error insertando localidad:', error);
    return res.status(500).json({ error: 'Error interno al crear localidad' }); 
  }
});

app.delete('/api/localidades/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Apunta a tu columna id_localidad
    await pool.query('DELETE FROM localidades WHERE id_localidad = $1', [id]);
    res.json({ message: 'Localidad eliminada con éxito' });
  } catch (error) {
    console.error('Error eliminando localidad:', error);
    res.status(500).json({ error: 'Error interno al eliminar localidad' });
  }
});

// ==========================================
// RUTAS PARA LA NUEVA TABLA DE GRUPOS
// ==========================================
app.get('/api/grupos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grupos ORDER BY id_grupo ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grupos:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/grupos', async (req, res) => {
  const { id_grupo, nombre, zona } = req.body;
  try {
    const query = 'INSERT INTO grupos (id_grupo, nombre, zona) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [id_grupo, nombre, zona]);
    
    return res.json(result.rows[0]);
    
  } catch (error: any) {
    // Si intentas poner un número de grupo que ya existe
    if (error.code === '23505') {
      return res.status(400).json({ error: `El grupo con ID ${id_grupo} ya está registrado.` });
    }
    
    console.error('Error insertando grupo:', error);
    return res.status(500).json({ error: 'Error interno al crear grupo' });
  }
});

app.put('/api/grupos/:id', async (req, res) => {
  const { id } = req.params; // El id_grupo a editar
  const { nombre, zona } = req.body;
  try {
    const query = 'UPDATE grupos SET nombre = $1, zona = $2 WHERE id_grupo = $3';
    const result = await pool.query(query, [nombre, zona, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
    } else {
      res.json({ message: 'Grupo actualizado con éxito' });
    }

  } catch (error) {
    console.error('Error actualizando grupo:', error);
    res.status(500).json({ error: 'Error interno al actualizar grupo' });
  }
});

app.delete('/api/grupos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM grupos WHERE id_grupo = $1', [id]);
    res.json({ message: 'Grupo eliminado con éxito' });
  } catch (error) {
    console.error('Error eliminando grupo:', error);
    res.status(500).json({ error: 'Error interno al eliminar grupo' });
  }
});


// ==========================================
// RUTAS PARA EL CATÁLOGO DE ZAFRAS 
// ==========================================
app.get('/api/cortadores/zafras', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zafras ORDER BY fecha_inicio DESC');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor al obtener zafras' });
  }
});

app.post('/api/cortadores/zafras', async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, activa } = req.body;
  try {
    const query = 'INSERT INTO zafras (nombre, fecha_inicio, fecha_fin, activa) VALUES ($1, $2, $3, $4) RETURNING *';
    const result = await pool.query(query, [nombre, fecha_inicio || null, fecha_fin || null, activa ?? true]);
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno al crear zafra' });
  }
});

app.delete('/api/cortadores/zafras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM zafras WHERE id_zafra = $1', [id]);
    return res.json({ message: 'Zafra eliminada con éxito' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al eliminar zafra' });
  }
});


// ==========================================
// CONFIGURACIÓN DE ANGULAR Y PUERTOS
// ==========================================
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);