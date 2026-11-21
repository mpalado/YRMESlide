(() => {
  const config = window.YRMESupabaseConfig;
  if (!config?.url || !config?.anonKey || !window.supabase) {
    console.warn('Supabase catalog is not configured.');
    window.YRMECatalogDB = null;
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey);

  async function fetchProducts(options = {}) {
    let query = client
      .from('aircon_products')
      .select('*');

    if (!options.includeInactive) {
      query = query
        .eq('is_active', true)
        .neq('stock_status', 'out_stock');
    }

    const { data, error } = await query.order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function upsertProduct(product) {
    const stockStatus = product.stock_status || 'in_stock';
    const payload = {
      ...product,
      stock_status: stockStatus,
      is_active: stockStatus !== 'out_stock'
    };
    const { data, error } = await client
      .from('aircon_products')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteProduct(id) {
    const { error } = await client
      .from('aircon_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async function resetProducts(defaultProducts) {
    const { error: deleteError } = await client
      .from('aircon_products')
      .delete()
      .neq('id', -1);
    if (deleteError) throw deleteError;
    const { error: insertError } = await client
      .from('aircon_products')
      .insert(defaultProducts);
    if (insertError) throw insertError;
  }

  async function seedProducts(defaultProducts) {
    const payload = defaultProducts.map(product => ({
      ...product,
      stock_status: product.stock_status || 'in_stock',
      is_active: (product.stock_status || 'in_stock') !== 'out_stock'
    }));
    const { data, error } = await client
      .from('aircon_products')
      .upsert(payload, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return { data: data || [], warning: null };
  }

  async function uploadImage(file, productId) {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `products/${productId}-${Date.now()}.${extension}`;
    const { error } = await client.storage
      .from('aircon-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = client.storage.from('aircon-images').getPublicUrl(path);
    return data.publicUrl;
  }

  window.YRMECatalogDB = {
    client,
    fetchProducts,
    upsertProduct,
    deleteProduct,
    resetProducts,
    seedProducts,
    uploadImage
  };
})();
