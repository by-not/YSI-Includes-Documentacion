# y_hooks: Sistema de Hooking Modular

En arquitecturas de software modernas para SA-MP y open.mp, dividir un gamemode monolítico de decenas de miles de líneas en módulos independientes (sistemas de vehículos, facciones, inventario, administración, etc.) es una regla fundamental. Sin embargo, el lenguaje Pawn tradicional no cuenta con soporte nativo para múltiples definiciones del mismo callback: si dos archivos declaran `public OnPlayerConnect(playerid)`, el compilador genera un error de redefinición de símbolo (`error 021: symbol already defined`).

Durante años, la comunidad recurrió a los sistemas **ALS (Advanced Library Shield)**, que requerían decenas de directivas `#define`, `#undef` y funciones puente por cada callback o nativa. `y_hooks` revoluciona este paradigma permitiendo que cualquier cantidad de scripts e includes intercepten callbacks y funciones de manera transparente, segura, con soporte para prioridades y sin colisiones.

---

## Cómo incluir el módulo

Para utilizar `y_hooks`, debes incluirlo en cada archivo o módulo que defina un hook:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_hooks>
```

> [!TIP]
> Puedes incluir `<YSI_Coding\y_hooks>` en la cabecera de múltiples archivos `.pwn` o `.inc`. El sistema gestionará automáticamente los nombres únicos internos para que no colisionen.

---

## Resumen de Funciones y Macros

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`hook Callback`](#hook-callback) | Macro preprocesador | Hook original para callbacks públicos (`OnPlayerConnect`, etc.). Extremadamente rápido. |
| [`hook function`](#hook-function) | Macro preprocesador | Intercepta llamadas a funciones nativas o creadas en Pawn con encadenamiento explícito (`continue`). |
| [`hook callback`](#hook-callback-1) | Macro preprocesador | Hook para callbacks públicos que añade encadenamiento explícito con `continue`. |
| [`continue(...)`](#continue) | Palabra clave de hook | Pasa el control y los parámetros a la siguiente función o nativa en la cadena de hooks. |
| [`~1` y `~0` (Break Hook)](#retornos-en-cadenas-de-hooks) | Operador de retorno | Corta inmediatamente la ejecución de los hooks restantes y devuelve 1 o 0 al servidor. |
| [`DEFINE_HOOK_RETURN__`](#define_hook_return__) | Macro global | Define el valor por defecto devuelto por un callback si ningún hook lo altera. |
| [`DEFINE_HOOK_REPLACEMENT__`](#define_hook_replacement__) | Macro global | Registra abreviaturas automáticas para evitar que los nombres de hooks superen el límite del compilador. |

---

## Tipos de Hooks

### hook Callback

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Macro preprocesador
- **Descripción:** Es la forma más conocida y utilizada de `y_hooks`. Se utiliza exclusivamente para enganchar callbacks públicos del servidor (como `OnGameModeInit`, `OnPlayerConnect`, `OnPlayerSpawn`, etc.). Todos los hooks declarados para un callback se llaman secuencialmente en el orden en que se declaran en el código fuente.
- **Sintaxis:**
```pawn
hook NombreCallback(parametros)
{
    // Código del hook
    return 1;
}
```
- **Parámetros:**
  - `NombreCallback`: Nombre exacto del callback de SA-MP u open.mp (ej. `OnPlayerDisconnect`).
  - `parametros`: Argumentos idénticos a los esperados por el callback oficial.
- **Retorno:**
  - `return 1;` o `return 0;`: Continúa ejecutando los siguientes hooks de la cadena.
  - `return ~1;` o `return ~0;`: Finaliza inmediatamente la cadena de hooks y retorna 1 o 0 al servidor sin llamar a los hooks posteriores.
- **Ejemplo práctico:**
```pawn
// modulo_bienvenida.inc
#include <YSI_Coding\y_hooks>

hook OnPlayerConnect(playerid)
{
    SendClientMessage(playerid, 0x00FF00AA, "¡Bienvenido a San Andreas!");
    return 1;
}

// modulo_autenticacion.inc
#include <YSI_Coding\y_hooks>

hook OnPlayerConnect(playerid)
{
    // Este código se ejecuta después del módulo de bienvenida
    VerificarCuentaJugador(playerid);
    return 1;
}
```
- **Notas / Advertencias:**
  - No es necesario que exista una declaración `public OnPlayerConnect(playerid)` en tu gamemode base para que `hook OnPlayerConnect` funcione. Si no existe ningún callback original, `y_hooks` lo genera por ti.

---

### hook function

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Macro preprocesador (Sinónimos: `hook stock`, `hook native`)
- **Descripción:** Intercepta la llamada a cualquier función invocada dentro de tus scripts, ya sea una función nativa de SA-MP (`SetPlayerPos`, `GivePlayerMoney`, `SendClientMessage`) o una función ordinaria en Pawn. A diferencia de los hooks de callbacks, un hook de función captura la salida desde tu código hacia el servidor, permitiendo validar, modificar o cancelar la operación mediante la instrucción `continue(...)`.
- **Sintaxis:**
```pawn
hook function NombreFuncion(parametros)
{
    // Pre-procesamiento de parámetros
    return continue(parametros_modificados);
}
```
- **Parámetros:**
  - `NombreFuncion`: Identificador de la función nativa o stock a interceptar.
  - `parametros`: Argumentos que recibe normalmente dicha función.
- **Retorno:** El valor devuelto por `continue(...)` o cualquier valor personalizado si se cancela la llamada.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_hooks>

// Hook para auditar y limitar el dinero entregado
hook function GivePlayerMoney(playerid, money)
{
    if (money > 1000000)
    {
        printf("[SEGURIDAD] Intento sospechoso de GivePlayerMoney: %d al jugador %d", money, playerid);
        // Limitamos la entrega a 1 millón
        return continue(playerid, 1000000);
    }
    
    // Continuar con los parámetros originales
    return continue(playerid, money);
}
```
- **Notas / Advertencias:**
  - **Evita la recursión infinita:** Jamás llames a `GivePlayerMoney(playerid, money);` directamente dentro del hook de dicha función; debes usar `continue(...)` para invocar al siguiente nivel de la cadena o la nativa real.
  - La función objetivo debe existir obligatoriamente al momento de compilar; de lo contrario se emitirá un error.

---

### hook callback

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Macro preprocesador (Sinónimo: `hook public`)
- **Descripción:** Combina la capacidad de interceptar callbacks del servidor con el control granular de encadenamiento explícito mediante `continue(...)`. A diferencia del `hook` original que se procesa en bloque, con `hook callback` tú decides el momento exacto en que se transfiere el flujo a los demás hooks y capturar su valor de retorno.
- **Sintaxis:**
```pawn
hook callback NombreCallback(parametros)
{
    // Código previo
    new ret = continue(parametros);
    // Código posterior
    return ret;
}
```
- **Parámetros:**
  - Coinciden con los del callback interceptado.
- **Retorno:** Retorna el resultado de `continue(...)` o un valor de control.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_hooks>

hook callback OnPlayerText(playerid, text[])
{
    if (text[0] == '$')
    {
        SendClientMessage(playerid, 0xFF0000AA, "No se permiten mensajes que inicien con $");
        return 0; // Cancela el mensaje inmediatamente
    }

    // Pasa la ejecución al siguiente hook o al gamemode
    return continue(playerid, text);
}
```

---

### continue

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Palabra clave / Macro de encadenamiento
- **Descripción:** Transfiere la ejecución al siguiente eslabón en la cadena de hooks o a la implementación original de la función. Es obligatorio en `hook function` y `hook callback` si se desea mantener el flujo natural.
- **Sintaxis:**
```pawn
return continue(arg1, arg2, ...);
```
- **Parámetros:**
  - Lista de argumentos que se transmitirán a la siguiente función. Permite alterar los valores en tránsito.
- **Retorno:** El valor de retorno del siguiente hook o de la función nativa subyacente.

---

## Retornos en Cadenas de Hooks

En el sistema tradicional de callbacks de SA-MP, el valor devuelto define el comportamiento del servidor (por ejemplo, en `OnPlayerCommandText`, retornar `1` indica que el comando fue procesado, mientras que retornar `0` provoca el mensaje *"SERVER: Unknown Command"*).

### Retorno Normal (`return 1;` / `return 0;`)
Cuando un hook finaliza con `return 1;` o `return 0;`, la ejecución prosigue con el siguiente hook de la cadena. El valor final entregado a la máquina virtual será el retornado por el último hook que se ejecute.

### Interrupción Inmediata con `~1` y `~0` (Break Chains)
Si un hook detecta una condición determinante (por ejemplo, un sistema anticheat que detecta un arma prohibida y expulsa al jugador), no tiene sentido continuar ejecutando los hooks posteriores de otros módulos.

En `y_hooks`, los operadores de complemento a uno `~0` y `~1` actúan como señales de detención inmediata:
* `return ~0;`: Detiene toda la cadena inmediatamente y devuelve `0` al servidor.
* `return ~1;`: Detiene toda la cadena inmediatamente y devuelve `1` al servidor.

```pawn
hook OnPlayerText(playerid, text[])
{
    if (IsPlayerMuted(playerid))
    {
        SendClientMessage(playerid, 0xFF0000AA, "Estás silenciado.");
        // Detiene el procesamiento aquí mismo y devuelve 0 a SA-MP
        return ~0;
    }
    return 1; // Permite que otros hooks procesen el texto
}
```

---

## Prioridades y Orden de Ejecución

Por defecto, los hooks de callbacks se ejecutan en el **mismo orden en que son leídos por el compilador** (de arriba hacia abajo en los includes). Los hooks de funciones se ejecutan en **orden inverso** (el último incluido intercepta primero la llamada saliente).

Si necesitas controlar de forma explícita qué hook se ejecuta antes que otro en el mismo script o entre módulos, `y_hooks` provee los siguientes mecanismos:

### Sufijos de orden numérico (`@0`, `@1`, `@2`, ...)
Puedes añadir un sufijo al nombre del callback para forzar un orden relativo determinista:

```pawn
#include <YSI_Coding\y_hooks>

// Este hook se ejecutará primero para OnPlayerConnect
hook OnPlayerConnect@0(playerid)
{
    printf("[ORDEN 0] Inicializando buffers de red del jugador %d", playerid);
    return 1;
}

// Este hook se ejecutará después de @0
hook OnPlayerConnect@1(playerid)
{
    printf("[ORDEN 1] Cargando datos de base de datos para %d", playerid);
    return 1;
}
```

### Hooking Condicional por Estados (Automata States)
`y_hooks` se integra con el sistema de máquinas de estados de Pawn, permitiendo activar hooks específicos únicamente cuando el servidor o un subsistema se encuentre en un estado determinado:

```pawn
#include <YSI_Coding\y_hooks>

hook OnPlayerConnect(playerid) <servidor_mantenimiento : activo>
{
    SendClientMessage(playerid, 0xFF0000AA, "El servidor está en mantenimiento. Intenta más tarde.");
    Kick(playerid);
    return ~0;
}

hook OnPlayerConnect(playerid) <servidor_mantenimiento : inactivo>
{
    SendClientMessage(playerid, 0x00FF00AA, "Bienvenido al servidor en línea.");
    return 1;
}
```

---

## Macros de Configuración Global

### DEFINE_HOOK_RETURN__

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Macro preprocesador global
- **Descripción:** Por defecto, `y_hooks` asume que un callback sin hooks explícitos devolvería `1`. Sin embargo, algunos callbacks nativos como `OnPlayerCommandText` o `OnRconCommand` esperan un valor por defecto de `0`. Este macro permite establecer el valor predeterminado para callbacks personalizados. Debe colocarse fuera de cualquier función.
- **Sintaxis:**
```pawn
DEFINE_HOOK_RETURN__(NombreCallback, valor_defecto);
```
- **Ejemplo:**
```pawn
// Configurar un callback personalizado para que devuelva 0 por defecto
DEFINE_HOOK_RETURN__(OnAdminActionAttempted, 0);
```

---

### DEFINE_HOOK_REPLACEMENT__

- **Módulo requerido:** `#include <YSI_Coding\y_hooks>`
- **Tipo:** Macro preprocesador global
- **Descripción:** En compiladores antiguos de Pawn (o en sistemas con identificadores limitados a 31 caracteres), los nombres generados internamente por `y_hooks` para callbacks largos pueden truncarse y causar colisiones. Este macro permite sustituir fragmentos comunes de nombres (respetando CamelCase) por abreviaturas compactas.
- **Sintaxis:**
```pawn
DEFINE_HOOK_REPLACEMENT__(TextoLargo, TextoCorto);
```
- **Ejemplo:**
```pawn
DEFINE_HOOK_REPLACEMENT__(Inventory, Inv);
DEFINE_HOOK_REPLACEMENT__(Checkpoint, CP);

hook OnPlayerInventoryOpened(playerid)
{
    // Internamente se procesará como OnPlayerInvOpened para acortar el símbolo
    return 1;
}
```

---

## Comparativa: ALS Tradicional vs y_hooks

| Característica | ALS Tradicional (v1 a v7) | y_hooks (YSI) |
| :--- | :--- | :--- |
| **Líneas de código por hook** | Entre 8 y 15 líneas de macros complejos (`#if defined _ALS_... #undef...`). | 1 línea (`hook OnPlayerConnect(playerid)`). |
| **Sensibilidad al orden de inclusión** | Crítica. Si el orden de `#include` es incorrecto, el compilador rompe la cadena. | Totalmente independiente del orden de los `#include`. |
| **Interoperabilidad** | Difícil entre diferentes filterscripts o includes de terceros. | Nativa. Incluso detecta y enlaza funciones creadas con ALS tradicional. |
| **Interrupción de cadena** | Compleja y manual. | Directa mediante `return ~1;` o `return ~0;`. |
| **Rendimiento** | Añade saltos de llamada estándar entre funciones intermedias. | Genera tablas de salto optimizadas en AMX más rápidas que funciones normales. |
| **Detección de errores** | Los errores de sintaxis en ALS provocan mensajes crípticos del compilador. | Mensajes descriptivos y verificación estricta de parámetros. |

---

## Ejemplo Completo para SA-MP / open.mp

Demostración de un sistema modular compuesto por tres archivos independientes que enganchan los mismos eventos sin generar colisiones ni dependencias directas:

```pawn
// =============================================================
// Archivo: modulo_seguridad.inc
// =============================================================
#include <open.mp>
#include <YSI_Coding\y_hooks>

static bool:gPlayerAuthenticated[MAX_PLAYERS];

hook OnPlayerConnect(playerid)
{
    gPlayerAuthenticated[playerid] = false;
    printf("[SEGURIDAD] Inicializando sesión del jugador ID: %d", playerid);
    return 1;
}

hook OnPlayerDisconnect(playerid, reason)
{
    gPlayerAuthenticated[playerid] = false;
    return 1;
}

// Hook de función para evitar que jugadores no autenticados reciban armas
hook function GivePlayerWeapon(playerid, weaponid, ammo)
{
    if (!gPlayerAuthenticated[playerid])
    {
        printf("[SEGURIDAD] Bloqueada entrega de arma a jugador no autenticado (%d)", playerid);
        return 0; // Rechazar entrega
    }
    return continue(playerid, weaponid, ammo);
}

// =============================================================
// Archivo: modulo_chat.inc
// =============================================================
#include <open.mp>
#include <YSI_Coding\y_hooks>

hook OnPlayerText(playerid, text[])
{
    // Filtrar caracteres de control o comandos maliciosos
    if (strlen(text) > 128)
    {
        SendClientMessage(playerid, 0xFF0000FF, "Mensaje demasiado largo.");
        return ~0; // Cortar el callback inmediatamente
    }
    return 1;
}

// =============================================================
// Archivo: gamemode principal (gamemode.pwn)
// =============================================================
#include <open.mp>

// Incluir los módulos independientes
#include "modulo_seguridad.inc"
#include "modulo_chat.inc"

#include <YSI_Coding\y_hooks>

// Hook propio del gamemode
hook OnPlayerConnect(playerid)
{
    SendClientMessage(playerid, 0x00FF88AA, "Servidor conectado exitosamente. Escribe /ayuda.");
    return 1;
}

main()
{
    print("Servidor iniciado con arquitectura modular y_hooks.");
}
```

---

## Buenas Prácticas y Errores Comunes

1. **Parámetros desalineados:**  
   La lista de parámetros en `hook Callback(params)` debe coincidir exactamente en tipo y número con la definición oficial del callback. Si el callback toma `(playerid, reason)` y declaras `hook OnPlayerDisconnect(playerid)`, se generará una advertencia de desajuste de argumentos o fallo en la pila.

2. **Recursión accidental en `hook function`:**  
   Nunca invoques por su nombre a la misma función que estás enganchando dentro de su propio cuerpo; utiliza siempre `continue(...)`. De lo contrario, se creará un bucle de llamada infinito que provocará un desbordamiento de pila (*Stack Overflow / Run time error 3*).

3. **Uso incorrecto de `return ~0` vs `return 0`:**  
   Recuerda que `return 0;` no detiene la ejecución de los siguientes hooks en la cadena, solo sugiere un valor de retorno. Para abortar y garantizar que ningún otro hook reciba el evento, usa `return ~0;` o `return ~1;`.

4. **Hooks en funciones inexistentes:**  
   `hook Callback` creará el callback si no existe, pero `hook function` generará un error en tiempo de compilación si la función objetivo no ha sido declarada previamente. Asegúrate de incluir las librerías nativas antes de hookearlas.
