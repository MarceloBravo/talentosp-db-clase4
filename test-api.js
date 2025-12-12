// test-api.js - Script para probar la API
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function probarAPI() {
  try {
    console.log('🧪 Probando API REST con MySQL...\n');

    // 1. Probar endpoint de estadísticas
    console.log('1. 📊 Obteniendo estadísticas...');
    const statsResponse = await axios.get(`${API_BASE}/estadisticas`);
    console.log('   ✅ Estadísticas:', statsResponse.data);

    // 2. Listar productos
    console.log('\n2. 📦 Listando productos...');
    const productosResponse = await axios.get(`${API_BASE}/productos`);
    console.log(`   ✅ ${productosResponse.data.productos.length} productos encontrados`);

    // 3. Crear un nuevo usuario
    console.log('\n3. 👤 Creando nuevo usuario...');
    const nuevoUsuario = {
      nombre: 'Test User',
      email: `test${Date.now()}@example.com`,
      edad: 25
    };

    const createUserResponse = await axios.post(`${API_BASE}/usuarios`, nuevoUsuario);
    console.log('   ✅ Usuario creado:', createUserResponse.data.usuario);

    const userId = createUserResponse.data.usuario.id;

    // 4. Obtener usuario específico
    console.log('\n4. 🔍 Obteniendo usuario específico...');
    const userResponse = await axios.get(`${API_BASE}/usuarios/${userId}`);
    console.log('   ✅ Usuario obtenido:', userResponse.data.nombre);

    // 5. Actualizar usuario
    console.log('\n5. 📝 Actualizando usuario...');
    const updateResponse = await axios.put(`${API_BASE}/usuarios/${userId}`, {
      nombre: 'Test User Updated',
      email: nuevoUsuario.email,
      edad: 26
    });
    console.log('   ✅ Usuario actualizado:', updateResponse.data.usuario.nombre);

    // 6. Listar usuarios
    console.log('\n6. 👥 Listando usuarios...');
    const usuariosResponse = await axios.get(`${API_BASE}/usuarios`);
    console.log(`   ✅ ${usuariosResponse.data.usuarios.length} usuarios encontrados`);

    // 7. Crear producto
    console.log('\n7. 🛍️ Creando nuevo producto...');
    const nuevoProducto = {
      nombre: 'Producto de Prueba',
      precio: 49.99,
      descripcion: 'Producto creado para testing',
      stock: 10,
      categoria_id: 1
    };

    const createProductResponse = await axios.post(`${API_BASE}/productos`, nuevoProducto);
    console.log('   ✅ Producto creado:', createProductResponse.data.producto.nombre);

    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');

  } catch (error) {
    console.log(error);
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

// Ejecutar pruebas
probarAPI();