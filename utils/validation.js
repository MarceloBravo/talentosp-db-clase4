// utils/validation.js
function validarUsuario(datos) {
    const errores = [];
  
    if (!datos.nombre || typeof datos.nombre !== 'string') {
      errores.push('Nombre es requerido y debe ser texto');
    } else if (datos.nombre.length < 2 || datos.nombre.length > 100) {
      errores.push('Nombre debe tener entre 2 y 100 caracteres');
    }
  
    if (!datos.email || typeof datos.email !== 'string') {
      errores.push('Email es requerido y debe ser texto');
    } else if (!datos.email.includes('@')) {
      errores.push('Email debe tener formato válido');
    }
  
    if (datos.edad !== undefined) {
      const edad = parseInt(datos.edad);
      if (isNaN(edad) || edad < 0 || edad > 150) {
        errores.push('Edad debe ser un número entre 0 y 150');
      }
    }

    // Validar password solo si se proporciona (para creación de usuarios)
    if (datos.password !== undefined) {
      if (typeof datos.password !== 'string' || datos.password.length < 6) {
        errores.push('La contraseña debe tener al menos 6 caracteres');
      }
    }
  
    return errores;
  }
  
  function validarProducto(datos) {
    const errores = [];
  
    if (!datos.nombre || typeof datos.nombre !== 'string') {
      errores.push('Nombre es requerido');
    }
  
    if (datos.precio === undefined || datos.precio === null) {
      errores.push('Precio es requerido');
    } else {
      const precio = parseFloat(datos.precio);
      if (isNaN(precio) || precio < 0) {
        errores.push('Precio debe ser un número positivo');
      }
    }
  
    if (datos.stock !== undefined) {
      const stock = parseInt(datos.stock);
      if (isNaN(stock) || stock < 0) {
        errores.push('Stock debe ser un número no negativo');
      }
    }
  
    return errores;
  }
  
  function validarResena(datos) {
    const errores = [];
  
    if (datos.producto_id === undefined || datos.producto_id === null) {
      errores.push('producto_id es requerido');
    } else {
      const productoId = parseInt(datos.producto_id);
      if (isNaN(productoId) || productoId <= 0) {
        errores.push('producto_id debe ser un número entero positivo');
      }
    }
  
    if (datos.calificacion === undefined || datos.calificacion === null) {
      errores.push('calificacion es requerida');
    } else {
      const calificacion = parseInt(datos.calificacion);
      if (isNaN(calificacion) || calificacion < 1 || calificacion > 5) {
        errores.push('calificacion debe ser un número entre 1 y 5');
      }
    }
  
    if (datos.comentario !== undefined && datos.comentario !== null) {
      if (typeof datos.comentario !== 'string') {
        errores.push('comentario debe ser texto');
      } else if (datos.comentario.length > 1000) {
        errores.push('comentario no puede exceder 1000 caracteres');
      }
    }
  
    return errores;
  }
  
  module.exports = { validarUsuario, validarProducto, validarResena };