# Avance 1 — Big Data Analysis

Proyecto de consultoría analítica sobre el dataset Olist Brazilian E-Commerce.

## Contenido

- `main.tex` — documento principal del avance
- `figuras/modelo_fisico.tex` — código fuente del diagrama del modelo físico (TikZ standalone)
- `figuras/modelo_fisico.pdf` — diagrama del modelo físico ya compilado

## Estructura del documento

1. Introducción
2. KPIs del proyecto (agrupados por cada uno de los 5 problemas de negocio)
3. Modelo conceptual (diagrama TikZ)
4. Modelo lógico — estrella (diagrama TikZ)
5. Modelo físico — DDL completo para SQL Server (diagrama PDF + código SQL)
6. Próximos pasos

## Requisitos

Distribución de LaTeX con los siguientes paquetes (vienen en TeX Live completo
o MiKTeX):

- `babel` con soporte español (`babel-spanish` / `texlive-lang-spanish`)
- `amsmath`, `helvet`, `microtype`
- `tikz` con librerías `positioning`, `shapes.geometric`, `arrows.meta`,
  `fit`, `backgrounds`, `shapes.multipart`
- `xcolor`, `hyperref`, `booktabs`, `tabularx`, `enumitem`, `listings`,
  `caption`, `titlesec`, `float`

## Cómo compilar

### Opción A — Compilación completa (recomendada)

Desde la carpeta raíz del proyecto:

```bash
# 1. Primero compilamos el diagrama del modelo físico (si se quiere regenerar)
cd figuras
pdflatex modelo_fisico.tex
cd ..

# 2. Compilamos el documento principal (dos veces para resolver referencias)
pdflatex main.tex
pdflatex main.tex
```

El resultado final es `main.pdf`.

### Opción B — Compilación rápida

Si el PDF del diagrama físico ya existe en `figuras/modelo_fisico.pdf`
(que es el caso por defecto), basta con compilar el documento principal:

```bash
pdflatex main.tex
pdflatex main.tex
```

### Opción C — Overleaf

Subir todo el contenido (incluyendo la carpeta `figuras/`) y compilar
`main.tex` con `pdfLaTeX`.

## Notas

- Se usa `pdflatex` (no `xelatex` ni `lualatex`) porque es el compilador más
  universal y suficiente para este documento.
- El diagrama físico está precompilado en `figuras/modelo_fisico.pdf` para
  evitar tener que compilar dos documentos separados en cada iteración.
