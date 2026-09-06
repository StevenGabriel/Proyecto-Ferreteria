## Plan de Verificación Manual (Cómo probarlo)

1. **Prueba el Backend:**
   * Abre tu base de datos local `HardwareStore` en SQL Server.
   * Ejecuta `npm start` en la carpeta `backend` y verifica que en consola diga: `Conexión a la base de datos establecida correctamente con Sequelize.`
2. **Prueba el Frontend:**
   * Ejecuta `npm run dev` en la carpeta `ferreteria`.
   * En tu navegador, ve a la nueva URL corregida: `http://localhost:5173/productsView`.
   * Intenta registrar un producto (`http://localhost:5173/productReg`), editarlo y finalmente eliminarlo para corroborar que el flujo completo de datos funcione a la perfección con la base de datos local.
