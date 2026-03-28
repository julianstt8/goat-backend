# Carpeta de datos CSV para migración

Coloca aquí los archivos exportados desde Excel/Google Sheets antes de ejecutar:

```bash
npm run seed:csv
```

## Archivos esperados

### `VENTAS.csv` — Historial de pedidos
| Columna | Descripción | Ejemplo |
|---|---|---|
| fecha_compra | Fecha del pedido | 15/03/2025 |
| referencia | Nombre del producto | Jordan 1 Retro US10 |
| tracking_number | Número de tracking | 1Z999AA10123456784 |
| talla | Talla del producto | US10 |
| valor_original_usd | Precio en USD | 150.00 |
| precio_total_cop | Precio final COP | 980000 |
| estado_logistico | Estado del envío | ENTREGADO |
| ganancia_cop | Ganancia en COP | 120000 |
| nombre_cliente | Nombre del cliente | María García |
| telefono | Teléfono | +573001234567 |
| email | Email (opcional) | maria@email.com |
| Anticipo | Primer pago | 500000 |
| Abono_1 | Segundo pago | 300000 |
| Abono_2 | Tercer pago | 180000 |

### `STOCK.csv` — Inventario
| Columna | Descripción | Ejemplo |
|---|---|---|
| articulo | Nombre del producto | Nike Air Max 90 |
| talla | Talla | US11 |
| costo_compra_usd | Precio de compra USD | 120.00 |
| categoria | Tipo | Sneakers |
| en_stock | Disponible | true |
| vendido | Ya vendido | false |

### `Gastos-YYYY-MM.csv` — Gastos operativos
| Columna | Descripción | Ejemplo |
|---|---|---|
| descripcion | Qué fue | Pauta Instagram |
| monto_cop | Valor en COP | 150000 |
| categoria | Tipo | Marketing |
| fecha | Cuándo | 01/03/2025 |

## Notas
- Los archivos pueden usar `,` o `;` como separador
- Se acepta el BOM de Excel UTF-8
- Los montos pueden estar en formato `1.234,50` (europeo) o `1,234.50` (americano)
- El script detecta el nombre de las columnas de forma flexible
