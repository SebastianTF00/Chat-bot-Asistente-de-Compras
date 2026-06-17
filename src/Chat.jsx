import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import './index.css';

const Chat = ({ tipoVenta, agregarAlCarrito, productos, reducirStock }) => {
    const [messages, setMessages] = useState([
        { text: "¡Hola! Soy tu asistente de compras. ¿Qué producto buscas hoy? Prueba escribiendo una lista como: 'Zanahoria 10, Manzana delicia 5, Pallar'", sender: 'bot' }
    ]);
    const [input, setInput] = useState("");
    const [sugerencias, setSugerencias] = useState([]);

    // Estado local para controlar las cantidades elegidas directamente en las tarjetas del bot
    const [cantidadesBot, setCantidadesBot] = useState({});

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // MEJORA: LÓGICA DE AUTOCOMPLETADO INTELIGENTE BASADA EN LA ÚLTIMA PALABRA DE LA LISTA
        useEffect(() => {
            if (!input.trim()) {
                setSugerencias([]);
                return;
            }

            // Separamos por comas para aislar los elementos de la lista
            const partes = input.split(',');
            // Tomamos el último fragmento que el usuario está escribiendo actualmente y limpiamos espacios
            const ultimoFragmento = partes[partes.length - 1].trim();

            // Si el usuario acaba de poner una coma y el fragmento está vacío, o tiene números, no sugerimos nada aún
            if (!ultimoFragmento || /\d+/.test(ultimoFragmento)) {
                setSugerencias([]);
                return;
            }

            // Filtramos en la base de datos usando solo ese último fragmento
            const filtrados = productos.filter(p =>
                p.nombre.toLowerCase().includes(ultimoFragmento.toLowerCase())
            ).slice(0, 4);

            setSugerencias(filtrados);
        }, [input, productos]);

    // Función para manejar el cambio de cantidad manual en la tarjeta del bot
    const manejarCambioCantidadBot = (id, valor, stockMax) => {
        const cant = Math.min(stockMax, Math.max(1, parseInt(valor) || 1));
        setCantidadesBot(prev => ({ ...prev, [id]: cant }));
    };

    const procesarListaMasiva = (textoCompleto) => {
        const lineas = textoCompleto.split(/[,\n]+/);
        let itemsAgregados = [];
        let itemsNoEncontrados = [];

        lineas.forEach(linea => {
            let textoLimpio = linea.trim();
            if (!textoLimpio) return;

            const matchNumero = textoLimpio.match(/\d+/);
            let cantidad = 1;
            let nombreBuscar = textoLimpio;

            if (matchNumero) {
                cantidad = parseInt(matchNumero[0]);
                nombreBuscar = textoLimpio.replace(matchNumero[0], "").trim();
            }

            const prodReal = productos.find(p =>
                p.nombre.toLowerCase().includes(nombreBuscar.toLowerCase()) ||
                nombreBuscar.toLowerCase().includes(p.nombre.toLowerCase())
            );

            if (prodReal) {
                if (prodReal.stock >= cantidad) {
                    agregarAlCarrito(prodReal, cantidad);
                    reducirStock(prodReal.id, Math.abs(cantidad));
                    itemsAgregados.push(`${cantidad}x ${prodReal.nombre}`);
                } else if (prodReal.stock > 0) {
                    const stockDisponible = prodReal.stock;
                    agregarAlCarrito(prodReal, stockDisponible);
                    reducirStock(prodReal.id, stockDisponible);
                    itemsAgregados.push(`${stockDisponible}x ${prodReal.nombre} (Stock limitado)`);
                } else {
                    itemsNoEncontrados.push(`${nombreBuscar} (Agotado)`);
                }
            } else {
                itemsNoEncontrados.push(nombreBuscar);
            }
        });

        let respuestaBot = "📋 **Procesamiento de Lista Masiva:**\n";
        if (itemsAgregados.length > 0) {
            respuestaBot += `✅ Agregado al carrito:\n- ${itemsAgregados.join('\n- ')}\n`;
        }
        if (itemsNoEncontrados.length > 0) {
            respuestaBot += `❌ No se pudo procesar:\n- ${itemsNoEncontrados.join('\n- ')}`;
        }

        setMessages(prev => [...prev, { text: respuestaBot, sender: 'bot' }]);

        // Devolver el foco al input del chat inmediatamente
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = { text, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setSugerencias([]);

        const esLista = text.includes(',') || text.includes('\n') || (text.match(/\d+/) && text.toLowerCase().split(" ").length > 2);

        if (esLista) {
            procesarListaMasiva(text);
            return;
        }

        try {
            const response = await fetch("http://localhost:8000/consultar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: text, tipoVenta: tipoVenta })
            });

            const data = await response.json();

            // Si el backend Naive Bayes detecta la acción directa, toma cantidad 1 por defecto o la procesa
            if (data.accion === "AGREGAR" && data.producto) {
                const prodReal = productos.find(p => p.id === data.producto.id);
                if (prodReal && prodReal.stock > 0) {
                    agregarAlCarrito(data.producto, 1);
                    reducirStock(data.producto.id, 1);
                }
            }

            const botMsg = {
                text: data.mensaje,
                sender: 'bot',
                options: data.opciones || [],
                productoVinculado: data.producto || null
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            setMessages(prev => [...prev, { text: "Error: No hay conexión con el servidor Python.", sender: 'bot' }]);
        }

        // Mantener siempre el foco listo para el siguiente producto
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    return (
        <div className="chat-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>

            {/* VENTANA DE MENSAJES */}
            <div className="messages-window" style={{ flex: 1, padding: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, i) => (
                    <div key={i} className={`message-row ${m.sender}`}>
                        <div className={`bubble ${m.sender}`} style={{ whiteSpace: 'pre-line' }}>
                            {m.text}
                        </div>

                        {/* TARJETA INTERACTIVA DE PRODUCTO DETECTADO */}
                        {m.productoVinculado && !m.text.includes("📋") && (() => {
                            const prodReal = productos.find(p => p.id === m.productoVinculado.id);
                            const stockActual = prodReal ? prodReal.stock : 0;
                            const precioActual = tipoVenta === 'minorista' ? m.productoVinculado.precioMin : m.productoVinculado.precioMay;

                            // Cantidad seleccionada actualmente para esta tarjeta específica (por defecto 1)
                            const cantidadElegida = cantidadesBot[m.productoVinculado.id] || 1;

                            return (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginTop: '6px', maxWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{m.productoVinculado.nombre}</span>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Stock: {stockActual}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>S/ {precioActual.toFixed(2)}</span>

                                        {/* MEJORA: Modificar cantidad directamente antes de agregar */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max={stockActual}
                                                value={cantidadElegida}
                                                disabled={stockActual <= 0}
                                                onChange={(e) => manejarCambioCantidadBot(m.productoVinculado.id, e.target.value, stockActual)}
                                                style={{ width: '45px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '12px' }}
                                            />

                                            <button
                                                disabled={stockActual <= 0 || cantidadElegida > stockActual}
                                                onClick={() => {
                                                    agregarAlCarrito(prodReal, cantidadElegida);
                                                    reducirStock(prodReal.id, cantidadElegida);
                                                    // Reiniciar contador de la tarjeta a 1
                                                    setCantidadesBot(prev => ({ ...prev, [prodReal.id]: 1 }));
                                                    // Devolver foco al input principal
                                                    inputRef.current?.focus();
                                                }}
                                                style={{ backgroundColor: stockActual > 0 ? '#0f172a' : '#94a3b8', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: stockActual > 0 ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                Añadir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* BOTONES DE OPCIONES / AUTOCOMPLETADO */}
                        {m.options && m.options.length > 0 && (
                            <div className="options-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {m.options.map((opt, j) => (
                                    <button
                                        key={j}
                                        onClick={() => {
                                            sendMessage(opt);
                                        }}
                                        className="option-button"
                                        style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', color: '#334155' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* POPUP DE SUGERENCIAS FLOTANTES ACTUALIZADO */}
                        {sugerencias.length > 0 && (
                            <div style={{ position: 'absolute', bottom: '60px', left: '12px', right: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 -4px 12px rgba(0,0,0,0.08)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                {sugerencias.map((sug) => (
                                    <div
                                        key={sug.id}
                                        onClick={() => {
                                            // Separamos lo que ya estaba escrito por comas
                                            const partes = input.split(',');
                                            // Eliminamos el último fragmento incompleto (ej: "zan")
                                            partes.pop();

                                            // Volvemos a armar la cadena con los productos anteriores mas la nueva sugerencia seleccionada
                                            if (partes.length > 0) {
                                                setInput(partes.join(',') + `, ${sug.nombre} `);
                                            } else {
                                                setInput(`${sug.nombre} `);
                                            }

                                            // Devolvemos el foco al teclado para que sigas escribiendo rápido
                                            setTimeout(() => inputRef.current?.focus(), 50);
                                        }}
                                        style={{ padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', color: '#334155', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        🔍 Sugerir <strong style={{ color: '#0f172a' }}>{sug.nombre}</strong>
                                    </div>
                                ))}
                            </div>
                        )}

            {/* ÁREA DE INPUT DEL CHAT */}
            <div className="input-area" style={{ padding: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px', backgroundColor: 'white' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ej: Zanahoria 10, Manzana 5... o busca un producto"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    onKeyPress={(e) => e.key === 'Enter' && (sendMessage(input), setInput(""))}
                />
                <button onClick={() => { sendMessage(input); setInput(""); }} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Enviar</button>
            </div>
        </div>
    );
};

export default Chat;