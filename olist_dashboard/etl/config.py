import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Cargar .env si existe (busca en raíz del proyecto). Sin dependencias externas.
_env_path = PROJECT_ROOT / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

# Credenciales SQL Server (Docker local). Override vía .env o variables de entorno.
DB_HOST     = os.environ.get("OLIST_DB_HOST", "localhost")
DB_PORT     = int(os.environ.get("OLIST_DB_PORT", "1433"))
DB_USER     = os.environ.get("OLIST_DB_USER", "sa")
DB_PASSWORD = os.environ.get("OLIST_DB_PASSWORD", "TuClaveFuerte123!")
DB_NAME     = os.environ.get("OLIST_DB_NAME", "OlistDW")

DATA_DIR    = PROJECT_ROOT / "proyectobigdata" / "data"
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "db" / "schema.sql"

REGION_BY_STATE = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sur", "RS": "Sur", "SC": "Sur",
}

# Traducciones EN -> ES. Mantener sincronizado con
# frontend/src/lib/translate.ts (single source of truth).
CATEGORIAS_ES = {
    "agro_industry_and_commerce": "Agroindustria y comercio",
    "air_conditioning": "Aire acondicionado",
    "art": "Arte",
    "arts_and_craftmanship": "Manualidades",
    "audio": "Audio",
    "auto": "Automotriz",
    "baby": "Bebés",
    "bed_bath_table": "Cama, baño y mesa",
    "books_general_interest": "Libros (interés general)",
    "books_imported": "Libros importados",
    "books_technical": "Libros técnicos",
    "cds_dvds_musicals": "CDs, DVDs y musicales",
    "christmas_supplies": "Artículos de Navidad",
    "cine_photo": "Cine y fotografía",
    "computers": "Computadoras",
    "computers_accessories": "Computación y accesorios",
    "consoles_games": "Consolas y videojuegos",
    "construction_tools_construction": "Herramientas de construcción",
    "construction_tools_lights": "Herramientas e iluminación",
    "construction_tools_safety": "Herramientas de seguridad",
    "cool_stuff": "Productos novedosos",
    "costruction_tools_garden": "Herramientas de jardín",
    "costruction_tools_tools": "Herramientas",
    "diapers_and_hygiene": "Pañales e higiene",
    "drinks": "Bebidas",
    "dvds_blu_ray": "DVDs y Blu-ray",
    "electronics": "Electrónica",
    "fashio_female_clothing": "Moda femenina",
    "fashion_bags_accessories": "Moda · bolsos y accesorios",
    "fashion_childrens_clothes": "Ropa infantil",
    "fashion_female_clothing": "Moda femenina",
    "fashion_male_clothing": "Moda masculina",
    "fashion_shoes": "Calzado",
    "fashion_sport": "Moda deportiva",
    "fashion_underwear_beach": "Lencería y baño",
    "fixed_telephony": "Telefonía fija",
    "flowers": "Flores",
    "food": "Alimentos",
    "food_drink": "Comida y bebida",
    "furniture_bedroom": "Muebles de dormitorio",
    "furniture_decor": "Muebles y decoración",
    "furniture_living_room": "Muebles de sala",
    "furniture_mattress_and_upholstery": "Colchones y tapicería",
    "garden_tools": "Herramientas de jardín",
    "health_beauty": "Salud y belleza",
    "home_appliances": "Electrodomésticos",
    "home_appliances_2": "Electrodomésticos (otros)",
    "home_comfort_2": "Confort del hogar (otros)",
    "home_confort": "Confort del hogar",
    "home_construction": "Construcción y hogar",
    "housewares": "Artículos del hogar",
    "industry_commerce_and_business": "Industria y comercio",
    "kitchen_dining_laundry_garden_furniture": "Cocina, comedor y lavandería",
    "la_cuisine": "La cocina",
    "luggage_accessories": "Equipaje y accesorios",
    "market_place": "Marketplace",
    "music": "Música",
    "musical_instruments": "Instrumentos musicales",
    "office_furniture": "Muebles de oficina",
    "party_supplies": "Artículos de fiesta",
    "pc_gamer": "PC Gamer",
    "perfumery": "Perfumería",
    "pet_shop": "Mascotas",
    "portateis_cozinha_e_preparadores_de_alimentos": "Cocina · preparadores de alimentos",
    "security_and_services": "Seguridad y servicios",
    "signaling_and_security": "Señalización y seguridad",
    "small_appliances": "Pequeños electrodomésticos",
    "small_appliances_home_oven_and_coffee": "Hornos y cafeteras",
    "sports_leisure": "Deportes y ocio",
    "stationery": "Papelería",
    "tablets_printing_image": "Tablets, impresión e imagen",
    "telephony": "Telefonía",
    "toys": "Juguetes",
    "watches_gifts": "Relojes y regalos",
}

TIPOS_PAGO_ES = {
    "credit_card": "Tarjeta de crédito",
    "boleto": "Boleto bancario",
    "voucher": "Voucher",
    "debit_card": "Tarjeta de débito",
    "not_defined": "No definido",
}
