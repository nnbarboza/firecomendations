# BROmendations 🎬📚🎧📺

App familiar de recomendaciones culturales (películas, series, música, libros).

## 🚀 Estado actual: Fase 1 — Esqueleto navegable

Esta versión tiene la estructura visual y de navegación lista, con datos de prueba (mock). Aún no se conecta con Google Sheets ni con OpenAI — eso viene en Fase 2 y 3.

## 📁 Estructura

```
/
├── index.html          # App completa (HTML + CSS + JS inline)
├── manifest.json       # Configuración PWA
├── img/                # (crear esta carpeta)
│   ├── icon-192.png    # (pendiente)
│   ├── icon-512.png    # (pendiente)
│   └── avatars/        # (pendiente)
└── README.md
```

## 🔗 URLs de uso

Una vez deployado en GitHub Pages:

- **URL base** (con selector de usuario): `https://nnbarboza.github.io/bromendations/`
- **URL personal de cada familiar**:
  - `https://nnbarboza.github.io/bromendations/#/u/nico`
  - `https://nnbarboza.github.io/bromendations/#/u/andres`
  - `https://nnbarboza.github.io/bromendations/#/u/juampa`
  - `https://nnbarboza.github.io/bromendations/#/u/seba`
  - `https://nnbarboza.github.io/bromendations/#/u/pao`
  - `https://nnbarboza.github.io/bromendations/#/u/papi`

## 📋 Cómo subirlo a GitHub Pages

1. Sube `index.html`, `manifest.json` y `README.md` a la raíz de tu repo `bromendations`.
2. Ve a **Settings → Pages**.
3. En "Source", selecciona la rama `main` (o `master`) y carpeta `/ (root)`.
4. Guarda. En 1-2 minutos estará disponible en `https://nnbarboza.github.io/bromendations/`.

## ✅ Qué probar en la Fase 1

- [ ] Abrir la URL base → ver el selector de usuario y elegir uno
- [ ] Abrir directamente `#/u/nico` → entrar como Nico sin selector
- [ ] Tocar las 4 tarjetas de categoría → ver listado mock
- [ ] Navegar a "Mi biblioteca", "Recomendar", "Bromendators", "Mi perfil"
- [ ] Probar en móvil: iPhone Safari y Android Chrome
- [ ] Añadir a pantalla de inicio en iPhone (botón compartir → "Añadir a inicio")

## ⏭️ Próximas fases

- **Fase 2**: Conectar Google Sheets + Apps Script (lectura/escritura real)
- **Fase 3**: Enriquecimiento automático con OpenAI
- **Fase 4**: Pulido visual (imágenes 3D reales, avatares, animaciones)
- **Fase 5**: Panel admin + backup descargable

## 🎨 Sistema de diseño

- **Tipografías**: Playfair Display (titulares) + Inter (cuerpo)
- **Paleta**:
  - Películas: `#FF8A80`
  - Series: `#6BA4FF`
  - Música: `#B99AE6`
  - Libros: `#FFC857`
  - Acción: `#2E8B6C`
- **Sistema 8pt**, radio 20px, sombras suaves
