import pandas as pd

# Cargamos el dataset
df = pd.read_csv("minimercado_dataset_julio.csv")

print("--- REVISIÓN DE COLUMNAS ---")
print(df.columns.tolist())

print("\n--- PRIMERAS 5 FILAS ---")
print(df[['PRODUCTO', 'PRECIO_MINORISTA']].head())

print("\n--- BÚSQUEDA DE MANZANAS ---")
# Esto nos dirá qué precios tienen las diferentes manzanas en tu CSV
manzanas = df[df['PRODUCTO'].str.contains("Manzana", case=False, na=False)]
print(manzanas[['PRODUCTO', 'PRECIO_MINORISTA']])