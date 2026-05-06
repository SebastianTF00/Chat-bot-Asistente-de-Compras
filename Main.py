from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import unicodedata
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

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

# Preparamos la columna de búsqueda
df['PRODUCTO_BUSQUEDA'] = df['PRODUCTO'].apply(limpiar)


data_entrenamiento = [
    ("cuanto vale", "precio"), ("precio de", "precio"), ("que cuesta", "precio"),
    ("hay stock", "stock"), ("esta disponible", "stock"), ("tienes", "stock"),
    ("como lo venden", "medida"), ("es por kilo", "medida"),("Quiero,PRODCUTO")
]
frases, etiquetas = zip(*data_entrenamiento)
vectorizador = CountVectorizer()
X_train = vectorizador.fit_transform(list(frases))
modelo_ia = MultinomialNB()
modelo_ia.fit(X_train, list(etiquetas))

class Consulta(BaseModel):
    texto: str
@app.post("/consultar")
async def chatbot(pedido: Consulta):
    mensaje_usuario = pedido.texto
    mensaje_limpio = limpiar(mensaje_usuario)
    
    intencion = modelo_ia.predict(vectorizador.transform([mensaje_limpio]))[0]

    match_exacto = df[df['PRODUCTO_BUSQUEDA'] == mensaje_limpio]
    
    if not match_exacto.empty:
        match = match_exacto
    else:
        match = df[df['PRODUCTO_BUSQUEDA'].apply(lambda x: x in mensaje_limpio or mensaje_limpio in x)]

    # Si no hay resultados
    if match.empty:
        return {"mensaje": "Lo siento, no encontré ese producto en el inventario de julio.", "opciones": []}

    # Si hay varios resultados (Mostramos botones)
    if len(match) > 1 and match_exacto.empty:
        opciones = match['PRODUCTO'].unique()[:5].tolist()
        return {
            "mensaje": f"Encontré {len(match)} coincidencias. ¿Cuál buscas?",
            "opciones": opciones
        }

    # SI HAY SOLO UNO (Éxito)
    p = match.iloc[0]
    nombre = p['PRODUCTO']
    precio = p['PRECIO_MINORISTA']
    unidad = p['UNIDAD_MEDIDA_MIN']

    if intencion == "precio":
        res = f"El precio de {nombre} es S/ {precio} por {unidad}."
    else:
        res = f"Encontré {nombre} a S/ {precio}. ¿Deseas saber el stock?"

    return {"mensaje": res, "opciones": []}