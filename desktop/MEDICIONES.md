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
Se esconde el final, se predice como en la app y se compara con lo que pasó. Error = WAPE (error sobre el total), mediana entre series.
«Para quien la usa» es el error si se sigue a MIO y, cuando MIO no predice, se repite lo último: la medida que importa.

| Caso | Para quien la usa (antes → ahora) | Predice | Error | Repetir lo último | Le gana a repetir | Lo real cae en la franja | Sesgo |
|---|---|---|---|---|---|---|---|
| Meses · sumadas | 6,6 → 6,9 % | 68 % | 6,4 % | 8,3 % | 85 % | 84 % | −2,0 % |
| Semanas · sumadas | 9,2 → 8,1 % | 89 % | 8,1 % | 8,0 % | 46 % | 82 % | −1,4 % |
| Días · sumadas | 10,5 → 10,8 % | 90 % | 10,4 % | 26,2 % | 95 % | 89 % | +0,4 % |
| Meses · productos | 50,4 → 48,1 % | 44 % | 48,3 % | 45,5 % | 45 % | 79 % | +8,2 % |
| Semanas · productos | 67,0 → 64,6 % | 68 % | 67,0 % | 65,4 % | 46 % | 80 % | −1,2 % |
| Días · productos | 100 → 100 % | 40 % | 90,6 % | 100 % | 62 % | 88 % | −3,2 % |

Qué cambió en noviembre de 2026 (`Rules::MIO` en `forecast.rs`; `Rules::PYTHON` es la de la web):
- Lo vendido se proyecta como **total por período** (antes, promedio por fila). Un precio, un porcentaje o un saldo se siguen promediando.
- El error es sobre el total: el MAPE se disparaba con períodos casi en cero y premiaba predecir cero.
- **Solo se muestra una predicción que le gana a lo obvio** (repetir lo último, el promedio o la temporada anterior); antes se aceptaba hasta un 25 % peor.
- También compite el promedio de los 3 mejores modelos.
- Con «Precaución», la pantalla dice que es solo una referencia y cuánto se equivocó; ya no dice «acertó N de cada 10» (era 100 menos el error).

Lo que dice:
- La franja es honesta: lo real cae adentro 8 a 9 de cada 10 veces. No tiene sesgo en lo sumado.
- Con semanas, los modelos apenas igualan a repetir la semana anterior: en ventas estables, lo obvio es difícil de mejorar.
- Con productos sueltos se equivoca alrededor del 50 %: va con «Precaución» o no se muestra.
- Mercado Litoral (por semana, total): erra 6,1 % contra 11,5 % de lo obvio.
- Las ventas del ejemplo de la app son ruido (30 % de variación semanal sin patrón): no se muestra predicción y se dice por qué.
