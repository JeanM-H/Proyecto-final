require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Try to create the cotizaciones table
  const sql = `
  CREATE TABLE IF NOT EXISTS cotizaciones (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL,
    descripcion TEXT,
    monto_estimado DECIMAL(10, 2),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    fecha_solicitud TIMESTAMP WITH TIME ZONE,
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );
  `;

  const { data, error } = await supabase
    .rpc('exec_sql', { query: sql });

  if (error) {
    console.error('Error creating table:', error);
    console.log('Trying alternative method...');
    
    // Alternative: Insert a dummy record to check if table exists
    const { data: test, error: testError } = await supabase
      .from('cotizaciones')
      .select('count')
      .limit(1);
    
    if (testError && testError.message.includes("Could not find the table")) {
      console.log('Table does not exist. You need to create it manually in Supabase SQL Editor.');
      console.log('Use this SQL:');
      console.log(sql);
    } else if (testError) {
      console.log('Other error:', testError);
    } else {
      console.log('Table exists!');
    }
  } else {
    console.log('Table created successfully!', data);
  }
})();