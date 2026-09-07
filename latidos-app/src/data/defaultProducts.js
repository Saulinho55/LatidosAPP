// Default products and services for demo and fallback
export const DEFAULT_COMMERCE_PRODUCTS = {
  1: [ // Cafetería El Guiniguada
    {
      id: 'prod-1-1',
      nombre: 'Desayuno Clásico Canario',
      tipo: 'Menú / Pack',
      categoria: 'Desayunos',
      descripcion: 'Café con leche o infusión + Tostada de pan artesano con tomate y queso semicurado majorero.',
      precioOriginal: 5.50,
      enOferta: true,
      precioRebajado: 4.20,
      badge: 'Especial',
      emoji: '',
      imagen: '',
      disponible: true,
      latidosDescuento: 20
    },
    {
      id: 'prod-1-2',
      nombre: 'Croissant Artesano de Mantequilla',
      tipo: 'Producto',
      categoria: 'Bollería',
      descripcion: 'Horneado cada mañana con mantequilla de primera calidad. Puedes pedirlo relleno de chocolate o crema.',
      precioOriginal: 2.80,
      enOferta: true,
      precioRebajado: 2.00,
      badge: '-28%',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-1-3',
      nombre: 'Smoothie Tropical de Plátano y Mango',
      tipo: 'Producto',
      categoria: 'Bebidas',
      descripcion: 'Zumo 100% natural batido al momento con fruta fresca de Gran Canaria.',
      precioOriginal: 4.20,
      enOferta: false,
      precioRebajado: null,
      badge: '',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-1-4',
      nombre: 'Tarta Casera de Zanahoria & Nuez',
      tipo: 'Producto',
      categoria: 'Postres',
      descripcion: 'Generosa porción con frosting de queso suave y nueces caramelizadas.',
      precioOriginal: 4.80,
      enOferta: true,
      precioRebajado: 3.80,
      badge: 'Casera',
      emoji: '',
      imagen: '',
      disponible: true
    }
  ],
  2: [ // Librería Canaima
    {
      id: 'prod-2-1',
      nombre: 'Novela: "Historias de Vegueta"',
      tipo: 'Producto',
      categoria: 'Libros',
      descripcion: 'La novela de suspense y patrimonio histórico más leída este mes en la isla.',
      precioOriginal: 19.90,
      enOferta: true,
      precioRebajado: 15.90,
      badge: '-20%',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-2-2',
      nombre: 'Tote Bag de Algodón Orgánico Ilustrada',
      tipo: 'Producto',
      categoria: 'Accesorios',
      descripcion: 'Bolsa de tela resistente 100% algodón orgánico con ilustración exclusiva del barrio histórico.',
      precioOriginal: 12.00,
      enOferta: true,
      precioRebajado: 8.50,
      badge: 'Edición Limitada',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-2-3',
      nombre: 'Cuaderno Artesanal de Notas + Marcapáginas',
      tipo: 'Producto',
      categoria: 'Papelería',
      descripcion: 'Papel reciclado de 100g punteado, encuadernación rústica cosida a mano.',
      precioOriginal: 8.50,
      enOferta: false,
      precioRebajado: null,
      badge: '',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-2-4',
      nombre: 'Taller de Club de Lectura Mensual',
      tipo: 'Servicio',
      categoria: 'Talleres',
      descripcion: 'Acceso a la sesión de debate con café y merienda incluida los primeros jueves de mes.',
      precioOriginal: 15.00,
      enOferta: true,
      precioRebajado: 10.00,
      badge: 'Plazas Limitadas',
      emoji: '',
      imagen: '',
      disponible: true
    }
  ],
  3: [ // Panadería Pulido
    {
      id: 'prod-3-1',
      nombre: 'Pack 4 Panes Rústicos de Masa Madre',
      tipo: 'Menú / Pack',
      categoria: 'Panadería',
      descripcion: 'Variedad de 4 panes artesanos (espelta, semillas, centeno y clásico) recién horneados.',
      precioOriginal: 7.20,
      enOferta: true,
      precioRebajado: 5.50,
      badge: 'Pack Ahorro',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-3-2',
      nombre: 'Empanada Gallega de Atún (Porción XL)',
      tipo: 'Producto',
      categoria: 'Salado',
      descripcion: 'Relleno jugoso con pimientos asados, cebolla pochada y bonito del norte.',
      precioOriginal: 4.20,
      enOferta: false,
      precioRebajado: null,
      badge: '',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-3-3',
      nombre: 'Queque Canario Tradicional de Limón',
      tipo: 'Producto',
      categoria: 'Repostería',
      descripcion: 'Bizcocho esponjoso artesano con ralladura de limones locales.',
      precioOriginal: 8.00,
      enOferta: true,
      precioRebajado: 6.50,
      badge: 'Recomendado',
      emoji: '',
      imagen: '',
      disponible: true
    }
  ],
  4: [ // Herbolario Laurel
    {
      id: 'prod-4-1',
      nombre: 'Gel Puro de Aloe Vera Canario (250ml)',
      tipo: 'Producto',
      categoria: 'Cosmética Natural',
      descripcion: 'Extracción en frío de plantaciones ecológicas de las islas. Ideal para hidratación y piel sensible.',
      precioOriginal: 14.50,
      enOferta: true,
      precioRebajado: 10.90,
      badge: '-25%',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-4-2',
      nombre: 'Pack Bienestar: Infusiones Digestivas + Miel Cruda',
      tipo: 'Menú / Pack',
      categoria: 'Alimentación Bio',
      descripcion: 'Caja con 20 pirámides botánicas y bote de 250g de miel de cumbre artesanal.',
      precioOriginal: 13.00,
      enOferta: true,
      precioRebajado: 9.80,
      badge: 'Ahorro',
      emoji: '',
      imagen: '',
      disponible: true
    },
    {
      id: 'prod-4-3',
      nombre: 'Sesión Consulta Nutricional y Flores de Bach (45 min)',
      tipo: 'Servicio',
      categoria: 'Servicios',
      descripcion: 'Asesoramiento personalizado con profesional acreditado en salud natural.',
      precioOriginal: 40.00,
      enOferta: true,
      precioRebajado: 28.00,
      badge: 'Promo Vecinal',
      emoji: '',
      imagen: '',
      disponible: true
    }
  ]
};

export const getComerciosProductsList = (comercioId, comercioData) => {
  const cId = Number(comercioId);
  
  // 1. Check if stored in localStorage
  try {
    const local = localStorage.getItem(`latidos_comercio_productos_${cId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // 2. Check if comercioData has productos
  if (comercioData?.productos && Array.isArray(comercioData.productos) && comercioData.productos.length > 0) {
    return comercioData.productos;
  }

  // 3. Fallback to default catalog or generate tailored products based on category
  if (DEFAULT_COMMERCE_PRODUCTS[cId]) {
    return DEFAULT_COMMERCE_PRODUCTS[cId];
  }

  // Generic generator for other shops
  const cat = (comercioData?.categoria || '').toLowerCase();
  if (cat.includes('café') || cat.includes('restaurante') || cat.includes('bar') || cat.includes('comida') || cat.includes('gastronom')) {
    return [
      {
        id: `prod-${cId}-1`,
        nombre: 'Menú del Día Especial',
        tipo: 'Menú / Pack',
        categoria: 'Comida',
        descripcion: 'Primer plato, segundo plato, bebida, pan y postre casero.',
        precioOriginal: 12.50,
        enOferta: true,
        precioRebajado: 9.90,
        badge: 'Oferta',
        emoji: '',
        imagen: '',
        disponible: true
      },
      {
        id: `prod-${cId}-2`,
        nombre: 'Tapa Especial de la Casa',
        tipo: 'Producto',
        categoria: 'Tapas',
        descripcion: 'Elaborada con productos frescos de temporada de nuestro mercado local.',
        precioOriginal: 5.00,
        enOferta: false,
        precioRebajado: null,
        badge: '',
        emoji: '',
        imagen: '',
        disponible: true
      }
    ];
  }

  if (cat.includes('peluquer') || cat.includes('belleza') || cat.includes('estétic') || cat.includes('barber')) {
    return [
      {
        id: `prod-${cId}-1`,
        nombre: 'Corte + Lavado y Peinado',
        tipo: 'Servicio',
        categoria: 'Peluquería',
        descripcion: 'Servicio completo con productos premium y asesoramiento de imagen.',
        precioOriginal: 22.00,
        enOferta: true,
        precioRebajado: 16.50,
        badge: 'Promo Vecinal',
        emoji: '',
        imagen: '',
        disponible: true
      },
      {
        id: `prod-${cId}-2`,
        nombre: 'Tratamiento Capilar Hidratante',
        tipo: 'Servicio',
        categoria: 'Tratamientos',
        descripcion: 'Recupera el brillo y la suavidad de tu cabello con queratina y aceites naturales.',
        precioOriginal: 25.00,
        enOferta: false,
        precioRebajado: null,
        badge: '',
        emoji: '',
        imagen: '',
        disponible: true
      }
    ];
  }

  return [
    {
      id: `prod-${cId}-1`,
      nombre: 'Artículo Destacado de la Tienda',
      tipo: 'Producto',
      categoria: 'Destacados',
      descripcion: 'Producto seleccionado de alta calidad con garantía de comercio local.',
      precioOriginal: 15.00,
      enOferta: true,
      precioRebajado: 11.50,
      badge: 'Oferta Local',
      emoji: '',
      imagen: '',
      disponible: true
    }
  ];
};
