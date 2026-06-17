import React, { useState, useEffect } from 'react';
import Chat from './Chat';
import {
  ShoppingCart, Apple, MessageSquare, X, ShoppingBag,
  Trash2, CheckCircle, BarChart3, AlertTriangle, Package, History, Coins, TrendingUp, Download, Filter, Sparkles
} from 'lucide-react';

function App() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tipoVenta, setTipoVenta] = useState('minorista');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [historialVentas, setHistorialVentas] = useState([]);
  const [totalVentasDia, setTotalVentasDia] = useState(0);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODOS');

  const [cantidadesInput, setCantidadesInput] = useState({});
  const [isBoletaOpen, setIsBoletaOpen] = useState(false);
  const [ultimaBoleta, setUltimaBoleta] = useState(null);

  // Estado para la recomendación de venta cruzada
  const [sugerenciaCross, setSugerenciaCross] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/productos")
      .then(res => res.json())
      .then(data => {
        const datosCorregidos = data.map(p => ({
          ...p,
          precioMay: p.precioMay > 0 ? p.precioMay : parseFloat((p.precioMin * 0.75).toFixed(2))
        }));
        setProductos(datosCorregidos);
      })
      .catch(err => console.error("Error cargando catálogo:", err));
  }, []);

  // --- NUEVO: SISTEMA DE RECOMENDACIÓN DE CROSS-SELLING EN EL CARRITO ---
  useEffect(() => {
    if (carrito.length === 0) {
      setSugerenciaCross(null);
      return;
    }

    // Tomamos la categoría del último producto añadido al carrito
    const ultimaCategoria = carrito[carrito.length - 1].categoria;

    // Buscamos un producto de esa misma categoría en la base de datos que NO esté en el carrito y que tenga stock
    const recomendado = productos.find(p =>
      p.categoria === ultimaCategoria &&
      p.stock > 0 &&
      !carrito.some(item => item.id === p.id)
    );

    setSugerenciaCross(recomendado || null);
  }, [carrito, productos]);

  const categoriasUnicas = ['TODOS', ...new Set(productos.map(p => p.categoria).filter(Boolean))];
  const productosFiltrados = categoriaSeleccionada === 'TODOS' ? productos : productos.filter(p => p.categoria === categoriaSeleccionada);

  const stats = {
    totalProductos: productos.length,
    bajoStock: productos.filter(p => p.stock > 0 && p.stock < 10).length,
    valorInventario: productos.reduce((acc, p) => acc + (p.precioMin * p.stock), 0).toFixed(2),
    ingresosCaja: totalVentasDia.toFixed(2)
  };

  const manejarCambioCantidadInput = (id, valor) => {
    setCantidadesInput({ ...cantidadesInput, [id]: Math.max(1, parseInt(valor) || 1) });
  };

  const agregarAlCarrito = (producto, cantidadAñadir = 1) => {
    const precio = tipoVenta === 'minorista' ? producto.precioMin : producto.precioMay;
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id && item.modalidad === tipoVenta);
      if (existe) {
        return prev.map(item => (item.id === producto.id && item.modalidad === tipoVenta) ? { ...item, cantidad: item.cantidad + cantidadAñadir } : item);
      }
      return [...prev, { ...producto, precioSeleccionado: precio, cantidad: cantidadAñadir, modalidad: tipoVenta }];
    });
  };

  const reducirStock = (id, cantidadAñadir = 1) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock - cantidadAñadir) } : p));
  };

  const eliminarDelCarrito = (id, modalidad, cantidad) => {
    setCarrito(prev => prev.filter(item => !(item.id === id && item.modalidad === modalidad)));
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock + cantidad } : p));
  };

  const calcularTotal = () => carrito.reduce((acc, item) => acc + (item.precioSeleccionado * item.cantidad), 0);

  const manejarProcesarCompra = () => {
    if (carrito.length === 0) return;
    const montoTotal = calcularTotal();
    const nuevaBoleta = {
      nro: `B001-${Math.floor(Math.random() * 9000) + 1000}`,
      fecha: new Date().toLocaleTimeString(),
      items: [...carrito],
      subtotal: (montoTotal / 1.18).toFixed(2),
      igv: (montoTotal - (montoTotal / 1.18)).toFixed(2),
      total: montoTotal.toFixed(2),
      modalidad: tipoVenta
    };
    setHistorialVentas([nuevaBoleta, ...historialVentas]);
    setTotalVentasDia(prev => prev + montoTotal);
    setUltimaBoleta(nuevaBoleta);
    setIsBoletaOpen(true);
    setIsCartOpen(false);
    setCarrito([]);
  };

  const exportarReporteExcel = () => {
    if (historialVentas.length === 0) return alert("No hay transacciones.");
    let contenidoCsv = "HORA,DOCUMENTO,MODALIDAD,TOTAL_SOLES\n";
    historialVentas.forEach(v => { contenidoCsv += `${v.fecha},${v.nro},${v.modalidad.toUpperCase()},S/ ${v.total}\n`; });
    const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Caja.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0, overflow: 'hidden' }}>

      {/* NAVBAR */}
      <header style={{ backgroundColor: '#0f172a', color: 'white', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, height: '60px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#22c55e', padding: '6px', borderRadius: '8px' }}><Apple style={{ color: 'white' }} size={18} /></div>
          <div><h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>SistemVenta Pro</h1><span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold' }}>● CORE INTEGRADO ERP</span></div>
        </div>
        <div style={{ display: 'flex', backgroundColor: '#1e293b', padding: '4px', borderRadius: '8px' }}>
          <button onClick={() => setTipoVenta('minorista')} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: tipoVenta === 'minorista' ? '#22c55e' : 'transparent', color: 'white' }}>MINORISTA</button>
          <button onClick={() => setTipoVenta('mayorista')} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: tipoVenta === 'mayorista' ? '#22c55e' : 'transparent', color: 'white' }}>MAYORISTA</button>
        </div>
        <button onClick={() => setIsCartOpen(!isCartOpen)} style={{ background: '#22c55e', border: 'none', color: '#052e16', padding: '8px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <ShoppingCart size={18} /> S/ {calcularTotal().toFixed(2)}
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', height: 'calc(100vh - 60px)' }}>

        {/* PANEL CENTRAL */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* STATS */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '10px' }}><Package color="#64748b" /></div><div><p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Artículos</p><h4 style={{ margin: 0 }}>{stats.totalProductos}</h4></div></div>
              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '10px' }}><AlertTriangle color="#f97316" /></div><div><p style={{ margin: 0, fontSize: '11px', color: '#f97316' }}>Stock Crítico</p><h4 style={{ margin: 0 }}>{stats.bajoStock}</h4></div></div>
              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px' }}><Coins color="#16a34a" /></div><div><p style={{ margin: 0, fontSize: '11px', color: '#16a34a' }}>Valor Almacén</p><h4 style={{ margin: 0 }}>S/ {stats.valorInventario}</h4></div></div>
              <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '10px' }}><TrendingUp color="#22c55e" /></div><div><p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Ingresos Caja</p><h4 style={{ margin: 0, color: '#22c55e' }}>S/ {stats.ingresosCaja}</h4></div></div>
            </section>

            {/* FILTROS */}
            <div style={{ backgroundColor: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Filter size={14}/> Filtrar Catálogo:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categoriasUnicas.map(cat => (
                  <button key={cat} onClick={() => setCategoriaSeleccionada(cat)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid', cursor: 'pointer', backgroundColor: categoriaSeleccionada === cat ? '#0f172a' : '#f1f5f9', borderColor: categoriaSeleccionada === cat ? '#0f172a' : '#cbd5e1', color: categoriaSeleccionada === cat ? 'white' : '#475569' }}>{cat}</button>
                ))}
              </div>
            </div>

            {/* PRODUCTOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {productosFiltrados.map(prod => {
                const cantidad = cantidadesInput[prod.id] || 1;
                const precio = tipoVenta === 'minorista' ? prod.precioMin : prod.precioMay;
                return (
                  <div key={prod.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', opacity: prod.stock === 0 ? 0.5 : 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{prod.categoria}</span>
                    <h3 style={{ fontSize: '14px', margin: '8px 0 4px 0', color: '#0f172a', fontWeight: '700' }}>{prod.nombre}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>Stock: <strong>{prod.stock} {prod.unidad}</strong></p>
                    <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '10px' }}>S/ {precio.toFixed(2)}</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="number" min="1" max={prod.stock} value={cantidad} disabled={prod.stock === 0} onChange={(e) => manejarCambioCantidadInput(prod.id, e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }} />
                      <button onClick={() => { agregarAlCarrito(prod, cantidad); reducirStock(prod.id, cantidad); setCantidadesInput({...cantidadesInput, [prod.id]: 1}) }} disabled={prod.stock === 0 || cantidad > prod.stock} style={{ flex: 1, backgroundColor: prod.stock > 0 ? '#0f172a' : '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>AÑADIR</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REGISTRO DE CAJA (ANCLADO ABAJO) */}
          <section style={{ backgroundColor: 'white', borderTop: '1px solid #e2e8f0', padding: '16px 20px', height: '180px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History size={18} color="#64748b" /><h3 style={{ margin: 0, fontSize: '14px', color: '#0f172a', fontWeight: 'bold' }}>Registro de Operaciones (Caja del Día)</h3></div>
              <button onClick={exportarReporteExcel} disabled={historialVentas.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: historialVentas.length > 0 ? '#16a34a' : '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: historialVentas.length > 0 ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: 'bold' }}><Download size={12} /> Exportar Excel (.CSV)</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {historialVentas.length === 0 ? ( <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No hay transacciones registradas.</p> ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, backgroundColor: 'white' }}><th style={{ padding: '6px 8px' }}>HORA</th><th style={{ padding: '6px 8px' }}>DOCUMENTO</th><th style={{ padding: '6px 8px' }}>MODALIDAD</th><th style={{ padding: '6px 8px', textAlign: 'right' }}>TOTAL</th></tr></thead>
                  <tbody>{historialVentas.map((v, i) => ( <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}><td style={{ padding: '6px 8px', color: '#64748b' }}>{v.fecha}</td><td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{v.nro}</td><td style={{ padding: '6px 8px' }}><span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', backgroundColor: v.modalidad === 'mayorista' ? '#e0f2fe' : '#f0fdf4', color: v.modalidad === 'mayorista' ? '#0369a1' : '#166534', fontWeight: 'bold' }}>{v.modalidad.toUpperCase()}</span></td><td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>S/ {v.total}</td></tr> ))}</tbody>
                </table>
              )}
            </div>
          </section>
        </main>

        {/* CHATBOT */}
        <aside style={{ width: isChatOpen ? '400px' : '0px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: '0.3s' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 'bold', fontSize: '14px' }}>Asistente Inteligente</span><X size={18} cursor="pointer" onClick={() => setIsChatOpen(false)} /></div>
          <div style={{ flex: 1, overflow: 'hidden' }}><Chat tipoVenta={tipoVenta} agregarAlCarrito={agregarAlCarrito} productos={productos} reducirStock={reducirStock} /></div>
        </aside>

        {/* CARRITO CON BANNER DE SUGERENCIA INTELIGENTE (CROSS-SELLING) */}
        {isCartOpen && (
          <div style={{ position: 'absolute', top: 0, right: isChatOpen ? '400px' : 0, width: '350px', height: '100%', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Mi Carrito</h3><X size={20} cursor="pointer" onClick={() => setIsCartOpen(false)} /></div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {carrito.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Tu carrito está vacío</p> : carrito.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                  <div><h5 style={{ margin: 0, fontSize: '13px' }}>{item.nombre}</h5><small>{item.cantidad} x S/ {item.precioSeleccionado.toFixed(2)}</small></div>
                  <Trash2 size={16} color="#ef4444" cursor="pointer" onClick={() => eliminarDelCarrito(item.id, item.modalidad, item.cantidad)} />
                </div>
              ))}

              {/* MEJORA: BANNER DE VENTA CRUZADA INTERACTIVO */}
              {sugerenciaCross && (
                <div style={{ marginTop: 'auto', backgroundColor: '#f0fdf4', border: '1px dashed #bbf7d0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>
                    <Sparkles size={14} color="#16a34a" /> <span>Sugerencia del Sistema:</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>Lleva también <strong style={{ color: '#0f172a' }}>{sugerenciaCross.nombre}</strong> por solo <strong>S/ {(tipoVenta === 'minorista' ? sugerenciaCross.precioMin : sugerenciaCross.precioMay).toFixed(2)}</strong>.</p>
                  <button
                    onClick={() => { agregarAlCarrito(sugerenciaCross, 1); reducirStock(sugerenciaCross.id, 1); }}
                    style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                  >
                    + Añadir Sugerencia
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '20px', borderTop: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><strong>Total:</strong> <strong style={{ color: '#16a34a', fontSize: '18px' }}>S/ {calcularTotal().toFixed(2)}</strong></div>
              <button onClick={manejarProcesarCompra} style={{ width: '100%', padding: '12px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>FINALIZAR VENTA</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL BOLETA */}
      {isBoletaOpen && ultimaBoleta && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '380px', padding: '30px', borderRadius: '2px', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>SistemVenta S.A.</h2>
              <p style={{ margin: '5px 0' }}>RUC: 20601234567</p>
              <h4 style={{ margin: '10px 0', backgroundColor: '#000', color: '#fff', padding: '4px' }}>BOLETA DE VENTA</h4>
              <p style={{ fontWeight: 'bold' }}>{ultimaBoleta.nro}</p>
            </div>
            <div style={{ padding: '15px 0', fontSize: '12px' }}>
              <p>HORA: {ultimaBoleta.fecha}</p>
              <p>MODALIDAD: {ultimaBoleta.modalidad.toUpperCase()}</p>
              <div style={{ borderBottom: '1px solid #000', margin: '10px 0' }}></div>
              {ultimaBoleta.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{it.cantidad} x {it.nombre.substring(0, 20)}</span>
                  <span>S/ {(it.cantidad * it.precioSeleccionado).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px dashed #000', paddingTop: '10px', textAlign: 'right' }}>
              <p style={{ margin: '2px 0' }}>SUBTOTAL: S/ {ultimaBoleta.subtotal}</p>
              <p style={{ margin: '2px 0' }}>IGV (18%): S/ {ultimaBoleta.igv}</p>
              <h3 style={{ margin: '8px 0' }}>TOTAL: S/ {ultimaBoleta.total}</h3>
            </div>
            <button onClick={() => setIsBoletaOpen(false)} style={{ marginTop: '20px', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>ACEPTAR Y CONTINUAR</button>
          </div>
        </div>
      )}

      {!isChatOpen && <button onClick={() => setIsChatOpen(true)} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#0f172a', color: 'white', padding: '15px', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 100 }}><MessageSquare /></button>}
    </div>
  );
}

export default App;