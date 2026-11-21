const STORAGE_KEY = 'yrme-products';
const PAGE_SIZE = 10;

let products = [];
let searchQuery = '';
let brandFilter = 'All';
let typeFilter = 'All';
let currentPage = 1;
let uploadedImage = '';
let pendingImageFile = null;

const brandNames = ['Matrix', 'HK', 'AUFIT', 'AUX', 'Carrier', 'LG', 'Panasonic', 'Kolin', 'Samsung', 'Koppel', 'Daikin', 'Midea'];
const typeNames = ['Split Type', 'Window Type', 'Inverter', 'Non-Inverter'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function formatPrice(value) {
  const number = Number(String(value).replace(/[^0-9.]/g, '')) || 0;
  return `₱${number.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function getFallbackProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.warn('Could not read local catalog:', error);
  }
  return window.YRMECatalog?.defaultProducts
    ? [...window.YRMECatalog.defaultProducts]
    : [];
}

function brandClass(brand) {
  const name = String(brand || '').replace(/[^a-z0-9]/gi, '');
  return brandNames.includes(String(brand)) ? `brand-${name}` : 'brand-default';
}

function matchesType(product, filter) {
  const type = String(product.type || '').toLowerCase();
  const energy = String(product.energy || '').toLowerCase();

  if (filter === 'All') return true;
  if (filter === 'Inverter') return type.includes('inverter') || energy.includes('inverter');
  if (filter === 'Non-Inverter') return type.includes('manual') || energy.includes('non-inverter') || energy.includes('standard');
  if (filter === 'Split Type') return type.includes('split') || type.includes('cassette') || type.includes('floor');
  if (filter === 'Window Type') return type.includes('window');
  return true;
}

function getFilteredProducts() {
  const query = searchQuery.trim().toLowerCase();
  return products.filter(product => {
    const haystack = [
      product.id,
      product.brand,
      product.title,
      product.hp,
      product.type,
      product.tech
    ].join(' ').toLowerCase();

    const brandMatches = brandFilter === 'All'
      || String(product.brand).toLowerCase() === brandFilter.toLowerCase();

    return (!query || haystack.includes(query))
      && brandMatches
      && matchesType(product, typeFilter);
  });
}

function renderBrandFilters() {
  const container = document.getElementById('brand-filters');
  container.innerHTML = `<span class="filter-label">Brand</span>${['All', ...brandNames].map(name => `
    <button type="button" class="filter-pill ${brandFilter === name ? 'active' : ''}" data-brand="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join('')}`;

  container.querySelectorAll('[data-brand]').forEach(button => {
    button.addEventListener('click', () => {
      brandFilter = button.dataset.brand;
      currentPage = 1;
      renderBrandFilters();
      renderProducts();
    });
  });
}

function renderTypeFilters() {
  const container = document.getElementById('type-filters');
  container.innerHTML = `<span class="filter-label">Type</span>${['All', ...typeNames].map(name => `
    <button type="button" class="filter-pill ${typeFilter === name ? 'active' : ''}" data-type="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join('')}`;

  container.querySelectorAll('[data-type]').forEach(button => {
    button.addEventListener('click', () => {
      typeFilter = button.dataset.type;
      currentPage = 1;
      renderTypeFilters();
      renderProducts();
    });
  });
}

function getStockStatus(product) {
  if (product.stock_status) return product.stock_status;
  if (product.stockStatus) return product.stockStatus;
  return 'in_stock';
}

function renderInventoryTable(filtered) {
  if (filtered.length === 0) {
    return `
      <table>
        <thead><tr><th>Product Info</th><th>Capacity &amp; Type</th><th>Price (Cash / SRP)</th><th>Stock &amp; Warranty</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody><tr><td colspan="5" style="height:160px;text-align:center;color:#8a98a3">No products match your filters.</td></tr></tbody>
      </table>`;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageProducts = filtered.slice(start, start + PAGE_SIZE);

  return `
    <table>
      <thead>
        <tr>
          <th>Product Info</th>
          <th>Capacity &amp; Type</th>
          <th>Price (Cash / SRP)</th>
          <th>Stock &amp; Warranty</th>
          <th style="text-align:right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${pageProducts.map(product => {
          const stock = getStockStatus(product);
          const stockClass = stock === 'out_stock' ? 'out-stock' : stock === 'low_stock' ? 'low-stock' : 'in-stock';
          const stockLabel = stock === 'out_stock' ? 'Out of Stock' : stock === 'low_stock' ? 'Low Stock' : 'In Stock';
          const image = product.img || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=70';
          return `
            <tr>
              <td>
                <div class="product-info">
                  <img class="product-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}">
                  <div>
                    <span class="brand-badge ${brandClass(product.brand)}">${escapeHtml(product.brand || 'Other')}</span>
                    <div class="product-name">${escapeHtml(product.title)}</div>
                  </div>
                </div>
              </td>
              <td><div class="capacity">${escapeHtml(product.hp || 'N/A')}</div><span class="type-badge">${escapeHtml(product.type || 'Not Set')}</span></td>
              <td><div class="price">${escapeHtml(product.price || formatPrice(product.rawPrice))}</div></td>
              <td><div class="stock-line"><span class="stock-badge ${stockClass}">${stockLabel}</span></div><div class="warranty">${escapeHtml(product.warranty || 'No warranty listed')}</div></td>
              <td>
                <div class="row-actions">
                  <button type="button" class="row-btn edit-btn" onclick="editProduct(${Number(product.id)})"><i data-lucide="pencil"></i> Edit</button>
                  <button type="button" class="row-btn delete-btn" onclick="deleteProduct(${Number(product.id)})"><i data-lucide="trash-2"></i> Delete</button>
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderPagination(filtered) {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = filtered.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);
  document.getElementById('pagination-summary').textContent =
    `Showing ${start}–${end} of ${filtered.length} products`;

  const container = document.getElementById('pagination-actions');
  container.innerHTML = `
    <button type="button" class="page-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
    ${Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
      .map((page, index, visiblePages) => {
        const previous = visiblePages[index - 1];
        const ellipsis = previous && page - previous > 1 ? '<span>…</span>' : '';
        return `${ellipsis}<button type="button" class="page-btn ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
      }).join('')}
    <button type="button" class="page-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;

  document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts();
    }
  });
  document.getElementById('next-page')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts();
    }
  });
  container.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = Number(button.dataset.page);
      renderProducts();
    });
  });
}

function renderKpis() {
  document.getElementById('stat-total').textContent = products.length;
  document.getElementById('stat-inverters').textContent = products.filter(product =>
    String(product.type || '').toLowerCase().includes('inverter')
    || String(product.energy || '').toLowerCase() === 'inverter'
  ).length;

  const activeBrands = [...new Set(products.map(product => product.brand).filter(Boolean))]
    .filter(brand => brandNames.includes(brand));

  document.getElementById('brand-badges').innerHTML = activeBrands.length
    ? activeBrands.map(brand => `<span class="brand-logo-badge ${brandClass(brand)}">${escapeHtml(brand)}</span>`).join('')
    : brandNames.slice(0, 4).map(brand => `<span class="brand-logo-badge ${brandClass(brand)}">${brand}</span>`).join('');
}

function renderProducts() {
  const filtered = getFilteredProducts();
  renderKpis();
  document.getElementById('product-count').textContent = `${filtered.length} matching products`;
  document.getElementById('admin-products').innerHTML = renderInventoryTable(filtered);
  renderPagination(filtered);
  refreshIcons();
}

function openModal(product) {
  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  if (product) fillForm(product);
  refreshIcons();
}

function closeModal() {
  document.getElementById('product-modal').classList.add('hidden');
  document.getElementById('product-modal').classList.remove('flex');
  document.body.style.overflow = '';
  resetForm();
}

function updatePreview(source) {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  if (source) {
    preview.src = source;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.removeAttribute('src');
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

function setStockStatus(status) {
  const toggle = document.getElementById('stock-toggle');
  const hidden = document.getElementById('stock_status');
  const text = document.getElementById('stock-status-text');
  hidden.value = status;
  toggle.classList.toggle('on', status !== 'out_stock');
  toggle.setAttribute('aria-pressed', status !== 'out_stock' ? 'true' : 'false');
  text.textContent = status === 'out_stock'
    ? 'Item is hidden or marked sold out'
    : status === 'low_stock'
      ? 'Item has limited quantity'
      : 'Item is available for sale';
}

function fillForm(product) {
  document.getElementById('form-title').textContent = 'Edit product';
  document.getElementById('save-label').textContent = 'Save Changes';
  document.getElementById('product-id').value = product.id;
  document.getElementById('brand').value = product.brand || '';
  document.getElementById('title').value = product.title || '';
  document.getElementById('rawPrice').value = product.rawPrice || 0;
  document.getElementById('price').value = product.price || formatPrice(product.rawPrice);
  document.getElementById('hp').value = product.hp || '';
  document.getElementById('type').value = product.type || '';
  document.getElementById('energy').value = product.energy || 'Standard Efficiency';
  document.getElementById('gas').value = product.gas || 'R32';
  document.getElementById('noise').value = product.noise || '';
  document.getElementById('warranty').value = product.warranty || '1 Year Parts & Service';
  document.getElementById('tech').value = product.tech || '';
  document.getElementById('desc').value = product.desc || '';
  uploadedImage = product.img || '';
  pendingImageFile = null;
  setStockStatus(getStockStatus(product));
  updatePreview(uploadedImage);
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('form-title').textContent = 'Add product';
  document.getElementById('save-label').textContent = 'Save Product';
  document.getElementById('price').value = '';
  uploadedImage = '';
  pendingImageFile = null;
  setStockStatus('in_stock');
  updatePreview('');
}

window.editProduct = id => {
  const product = products.find(item => Number(item.id) === Number(id));
  if (product) openModal(product);
};

window.deleteProduct = async id => {
  const product = products.find(item => Number(item.id) === Number(id));
  if (!product || !confirm(`Delete "${product.title}"?`)) return;

  try {
    if (window.YRMECatalogDB) await window.YRMECatalogDB.deleteProduct(id);
    products = products.filter(item => Number(item.id) !== Number(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    renderProducts();
  } catch (error) {
    alert(`Could not delete product: ${error.message}`);
  }
};

async function initializeCatalog() {
  products = getFallbackProducts();
  if (window.YRMECatalogDB) {
    try {
      const liveProducts = await window.YRMECatalogDB.fetchProducts({ includeInactive: true });
      if (liveProducts.length) {
        products = liveProducts;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(liveProducts));
      } else {
        const { data: sessionData } = await window.YRMECatalogDB.client.auth.getSession();
        if (sessionData.session) {
          await seedCatalog(true);
          return;
        }
      }
    } catch (error) {
      console.warn('Unable to load live catalog:', error);
    }
  }
  renderBrandFilters();
  renderTypeFilters();
  renderProducts();
}

async function seedCatalog(silent = false) {
  if (!window.YRMECatalogDB || !window.YRMECatalog?.defaultProducts) {
    if (!silent) alert('Catalog data or Supabase is not available.');
    return;
  }

  try {
    const result = await window.YRMECatalogDB.seedProducts(window.YRMECatalog.defaultProducts);
    const liveProducts = await window.YRMECatalogDB.fetchProducts({ includeInactive: true });
    products = liveProducts;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liveProducts));
    renderBrandFilters();
    renderTypeFilters();
    renderProducts();
    if (!silent) {
      alert(result.warning || `Seeded ${liveProducts.length} aircon products and image URLs.`);
    }
  } catch (error) {
    if (!silent) alert(`Could not seed catalog: ${error.message}`);
    else console.error('Automatic catalog seed failed:', error);
  }
}

document.getElementById('open-add-btn').addEventListener('click', () => {
  resetForm();
  openModal();
});
document.getElementById('seed-catalog-btn').addEventListener('click', () => {
  if (confirm(`Seed all ${window.YRMECatalog?.defaultProducts?.length || 77} catalog products and image URLs into Supabase?`)) {
    seedCatalog(false);
  }
});

window.addEventListener('yrme-admin-authenticated', () => {
  initializeCatalog();
});
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-edit').addEventListener('click', closeModal);
document.getElementById('product-modal').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeModal();
});

document.getElementById('catalog-search').addEventListener('input', event => {
  searchQuery = event.target.value;
  currentPage = 1;
  renderProducts();
});

document.getElementById('rawPrice').addEventListener('input', event => {
  document.getElementById('price').value = formatPrice(event.target.value);
});

document.getElementById('stock-toggle').addEventListener('click', () => {
  const current = document.getElementById('stock_status').value;
  setStockStatus(current === 'out_stock' ? 'in_stock' : 'out_stock');
});

document.getElementById('img').addEventListener('input', event => {
  uploadedImage = event.target.value.trim();
  updatePreview(uploadedImage);
});

document.getElementById('image-file').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Please choose an image smaller than 2 MB.');
    event.target.value = '';
    return;
  }
  pendingImageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    uploadedImage = reader.result;
    document.getElementById('img').value = '';
    updatePreview(uploadedImage);
  };
  reader.readAsDataURL(file);
});

document.getElementById('scan-btn').addEventListener('click', () => {
  document.getElementById('scan-file').click();
});

document.getElementById('scan-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;

  if (!('BarcodeDetector' in window)) {
    alert('QR/barcode scanning is not supported by this browser. Use the search box instead.');
    event.target.value = '';
    return;
  }

  try {
    const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128'] });
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    if (codes.length) {
      searchQuery = codes[0].rawValue;
      document.getElementById('catalog-search').value = searchQuery;
      currentPage = 1;
      renderProducts();
    } else {
      alert('No barcode or QR code was detected.');
    }
  } catch (error) {
    alert(`Could not scan image: ${error.message}`);
  }
  event.target.value = '';
});

document.getElementById('product-form').addEventListener('submit', async event => {
  event.preventDefault();

  const idValue = document.getElementById('product-id').value;
  const productId = idValue
    ? Number(idValue)
    : (products.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1);

  let imageUrl = uploadedImage || document.getElementById('img').value.trim();
  if (pendingImageFile && window.YRMECatalogDB) {
    try {
      imageUrl = await window.YRMECatalogDB.uploadImage(pendingImageFile, productId);
    } catch (error) {
      alert(`Could not upload image: ${error.message}`);
      return;
    }
  }

  const rawPrice = Number(document.getElementById('rawPrice').value) || 0;
  const product = {
    id: productId,
    brand: document.getElementById('brand').value,
    title: document.getElementById('title').value.trim(),
    price: formatPrice(rawPrice),
    rawPrice,
    hp: document.getElementById('hp').value,
    type: document.getElementById('type').value,
    energy: document.getElementById('energy').value,
    gas: document.getElementById('gas').value,
    noise: document.getElementById('noise').value.trim(),
    warranty: document.getElementById('warranty').value,
    tech: document.getElementById('tech').value.trim(),
    desc: document.getElementById('desc').value.trim(),
    img: imageUrl,
    stock_status: document.getElementById('stock_status').value
  };

  try {
    let saveResult = null;
    if (window.YRMECatalogDB) {
      saveResult = await window.YRMECatalogDB.upsertProduct(product);
    }
    if (idValue) {
      products = products.map(item => Number(item.id) === productId ? product : item);
    } else {
      products.push(product);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    closeModal();
    renderProducts();
    if (saveResult?.warning) alert(saveResult.warning);
  } catch (error) {
    alert(`Could not save product: ${error.message}`);
  }
});

document.getElementById('export-btn').addEventListener('click', () => {
  const headers = ['ID', 'Brand', 'Model', 'Capacity', 'Type', 'Price', 'Stock Status', 'Warranty', 'Refrigerant'];
  const rows = getFilteredProducts().map(product => [
    product.id,
    product.brand,
    product.title,
    product.hp,
    product.type,
    product.rawPrice || product.price,
    getStockStatus(product),
    product.warranty,
    product.gas
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'yrme-products.csv';
  link.click();
  URL.revokeObjectURL(url);
});

initializeCatalog();
