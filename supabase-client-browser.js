// Cliente Supabase para el navegador
// Este archivo se usa desde el HTML para acceder a Supabase Storage

const createSupabaseClient = () => {
  const supabaseUrl = 'https://nqbowbqitwxwczxyktya.supabase.co'; // Reemplazar con tu URL
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYm93YnFpdHd4d2N6eHlrdHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIzMjU0MDAsImV4cCI6MjAyNzkyNTQwMH0.8Yv2-Ax_oJPc2xQyGJGQYaKdVYrOwdxQgFp3xQz8jbI'; // Reemplazar con tu clave

  // Función para hacer una petición a Supabase Storage
  return {
    storage: {
      from: (bucket) => ({
        upload: async (path, file) => {
          const formData = new FormData();
          formData.append('content', file);

          try {
            const response = await fetch(
              `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: formData
              }
            );

            if (response.ok) {
              return {
                data: { path },
                error: null
              };
            } else {
              return {
                data: null,
                error: { message: 'Error uploading file' }
              };
            }
          } catch (error) {
            return {
              data: null,
              error: { message: error.message }
            };
          }
        },
        getPublicUrl: (path) => ({
          data: {
            publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
          }
        })
      })
    }
  };
};

// Crear instancia global
const supabaseClient = createSupabaseClient();
