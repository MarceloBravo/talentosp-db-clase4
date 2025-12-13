// utils/email.js - Servicio de envío de emails
const nodemailer = require('nodemailer');

// Configurar transporter de nodemailer
const crearTransporter = async () => {
  // En desarrollo, usar Ethereal Email (servicio de prueba)
  // En producción, configurar con SMTP real (Gmail, SendGrid, etc.)
  
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM || 'noreply@tienda.com';

  // Si no hay credenciales configuradas, crear cuenta de prueba de Ethereal
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  SMTP no configurado. Creando cuenta de prueba de Ethereal Email...');
    console.warn('   Para producción, configura SMTP_HOST, SMTP_USER, SMTP_PASS en .env');
    
    try {
      // Crear cuenta de prueba de Ethereal
      const testAccount = await nodemailer.createTestAccount();
      
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (error) {
      console.error('❌ Error creando cuenta de prueba de Ethereal:', error);
      // Retornar un transporter "dummy" que no enviará emails pero no fallará
      return {
        sendMail: async () => {
          console.warn('⚠️  Email no enviado: SMTP no configurado y no se pudo crear cuenta de prueba');
          return { messageId: 'dummy-id' };
        }
      };
    }
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT == 465, // true para 465, false para otros puertos
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

// Función para enviar email de confirmación de pedido
const enviarEmailPedido = async (usuario, pedido, detalles) => {
  try {
    const transporter = await crearTransporter();

    // Calcular total de productos
    const totalProductos = detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0);

    // Formatear detalles del pedido para el email
    const detallesHTML = detalles.map(detalle => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${detalle.producto_nombre}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${detalle.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(parseFloat(detalle.precio_unitario) * detalle.cantidad).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background-color: #4CAF50; color: white; padding: 10px; text-align: left; }
          .total { font-size: 18px; font-weight: bold; color: #4CAF50; text-align: right; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Pedido Confirmado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${usuario.nombre}</strong>,</p>
            <p>Tu pedido ha sido recibido exitosamente. Te enviaremos una actualización cuando sea procesado.</p>
            
            <div class="order-info">
              <h3>Detalles del Pedido</h3>
              <p><strong>Número de Pedido:</strong> #${pedido.id}</p>
              <p><strong>Fecha:</strong> ${new Date(pedido.fecha_pedido).toLocaleString('es-ES')}</p>
              <p><strong>Estado:</strong> ${pedido.estado}</p>
            </div>

            <h3>Productos:</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cantidad</th>
                  <th style="text-align: right;">Precio Unitario</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${detallesHTML}
              </tbody>
            </table>
            
            <div class="total">
              <p>Total: $${parseFloat(pedido.total).toFixed(2)}</p>
            </div>

            <p>Gracias por tu compra. Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textoPlano = `
¡Pedido Confirmado!

Hola ${usuario.nombre},

Tu pedido ha sido recibido exitosamente.

Detalles del Pedido:
- Número de Pedido: #${pedido.id}
- Fecha: ${new Date(pedido.fecha_pedido).toLocaleString('es-ES')}
- Estado: ${pedido.estado}

Productos:
${detalles.map(d => `- ${d.producto_nombre} x${d.cantidad} - $${parseFloat(d.precio_unitario).toFixed(2)} c/u = $${(parseFloat(d.precio_unitario) * d.cantidad).toFixed(2)}`).join('\n')}

Total: $${parseFloat(pedido.total).toFixed(2)}

Gracias por tu compra.
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@tienda.com',
      to: usuario.email,
      subject: `Confirmación de Pedido #${pedido.id}`,
      text: textoPlano,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', info.messageId);
    console.log('   Para:', usuario.email);
    
    // Si es Ethereal Email, mostrar la URL de vista previa
    if (info.messageId && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('   Vista previa:', previewUrl);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    // No lanzar error para no interrumpir el proceso de creación del pedido
    return { success: false, error: error.message };
  }
};

module.exports = {
  enviarEmailPedido
};
