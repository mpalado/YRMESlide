// 1. AIRCON CATALOG DATASET
    function loadProductsData() {
      try {
        const stored = localStorage.getItem('yrme-products');
        if (stored) {
          return JSON.parse(stored).filter(product =>
            (product.stock_status || product.stockStatus || 'in_stock') !== 'out_stock'
          );
        }
      } catch (error) {
        console.error('Unable to load the saved aircon catalog:', error);
      }
      return window.YRMECatalog?.defaultProducts ? [...window.YRMECatalog.defaultProducts] : [];
    }

    let productsData = loadProductsData();
    // 2. SERVICES DATASET
    const servicesData = [
      {
        title: 'Deep Chemical Aircon Cleaning',
        price: 'Starts at ₱750',
        icon: 'sparkles',
        desc: 'Complete dismantling and high-pressure chemical wash to eliminate mold, bacteria, dust, and restore 100% cooling power.',
        time: '45 - 60 mins'
      },
      {
        title: 'Standard & Specialized Installation',
        price: 'Starts at ₱3,500',
        icon: 'wrench',
        desc: 'Professional installation for Split Type and Window Type units including brackets, copper tubing, and vacuuming process.',
        time: '2 - 3 Hours'
      },
      {
        title: 'Freon Charging & Leak Repair',
        price: 'Starts at ₱1,200',
        icon: 'gauge',
        desc: 'System pressure diagnostic, flare repair, nitrogen leak testing, and original R32 / R410A refrigerant re-charging.',
        time: '1 Hour'
      },
      {
        title: 'Commercial Refrigeration Maintenance',
        price: 'Custom Quote',
        icon: 'snowflake',
        desc: 'Servicing for cold storage, walk-in freezers, chiller display cabinets, and commercial ice machines.',
        time: 'On-site Inspection'
      },
      {
        title: 'Mechanical Works',
        price: 'Custom Quote',
        icon: 'cog',
        desc: 'Mechanical installation, repair, fabrication, and maintenance support for commercial and industrial systems.',
        time: 'On-site Inspection'
      },
      {
        title: 'Website Applications',
        price: 'Custom Quote',
        icon: 'globe',
        desc: 'We accept website application projects, from business websites and booking systems to custom web applications.',
        time: 'Project-based'
      }
    ];

    // 3. SLIDESHOW DATASET
    const slideshowItems = [
      {
        title: 'Premium Inverter Air Conditioning Units',
        desc: 'Save up to 60% on electricity costs with top brands like Daikin, Carrier, LG, Panasonic & TCL. Available in stock now!',
        bg: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1920&q=80'
      },
      {
        title: 'Professional Cleaning & Freon Service',
        desc: 'Keep your indoor air fresh and bacteria-free. Schedule your deep chemical cleaning with YRME certified technicians.',
        bg: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=1920&q=80'
      },
      {
        title: 'Commercial Aircon & Cold Storage Repair',
        desc: 'Fast diagnostics, leak testing, compressor replacement, and preventive maintenance for business operations.',
        bg: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1920&q=80'
      }
    ];

    // 4. STATE MANAGEMENT
    let selectedBrand = 'ALL';
    let selectedType = 'ALL';
    let compareList = [];
    let currentSlide = 0;

    // Initialize UI on Load
    document.addEventListener('DOMContentLoaded', async () => {
      lucide.createIcons();
      renderBrandFilters();
      renderTypeFilters();
      renderProducts();
      renderServices();
      initIdleTimer();
      startSlideshowLoop();

      if (window.YRMECatalogDB) {
        try {
          const liveProducts = await window.YRMECatalogDB.fetchProducts();
          if (liveProducts.length > 0) {
            productsData = liveProducts.filter(product =>
              (product.stock_status || product.stockStatus || 'in_stock') !== 'out_stock'
            );
            localStorage.setItem('yrme-products', JSON.stringify(liveProducts));
            renderBrandFilters();
            renderTypeFilters();
            renderProducts();
          }
        } catch (error) {
          console.warn('Unable to load live Supabase catalog:', error);
        }
      }
    });

    // GO TO HOME SCREEN FUNCTION
    function goHome() {
      switchTab('catalog');
      setBrandFilter('ALL');
      setTypeFilter('ALL');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // RENDER BRAND FILTERS
    function renderBrandFilters() {
      const brands = ['ALL', 'Carrier', 'LG', 'Panasonic', 'Kolin', 'Samsung', 'HK', 'AUFIT', 'AUX', 'Matrix', 'Daikin', 'Koppel', 'Midea', 'TCL'];
      const container = document.getElementById('brand-filters');
      
      container.innerHTML = brands.map(brand => `
        <button onclick="setBrandFilter('${brand}')" 
          class="px-5 py-2.5 rounded-xl font-extrabold text-sm transition whitespace-nowrap border ${
            selectedBrand === brand 
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }">
          ${brand === 'ALL' ? '🌟 All Brands' : brand}
        </button>
      `).join('');
    }

    // RENDER TYPE FILTERS
    function renderTypeFilters() {
      const types = ['ALL', 'Split Inverter', 'Window Inverter'];
      const container = document.getElementById('type-filters');
      
      container.innerHTML = types.map(type => `
        <button onclick="setTypeFilter('${type}')" 
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            selectedType === type 
              ? 'bg-slate-700 text-cyan-300 border border-cyan-500/50' 
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }">
          ${type === 'ALL' ? 'All Unit Types' : type}
        </button>
      `).join('');
    }

    // FILTER LOGIC
    function setBrandFilter(brand) {
      selectedBrand = brand;
      renderBrandFilters();
      renderProducts();
    }

    function setTypeFilter(type) {
      selectedType = type;
      renderTypeFilters();
      renderProducts();
    }

    function getProductFeatures(product) {
      return [product.energy, `${product.gas} Refrigerant`, product.noise, product.tech]
        .filter(Boolean);
    }

    // RENDER PRODUCT CARDS
    function renderProducts() {
      const grid = document.getElementById('product-grid');
      const filtered = productsData.filter(p =>
        (p.stock_status || p.stockStatus || 'in_stock') !== 'out_stock'
      ).filter(p => {
        const matchBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
        const matchType = selectedType === 'ALL' || p.type === selectedType;
        return matchBrand && matchType;
      });

      document.getElementById('product-count-label').innerText = `Showing ${filtered.length} Aircon Units`;

      grid.innerHTML = filtered.map(p => {
        const isCompared = compareList.includes(p.id);
        return `
          <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-cyan-500/50 transition-all shadow-xl flex flex-col justify-between group">
            
            <div>
              <!-- Card Header / Image -->
              <div class="relative h-52 bg-slate-950 overflow-hidden">
                <img src="${p.img}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                
                <!-- Brand Badge -->
                <span class="absolute top-4 left-4 bg-slate-950/90 border border-slate-700 px-3 py-1 rounded-full text-xs font-black tracking-wider text-cyan-400 uppercase">
                  ${p.brand}
                </span>

                <!-- HP Badge -->
                <span class="absolute bottom-3 right-4 bg-cyan-500 text-slate-950 px-3 py-1 rounded-lg text-sm font-black shadow-md">
                  ${p.hp}
                </span>
              </div>

              <!-- Product Info -->
              <div class="p-6 space-y-4">
                <div>
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${p.type}</span>
                  <h3 class="text-xl font-extrabold text-white leading-snug mt-0.5">${p.title}</h3>
                </div>

                <!-- Feature Highlights -->
                <ul class="space-y-1.5 text-xs text-slate-300">
                  ${getProductFeatures(p).map(f => `<li class="flex items-center gap-2"><i data-lucide="check-circle" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i> ${f}</li>`).join('')}
                </ul>
              </div>
            </div>

            <!-- Price & Actions -->
            <div class="p-6 pt-0 space-y-3">
              <div class="flex items-baseline justify-between border-t border-slate-800/80 pt-4">
                <span class="text-xs text-slate-400 uppercase font-semibold">SRP Price:</span>
                <span class="text-2xl font-black text-cyan-300">${p.price}</span>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button onclick="openProductModal(${p.id})" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
                  <i data-lucide="info" class="w-4 h-4"></i> Details
                </button>
                <button onclick="toggleCompare(${p.id})" class="w-full py-2.5 ${isCompared ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
                  <i data-lucide="sliders-horizontal" class="w-4 h-4"></i> ${isCompared ? 'Added' : 'Compare'}
                </button>
              </div>
            </div>

          </div>
        `;
      }).join('');

      lucide.createIcons();
    }

    // RENDER SERVICES
    function renderServices() {
      const container = document.getElementById('services-grid');
      container.innerHTML = servicesData.map(s => `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-cyan-500/40 transition shadow-xl">
          <div class="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400">
            <i data-lucide="${s.icon}" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="text-xl font-extrabold text-white">${s.title}</h3>
            <span class="text-cyan-400 font-bold text-sm">${s.price}</span>
          </div>
          <p class="text-slate-300 text-sm leading-relaxed">${s.desc}</p>
          <div class="text-xs text-slate-500 font-semibold border-t border-slate-800 pt-3">
            Est. Time: ${s.time}
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    }

    // PRODUCT SPEC MODAL
    function openProductModal(id) {
      const p = productsData.find(item => item.id === id);
      if (!p) return;

      const content = document.getElementById('modal-content');
      content.innerHTML = `
        <div class="space-y-4">
          <img src="${p.img}" alt="${p.title}" class="rounded-2xl w-full h-64 object-cover border border-slate-800">
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div><strong class="text-slate-200">Warranty:</strong> ${p.warranty}</div>
            <div><strong class="text-slate-200">Refrigerant:</strong> ${p.gas}</div>
            <div><strong class="text-slate-200">Noise Level:</strong> ${p.noise}</div>
          </div>
        </div>
        <div class="space-y-6">
          <div>
            <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest">${p.brand} • ${p.type}</span>
            <h2 class="text-3xl font-black text-white mt-1">${p.title}</h2>
            <div class="text-3xl font-black text-cyan-300 mt-2">${p.price}</div>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Key Specifications</h4>
            <ul class="space-y-2 text-sm text-slate-200">
              ${getProductFeatures(p).map(f => `<li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-cyan-400"></i> ${f}</li>`).join('')}
            </ul>
          </div>

          <div class="bg-cyan-950/30 border border-cyan-500/30 p-4 rounded-xl text-xs text-cyan-300 leading-relaxed">
            💡 <strong>Showroom Tip:</strong> Speak with our staff at the counter to verify stock availability, installation scheduling, and bundle discounts.
          </div>
        </div>
      `;

      document.getElementById('product-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeProductModal() {
      document.getElementById('product-modal').classList.add('hidden');
    }

    // COMPARE FUNCTIONALITY
    function toggleCompare(id) {
      if (compareList.includes(id)) {
        compareList = compareList.filter(item => item !== id);
      } else {
        if (compareList.length >= 3) {
          alert('You can compare up to 3 units at a time.');
          return;
        }
        compareList.push(id);
      }
      document.getElementById('compare-count').innerText = compareList.length;
      renderProducts();
    }

    function toggleCompareModal(forceOpen = false) {
      const modal = document.getElementById('compare-modal');
      const container = document.getElementById('compare-cards');

      if (!forceOpen && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        return;
      }

      if (compareList.length === 0) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        return;
      }

      const items = productsData.filter(p => compareList.includes(p.id));
      const columns = `minmax(220px, 1fr)`;
      const gridColumns = `grid-template-columns: 150px repeat(${items.length}, ${columns})`;

      const removeButton = p => `
        <button onclick="toggleCompare(${p.id}); toggleCompareModal(true);" class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition" title="Remove ${p.title}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;

      container.innerHTML = `
        <div class="min-w-[720px] p-5 md:p-7">
          <div class="grid border border-slate-800 rounded-xl overflow-hidden" style="${gridColumns}">
            <div class="bg-slate-900 p-4 flex items-end">
              <span class="text-xs font-black uppercase tracking-wider text-slate-500">Specifications</span>
            </div>
            ${items.map(p => `
              <div class="bg-slate-900 p-4 border-l border-slate-800">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p class="text-xs font-black uppercase tracking-wider text-cyan-400">${p.brand}</p>
                    <h4 class="text-sm font-extrabold text-white leading-snug mt-1">${p.title}</h4>
                  </div>
                  ${removeButton(p)}
                </div>
                <img src="${p.img}" class="w-full h-32 object-cover rounded-lg border border-slate-800">
              </div>
            `).join('')}

            ${[
              ['Price', 'price'],
              ['Capacity', 'hp'],
              ['Unit Type', 'type'],
              ['Efficiency', 'energy'],
              ['Refrigerant', 'gas'],
              ['Noise Level', 'noise'],
              ['Technology', 'tech'],
              ['Warranty', 'warranty']
            ].map(([label, field], index) => `
              <div class="px-4 py-4 ${index % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/60'} flex items-center text-xs font-bold uppercase tracking-wide text-slate-500">${label}</div>
              ${items.map(p => `
                <div class="px-4 py-4 ${index % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/60'} border-l border-slate-800 text-sm font-bold text-slate-100">${p[field] || 'N/A'}</div>
              `).join('')}
            `).join('')}
          </div>

          <div class="grid gap-3 mt-5" style="grid-template-columns: 150px repeat(${items.length}, ${columns})">
            <div></div>
            ${items.map(p => `
              <button onclick="openProductModal(${p.id})" class="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-2">
                <i data-lucide="info" class="w-4 h-4"></i> View Details
              </button>
            `).join('')}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      lucide.createIcons();
    }

    // CALCULATOR LOGIC
    function updateCalculator(sqm) {
      const cappedSqm = Math.min(100, Math.max(8, Number(sqm) || 8));
      document.getElementById('area-display').innerText = `${cappedSqm} sq.m`;
      
      let hp = '1.0 HP';
      let price = '₱20,000 - ₱28,000';
      
      if (cappedSqm <= 12) {
        hp = '0.5 HP - 0.75 HP';
        price = '₱14,000 - ₱19,000';
      } else if (cappedSqm <= 18) {
        hp = '1.0 HP';
        price = '₱19,000 - ₱31,000';
      } else if (cappedSqm <= 25) {
        hp = '1.5 HP';
        price = '₱28,000 - ₱39,000';
      } else if (cappedSqm <= 36) {
        hp = '2.0 HP';
        price = '₱38,000 - ₱49,000';
      } else {
        hp = '2.5 HP - 3.0 HP';
        price = '₱52,000 - ₱75,000+';
      }

      document.getElementById('rec-hp').innerText = hp;
      document.getElementById('rec-price').innerText = price;
    }

    // TAB NAVIGATION
    function switchTab(tab) {
      ['catalog', 'services', 'calculator'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`nav-${t}`).className = 'px-5 py-2 rounded-lg font-bold text-base transition flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700';
      });

      document.getElementById(`tab-${tab}`).classList.remove('hidden');
      document.getElementById(`nav-${tab}`).className = 'px-5 py-2 rounded-lg font-bold text-base transition flex items-center gap-2 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20';
    }

    // IDLE TIMER & SLIDESHOW CONTROLLER
    let idleTimer;
    const idleSlideshow = document.getElementById('idle-slideshow');

    function resetIdleTimer() {
      idleSlideshow.classList.add('opacity-0', 'pointer-events-none');
      
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleSlideshow.classList.remove('opacity-0', 'pointer-events-none');
      }, 30000);
    }

    function initIdleTimer() {
      window.onload = resetIdleTimer;
      window.onmousemove = resetIdleTimer;
      window.onmousedown = resetIdleTimer;
      window.ontouchstart = resetIdleTimer;
      window.onclick = resetIdleTimer;
      window.onkeydown = resetIdleTimer;
    }

    function startSlideshowLoop() {
      setInterval(() => {
        currentSlide = (currentSlide + 1) % slideshowItems.length;
        const item = slideshowItems[currentSlide];

        const titleEl = document.getElementById('slideshow-title');
        const descEl = document.getElementById('slideshow-desc');
        const bgEl = document.getElementById('slideshow-bg');

        if (titleEl && descEl && bgEl) {
          titleEl.innerText = item.title;
          descEl.innerText = item.desc;
          bgEl.style.backgroundImage = `url('${item.bg}')`;

          for (let i = 0; i < 3; i++) {
            const dot = document.getElementById(`dot-${i}`);
            if (dot) {
              if (i === currentSlide) {
                dot.className = 'w-12 h-3 bg-cyan-400 rounded-full transition-all duration-300';
              } else {
                dot.className = 'w-3 h-3 bg-slate-700 rounded-full transition-all duration-300';
              }
            }
          }
        }
      }, 5000);
    }