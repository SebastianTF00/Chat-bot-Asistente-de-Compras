from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import unicodedata
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

df = pd.read_csv("minimercado_dataset_julio.csv")

def limpiar(t):
    t = str(t).lower().strip()
    return "".join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')

df['PRODUCTO_BUSQUEDA'] = df['PRODUCTO'].apply(limpiar)

# Expandimos el entrenamiento con la intención de compra
data_entrenamiento = [
    ("cuanto vale", "precio"), ("precio de", "precio"), ("que cuesta", "precio"), ("costo", "precio"),
    ("hay stock", "stock"), ("esta disponible", "stock"), ("tienes", "stock"), ("inventario", "stock"),
    ("como lo venden", "medida"), ("es por kilo", "medida"),
    ("agregar", "comprar"), ("comprar", "comprar"), ("llevar", "comprar"), ("ponlo al carrito", "comprar"), ("anadir", "comprar")
]
frases, etiquetas = zip(*data_entrenamiento)
vectorizador = CountVectorizer()
X_train = vectorizador.fit_transform(list(frases))
modelo_ia = MultinomialNB()
modelo_ia.fit(X_train, list(etiquetas))

class Consulta(BaseModel):
    texto: str
    tipoVenta: Optional[str] = "minorista" # Recibe si la tienda está en modo mayorista o minorista

@app.get("/productos")
async def obtener_productos():
    # Tomamos los productos únicos del CSV para mostrarlos en la tienda
    productos_unicos = df.drop_duplicates(subset=['PRODUCTO'])

    lista_productos = []
    for idx, row in productos_unicos.iterrows():
        # Mapeamos las columnas de tu CSV a un formato limpio para el frontend
        lista_productos.append({
            "id": int(idx),
            "nombre": str(row['PRODUCTO']),
            "precioMin": float(row.get('PRECIO_MINORISTA', 0.0)),
            "precioMay": float(row.get('PRECIO_MAYORISTA', 0.0)),
            "unidad": str(row.get('UNIDAD_MEDIDA_MIN', 'kg')),
            "stock": int(row.get('STOCK', 100)),  # Si tu CSV no tiene STOCK, dejamos un valor base
            "categoria": str(row.get('CATEGORIA', 'Frutas & Verduras'))
        })
    return lista_productos


@app.post("/consultar")
async def chatbot(pedido: Consulta):
    mensaje_usuario = pedido.texto
    mensaje_limpio = limpiar(mensaje_usuario)
    tipo_venta = pedido.tipoVenta

    intencion = modelo_ia.predict(vectorizador.transform([mensaje_limpio]))[0]

    # Estrategia de búsqueda mejorada
    match_exacto = df[df['PRODUCTO_BUSQUEDA'] == mensaje_limpio]
    if not match_exacto.empty:
        match = match_exacto
    else:
        match = df[df['PRODUCTO_BUSQUEDA'].apply(lambda x: x in mensaje_limpio or mensaje_limpio in x)]

    if match.empty:
        return {"mensaje": "Lo siento, no encontré ese producto en el inventario actual.", "opciones": [], "accion": None}

    if len(match) > 1 and match_exacto.empty:
        opciones = match['PRODUCTO'].unique()[:5].tolist()
        return {
            "mensaje": f"Encontré {len(match)} coincidencias en almacén. ¿Cuál de estas buscas?",
            "opciones": opciones,
            "accion": "MOSTRAR_OPCIONES"
        }

    # Procesamos el producto único encontrado
    p = match.iloc[0]
    nombre = p['PRODUCTO']

    # Manejo dinámico de precios según la base de datos y la selección de la App
    precio = p.get('PRECIO_MAYORISTA' if tipo_venta == "mayorista" else 'PRECIO_MINORISTA', p.get('PRECIO_MINORISTA', 0.0))
    unidad = p.get('UNIDAD_MEDIDA_MIN', 'unidad')

    # Objeto estructurado para que React actualice la UI de inmediato
    producto_json = {
        "id": int(p.name), # Usamos el índice como ID
        "nombre": nombre,
        "precioMin": float(p.get('PRECIO_MINORISTA', precio)),
        "precioMay": float(p.get('PRECIO_MAYORISTA', precio)),
        "unidad": unidad,
        "categoria": "General"
    }

    if intencion == "comprar":
        return {
            "mensaje": f"¡Perfecto! He añadido {nombre} al carrito de compras.",
            "opciones": [],
            "accion": "AGREGAR",
            "producto": producto_json
        }

    if intencion == "precio":
        res = f"El precio de {nombre} ({tipo_venta}) es de S/ {float(precio):.2f} por {unidad}."
    elif intencion == "stock":
        res = f"Tenemos stock disponible para {nombre}. ¿Te gustaría que lo añada a tu pedido?"
    else:
        res = f"Encontré {nombre}. ¿Deseas consultar el precio o añadirlo directamente?"

    return {"mensaje": res, "opciones": [], "accion": "RESALTAR", "producto": producto_json}