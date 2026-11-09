# y_amx (Inspección y Manipulación de la Máquina Virtual AMX)

El módulo `y_amx` proporciona acceso de bajo nivel, introspección en tiempo de ejecución y capacidades de manipulación sobre la máquina virtual AMX (*Abstract Machine eXecutive*) de Pawn. Permite que un script de SA-MP o open.mp examine su propio binario en ejecución: recorrer la tabla de funciones públicas, descubrir funciones nativas importadas, inspeccionar variables globales públicas (`public new`), leer o escribir en cualquier posición del segmento de datos (`DAT`) y calcular punteros reales en la memoria del proceso.

`y_amx` constituye el cimiento arquitectónico sobre el que se construyen los subsistemas más avanzados de YSI, tales como `y_hooks` (para detectar qué callbacks existen y redirigirlos), `y_testing` (para descubrir y ejecutar tests unitarios automáticamente) y `y_commands` (para indexar comandos sin declararlos en gigantescos `switch` o `strcmp`).

---

## Ventajas sobre los Métodos Tradicionales

1. **Introspección y Reflexión Real en Pawn:** Convierte a Pawn en un lenguaje reflexivo, permitiendo descubrir funciones en tiempo de ejecución sin necesidad de plugins en C++ externos.
2. **Búsqueda Eficiente de Símbolos:** Implementa algoritmos de búsqueda lineal y binaria en las tablas de símbolos del binario `.amx`, optimizados con funciones en ensamblador Pawn (`#emit`).
3. **Acceso Directo al Segmento de Datos (DAT):** Permite leer y escribir arrays, cadenas empaquetadas y desempaquetadas, y celdas individuales en cualquier dirección válida sin violar la seguridad del proceso del servidor.
4. **Inspección de Cabeceras (Header Dumping):** Proporciona herramientas de diagnóstico para examinar el tamaño de la memoria dinámica (Heap y Stack), direcciones base y flags de compilación.

---

## Inclusión en el Script

Para incluir `y_amx`:

```pawn
#include <openmultiplayer> // o <a_samp>
#include <YSI_Storage\y_amx>
```

---

## Tabla de Contenido

- [Arquitectura de la Máquina Virtual AMX](#arquitectura-de-la-maquina-virtual-amx)
- [Constantes y Tablas del Header](#constantes-y-tablas-del-header)
- [Funciones de Inspección del Header y Conteo](#funciones-de-inspeccion-del-header-y-conteo)
  - [AMX_DumpHeader](#amx_dumpheader)
  - [AMX_GetCount](#amx_getcount)
  - [AMX_GetBaseAddress y AMX_GetRealAddress](#amx_getbaseaddress-y-amx_getrealaddress)
- [Inspección de Funciones Públicas](#inspeccion-de-funciones-publicas)
  - [AMX_GetEntryFromPublicIndex](#amx_getentryfrompublicindex)
  - [AMX_GetPublicPointer](#amx_getpublicpointer)
- [Inspección de Funciones Nativas](#inspeccion-de-funciones-nativas)
  - [AMX_GetEntryFromNativeIndex](#amx_getentryfromnativeindex)
- [Inspección de Variables Públicas (pubvars)](#inspeccion-de-variables-publicas-pubvars)
  - [AMX_GetPubvarCount](#amx_getpubvarcount)
  - [AMX_GetPubvarName y AMX_GetPubvarValue](#amx_getpubvarname-y-amx_getpubvarvalue)
- [Operaciones de Memoria de Bajo Nivel](#operaciones-de-memoria-de-bajo-nivel)
  - [AMX_Read y AMX_Write](#amx_read-y-amx_write)
  - [AMX_ReadArray y AMX_WriteArray](#amx_readarray-y-amx_writearray)
  - [AMX_ReadString](#amx_readstring)
  - [AMX_Deref](#amx_deref)
- [Ejemplo Práctico Completo: Diagnóstico e Introspección del Gamemode](#ejemplo-practico-completo-diagnostico-e-introspeccion-del-gamemode)
- [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Arquitectura de la Máquina Virtual AMX

El archivo compilado `.amx` cargado en memoria tiene la siguiente estructura secuencial:

```
┌─────────────────────────────────────────────────────────────┐
│ AMX Header (Tamaño, Versión, Offsets de Tablas, Magic)     │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Funciones Públicas (Publics Table)                │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Funciones Nativas (Natives Table)                  │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Librerías (Libraries Table)                       │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Variables Públicas (Pubvars Table)                │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Tags (Tags Table)                                  │
├─────────────────────────────────────────────────────────────┤
│ Tabla de Nombres (Name Table / Cadenas de caracteres)      │
├─────────────────────────────────────────────────────────────┤
│ Segmento de Código (COD) - Instrucciones de bytecode       │
├─────────────────────────────────────────────────────────────┤
│ Segmento de Datos (DAT) - Variables estáticas y globales   │
├─────────────────────────────────────────────────────────────┤
│ Memoria Dinámica: Heap (HEA ↑) y Stack (STP ↓)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Constantes y Tablas del Header

El enumerador `E_AMX_TABLE` identifica las tablas principales accesibles en el encabezado AMX:

```pawn
enum E_AMX_TABLE
{
    AMX_TABLE_PUBLICS   = 0, // Funciones públicas (public / forward)
    AMX_TABLE_NATIVES   = 1, // Funciones nativas del servidor (CreateVehicle, etc.)
    AMX_TABLE_LIBRARIES = 2, // Librerías dinámicas requeridas
    AMX_TABLE_PUBVARS   = 3, // Variables públicas globales (public new ...)
    AMX_TABLE_TAGS      = 4  // Tags definidos en el script (Float:, Group:, etc.)
}
```

Campos destacados del Header (`AMX_HEADER_*`):
- `AMX_HEADER_SIZE`: Tamaño del archivo/memoria del header.
- `AMX_HEADER_MAGIC`: Número mágico identificador de la máquina AMX (`0xF1E0`).
- `AMX_HEADER_CIP`: Instruction Pointer inicial.
- `AMX_HEADER_COD`: Desplazamiento del segmento de código.
- `AMX_HEADER_DAT`: Desplazamiento del segmento de datos.
- `AMX_HEADER_HEA`: Inicio actual del Heap.
- `AMX_HEADER_STP`: Límite superior del Stack.

---

## Funciones de Inspección del Header y Conteo

### AMX_DumpHeader

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Imprime en la consola del servidor un volcado técnico detallado de la cabecera AMX del script actual, incluyendo tamaños, flags y offsets.
- **Sintaxis:**
```pawn
void:AMX_DumpHeader()
```
- **Ejemplo:**
```pawn
public OnGameModeInit()
{
    print("[AMX DEBUG] Volcando informacion de cabecera...");
    AMX_DumpHeader();
    return 1;
}
```

---

### AMX_GetCount

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Devuelve la cantidad de entradas contenidas en cualquiera de las tablas del binario AMX.
- **Sintaxis:**
```pawn
AMX_GetCount(E_AMX_TABLE:table)
```
- **Parámetros:**
  - `E_AMX_TABLE:table`: Constante que especifica la tabla a consultar (`AMX_TABLE_PUBLICS`, `AMX_TABLE_NATIVES`, etc.).
- **Retorno:** Número entero con la cantidad de elementos en dicha tabla.
- **Ejemplo:**
```pawn
new totalPublics = AMX_GetCount(AMX_TABLE_PUBLICS);
new totalNatives = AMX_GetCount(AMX_TABLE_NATIVES);
printf("Este script contiene %d funciones publicas y %d nativas.", totalPublics, totalNatives);
```

---

### AMX_GetBaseAddress y AMX_GetRealAddress

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Permiten obtener la dirección base en la memoria física del proceso donde está alojado el script AMX, o convertir una dirección relativa a una dirección virtual física real.
- **Sintaxis:**
```pawn
// Obtener dirección base en memoria del proceso:
AMX_GetBaseAddress()

// Convertir dirección relativa a puntero real del proceso:
AMX_GetRealAddress(addr)
```

---

## Inspección de Funciones Públicas

### AMX_GetEntryFromPublicIndex

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Obtiene los datos de una función pública a partir de su índice en la tabla de públicas (de 0 a `AMX_GetCount(AMX_TABLE_PUBLICS) - 1`), devolviendo su dirección relativa en código y su nombre textual.
- **Sintaxis:**
```pawn
bool:AMX_GetEntryFromPublicIndex(idx, &address, name[], len = sizeof(name))
```
- **Parámetros:**
  - `idx`: Índice de la función en la tabla de públicas.
  - `&address`: Variable que recibirá la dirección de la función en el segmento de código.
  - `name[]`: Array donde se copiará el nombre de la función pública.
  - `len`: Longitud máxima del array `name`.
- **Retorno:** `true` si el índice es válido y la información fue leída; `false` si el índice está fuera de rango.
- **Ejemplo:**
```pawn
new funcAddress, funcName[32];
for (new i = 0, count = AMX_GetCount(AMX_TABLE_PUBLICS); i < count; ++i)
{
    if (AMX_GetEntryFromPublicIndex(i, funcAddress, funcName))
    {
        printf("Public #%d: '%s' en direccion 0x%08X", i, funcName, funcAddress);
    }
}
```

---

## Inspección de Funciones Nativas

### AMX_GetEntryFromNativeIndex

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Obtiene el nombre y dirección de stub de una función nativa importada por el script mediante su índice en la tabla de nativas.
- **Sintaxis:**
```pawn
bool:AMX_GetEntryFromNativeIndex(idx, &address, name[], len = sizeof(name))
```
- **Parámetros:**
  - `idx`: Índice de la función nativa (de 0 a `AMX_GetCount(AMX_TABLE_NATIVES) - 1`).
  - `&address`: Variable que recibirá la dirección del stub nativo.
  - `name[]`: Array de destino para el nombre de la función (ej: `"SetPlayerPos"`).
  - `len`: Tamaño del array.
- **Retorno:** `true` en caso de éxito; `false` si el índice no existe.
- **Ejemplo:**
```pawn
new natAddr, natName[32];
for (new i = 0, count = AMX_GetCount(AMX_TABLE_NATIVES); i < count; ++i)
{
    AMX_GetEntryFromNativeIndex(i, natAddr, natName);
    if (!strcmp(natName, "CreateVehicle"))
    {
        printf("La funcion CreateVehicle esta enlazada en el indice nativo #%d.", i);
        break;
    }
}
```

---

## Inspección de Variables Públicas (pubvars)

En Pawn, declarar `public new gMiVariable = 123;` registra el símbolo en la tabla de variables públicas (`pubvars`). Esto permite que otros scripts lean o modifiquen su valor por nombre sin necesidad de callbacks.

### AMX_GetPubvarCount

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Devuelve la cantidad de variables públicas registradas en el script actual.
- **Sintaxis:**
```pawn
AMX_GetPubvarCount()
```

---

### AMX_GetPubvarName y AMX_GetPubvarValue

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Permite obtener el nombre de una variable pública por su índice, o leer directamente el valor almacenado en su dirección.
- **Sintaxis:**
```pawn
// Obtener nombre de la variable pública:
AMX_GetPubvarName(idx, name[], len = sizeof(name))

// Obtener valor directo:
AMX_GetPubvarValue(idx)
```

---

## Operaciones de Memoria de Bajo Nivel

### AMX_Read y AMX_Write

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Lee o escribe el valor de una celda (`cell`) de 32 bits directamente en una dirección relativa del segmento de datos (`DAT`).
- **Sintaxis:**
```pawn
// Leer una celda:
cell = AMX_Read(address)

// Escribir una celda:
void:AMX_Write(address, value)
```
- **Parámetros:**
  - `address`: Dirección relativa en memoria dentro del segmento de datos.
  - `value`: Valor entero a asignar.

---

### AMX_ReadArray y AMX_WriteArray

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Copia un bloque contiguo de celdas desde o hacia una dirección de memoria.
- **Sintaxis:**
```pawn
void:AMX_ReadArray(address, array[], size = sizeof(array))
void:AMX_WriteArray(address, const array[], size = sizeof(array))
```

---

### AMX_ReadString

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Lee una cadena de caracteres terminada en nulo (`\0`) alojada en la dirección `address`.
- **Sintaxis:**
```pawn
void:AMX_ReadString(address, string[], len = sizeof(string))
```

---

### AMX_Deref

- **Módulo:** `#include <YSI_Storage\y_amx>`
- **Tipo:** `Función stock`
- **Descripción:** Desreferencia un puntero de datos (`DAT pointer`), devolviendo una referencia de array válida y usable directamente en Pawn sin necesidad de copias manuales.
- **Sintaxis:**
```pawn
AMX_Deref(addr)
```

---

## Ejemplo Práctico Completo: Diagnóstico e Introspección del Gamemode

El siguiente script recorre en el inicio del servidor la tabla de funciones públicas para descubrir automáticamente callbacks administrativos (con prefijo `AdminCmd_`) y diagnosticar el entorno de la máquina virtual AMX:

```pawn
#include <openmultiplayer>
#include <YSI_Storage\y_amx>
#include <YSI_Visual\y_commands>

// Variable pública global expuesta para otros scripts / introspección
public new g_VersionServidor = 205;

// Callbacks administrativos de ejemplo con prefijo especial
forward AdminCmd_Reiniciar(playerid);
public AdminCmd_Reiniciar(playerid)
{
    print("[EVENTO] Comando administrativo ejecutado: Reiniciar.");
    return 1;
}

forward AdminCmd_Mantenimiento(playerid);
public AdminCmd_Mantenimiento(playerid)
{
    print("[EVENTO] Comando administrativo ejecutado: Mantenimiento.");
    return 1;
}

public OnGameModeInit()
{
    print("\n==================================================");
    print("       DIAGNOSTICO AMX DEL GAMEMODE (y_amx)       ");
    print("==================================================");

    // 1. Conteo de componentes del binario
    new numPublics = AMX_GetCount(AMX_TABLE_PUBLICS);
    new numNatives = AMX_GetCount(AMX_TABLE_NATIVES);
    new numPubvars = AMX_GetPubvarCount();

    printf("• Funciones Publicas Registradas : %d", numPublics);
    printf("• Funciones Nativas Enlazadas    : %d", numNatives);
    printf("• Variables Publicas Expuestas   : %d", numPubvars);

    // 2. Descubrimiento dinámico de comandos con prefijo 'AdminCmd_'
    print("\n--- DESCUBRIMIENTO DE FUNCIONES 'AdminCmd_' ---");
    new funcAddress, funcName[64], adminCmdCount = 0;

    for (new i = 0; i < numPublics; ++i)
    {
        if (AMX_GetEntryFromPublicIndex(i, funcAddress, funcName))
        {
            // Comprobar si el nombre comienza con 'AdminCmd_'
            if (!strncmp(funcName, "AdminCmd_", 9))
            {
                adminCmdCount++;
                printf("  [#%d] Encontrado comando: '%s' en offset: 0x%08X", adminCmdCount, funcName, funcAddress);
            }
        }
    }
    printf("Total de comandos administrativos detectados: %d\n", adminCmdCount);

    // 3. Inspección de variables públicas (pubvars)
    print("--- VARIABLES PUBLICAS DEL SCRIPT ---");
    new varName[32];
    for (new i = 0; i < numPubvars; ++i)
    {
        AMX_GetPubvarName(i, varName);
        new valor = AMX_GetPubvarValue(i);
        printf("  Variable: '%s' = %d", varName, valor);
    }
    print("==================================================\n");
    return 1;
}

// Comando para volcar la cabecera AMX por consola
YCMD:dumpamx(playerid, params[], help)
{
    if (!IsPlayerAdmin(playerid))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "Comando exclusivo de administradores RCON.");
    }

    SendClientMessage(playerid, 0x00FF00FF, "Volcado AMX generado en la consola del servidor.");
    AMX_DumpHeader();
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### Buenas Prácticas
1. **Límites de Bucle:** Siempre utiliza `AMX_GetCount(...)` como cota máxima en bucles de iteración de tablas. Acceder a un índice fuera de rango devolverá datos erróneos o fallará.
2. **Uso de Búsqueda Binaria en Tablas Ordenadas:** En el formato AMX, la tabla de funciones públicas está ordenada alfabéticamente por diseño del compilador, lo que permite implementar búsquedas binarias de altísima velocidad (`O(log n)`).
3. **Cuidado con las Direcciones de Memoria:** Al utilizar `AMX_Write` o `AMX_WriteArray`, verifica que la dirección corresponda estrictamente al segmento de datos asignado para evitar corrupción del estado de ejecución.

### Errores Comunes
- **Confundir Índices Nativos con Índices Públicos:** Pasar un índice de tabla pública a `AMX_GetEntryFromNativeIndex` producirá información no deseada o nombres de funciones incorrectos.
- **Tratar de Leer Código como Datos:** El segmento de código (`COD`) suele ser de solo lectura en arquitecturas de ejecución modernas. `AMX_Write` opera sobre el segmento de datos (`DAT`).
- **Buffer de Nombre Insuficiente:** Usar arrays de tamaño menor a 32 celdas para el nombre de las funciones puede truncar identificadores largos de Pawn.
