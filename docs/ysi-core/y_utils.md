# y_utils (Funciones Utilitarias Esenciales)

`y_utils` es la biblioteca fundacional de utilidades del framework YSI. Provee un conjunto integral de macros matemáticas de alto rendimiento (muchas de ellas implementadas a nivel de bytecode con instrucciones `#emit` o trucos sin bifurcaciones *branchless*), herramientas robustas de manipulación de cadenas de texto (compatibles de forma transparente con cadenas estándar empaquetadas *packed* y no empaquetadas *unpacked*), comprobaciones seguras de rangos de memoria y funciones de conversión numérica avanzada.

---

## Introducción

En el desarrollo tradicional de SA-MP mediante Pawn estándar, operaciones cotidianas como validar si un string está vacío, comprobar si un número cae dentro de un rango cerrado o abierto, redondear divisiones enteras hacia arriba o transformar números hexadecimales suelen resolverse mediante código repetitivo, ineficiente o propenso a errores de límites y desbordamientos (*buffer overflows*).

`y_utils` soluciona estos problemas ofreciendo:
1. **Rendimiento extremo:** Emplea operaciones a nivel de bits (*bitwise*) e instrucciones nativas de máquina virtual AMX (`SHR`, `SHL`, `SMUL`, `LOAD.U.alt`, `SUB.alt`) para calcular valores absolutos, paridades y comparaciones de rangos en un ciclo mínimo de CPU.
2. **Compatibilidad total con Packed Strings:** Funciones como `StrToLower`, `Strip`, `IsNumeric` e `IsNull` detectan automáticamente en tiempo de ejecución si la cadena utiliza direccionamiento por celdas (`str[i]`) o por bytes (`str{i}`).
3. **Seguridad frente a límites de tipos:** Manejo formal de desbordamientos con `cellmin` y constantes precisas de punto flotante IEEE 754 (`FLOAT_NAN`, `FLOAT_INFINITY`).

### Inclusión en el proyecto

Para utilizar todas las macros y funciones utilitarias en tu gamemode o filterscript:

```pawn
#include <openmultiplayer> // o <a_samp>
#include <YSI_Core\y_utils>
```

## Tabla de Contenido

1. [Macros Matemáticas y de Rango](#macros-matematicas-y-de-rango)
   - [IS_IN_RANGE](#is_in_range)
   - [NOT_IN_RANGE](#not_in_range)
   - [UCMP](#ucmp)
   - [Abs](#abs)
   - [FloatAbs](#floatabs)
   - [min, max y clamp](#min-max-y-clamp)
   - [ceildiv](#ceildiv)
   - [floordiv](#floordiv)
   - [IsOdd e IsEven](#isodd-e-iseven)
   - [IsNaN](#isnan)
   - [Sum, Mean, Median, Mode, Range](#sum-mean-median-mode-range)
2. [Manipulación y Validación de Strings](#manipulacion-y-validacion-de-strings)
   - [IsNull (isnull)](#isnull-isnull)
   - [StrCpy (strcpy)](#strcpy-strcpy)
   - [StrToLower y StrToUpper](#strtolower-y-strtoupper)
   - [Strip, StripL y StripR (StripNL)](#strip-stripl-y-stripr-stripnl)
   - [EndOfLine](#endofline)
3. [Conversión y Parseo de Datos](#conversion-y-parseo-de-datos)
   - [IsNumeric (isnumeric)](#isnumeric-isnumeric)
   - [IsHex](#ishex)
   - [HexStr](#hexstr)
   - [BinStr](#binstr)
   - [BoolStr](#boolstr)
4. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Macros Matemáticas y de Rango

### IS_IN_RANGE

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Evalúa si un valor numérico entero o sin signo se encuentra estrictamente dentro del rango semiabierto $[lower, upper)$, es decir, equivalente lógico a: `lower <= value < upper`. Utiliza aritmética modular con `cellmin` para garantizar que la comprobación se realice en una sola operación de comparación, eliminando saltos condicionales redundantes.

#### Sintaxis
```pawn
IS_IN_RANGE(value, lower, upper)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `value` | Entero (`_`) | Valor que se desea verificar. |
| `lower` | Entero (`_`) | Límite inferior inclusivo ($lower$). |
| `upper` | Entero (`_`) | Límite superior exclusivo ($upper$). |

#### Retorno
Devuelve `true` si el valor cumple `lower <= value < upper`; `false` en caso contrario.

#### Ejemplo Práctico
```pawn
#include <openmultiplayer>
#include <YSI_Core\y_utils>

public OnPlayerSpawn(playerid)
{
    // Validar si la skin está en el rango legal de IDs de SA-MP (0 a 311)
    new skin = GetPlayerSkin(playerid);
    if (!IS_IN_RANGE(skin, 0, 312))
    {
        SendClientMessage(playerid, 0xFF0000FF, "Error: Tu ID de skin es inválido.");
        SetPlayerSkin(playerid, 0);
    }
    return 1;
}
```

> [!NOTE]
> Al ser el límite superior exclusivo, para verificar un ID de jugador válido (0 a `MAX_PLAYERS - 1`) se escribe: `IS_IN_RANGE(playerid, 0, MAX_PLAYERS)`.

---

### NOT_IN_RANGE

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Es la negación complementaria directa de `IS_IN_RANGE`. Determina si un valor está por fuera del intervalo $[lower, upper)$.

#### Sintaxis
```pawn
NOT_IN_RANGE(value, lower, upper)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `value` | Entero (`_`) | Valor a evaluar. |
| `lower` | Entero (`_`) | Límite inferior inclusivo. |
| `upper` | Entero (`_`) | Límite superior exclusivo. |

#### Retorno
Devuelve `true` si el valor es estrictamente menor que `lower` o mayor o igual que `upper`.

#### Ejemplo Práctico
```pawn
public OnPlayerInteriorChange(playerid, newinteriorid, oldinteriorid)
{
    // Los interiores de GTA SA van de 0 a 18
    if (NOT_IN_RANGE(newinteriorid, 0, 19))
    {
        printf("[SEGURIDAD] Jugador %d intentó ingresar a un interior corrupto: %d", playerid, newinteriorid);
        SetPlayerInterior(playerid, 0);
    }
    return 1;
}
```

---

### UCMP

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Realiza una comparación no signada (*Unsigned Comparison*) para verificar si un valor está entre `0` (inclusivo) y `upper` (exclusivo). Es un atajo altamente eficiente para `IS_IN_RANGE(value, 0, upper)`.

#### Sintaxis
```pawn
UCMP(value, upper)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `value` | Entero (`_`) | Valor a comprobar si es no negativo y menor que el límite. |
| `upper` | Entero (`_`) | Límite superior exclusivo. |

#### Retorno
`true` si $0 \le value < upper$; `false` si es negativo o $\ge upper$.

#### Ejemplo Práctico
```pawn
// Validación instantánea de slots de inventario (0 a 19)
stock IsValidInventorySlot(slotid)
{
    return UCMP(slotid, 20);
}
```

---

### Abs

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro / Función stock con optimización `#emit`
- **Descripción:** Obtiene el valor absoluto de un número entero sin incurrir en bifurcaciones condicionales lentas (`if (x < 0)`). Cuando el compilador soporta `#emit`, genera instrucciones directas de desplazamiento de bits y sustracción (`x - (x >>> 31 << 1) * x`).

#### Sintaxis
```pawn
Abs(number)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `number` | Entero (`_`) | Número entero del cual se desea obtener el valor positivo. |

#### Retorno
El valor numérico en su magnitud absoluta positiva.

#### Ejemplo Práctico
```pawn
stock DistanciaManhattan(x1, y1, x2, y2)
{
    return Abs(x1 - x2) + Abs(y1 - y2);
}
```

---

### FloatAbs

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Calcula el valor absoluto de un número de punto flotante de 32 bits conforme al estándar IEEE 754. En lugar de ejecutar llamadas de función complejas, simplemente limpia el bit de signo (*Most Significant Bit*, MSB) aplicando una máscara binaria `(Float:0x7FFFFFFF)`.

#### Sintaxis
```pawn
FloatAbs(Float:value)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `value` | Flotante (`Float:`) | Número flotante a procesar. |

#### Retorno
El valor flotante sin signo (positivo).

#### Ejemplo Práctico
```pawn
stock bool:AreFloatsClose(Float:val1, Float:val2, Float:epsilon = 0.001)
{
    return (FloatAbs(val1 - val2) < epsilon);
}
```

---

### min, max y clamp

- **Módulo:** `#include <YSI_Core\y_utils>` / Core Pawn
- **Tipo:** Funciones estándar / integradas
- **Descripción:**
  - `min(val1, val2)`: Retorna el menor de dos enteros.
  - `max(val1, val2)`: Retorna el mayor de dos enteros.
  - `clamp(value, min = cellmin, max = cellmax)`: Restringe un valor numérico para que nunca sea menor que `min` ni mayor que `max`.

#### Sintaxis
```pawn
min(value1, value2)
max(value1, value2)
clamp(value, min = cellmin, max = cellmax)
```

#### Parámetros (`clamp`)
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `value` | Entero (`_`) | Valor que se desea acotar. |
| `min` | Entero (`_`) | Cota mínima permitida. |
| `max` | Entero (`_`) | Cota máxima permitida. |

#### Retorno
El valor acotado entre `min` y `max`.

#### Ejemplo Práctico
```pawn
stock AjustarNivelAgua(nivelSolicitado)
{
    // El nivel de agua no puede ser menor a 0 ni mayor a 100
    new nivelFinal = clamp(nivelSolicitado, 0, 100);
    printf("Nivel solicitado: %d -> Nivel asignado: %d", nivelSolicitado, nivelFinal);
    return nivelFinal;
}
```

---

### ceildiv

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Realiza una división entera redondeando siempre hacia el entero superior (*ceiling division*), a diferencia de la división estándar de Pawn `/` que trunca hacia abajo (*floor*). Es especialmente útil para paginación de menús y diálogos.

#### Sintaxis
```pawn
ceildiv(numerator, denominator)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `numerator` | Entero (`_`) | Dividendo (total de elementos). |
| `denominator` | Entero (`_`) | Divisor (elementos por página). |

#### Retorno
Resultado entero redondeado hacia arriba.

#### Ejemplo Práctico
```pawn
stock CalcularTotalPaginas(totalUsuarios, usuariosPorPagina = 10)
{
    // Si hay 21 usuarios y 10 por página, se necesitan 3 páginas (no 2)
    new totalPaginas = ceildiv(totalUsuarios, usuariosPorPagina);
    return totalPaginas;
}
```

---

### floordiv

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Realiza una división entera garantizando redondeo explícito hacia abajo. Equivale semánticamente a `((numerator) / (denominator))`.

#### Sintaxis
```pawn
floordiv(numerator, denominator)
```

---

### IsOdd e IsEven

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Determina si un número entero es impar (`IsOdd` / `isodd`) o par (`IsEven` / `iseven`) mediante una operación binaria rápida con el bit menos significativo (`& 1`).

#### Sintaxis
```pawn
IsOdd(value)
IsEven(value)
```

#### Retorno
`true` si cumple la paridad requerida; `false` en caso opuesto.

#### Ejemplo Práctico
```pawn
for (new i = 0; i < 10; ++i)
{
    if (IsEven(i))
    {
        printf("Índice par: %d", i);
    }
}
```

---

### IsNaN

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Comprueba si un valor `Float:` es un *NaN* (Not-A-Number) en la norma IEEE 754. Ocurre al realizar operaciones matemáticas indefinidas como divisiones por cero con flotantes o raíces de números negativos.

#### Sintaxis
```pawn
IsNaN(Float:value)
```

#### Retorno
`true` si el valor flotante no es un número válido; `false` si es un valor real.

#### Ejemplo Práctico
```pawn
public OnPlayerUpdate(playerid)
{
    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);

    if (IsNaN(x) || IsNaN(y) || IsNaN(z))
    {
        printf("[CRITICAL] Coordenadas corruptas (NaN) detectadas en player %d", playerid);
        SetPlayerPos(playerid, 0.0, 0.0, 3.0);
        return 0;
    }
    return 1;
}
```

---

### Sum, Mean, Median, Mode, Range

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Funciones estadísticas stock
- **Descripción:**
  - `Sum(const arr[], num = sizeof (arr))`: Devuelve la suma acumulada de todos los elementos de un array.
  - `Mean(const arr[], num = sizeof (arr))`: Calcula la media aritmética entera del array.
  - `Median(arr[], num = sizeof (arr))`: Ordena el array mediante QuickSort y obtiene la mediana matemática.
  - `Mode(arr[], num = sizeof (arr))`: Obtiene la moda (el valor más repetido).
  - `Range(const arr[], num = sizeof (arr))`: Devuelve la diferencia matemática entre el valor máximo y el valor mínimo del array ($max - min$).

#### Ejemplo Práctico
```pawn
stock AnalizarPingsServidor()
{
    new pings[MAX_PLAYERS], count = 0;
    foreach (new i : Player)
    {
        pings[count++] = GetPlayerPing(i);
    }
    if (count > 0)
    {
        printf("Ping promedio: %d ms", Mean(pings, count));
        printf("Diferencia de pings (Rango): %d ms", Range(pings, count));
    }
}
```

---

## Manipulación y Validación de Strings

### IsNull (isnull)

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Comprueba si una cadena de texto está vacía o nula. Es la forma más rápida y segura en Pawn, funcionando tanto con cadenas desempaquetadas como empaquetadas y admitiendo desplazamientos de puntero (por ejemplo `IsNull(str[5])`).

#### Sintaxis
```pawn
IsNull(const string:str[])
// Alias en minúsculas:
isnull(str)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `str` | Cadena (`const string:[]`) | String a evaluar. |

#### Retorno
Devuelve `true` si el string es nulo (`str[0] == '\0'`), `false` si contiene al menos un carácter.

#### Ejemplo Práctico
```pawn
YCMD:mensaje(playerid, params[], help)
{
    if (IsNull(params))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "Uso: /mensaje [texto]");
    }
    SendClientMessageToAll(0xFFFFFFFF, params);
    return 1;
}
```

---

### StrCpy (strcpy)

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Macro preprocesador
- **Descripción:** Copia de forma segura una cadena de texto en otra sobreescribiendo el contenido original. Reemplaza el uso engorroso de `format(dest, sizeof dest, "%s", src)` por una asignación del terminador nulo seguida de `strcat`.

#### Sintaxis
```pawn
StrCpy(dest[], const src[])
// Alias en minúsculas:
strcpy(dest, src)
```

#### Ejemplo Práctico
```pawn
new mensaje[64];
StrCpy(mensaje, "Bienvenido al servidor");
// 'mensaje' contiene ahora exactamente "Bienvenido al servidor"
```

---

### StrToLower y StrToUpper

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Convierte todos los caracteres alfabéticos de una cadena a minúsculas (`StrToLower`) o a mayúsculas (`StrToUpper`) *in-place*. Detecta automáticamente si el arreglo de caracteres está empaquetado o desempaquetado.

#### Sintaxis
```pawn
stock StrToLower(string:str[], len = sizeof (str))
stock StrToUpper(string:str[], len = sizeof (str))
```

#### Ejemplo Práctico
```pawn
new comando[] = "KiLlSeRvEr";
StrToLower(comando);
// 'comando' ahora es "killserver"
```

---

### Strip, StripL y StripR (StripNL)

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock / Macro
- **Descripción:**
  - `StripR(str)` (alias `StripNL`): Elimina espacios, tabulaciones y saltos de línea (`\r`, `\n`) del final derecho de la cadena.
  - `StripL(str)`: Elimina espacios y tabulaciones del inicio izquierdo de la cadena, desplazando el contenido hacia el índice 0 con `memcpy`.
  - `Strip(str)`: Elimina espacios en blanco de ambos extremos simultáneamente (*trim* completo).

#### Sintaxis
```pawn
stock Strip(string:str[])
stock StripL(string:str[])
stock StripR(string:str[])
```

#### Ejemplo Práctico
```pawn
new buffer[128];
// Leer una línea de un archivo de configuración que trae espacios y \r\n al final
new File:f = fopen("config.txt", io_read);
if (f)
{
    fread(f, buffer);
    Strip(buffer); // Limpia inicio y final
    printf("Línea limpia: '%s'", buffer);
    fclose(f);
}
```

---

### EndOfLine

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Comprueba si a partir de una posición dada en un string únicamente quedan caracteres invisibles o espacios en blanco hasta el terminador nulo.

#### Sintaxis
```pawn
stock bool:EndOfLine(const string:line[], pos)
```

---

## Conversión y Parseo de Datos

### IsNumeric (isnumeric)

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Verifica de manera ultra eficiente si una cadena de texto representa un número entero válido (positivo o negativo con prefijo `-`).

#### Sintaxis
```pawn
stock bool:IsNumeric(const string:str[])
```

#### Retorno
`true` si la cadena contiene exclusivamente dígitos numéricos; `false` si contiene letras, símbolos o está vacía.

#### Ejemplo Práctico
```pawn
YCMD:darvida(playerid, params[], help)
{
    new targetid, cantidad[16];
    if (sscanf(params, "ds[16]", targetid, cantidad))
    {
        return SendClientMessage(playerid, -1, "Uso: /darvida [id] [cantidad]");
    }
    if (!IsNumeric(cantidad))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "Error: La cantidad debe ser un número entero.");
    }
    SetPlayerHealth(targetid, float(strval(cantidad)));
    return 1;
}
```

---

### IsHex

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Comprueba si una cadena contiene un valor hexadecimal válido (admitiendo opcionalmente el prefijo `0x` o `0X`).

#### Sintaxis
```pawn
stock bool:IsHex(const string:str[])
```

#### Retorno
`true` si todos los caracteres son dígitos hexadecimales (`0-9`, `a-f`, `A-F`); `false` en caso contrario.

---

### HexStr

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Convierte una cadena de texto en formato hexadecimal a su correspondiente valor entero de 32 bits, deteniéndose ante cualquier carácter no hexadecimal.

#### Sintaxis
```pawn
stock HexStr(const string:str[])
```

#### Ejemplo Práctico
```pawn
new color = HexStr("0xFF0000FF");
// 'color' almacena el valor numérico entero del color rojo RGBA
```

---

### BinStr

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Convierte una cadena binaria de ceros y unos (por ejemplo `"1011"` o `"0b1011"`) en un número entero.

#### Sintaxis
```pawn
stock BinStr(const string:str[])
```

---

### BoolStr

- **Módulo:** `#include <YSI_Core\y_utils>`
- **Tipo:** Función stock
- **Descripción:** Convierte una cadena de texto a un valor booleano (`bool:`). Interpreta `"0"`, `"false"` (sin distinguir mayúsculas) y strings vacíos como `false`; cualquier otro contenido se evalúa como `true`.

#### Sintaxis
```pawn
stock bool:BoolStr(const string:str[])
```

---

## Buenas Prácticas y Errores Comunes

### 1. Cuidado con efectos secundarios en macros de rango
`IS_IN_RANGE(x, min, max)` expande sus parámetros múltiples veces en la expresión de preprocesamiento. Por ello, **nunca utilices operadores con efectos colaterales** dentro de sus argumentos:
```pawn
// INCORRECTO: 'i' se incrementará más de una vez de forma impredecible
if (IS_IN_RANGE(i++, 0, 10)) { ... }

// CORRECTO:
new val = i++;
if (IS_IN_RANGE(val, 0, 10)) { ... }
```

### 2. Confusión entre límites inclusivos y exclusivos
Recuerda que `IS_IN_RANGE` y `UCMP` consideran el límite superior como **exclusivo**:
```pawn
// Verifica índices de 0 a 499 (500 elementos en total)
if (IS_IN_RANGE(id, 0, 500)) // Correcto para un array[500]
```

### 3. Diferencia entre IsNull y comprobar longitud con strlen
`strlen(str)` recorre toda la cadena hasta encontrar `\0`, lo cual requiere $O(N)$ operaciones. `IsNull(str)` solo verifica la primera posición en $O(1)$, siendo órdenes de magnitud más rápido para verificar si un parámetro fue ingresado.
