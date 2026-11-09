# y_bit (Arrays de Bits / Bitarrays)

`y_bit` es el módulo de optimización de memoria a nivel de bits de la suite YSI. Proporciona estructuras de datos de tipo **bitfield/bitarray** (`BitArray`) y funciones de manipulación binaria ultrarrápidas a nivel de celda, permitiendo almacenar banderas booleanas con la máxima densidad posible en la arquitectura AMX de Pawn.

---

## Introducción y Propósito

En Pawn estándar (el lenguaje de scripting de SA-MP y open.mp), la unidad fundamental de almacenamiento es la **celda** (*cell*), que tiene un tamaño de **4 bytes (32 bits)** en sistemas de 32 bits y 8 bytes en arquitecturas de 64 bits.

Cuando declaras un array booleano convencional en Pawn:

```pawn
new bool:g_HaCompletadoTutorial[MAX_PLAYERS]; // 1,000 celdas
```

Cada valor booleano (`true` o `false`) consume una **celda completa de 32 bits** para almacenar solo 1 bit de información (`0` o `1`). El 96.87% del espacio en memoria asignado a esa variable se desperdicia por completo.

### Comparación de Consumo de Memoria

Si en un servidor necesitas almacenar 30 banderas por jugador (ej. licencias, logros, ajustes de usuario) para 1,000 jugadores:

| Método | Declaración | Celdas Utilizadas | Bytes en RAM | Eficiencia |
| :--- | :--- | :--- | :--- | :--- |
| **Array Booleano Estándar** | `new bool:g_Data[1000][30];` | $30,000$ celdas | **120,000 bytes (~117.2 KB)** | $3.12\%$ |
| **BitArray con `y_bit`** | `new BitArray:g_Data[1000]<30>;` | $1,000$ celdas | **4,000 bytes (~3.9 KB)** | **$100\%$** |

Con `y_bit`, 32 valores booleanos se empaquetan en una sola celda física mediante operaciones bit a bit (`AND`, `OR`, `XOR`, desplazamientos binarios `>>>` y `<<`), logrando una **reducción de memoria de exactamente 32 a 1**.

```mermaid
graph TD
    subgraph Celda Convencional de Pawn (32 bits)
        C1["00000000 00000000 00000000 00000001 (Valor: true - Desperdicia 31 bits)"]
    end
    subgraph Celda con BitArray de y_bit (32 bits)
        B1["Bit 0: Licencia Auto | Bit 1: Licencia Moto | Bit 2: Licencia Barco | ... | Bit 31"]
    end
```

### Inclusión en el Proyecto

```pawn
#include <YSI_Data\y_bit>
```

---

## Tabla de Contenidos

1. [Declaración de BitArrays](#declaracion-de-bitarrays)
2. [Funciones y Macros Principales](#funciones-y-macros-principales)
   - [Bit_Get](#bit_get)
   - [Bit_Set](#bit_set)
   - [Bit_Let](#bit_let)
   - [Bit_Vet](#bit_vet)
   - [Bit_Toggle](#bit_toggle)
   - [Bit_SetAll / Bit_Clear](#bit_setall--bit_clear)
   - [Bit_GetCount / Bit_Count](#bit_getcount--bit_count)
   - [bitsof](#bitsof)
3. [Integración con `y_iterate` (Recorrido de Bits)](#integracion-con-y_iterate-recorrido-de-bits)
4. [Ejemplos Prácticos Completos](#ejemplos-practicos-completos)
5. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Declaración de BitArrays

Para declarar un array de bits se utiliza la etiqueta y sintaxis angular `BitArray:Nombre<TAMAÑO>`:

### 1. BitArray Simple (Unidimensional)
```pawn
// Almacena 1,000 banderas booleanas (0 a 999).
// Ocupa solo 32 celdas de memoria (1,000 / 32 redondeado hacia arriba).
new BitArray:g_JugadorVerificado<MAX_PLAYERS>;
```

### 2. BitArray Multidimensional (Por Jugador o Entidad)
```pawn
#define TOTAL_LOGROS (128)

// 1,000 jugadores, cada uno con 128 banderas booleanas (4 celdas por jugador).
// En total son solo 4,000 celdas en lugar de 128,000 celdas estándar.
new BitArray:g_LogrosJugador[MAX_PLAYERS]<TOTAL_LOGROS>;
```

---

## Funciones y Macros Principales

### Bit_Get

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Macro preprocesador de alto rendimiento
- **Descripción:** Lee el estado del bit en la posición indicada (`slot`) y devuelve un valor booleano (`true` o `false`).

#### Sintaxis
```pawn
bool:Bit_Get(BitArray:array<>, slot);
```

#### Parámetros
- `array`: El array de bits a inspeccionar.
- `slot`: El índice del bit que se desea leer (base 0).

#### Retorno
Devuelve `true` si el bit en esa posición es `1`, o `false` si es `0` o está fuera de rango.

#### Ejemplo Práctico
```pawn
if (Bit_Get(g_JugadorVerificado, playerid))
{
    SendClientMessage(playerid, 0x00FF00AA, "Tu cuenta ya se encuentra verificada.");
}
else
{
    SendClientMessage(playerid, 0xFF0000AA, "Debes verificar tu correo electrónico.");
}
```

---

### Bit_Set

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Función stock
- **Descripción:** Asigna explícitamente un valor booleano (`true` o `false`) al bit especificado en el array.

#### Sintaxis
```pawn
Bit_Set(BitArray:array<>, slot, bool:set);
```

#### Parámetros
- `array`: El array de bits a modificar.
- `slot`: El índice del bit a modificar (base 0).
- `bool:set`: `true` para encender el bit (`1`) o `false` para apagarlo (`0`).

#### Retorno
No devuelve ningún valor.

#### Ejemplo Práctico
```pawn
stock EstablecerTutorialCompletado(playerid, bool:estado)
{
    Bit_Set(g_JugadorVerificado, playerid, estado);
}
```

> [!TIP]
> Existe también la macro `Bit_FastSet(array, slot, bool:set)`, que evalúa la condición de manera inline mediante operador ternario `(?:)` sin sobrecarga de llamada a función.

---

### Bit_Let

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Macro preprocesador
- **Descripción:** Enciende directamente el bit especificado a `1` (`true`) en tiempo récord usando una operación a nivel de bits directa `array[slot] |= MASK`. Es más rápida que `Bit_Set(..., true)`.

#### Sintaxis
```pawn
Bit_Let(BitArray:array<>, slot);
```

#### Parámetros
- `array`: El array de bits.
- `slot`: El índice del bit a encender.

#### Retorno
No devuelve ningún valor.

#### Ejemplo Práctico
```pawn
// Marcar al jugador como verificado en el sistema
Bit_Let(g_JugadorVerificado, playerid);
```

---

### Bit_Vet

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Macro preprocesador
- **Descripción:** Apaga directamente el bit especificado a `0` (`false`) mediante una operación binaria `array[slot] &= ~MASK`. Es más rápida que `Bit_Set(..., false)`.

#### Sintaxis
```pawn
Bit_Vet(BitArray:array<>, slot);
```

#### Parámetros
- `array`: El array de bits.
- `slot`: El índice del bit a apagar.

#### Retorno
No devuelve ningún valor.

#### Ejemplo Práctico
```pawn
public OnPlayerDisconnect(playerid, reason)
{
    // Limpiar la bandera de verificación al desconectarse
    Bit_Vet(g_JugadorVerificado, playerid);
    return 1;
}
```

---

### Bit_Toggle

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Macro preprocesador
- **Descripción:** Invierte el estado actual del bit (si era `1` pasa a `0`, y si era `0` pasa a `1`) mediante la operación `XOR` (`^=`).

#### Sintaxis
```pawn
Bit_Toggle(BitArray:array<>, slot);
```

#### Parámetros
- `array`: El array de bits.
- `slot`: El índice del bit a invertir.

#### Ejemplo Práctico
```pawn
// Alternar el modo de visión nocturna o HUD
YCMD:togglehud(playerid, params[], help)
{
    Bit_Toggle(g_OpcionesJugador[playerid], OPCION_OCULTAR_HUD);
    
    if (Bit_Get(g_OpcionesJugador[playerid], OPCION_OCULTAR_HUD))
    {
        SendClientMessage(playerid, 0xAAAAAAFF, "HUD desactivado.");
    }
    else
    {
        SendClientMessage(playerid, 0xAAAAAAFF, "HUD activado.");
    }
    return 1;
}
```

---

### Bit_SetAll / Bit_Clear

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Función stock / Macro
- **Descripción:** Llena todos los bits del array con `0` (apagado total) o `1` (encendido total) utilizando un relleno rápido de memoria en bloque (`MemSet`).

#### Sintaxis
```pawn
Bit_SetAll(BitArray:array<>, bool:set, size = sizeof (array));
```

#### Parámetros
- `array`: El array de bits.
- `bool:set`: `true` para encender todos los bits a `1`, o `false` para apagarlos a `0`.
- `size` *(opcional)*: Tamaño en celdas físicas del array (por defecto `sizeof(array)`).

#### Macro de Limpieza `Bit_Clear`
Comúnmente utilizada para reiniciar un bitarray completo a ceros:
```pawn
#define Bit_Clear(%0) Bit_SetAll((%0), false)
```

#### Ejemplo Práctico
```pawn
public OnGameModeInit()
{
    // Inicializar todos los jugadores en no verificados
    Bit_SetAll(g_JugadorVerificado, false);
    return 1;
}
```

---

### Bit_GetCount / Bit_Count

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Función stock
- **Descripción:** Cuenta el número total de bits que están encendidos (`1`) en todo el bitarray, utilizando un algoritmo paralelizado de conteo de bits estilo Stanford/Hamming weight en tiempo ultra veloz.

#### Sintaxis
```pawn
Bit_GetCount(const BitArray:array<>, size = sizeof (array));
// Alias:
Bit_Count(const BitArray:array<>, size = sizeof (array));
```

#### Parámetros
- `array`: El array de bits.
- `size` *(opcional)*: Tamaño físico del array (por defecto `sizeof(array)`).

#### Retorno
Devuelve un número entero indicando cuántos bits están en `1`.

#### Ejemplo Práctico
```pawn
YCMD:mislogros(playerid, params[], help)
{
    new logrosDesbloqueados = Bit_GetCount(g_LogrosJugador[playerid]);
    new str[128];
    format(str, sizeof(str), "Has completado %d de %d logros posibles.", logrosDesbloqueados, TOTAL_LOGROS);
    SendClientMessage(playerid, 0xFFFF00AA, str);
    return 1;
}
```

---

### bitsof

- **Módulo requerido:** `#include <YSI_Data\y_bit>`
- **Tipo:** Macro preprocesador
- **Descripción:** Devuelve la capacidad total máxima expresada en bits que puede albergar el array dado su tamaño en celdas (`sizeof(array) * cellbits`).

#### Sintaxis
```pawn
bitsof(array)
```

#### Ejemplo Práctico
```pawn
printf("Capacidad máxima de bits en g_Logros: %d", bitsof(g_LogrosJugador[0]));
```

---

## Integración con `y_iterate` (Recorrido de Bits)

Una de las características más potentes de YSI es la unión entre `y_bit` y `y_iterate`. Permite recorrer únicamente los bits que están activos (`Bits`) o los que están apagados (`Blanks`) mediante la sintaxis nativa de `foreach`:

### Recorrer Bits Encendidos (`Bits`)

```pawn
// Itera únicamente sobre las posiciones cuyo bit vale 1
foreach (new id : Bits(g_JugadorVerificado))
{
    printf("El ID %d tiene su bit encendido en true.", id);
}
```

### Recorrer Bits Apagados (`Blanks`)

```pawn
// Itera únicamente sobre las posiciones cuyo bit vale 0
foreach (new id : Blanks(g_JugadorVerificado))
{
    printf("El ID %d tiene su bit apagado en false.", id);
}
```

Esta técnica salta directamente bloques enteros de 32 ceros con instrucciones a nivel de procesador, evitando comprobar elemento por elemento.

---

## Ejemplos Prácticos Completos

### Ejemplo 1: Sistema de Licencias de Conducción Compacto

```pawn
#include <openmultiplayer>
#include <YSI_Data\y_bit>
#include <YSI_Visual\y_commands>

enum
{
    LICENCIA_AUTO = 0,
    LICENCIA_MOTO,
    LICENCIA_CAMION,
    LICENCIA_BARCO,
    LICENCIA_AVION,
    LICENCIA_ARMAS,
    TOTAL_LICENCIAS
};

// Solo consume 1 celda por jugador (32 bits disponibles para licencias)
new BitArray:g_LicenciasJugador[MAX_PLAYERS]<TOTAL_LICENCIAS>;

public OnPlayerConnect(playerid)
{
    // Limpiar todas las licencias del jugador
    Bit_SetAll(g_LicenciasJugador[playerid], false);
    return 1;
}

// Otorgar licencia
stock DarLicencia(playerid, tipoLicencia)
{
    if (0 <= tipoLicencia < TOTAL_LICENCIAS)
    {
        Bit_Let(g_LicenciasJugador[playerid], tipoLicencia);
        SendClientMessage(playerid, 0x2ECC71AA, "¡Has obtenido una nueva licencia!");
    }
}

// Retirar licencia
stock QuitarLicencia(playerid, tipoLicencia)
{
    if (0 <= tipoLicencia < TOTAL_LICENCIAS)
    {
        Bit_Vet(g_LicenciasJugador[playerid], tipoLicencia);
        SendClientMessage(playerid, 0xE74C3CAA, "Tu licencia ha sido revocada.");
    }
}

// Comprobación al subir al vehículo
public OnPlayerStateChange(playerid, newstate, oldstate)
{
    if (newstate == PLAYER_STATE_DRIVER)
    {
        if (!Bit_Get(g_LicenciasJugador[playerid], LICENCIA_AUTO))
        {
            SendClientMessage(playerid, 0xE67E22AA, "ADVERTENCIA: Estás conduciendo sin licencia de automóvil.");
        }
    }
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Confundir `sizeof` con `bitsof`
> [!WARNING]
> En un `BitArray:MiArray<100>`, `sizeof(MiArray)` devolverá `4` (el número de celdas físicas de 32 bits necesarias para alojar 100 bits: $\lceil 100/32 \rceil = 4$). Para conocer la cantidad de bits disponibles, utiliza siempre `bitsof(MiArray)`.

### 2. Acceso Fuera de Rango
Al igual que en los arrays convencionales, intentar acceder a un índice superior a la capacidad declarada provocará corrupción de memoria en las celdas contiguas de la pila AMX. Asegúrate de que el índice cumpla $0 \le \text{slot} < \text{TAMAÑO}$.

### 3. Selección de la Operación Adecuada
- Si sabes de antemano que vas a asignar un `true`, prefiere `Bit_Let(array, slot)` en lugar de `Bit_Set(array, slot, true)`. Es una sola instrucción bit a bit en lugar de una llamada condicional.
- De forma análoga, para asignar `false`, prefiere `Bit_Vet(array, slot)`.
