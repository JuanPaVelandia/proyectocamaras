import pandas as pd
import base64
from io import BytesIO
from PIL import Image
from fpdf import FPDF # Librería para generar el PDF (debes instalarla: pip install fpdf2)

# ==========================================================
# CONFIGURACIÓN
# ==========================================================
# Dentro de dailyrecap_car.py (Línea 10)
CSV_FILE = r'C:\Users\Usuario\Desktop\Consultas SQL\q_carros_2_dic_distribucionessha_scr50.csv'
BASE64_COLUMN = 'snapshot_base64' # <<-- Reemplaza si la columna se llama diferente
OUTPUT_PDF = 'recopilacion_de_eventos.pdf'
# Un tamaño estándar de página A4
A4_WIDTH_MM = 210
A4_HEIGHT_MM = 297

# ==========================================================
# FUNCIÓN PRINCIPAL
# ==========================================================
def generar_documento_con_imagenes():
    try:
        df = pd.read_csv(CSV_FILE)
    except FileNotFoundError:
        print(f"ERROR: No se encontró el archivo {CSV_FILE}.")
        return

    # 1. Preparar el documento PDF
    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Fuente para el título
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Recopilación de Eventos Diarios", 0, 1, 'C')
    pdf.set_font("Arial", "", 10)
    pdf.ln(5)

    # 2. Iterar sobre las filas del CSV
    for index, row in df.iterrows():
        base64_string = row.get(BASE64_COLUMN)
        
        if pd.isna(base64_string) or not base64_string:
            continue # Saltar si no hay datos Base64

        try:
            # 2.1 Decodificación de Base64
            # (Eliminar prefijos como 'data:image/jpeg;base64,' si existen)
            if ',' in base64_string:
                 base64_string = base64_string.split(',')[1]

            image_data = base64.b64decode(base64_string)
            image_buffer = BytesIO(image_data)
            
            # 2.2 Abrir la imagen con PIL
            img = Image.open(image_buffer)
            
            # 2.3 Obtener metadatos (hora, objeto) para el texto
            # Asume que tienes las columnas 'received_at' y 'detected_object'
            fecha_hora = row.get('received_at', f"Evento {index+1}")
            objeto = row.get('detected_object', "Objeto No Especificado")

            # 3. Insertar información y la imagen en el PDF
            
            # Título de la imagen
            pdf.set_fill_color(220, 220, 220)
            pdf.cell(0, 7, f"EVENTO {index + 1}: {fecha_hora} - Objeto: {objeto}", 0, 1, 'L', 1)
            
            # Insertar la imagen (Ajusta el ancho para que quepa en la página)
            img_width, img_height = img.size
            max_img_width = A4_WIDTH_MM - 30 # 30mm de margen (15mm a cada lado)
            
            # Calcular la altura manteniendo la proporción
            h_mm = (img_height * max_img_width) / img_width
            
            # Si la imagen no cabe en la página, añade una nueva
            if pdf.get_y() + h_mm > A4_HEIGHT_MM - 20: # 20mm margen inferior
                pdf.add_page()
                pdf.set_font("Arial", "B", 12)
                pdf.cell(0, 10, f"Continuación de Eventos", 0, 1, 'C')
                pdf.set_font("Arial", "", 10)
                pdf.ln(5)
            
            # Insertar la imagen desde el buffer (clave: usar un buffer en lugar de un archivo)
            pdf.image(image_buffer, x=15, w=max_img_width, h=h_mm, type=img.format)
            pdf.ln(5) # Espacio después de la imagen

        except Exception as e:
            pdf.set_text_color(255, 0, 0)
            pdf.cell(0, 5, f"ERROR al procesar el evento {index + 1}: {e}", 0, 1)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

    # 4. Guardar el PDF
    pdf.output(OUTPUT_PDF)
    print(f"\n✨ ¡Éxito! El documento recopilatorio fue creado: {OUTPUT_PDF}")

if __name__ == "__main__":
    generar_documento_con_imagenes()