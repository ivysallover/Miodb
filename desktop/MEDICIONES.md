# Cuánto acierta MIO

Medido con datos que el motor no vio. Para repetirlo: `cargo test --release --test <prueba> -- --nocapture` en `desktop/engine`.

## Valores raros (`valores_raros.rs`, `mercado_litoral.rs`)

| Planilla | Encuentra | De lo que marca, son errores |
|---|---|---|
| 16 planillas de ventas limpias (6.000 filas, inflación, productos caros y baratos) | — | marca 0 filas en todas |
| Ventas con 100 errores sembrados (×10, ×100, cantidad 500, cero, negativo, subtotal mal tipeado) | 100 de 100 | 100 % |
| La misma, sin subtotal (ninguna cuenta que revisar) | 85 de 85 | 100 % |
| Mercado Litoral (1,16 M filas, 18 CSV) | negativos 3.452/3.455, ceros 2.303/2.303, ×100 566/574, extremos 459/459 | 99,2 % |

Antes de noviembre de 2026 marcaba siempre entre 8 y 40 filas: 29 falsos avisos en una planilla limpia, y en la sembrada encontraba 54 de 100 con 69 % de acierto.

## MIO Predict (`mio_predict_real.rs`)

Ventas de Walmart (M5): 114 series sumadas (total, estados, tiendas, categorías, departamentos) y 200 productos sueltos.
Se esconde el final, se predice como en la app y se compara con lo que pasó. Error = WAPE, mediana entre series.

| Caso | Predice | Error | Repetir lo último | Le gana a repetir | Lo real cae en la franja | Sesgo |
|---|---|---|---|---|---|---|
| Meses · sumadas | 91 % | 6,6 % | 7,6 % | 77 % | 82 % | −2,0 % |
| Semanas · sumadas | 99 % | 9,1 % | 8,0 % | 36 % | 80 % | −2,4 % |
| Días · sumadas | 100 % | 10,5 % | 26,4 % | 95 % | 90 % | +0,1 % |
| Meses · productos | 62 % | 52,4 % | 48,0 % | 44 % | 83 % | +8,8 % |
| Semanas · productos | 80 % | 62,2 % | 59,3 % | 40 % | 82 % | −13,6 % |
| Días · productos | 60 % | 99,0 % | 100 % | 53 % | 90 % | −2,4 % |

Por confianza que muestra la app: Alta 8,7 % de error, Media 25,9 %, Precaución 73,1 %.

Lo que dice:
- La franja es honesta: lo real cae adentro 8 a 9 de cada 10 veces.
- No tiene sesgo en lo sumado: no se pasa ni se queda corto.
- La confianza que muestra acompaña lo que pasa.
- Con semanas, casi siempre muestra una predicción que no le gana a repetir lo último: el control acepta hasta un 25 % peor (`BASELINE_SLACK`).
- Con productos sueltos (ventas de a poco, días en cero) se equivoca alrededor del 50 %: tiene que decir que es solo una referencia.
- La predicción es del promedio por fila en cada período (como la web), no del total vendido.
