import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const Chat = () => {
    const [messages, setMessages] = useState([
        { text: "¡Hola! Soy tu asistente de compras. ¿Qué producto buscas hoy?", sender: 'bot' }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = { text, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);

        try {
            const response = await fetch("http://localhost:8000/consultar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: text })
            });

            const data = await response.json();
            
            const botMsg = { 
                text: data.mensaje, 
                sender: 'bot', 
                options: data.opciones || [] 
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            setMessages(prev => [...prev, { text: "Error: No hay conexión con el servidor Python.", sender: 'bot' }]);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3>Asistente de Compras</h3>
            </div>
            
            <div className="messages-window">
                {messages.map((m, i) => (
                    <div key={i} className={`message-row ${m.sender}`}>
                        <div className={`bubble ${m.sender}`}>
                            {m.text}
                        </div>
                        {m.options && m.options.length > 0 && (
                            <div className="options-grid">
                                {m.options.map((opt, j) => (
                                    <button 
                                        key={j} 
                                        onClick={() => sendMessage(opt)} 
                                        className="option-button"
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

            <div className="input-area">
                <input 
                    type="text"
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ej: Precio de manzana..."
                    onKeyPress={(e) => e.key === 'Enter' && (sendMessage(input), setInput(""))}
                />
                <button className="send-button" onClick={() => { sendMessage(input); setInput(""); }}>
                    Enviar
                </button>
            </div>
        </div>
    );
};

export default Chat;