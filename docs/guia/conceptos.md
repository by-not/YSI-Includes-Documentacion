# Conceptos y Buenas Prácticas en YSI

Para dominar la suite **YSI v5**, es indispensable comprender su filosofía de diseño, sus patrones idiomáticos, el sistema de decoradores modernos, sus convenciones de tipado y cómo evitar los errores más habituales al desarrollar en SA-MP y open.mp.

## Tabla de Contenido

- [Filosofía y Paradigma de YSI](#filosofia-y-paradigma-de-ysi)
- [De Tags Antiguos a Decoradores Modernos](#de-tags-antiguos-a-decoradores-modernos)
- [Modos de Compatibilidad](#modos-de-compatibilidad)
- [Convención de Nombres Interna](#convencion-de-nombres-interna)
- [Tipado Fuerte y Funciones de Primera Clase](#tipado-fuerte-y-funciones-de-primera-clase)
- [Gestión de Cadenas Seguras (IsNull)](#gestion-de-cadenas-seguras-isnull)
- [Sistema de Diagnóstico y Debug](#sistema-de-diagnostico-y-debug)
- [Resumen de Buenas Prácticas y Antipatrones](#resumen-de-buenas-practicas-y-antipatrones)

---

## Filosofía y Paradigma de YSI

Pawn estándar es un lenguaje imperativo clásico sin soporte formal para programación orientada a objetos o programación funcional. YSI salva esta distancia implementando técnicas avanzadas a través del preprocesador y la máquina virtual AMX:

1. **Resolución en Tiempo de Compilación**: Todo el trabajo pesado de asignación de IDs, cálculo de hashes y comprobación de límites se realiza mientras compilas. En tiempo de ejecución solo se ejecutan operaciones aritméticas y saltos O(1).
2. **Modularidad Total sin Dependencias Cíclicas**: Mediante `y_hooks`, distintos subsistemas de tu gamemode (casas, concesionarios, facciones, anticheat) pueden existir en archivos completamente independientes, cada uno enganchándose a los eventos que necesita sin tocar el gamemode central.
3. **Seguridad de Tipos**: YSI previene desbordamientos de buffer y conversiones ilegales mediante comprobaciones estrictas de tipos (*tags*).

---

## De Tags Antiguos a Decoradores Modernos

En versiones tempranas de YSI (v2/v3/v4), las extensiones del lenguaje se representaban abusando del sistema de etiquetas de Pawn (por ejemplo, `YCMD:comando()`, `HOOK:callback()`). En el compilador Pawn, una etiqueta como `Tag:identificador` está destinada a indicar un tipo de dato, no a modificar el comportamiento de una función.

En **YSI v5**, se introdujo el concepto formal de **Decoradores**, inspirados en lenguajes modernos como Python o TypeScript, con el prefijo `@`:

| Sintaxis Clásica (Aún soportada) | Decorador Moderno Recomendado (YSI v5) | Módulo |
| :--- | :--- | :--- |
| `YCMD:nombre(playerid, params[], help)` | `@cmd() nombre(playerid, params[], help)` | `YSI_Visual\y_commands` |
| `hook OnPlayerConnect(playerid)` | `@hook(OnPlayerConnect) MiFuncion(playerid)` | `YSI_Coding\y_hooks` |
| `ptask MiTemporizador[1000](playerid)` | `@ptask(1000) MiTemporizador(playerid)` | `YSI_Coding\y_timers` |
| `test MiPrueba()` | `@test() MiPrueba()` | `YSI_Core\y_testing` |

### Parámetros con Nombre en Decoradores
Los decoradores de YSI permiten argumentos con nombre (*named arguments*) delimitados por puntos, facilitando una configuración extremadamente legible:

```pawn
// Declarar un comando oculto para listas de ayuda y desactivado de inicio
@cmd(.hidden = true, .disabled = true) debuginfo(playerid, params[], help)
{
    SendClientMessage(playerid, -1, "Comando secreto ejecutado");
    return 1;
}
```

---

## Modos de Compatibilidad

YSI ofrece soporte retrospectivo para código legado mediante directivas que puedes definir antes de incluir sus cabeceras:

### Compatibilidad con ZCMD / I-ZCMD (`CMD:`)
Si tu base de código utiliza la sintaxis clásica de ZCMD:
```pawn
CMD:ayuda(playerid, params[])
{
    SendClientMessage(playerid, -1, "Mensaje de ayuda");
    return 1;
}
```
`y_commands` detecta y compila automáticamente las macros `CMD:` sin que tengas que reescribir un solo comando. Internamente las transforma en comandos de YSI con soporte para el sistema Master y permisos de grupos.

### Modo Silencioso y Depuración
Para controlar el nivel de verbosidad de compilación y mensajes en consola de YSI, puedes definir macros en la parte superior del script:
```pawn
// Desactivar mensajes informativos de carga de YSI en la consola al iniciar
#define YSI_NO_INIT_MESSAGE

// Ignorar advertencias menores en tests
#define YSI_NO_TEST_WARNINGS
```

---

## Convención de Nombres Interna

Para evitar colisiones entre el código del usuario y las librerías, YSI utiliza una nomenclatura muy estructurada:

- **`YSI_g_s*`**: Variables estáticas globales del sistema (*System Static Global Variables*). Son privadas a nivel interno y nunca deben manipularse directamente.
- **`Func:<...>`**: Puntero a función con tipado estricto (utilizado en callbacks de `y_dialog`, `y_timers` y `y_inline`).
- **`F@_@*`**: Etiquetas especiales generadas por el compilador para funciones indirectas o closures.
- **`_A<...>`**: Identificadores numéricos generados en tiempo de compilación a partir de cadenas empaquetadas de 4 caracteres (evitan colisiones numéricas accidentales).
- **`GLOBAL__` y `FOREIGN__`**: Macros de vinculación entre scripts gestionadas por el sistema maestro de `y_master`.

---

## Tipado Fuerte y Funciones de Primera Clase

YSI aprovecha el sistema de tags de Pawn para lograr funciones de primera clase. Por ejemplo, en `y_dialog`, un diálogo puede recibir una función de respuesta en línea sin necesidad de definir un callback público global:

```pawn
inline const AlResponder(response, listitem, string:inputtext[])
{
    if (response)
    {
        printf("El jugador seleccionó el índice: %d", listitem);
    }
}
Dialog_ShowCallback(playerid, using inline AlResponder, DIALOG_STYLE_LIST, "Opciones", "Opción A\nOpción B", "Seleccionar", "Cancelar");
```
Nota el uso de `using inline` y la etiqueta `string:` para cadenas de solo lectura, lo que garantiza que la memoria se libere automáticamente una vez el jugador cierra el diálogo.

---

## Gestión de Cadenas Seguras (`IsNull`)

Uno de los errores más comunes en SA-MP clásico al recibir texto de comandos o inputs de diálogos es comprobar si una cadena está vacía con `strlen(str) == 0`. Esto es inseguro y lento, ya que si el primer carácter es nulo o el puntero contiene caracteres invisibles (espacios, saltos de línea de clientes modificados), puede provocar desbordamientos o lecturas fuera de rango.

YSI incluye la macro de máxima eficiencia **`IsNull`**:

```pawn
// Forma correcta y recomendada en todo YSI:
if (IsNull(params))
{
    return SendClientMessage(playerid, 0xFF0000AA, "Debes ingresar parámetros.");
}
```

`IsNull` comprueba en un solo ciclo de CPU si el primer carácter es nulo (`\0`) o si el valor del primer byte representa el final de la cadena, evitando iterar por toda la memoria como hace `strlen`.

---

## Sistema de Diagnóstico y Debug

YSI incluye un subsistema de rastreo de errores que te permite inspeccionar en tiempo de ejecución exactamente qué llamadas se efectúan.

Para activar el modo debug en tus scripts, define la macro de depuración antes de incluir cualquier archivo de YSI:

```pawn
// Nivel de debug de 0 a 7 (7 siendo el más detallado con volcados paso a paso)
#define _DEBUG 3
#include <a_samp>
#include <YSI_Visual\y_commands>
```

Cuando `_DEBUG` está activo, YSI imprimirá en la consola del servidor (*server_log.txt*) trazas completas de:
- Inicialización de tablas hash de comandos.
- Resolución de callbacks mediante hooks.
- Cambios de titularidad en el sistema maestro.

> [!CAUTION]
> En entornos de producción con jugadores reales, asegúrate de compilar **sin** la macro `_DEBUG` activa (o con valor 0) para no saturar el archivo de log del servidor.

---

## Resumen de Buenas Prácticas y Antipatrones

### Prácticas Recomendadas
1. **Modula mediante `y_hooks`**: Si creas un sistema de concesionario, pon los comandos, los callbacks `OnPlayerDisconnect` y las consultas a base de datos en `dealership.pwn` usando `@hook` y `@cmd`.
2. **Utiliza `foreach` de `y_iterate`**: Olvídate de los bucles `for (new i = 0; i < MAX_PLAYERS; i++)`. Usa siempre `foreach (new i : Player)`.
3. **Aprovecha el parámetro `help` en comandos**: Permite que un comando `/ban` tenga su propia ayuda integrada al consultar `/help ban` con `Command_ReProcess`.

### Antipatrones a Evitar
1. **No modifiques las matrices internas de YSI**: Nunca intentes acceder a variables como `YSI_g_sCommands` directamente; utiliza siempre la API pública (`Command_SetPlayer`, `Command_GetPlayer`).
2. **No declares funciones públicas con nombres reservados de YSI**: Funciones que comiencen por `@y_`, `_y_` o `YSI_` están reservadas para la generación de código del preprocesador.
3. **No uses `return` tradicional dentro de bloques `inline` complejos**: Usa siempre `@return` dentro de funciones en línea para evitar advertencias de valor de retorno en el compilador.
