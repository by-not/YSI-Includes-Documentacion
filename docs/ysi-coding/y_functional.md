# y_functional: Programación Funcional y Lambdas

Pawn es un lenguaje procedimental e imperativo tradicionalmente enfocado en la manipulación directa de memoria y bucles `for` explícitos. No obstante, transformar, filtrar y acumular datos en arrays o colecciones mediante bucles tradicionales suele derivar en código extenso, propenso a errores en los índices (*off-by-one errors*) y difícil de abstraer.

El módulo `y_functional` de la suite YSI introduce los conceptos esenciales de la **programación funcional** en Pawn:
* **Funciones Lambda anónimas:** Expresiones concisas evaluadas al vuelo mediante la sintaxis `{ ... }` con parámetros implícitos (`_0`, `_1`).
* **Operaciones de alto nivel sobre arrays:** Transformación (`Map`), reducción (`Fold`), filtrado (`Filter`), escaneo acumulativo (`Scan`) y combinación de colecciones (`ZipWith`).
* **Abstracción matemática y lógica:** Utilidades como `Sum`, `Product`, `Any` y `All`.
* **Paso flexible de funciones:** Soporte indistinto para expresiones lambda, funciones `stock`, funciones públicas (`public`) y funciones `inline`.

---

## Cómo incluir el módulo

Para utilizar herramientas funcionales:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_functional>
```

---

## Resumen de Funciones y Operaciones

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`{ ... }` (Lambdas)](#sintaxis-de-lambdas) | Expresión anónima | Define una función matemática o lógica en línea con parámetros implícitos `_0`, `_1`. |
| [`Map`](#map) | Función funcional | Transforma cada elemento de un array según una función y guarda el resultado en otro array. |
| [`Map_`](#map_) | Función funcional | Itera sobre cada elemento ejecutando una acción sin almacenar valor de retorno (efectos secundarios). |
| [`MapIdx` y `MapIdx_`](#mapidx-y-mapidx_) | Función funcional | Versión de `Map` que proporciona tanto el índice actual como el valor del elemento. |
| [`Filter`](#filter) | Función funcional | Selecciona únicamente los elementos que satisfacen un predicado booleano y los copia a un array destino. |
| [`FoldL` y `FoldR`](#foldl-y-foldr) | Función funcional | Reduce una colección completa a un único valor acumulado (evaluando por izquierda o derecha). |
| [`Scan`](#scan) | Función funcional | Produce un array con el historial acumulativo paso a paso de una reducción (`Fold`). |
| [`ZipWith`](#zipwith) | Función funcional | Combina dos arrays de entrada aplicando una función binaria `{ _0 + _1 }` en cada par. |
| [`Sum` y `Product`](#utilidades-matematicas-sum-product-any-all) | Funciones de agregación | Suman o multiplican todos los elementos de un array en una sola llamada. |
| [`Any` y `All`](#utilidades-matematicas-sum-product-any-all) | Funciones lógicas | Evalúan si alguno o todos los elementos de un array son evaluados como verdaderos. |

---

## Sintaxis de Lambdas en Pawn

Una **lambda** es una pequeña función anónima declarada directamente en el lugar donde se requiere. En `y_functional`, las lambdas se declaran encerrando la expresión entre llaves `{ ... }`.

A diferencia de otros lenguajes donde se declaran nombres de parámetros explícitos (como `(x, y) => x + y`), en `y_functional` los argumentos son **implícitos** y se denominan por su orden ordinal:
* `_0`: Primer argumento (generalmente el valor actual del elemento o el acumulador).
* `_1`: Segundo argumento (siguiente elemento, valor en operaciones binarias o índice).

### Ejemplos de expresiones lambda:
```pawn
{ _0 + 10 }          // Suma 10 al elemento recibido
{ _0 * 2 }           // Duplica el valor
{ _0 > 0 }           // Predicado booleano: ¿es positivo?
{ _0 + _1 }          // Suma dos argumentos (usado en Fold y ZipWith)
{ printf("%d", _0) } // Ejecuta una acción de impresión
```

---

## Compatibilidad de Paso de Funciones

Gracias a la infraestructura de indirección de YSI, cualquier función de `y_functional` acepta múltiples formas de invocación de manera intercambiable:

```pawn
// 1. Con una lambda anónima (forma más rápida y compacta):
Map({ _0 * 2 }, origen, destino);

// 2. Con una función stock existente usando el operador de dirección &:
stock Duplicar(valor) return valor * 2;
Map(&Duplicar, origen, destino);

// 3. Con una función pública usando 'using public':
public Multiplicar(valor) return valor * 2;
Map(using public Multiplicar, origen, destino);

// 4. Con una función inline de y_inline:
inline Multiplicador(valor) return valor * factorGlobal;
Map(using inline Multiplicador, origen, destino);
```

---

## Funciones Principales de Transformación

### Map

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Recorre todos los elementos del array de origen (`src`), evalúa la función o lambda para cada celda y guarda el resultado resultante en el array de destino (`dst`).
- **Sintaxis:**
```pawn
Map(funcion_o_lambda, const src[], dst[], size = sizeof(src));
```
- **Parámetros:**
  - `funcion_o_lambda`: Expresión lambda o puntero a función que toma 1 argumento (`_0`).
  - `src[]`: Array de entrada con los datos originales.
  - `dst[]`: Array de salida donde se escribirán los valores procesados.
  - `size`: Cantidad de celdas a procesar (por defecto `sizeof(src)`).
- **Ejemplo práctico:**
```pawn
new sueldosBase[5] = { 1000, 1500, 2000, 1200, 3000 };
new sueldosConBono[5];

// Aumentar un 10% a cada sueldo
Map({ floatround(_0 * 1.10) }, sueldosBase, sueldosConBono);

// También es válido mutar el array original pasando el mismo origen y destino:
Map({ _0 + 50 }, sueldosBase, sueldosBase);
```

---

### Map_

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Variante de `Map` que no almacena ningún resultado de retorno. Se utiliza para iterar sobre un array produciendo efectos secundarios (como imprimir en consola, enviar paquetes de red o emitir sonidos).
- **Sintaxis:**
```pawn
Map_(funcion_o_lambda, const src[], size = sizeof(src));
```
- **Ejemplo práctico:**
```pawn
new playerList[3] = { 12, 45, 78 };

// Enviar un mensaje de alerta a todos los IDs contenidos en la lista
Map_({ SendClientMessage(_0, 0xFF0000FF, "¡Alerta general del servidor!") }, playerList);
```

---

### MapIdx y MapIdx_

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Permite acceder simultáneamente tanto a la **posición / índice** en el array como al **valor** almacenado. En la lambda, `_0` representa el índice actual (0, 1, 2, ...) y `_1` representa el contenido de la celda.
- **Sintaxis:**
```pawn
MapIdx(funcion_o_lambda, const src[], dst[], size = sizeof(src));
MapIdx_(funcion_o_lambda, const src[], size = sizeof(src));
```
- **Ejemplo práctico:**
```pawn
new puntajes[4] = { 100, 250, 400, 850 };

// Imprimir el puesto y los puntos correspondientes
MapIdx_({ printf("Posición #%d: %d puntos", _0 + 1, _1) }, puntajes);
```

---

### Filter

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Evalúa cada elemento del array contra un predicado lógico o función que devuelve un booleano. Todos los elementos que devuelvan verdadero (`true` o distinto de cero) se copian de forma compactada al array de destino.
- **Sintaxis:**
```pawn
new cantidad = Filter(predicado_lambda, const src[], dst[], size = sizeof(src));
```
- **Parámetros:**
  - `predicado_lambda`: Lambda que evalúa `_0` y devuelve un valor booleano.
  - `src[]`: Array original de entrada.
  - `dst[]`: Array destino que recibirá los elementos filtrados.
  - `size`: Longitud del array de entrada.
- **Retorno:** Retorna un entero con la cantidad exacta de elementos que cumplieron la condición y fueron copiados en `dst`.
- **Ejemplo práctico:**
```pawn
new ids[6] = { 0, 5, 12, 19, 24, 99 };
new conectados[6];

// Filtrar únicamente los jugadores que están actualmente online
new totalConectados = Filter({ IsPlayerConnected(_0) }, ids, conectados);

printf("Se encontraron %d jugadores conectados en la lista.", totalConectados);
```

---

### FoldL y FoldR

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior (Reduce / Acumulador)
- **Descripción:** Reduce una colección de elementos a un único valor final aplicando sucesivamente una función binaria. `FoldL` evalúa de izquierda a derecha; `FoldR` evalúa de derecha a izquierda.
- **Sintaxis:**
```pawn
new resultado = FoldL(funcion_binaria, initial_value, const src[], size = sizeof(src));
```
- **Variables en la lambda:**
  - `_0`: El acumulador que contiene el resultado acumulado hasta el momento.
  - `_1`: El valor del elemento actual que se está procesando.
- **Ejemplo práctico:**
```pawn
new precios[4] = { 25, 40, 15, 20 };

// Suma acumulativa con valor inicial 0: (((0 + 25) + 40) + 15) + 20
new costoTotal = FoldL({ _0 + _1 }, 0, precios);
printf("Costo total de la compra: $%d", costoTotal);

// Productorio (multiplicación acumulativa) con valor inicial 1:
new factores[3] = { 2, 3, 4 };
new producto = FoldL({ _0 * _1 }, 1, factores); // 24
```

---

### Scan

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Similar a `FoldL`, pero en lugar de devolver solo el total acumulado final, genera un nuevo array que contiene **todos los resultados intermedios** de la acumulación. El array destino debe tener un tamaño de `sizeof(src) + 1`.
- **Sintaxis:**
```pawn
Scan(funcion_binaria, initial_value, const src[], dst[], size = sizeof(src));
```
- **Ejemplo práctico:**
```pawn
new pasos[4] = { 10, 20, 30, 40 };
new trayectoria[5]; // tamaño sizeof(pasos) + 1

// Guarda la trayectoria acumulada: 0, 10, 30, 60, 100
Scan({ _0 + _1 }, 0, pasos, trayectoria);
```

---

### ZipWith

- **Módulo requerido:** `#include <YSI_Coding\y_functional>`
- **Tipo:** Función de orden superior
- **Descripción:** Toma dos arrays de entrada (`src1` y `src2`), los recorre en paralelo emparejando sus elementos por índice y aplica una función binaria `{ _0 y _1 }`, guardando el resultado en `dst`.
- **Sintaxis:**
```pawn
ZipWith(funcion_binaria, const src1[], const src2[], dst[], size = sizeof(src1));
```
- **Ejemplo práctico:**
```pawn
new coordenadasX_Origen[3]  = { 100, 200, 300 };
new coordenadasX_Destino[3] = { 120, 180, 350 };
new diferenciasX[3];

// Calcula la diferencia relativa en cada eje: dst[i] = src2[i] - src1[i]
ZipWith({ _1 - _0 }, coordenadasX_Origen, coordenadasX_Destino, diferenciasX);
```

---

## Utilidades Matemáticas: Sum, Product, Any, All

`y_functional` incluye abreviaciones integradas para operaciones recurrentes sobre arrays enteros:

```pawn
#include <open.mp>
#include <YSI_Coding\y_functional>

new datos[5] = { 10, 20, 30, 40, 50 };

// Suma total directa
new total = Sum(datos); // 150

// Multiplicación directa
new multi = Product(datos);

// Comprobaciones lógicas booleanas
new flags[4] = { 1, 0, 1, 1 };
if (Any(flags))
{
    // Al menos un elemento es verdadero (distinto de 0)
}

if (All(flags))
{
    // Todos los elementos son verdaderos
}
```

---

## Ejemplo Completo para SA-MP / open.mp

Cálculo de distancias geométricas 3D y análisis de inventario usando pipelines funcionales limpios:

```pawn
#include <open.mp>
#include <YSI_Coding\y_functional>
#include <YSI_Coding\y_va>

// Calcula la distancia euclidiana 3D entre dos puntos vectoriales
Float:CalcularDistancia3D(const Float:puntoA[3], const Float:puntoB[3])
{
    new Float:delta[3];
    
    // 1. Obtener la diferencia en cada componente (B - A)
    ZipWith({ _1 - _0 }, puntoA, puntoB, delta);

    // 2. Elevar cada componente al cuadrado (delta^2)
    Map({ _0 * _0 }, delta, delta);

    // 3. Sumar las componentes cuadráticas y aplicar raíz cuadrada
    new Float:sumaCuadrados = Sum(delta);
    return floatsqroot(sumaCuadrados);
}

CMD:sanitizar(playerid, params[])
{
    new puntajes[8] = { -15, 45, 0, -8, 120, 55, -2, 90 };
    new positivos[8];

    // Filtramos solo los valores positivos válidos
    new totalValidos = Filter({ _0 > 0 }, puntajes, positivos);

    // Obtenemos el promedio funcional usando FoldL
    new sumaTotal = FoldL({ _0 + _1 }, 0, positivos, totalValidos);
    new promedio = (totalValidos > 0) ? (sumaTotal / totalValidos) : 0;

    va_SendClientMessage(playerid, 0x00FF00AA, "[ANALISIS] Elementos validos: %d | Suma: %d | Promedio: %d", 
        totalValidos, sumaTotal, promedio);
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

1. **Orden de argumentos en `FoldL` vs `FoldR`:**  
   En operaciones no conmutativas (como la división o la resta), el orden de evaluación afecta radicalmente el resultado:
   - `FoldL({ _0 / _1 }, 1000, array)` evalúa `((1000 / a) / b) / c`.
   - `FoldR({ _0 / _1 }, 1000, array)` evalúa `a / (b / (c / 1000))`.
   Asegúrate de seleccionar la dirección correcta según la fórmula deseada.

2. **Tamaño del array en `Scan`:**  
   El array receptor de `Scan` almacena el valor inicial más todos los elementos sucesivos. Por lo tanto, su dimensión debe ser estrictamente al menos `sizeof(origen) + 1`.

3. **Confundir los parámetros implícitos:**  
   Recuerda siempre la convención:
   - En `Map`: `_0` es el valor de la celda.
   - En `MapIdx`: `_0` es el índice de la celda, y `_1` es el valor.
   - En `Fold`: `_0` es el acumulador, y `_1` es el valor de la celda.
   - En `ZipWith`: `_0` es la celda del primer array, y `_1` es la celda del segundo array.
