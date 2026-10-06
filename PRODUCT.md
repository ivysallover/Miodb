# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary (confirmed): dueño/a de una pyme sin equipo de datos (comercio, retail, servicios) que tiene sus ventas en Excel/CSV y decide a ojo. Secundarios (confirmados como objetivo): empresas chicas en general y usuarios particulares/emprendedores con sus propios datos. Habla español rioplatense; no sabe de ML y no quiere aprenderlo.

## Product Purpose
MIO convierte planillas (Excel/CSV) en diagnósticos: detecta anomalías (Isolation Forest), compite modelos de predicción (Prophet/ARIMA/boosting), explica el resultado con SHAP y ofrece un copiloto de chat sobre los datos. Éxito: que alguien suba su planilla y entienda qué pasa y qué hacer, sin escribir código.

## Positioning
Un diagnóstico explicado, no un dashboard genérico: muestra qué modelo ganó, con qué error, contra qué línea base, y por qué (SHAP). Mascota/guía (MIO bot, Espécimen 01) y consola MIO-DEV como carácter de marca. Fundado en Rosario, Argentina, por Tadeo Muñoz Garcés y Milena Abraham.

## Capabilities and Constraints
- Acción principal de la landing (confirmada): probar con la propia planilla, sin registro previo.
- Precios/planes: NO definidos. No inventar precios ni planes.
- Backend FastAPI (`dashboard-ia/backend/`) solo lectura. Auth con Firebase (Google).
- Fuentes de marca fijas: Climate Crisis, Wellfleet, Plus Jakarta Sans, JetBrains Mono.

## Brand Commitments
Violeta #7647eb, obsidiana #0b0914, página #f3f3f5, lima #bdf559 solo como chispa. Radio único 16 px. Voseo, directo, sin relleno corporativo ni promesas vagas. El MIO bot no se rediseña.

## Evidence on Hand
Benchmark propio sobre un dataset de ventas retail (138.116 transacciones, 2021-2025): sMAPE 13,5 % vs 17,0 % de la línea base ingenua, 108 anomalías, horizonte 14 días, backtesting de origen móvil (`scripts/benchmark_retail.py`, `public/data/benchmark_results.json`). Faltan: testimonios, clientes, logos, precios, URLs reales de LinkedIn y GitHub. No fabricarlos.

## Product Principles
1. La prueba es la demostración: la landing lleva a subir una planilla propia.
2. Lenguaje de negocio primero; la jerga técnica (sMAPE, SHAP) va como respaldo, nunca como titular.
3. Toda cifra debe ser verificable o estar rotulada como demostración.
4. El tono es de oficio y cercanía, no de startup de hype.

## Accessibility & Inclusion
Respetar prefers-reduced-motion; contraste AA (el lima no se usa como texto sobre claro); mobile completo, no solo desktop.
