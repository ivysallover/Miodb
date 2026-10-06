# Curvas de nivel — filosofía algorítmica

**Movimiento: Relieve de datos.** Una planilla es un territorio: los números altos y bajos forman montañas y valles que nadie ve porque están en filas. La textura de MIO dibuja ese territorio.

**Proceso.** Un terreno de ruido fractal, doblado dos veces sobre sí mismo (domain warping) hasta que los pliegues parecen cauces de río. De ese relieve se leen isolíneas cada 1/9 de altura; esas líneas son la tinta. Bajo ellas, una niebla muy tenue sigue la misma altura. Todo pasa por una matriz Bayer 8×8 y sale en la rampa violeta de la marca, sin gradientes suaves: solo puntos.

**Semilla.** Cada `seed` produce un territorio distinto y reproducible. La Prueba y el CTA usan semillas distintas para que no se repitan.

**Oficio.** Los parámetros (escala 3,2, intensidad de doblez 2,2, 9 bandas, grosor de línea 0,06) se afinaron a ojo hasta que la textura quedara en segundo plano: relieve que acompaña al texto sin competir con él.

Implementación: `texture` en `src/components/ui/DitherArt.tsx`. El visor p5.js del skill no se usó: la textura corre sobre canvas 2D, una sola vez, sin librerías.
