# y_debug & y_testing (Diagnóstico, Trazas y Unit Testing)

Esta guía documenta los dos pilares fundamentales para el aseguramiento de la calidad de software dentro del ecosistema YSI: el sistema de registro y trazas condicionales de alto rendimiento (**`y_debug`**) y el framework de pruebas unitarias automatizadas (**`y_testing`**).

Ambos sistemas están diseñados con un principio rector: **cero impacto en producción**. Todo el código de diagnóstico, formato de mensajes y bloques de prueba se remueve por completo del binario `.amx` cuando el servidor se compila para despliegue final.

---

## Introducción

En el desarrollo de servidores SA-MP y open.mp es habitual encontrar scripts repletos de llamadas a `print` y `printf` manuales para depuración. Esto acarrea dos graves inconvenientes:
1. **Degradación de rendimiento y spam en consola:** Imprimir cadenas en la consola de SA-MP es una de las operaciones sincrónicas más lentas del motor.
2. **Imposibilidad de encender o apagar trazas por niveles:** Eliminar manualmente los prints antes de subir a producción es tedioso y propenso a errores.

Por su parte, la validación de algoritmos suele hacerse "a ojo" ingresando al servidor, lo que ralentiza el desarrollo y facilita regresiones de bugs.

La dupla `y_debug` + `y_testing` soluciona esto con:
- **Trazas compilables por niveles:** Define mensajes desde información elemental (`P:1`) hasta volcados exhaustivos de memoria (`P:7`). Si compilas con un nivel inferior, el código simplemente no existe en el bytecode.
- **Macros cortas universales:** `P:E` (Error), `P:W` (Advertencia), `P:I` (Información) y `C:N{}` (bloques de código condicionales).
- **Inspección rápida de variables con Q:** `Q(variable)` imprime de inmediato el archivo, línea, nombre de variable, tipo y contenido, incluso volcando arreglos masivos a archivos temporales.
- **Framework de pruebas unitarias (`y_testing`):** Escribe tests con `@test()` o `TEST__`, comprueba estados con `ASSERT`, `ASSERT_EQ`, `ASSERT_SAME` y ejecuta suites completas de pruebas automáticamente al arrancar el servidor.

### Inclusión en el proyecto

```pawn
// Configurar nivel de depuración antes de incluir la biblioteca
#define _DEBUG 3
#define RUN_TESTS // Habilita la ejecución automática de tests al inicio

#include <openmultiplayer>
#include <YSI_Core\y_debug>
#include <YSI_Core\y_testing>
```

---

## Tabla de Contenido

1. [Sistema de Depuración: y_debug](#sistema-de-depuracion-y_debug)
   - [Niveles de _DEBUG](#niveles-de-_debug)
   - [Macros de Impresión P:0() a P:7()](#macros-de-impresion-p0-a-p7)
   - [Logs de Error y Advertencia: P:E(), P:W(), P:I(), P:F()](#logs-de-error-y-advertencia-pe-pw-pi-pf)
   - [Bloques de Código Condicional: C:N{}](#bloques-de-codigo-condicional-cn)
   - [Inspección Inteligente con Debug_Q (Q)](#inspeccion-inteligente-con-debug_q-q)
   - [Control en Tiempo de Ejecución (Debug_Level)](#control-en-tiempo-de-ejecucion-debug_level)
2. [Framework de Pruebas Unitarias: y_testing](#framework-de-pruebas-unitarias-y_testing)
   - [Definición de Tests: @test() y TEST__](#definicion-de-tests-test-y-test__)
   - [Aserciones Básicas: ASSERT y ASSERT__](#aserciones-basicas-assert-y-assert__)
   - [Familia de Aserciones Numéricas (ASSERT_EQ, ASSERT_NE, etc.)](#familia-de-aserciones-numericas-assert_eq-assert_ne-etc)
   - [Aserciones de Strings (ASSERT_SAME, ASSERT_DIFF, ASSERT_NEAR)](#aserciones-de-strings-assert_same-assert_diff-assert_near)
   - [Pruebas con Jugadores Interactivos: ASK](#pruebas-con-jugadores-interactivos-ask)
   - [Ciclo de Vida: @testinit() y @testclose()](#ciclo-de-vida-testinit-y-testclose)
   - [Parámetros de Configuración y Filtros de Ejecución](#parametros-de-configuracion-y-filtros-de-ejecucion)
3. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Sistema de Depuración: y_debug

### Niveles de _DEBUG

La directiva `#define _DEBUG` controla la granularidad de los logs compilados:

| Nivel de `_DEBUG` | Significado y Propósito |
| :---: | :--- |
| `0` (o no definido) | **Modo Producción:** No compila ninguna traza de depuración. Máxima velocidad de ejecución. |
| `1` | Información crítica y cambios mayores de estado del gamemode. |
| `2` | Operaciones principales de subsistemas (conexión de sockets, queries completadas). |
| `3` | Llamadas a funciones públicas y comandos de usuario comunes. |
| `4` | Detalle interno de flujos de control y transformaciones de datos. |
| `5` | Ejecución periódica (timers, repeticiones). |
| `6` | Depuración profunda y operaciones a nivel de algoritmos o nodos. |
| `7` | Depuración extrema (volcados masivos de paquetes, strings por carácter). |
| `-1` | **Modo Dinámico:** Compila todos los niveles pero permite activarlos o desactivarlos en caliente en ejecución vía `Debug_Level(nivel)`. |

---

### Macros de Impresión P:0() a P:7()

- **Módulo:** `#include <YSI_Core\y_debug>`
- **Tipo:** Macro preprocesador
- **Descripción:** Imprime un mensaje con formato similar a `printf` solo si el nivel configurado de `_DEBUG` en tiempo de compilación es mayor o igual al número de la macro. Si `_DEBUG` es menor, la macro no emite ningún código máquina.

#### Sintaxis
```pawn
P:0("Mensaje siempre disponible pero controlado por autómata");
P:1("Mensaje nivel 1: %s", texto);
P:2("Mensaje nivel 2: %d", numero);
// ... hasta P:7()
```

#### Ejemplo Práctico
```pawn
public OnPlayerSpawn(playerid)
{
    P:1("Spawn: Jugador %d ha aparecido en el mundo.", playerid);
    P:3("Spawn Detallado: Player=%d, Pos=(%.2f, %.2f, %.2f)", playerid, 100.0, 200.0, 15.0);
    return 1;
}
```

> [!NOTE]
> `P:0()` es una macro especial: siempre se compila en el binario pero utiliza un autómata interno (`state ysi_debug : on / off`) para encender o apagar su salida sin recompilar.

---

### Logs de Error y Advertencia: P:E(), P:W(), P:I(), P:F()

- **Módulo:** `#include <YSI_Core\y_debug>`
- **Tipo:** Macro preprocesador
- **Descripción:** Canales semánticos de diagnóstico estructurado:
  - `P:E(mensaje, ...)`: Registra un **Error** crítico (`Debug_Error`).
  - `P:W(mensaje, ...)`: Registra una **Advertencia** (*Warning*) (`Debug_Warning`).
  - `P:I(mensaje, ...)`: Registra un mensaje puramente **Informativo** (`Debug_Info`).
  - `P:F(mensaje, ...)`: Registra un error **Fatal** no recuperable (`Debug_Fatal`).

#### Ejemplo Práctico
```pawn
stock CargarConfiguracion(const ruta[])
{
    if (!fexist(ruta))
    {
        P:E("No se encontró el archivo de configuración en: %s", ruta);
        return 0;
    }
    P:I("Leyendo configuración exitosamente desde: %s", ruta);
    return 1;
}
```

---

### Bloques de Código Condicional: C:N{}

- **Módulo:** `#include <YSI_Core\y_debug>`
- **Tipo:** Macro preprocesador
- **Descripción:** Permite incluir bloques enteros de código ejecutable que solo existirán si `_DEBUG >= N`. Resulta ideal para calcular estadísticas, sumas de verificación o comprobaciones de integridad costosas que no deben ejecutarse en producción.

#### Sintaxis
```pawn
C:1{ /* Código que se compila si _DEBUG >= 1 */ }
C:2{ /* Código que se compila si _DEBUG >= 2 */ }
```

#### Ejemplo Práctico
```pawn
stock ProcesarArrayGrande(const datos[], tam = sizeof (datos))
{
    // Solo en depuración nivel 2 o superior calculamos el tiempo y el checksum
    C:2{
        new check = 0;
        for (new i = 0; i < tam; ++i) check ^= datos[i];
        P:2("Checksum del arreglo: %08x", check);
    }
    // Lógica habitual...
}
```

---

### Inspección Inteligente con Debug_Q (Q)

- **Módulo:** `#include <YSI_Core\y_debug>`
- **Tipo:** Macro de introspección AMX
- **Descripción:** Realiza una inspección profunda de cualquier variable, arreglo, flotante, booleano o string. Imprime el nombre exacto de la expresión en código fuente, el archivo, el número de línea y el valor con formato enriquecido.

#### Sintaxis
```pawn
Debug_Q(variable);
// O simplemente si no hay colisiones:
Q(variable);
```

#### Ejemplo Práctico
```pawn
stock TestInspeccion(playerid)
{
    new vidas = 3;
    new Float:posicion[3] = {100.5, 20.0, 15.2};
    new nombre[] = "Juan_Perez";

    Q(vidas);
    Q(posicion);
    Q(nombre);
}
```

Salida generada en consola:
```text
[Q] gamemodes/main.pwn:45
    vidas = 3

[Q] gamemodes/main.pwn:46
    Float:posicion[3] = { 100.500, 20.000, 15.200 }

[Q] gamemodes/main.pwn:47
    nombre[11] = "Juan_Perez"
```

---

### Control en Tiempo de Ejecución (Debug_Level)

- **Módulo:** `#include <YSI_Core\y_debug>`
- **Tipo:** Función stock
- **Descripción:** Permite consultar o modificar el nivel de filtrado de trazas en vivo cuando el gamemode fue compilado con `#define _DEBUG -1`.

#### Sintaxis
```pawn
stock Debug_Level(level = -1)
```

#### Ejemplo Práctico
```pawn
YCMD:setdebug(playerid, params[], help)
{
    if (!IsPlayerAdmin(playerid)) return 0;
    new nuevoNivel = strval(params);
    Debug_Level(nuevoNivel);
    va_SendClientMessage(playerid, -1, "Nivel de depuración actualizado a: %d", nuevoNivel);
    return 1;
}
```

---

## Framework de Pruebas Unitarias: y_testing

`y_testing` proporciona un entorno de pruebas unitarias (*Unit Testing*) integrado directamente en el compilador de Pawn. Las pruebas se ejecutan de forma automática al iniciar el servidor (antes de cargar el gamemode completo) e informan en consola el resultado con precisión de microsegundos.

---

### Definición de Tests: @test() y TEST__

- **Módulo:** `#include <YSI_Core\y_testing>`
- **Tipo:** Macro de declaración de caso de prueba
- **Descripción:** Define un caso de prueba independiente. Posee dos sintaxis equivalentes:
  - `@test(opciones) NombreTest()`: Sintaxis moderna recomendada.
  - `TEST__ NombreTest()`: Sintaxis clásica compatible con versiones anteriores de YSI.

#### Sintaxis
```pawn
@test() MiTestUnitario()
{
    // Aserciones
}

// O sintaxis clásica:
TEST__ MiTestUnitario()
{
    // Aserciones
}
```

#### Ejemplo Práctico
```pawn
#define RUN_TESTS
#include <openmultiplayer>
#include <YSI_Core\y_utils>
#include <YSI_Core\y_testing>

@test() TestCeilDiv()
{
    ASSERT_EQ(ceildiv(10, 5), 2);
    ASSERT_EQ(ceildiv(11, 5), 3);
    ASSERT_EQ(ceildiv(0, 5), 0);
}
```

---

### Aserciones Básicas: ASSERT y ASSERT__

- **Módulo:** `#include <YSI_Core\y_testing>`
- **Tipo:** Macro de aserción
- **Descripción:** Verifica que una expresión lógica sea verdadera (`true`). Si la expresión resulta falsa, la prueba se marca como fallida, informando el nombre del test, el archivo fuente, el número de línea y el código exacto de la expresión fallida.

#### Sintaxis
```pawn
ASSERT(expresion_booleana);
ASSERT__(expresion_booleana); // Alias clásico
ASSERT_TRUE(expresion);
ASSERT_FALSE(expresion);
ASSERT_NULL(puntero_o_valor);
```

#### Ejemplo Práctico
```pawn
@test() ValidarMatematica()
{
    new resultado = Abs(-50);
    ASSERT(resultado == 50);
    ASSERT_FALSE(IsOdd(4));
}
```

---

### Familia de Aserciones Numéricas (ASSERT_EQ, ASSERT_NE, etc.)

Cuando se comparan números o flotantes, estas macros especializadas reportan en la consola tanto el valor esperado como el valor real obtenido en caso de fallo, agilizando el diagnóstico:

| Macro | Significado | Comportamiento |
| :--- | :--- | :--- |
| `ASSERT_EQ(a, b)` | Equals | Comprueba que `a == b`. En flotantes, admite un margen de tolerancia epsilon. |
| `ASSERT_NE(a, b)` | Not Equals | Comprueba que `a != b`. |
| `ASSERT_LT(a, b)` | Less Than | Comprueba que `a < b`. |
| `ASSERT_LE(a, b)` | Less or Equal | Comprueba que `a <= b`. |
| `ASSERT_GT(a, b)` | Greater Than | Comprueba que `a > b`. |
| `ASSERT_GE(a, b)` | Greater or Equal | Comprueba que `a >= b`. |
| `ASSERT_ZE(a)` | Zero Equals | Comprueba que `a == 0`. |
| `ASSERT_NZ(a)` | Not Zero | Comprueba que `a != 0`. |

#### Ejemplo Práctico
```pawn
@test() TestCalculoVida()
{
    new Float:vidaBase = 100.0;
    new Float:danio = 24.5;
    new Float:vidaFinal = vidaBase - danio;

    ASSERT_EQ(vidaFinal, 75.5);
    ASSERT_GT(vidaFinal, 0.0);
}
```

---

### Aserciones de Strings (ASSERT_SAME, ASSERT_DIFF, ASSERT_NEAR)

Especialmente diseñadas para comparar cadenas de caracteres sin necesidad de invocar `strcmp`:

| Macro | Descripción |
| :--- | :--- |
| `ASSERT_SAME(strA, strB)` | Valida que ambas cadenas sean idénticas (sensible a mayúsculas/minúsculas). |
| `ASSERT_DIFF(strA, strB)` | Valida que las cadenas sean diferentes. |
| `ASSERT_NEAR(strA, strB)` | Valida que sean iguales ignorando mayúsculas y minúsculas (*case-insensitive*). |

#### Ejemplo Práctico
```pawn
@test() TestFormateoStrings()
{
    new buffer[32];
    StrCpy(buffer, "Hola Mundo");

    ASSERT_SAME(buffer, "Hola Mundo");
    ASSERT_NEAR(buffer, "HOLA MUNDO");
    ASSERT_DIFF(buffer, "Adios Mundo");
}
```

---

### Pruebas con Jugadores Interactivos: ASK

- **Módulo:** `#include <YSI_Core\y_testing>`
- **Tipo:** Macro de prueba interactiva
- **Descripción:** Cuando se prueba un aspecto visual o de cliente que el servidor no puede medir por sí solo (por ejemplo si un objeto dinámico o una animación se ve correctamente), `ASK` le presenta al jugador una pregunta en pantalla para que responda presionando las teclas `Y` o `N` (o mediante un diálogo si `#define YSI_DIALOG_ASK` está activo).

#### Sintaxis
```pawn
@test() NombreTest(playerid)
{
    // Ejecutar acción en el cliente
    ASK(playerid, "pregunta con formato %s", parametros...);
}
```

#### Ejemplo Práctico
```pawn
@test() TestTiempoClimatico(playerid)
{
    SetPlayerWeather(playerid, 8); // Clima de tormenta
    ASK(playerid, "¿Comenzó a llover en tu pantalla?");
}
```

---

### Ciclo de Vida: @testinit() y @testclose()

Permite inicializar dependencias antes de que corra un test (preparar datos ficticios en arrays o tablas temporales) y limpiarlas al finalizar, garantizando aislamiento entre pruebas:

```pawn
new gSaldoTest[MAX_PLAYERS];

@testinit() TestTransferencia(playerid)
{
    gSaldoTest[playerid] = 1000;
}

@test() TestTransferencia(playerid)
{
    gSaldoTest[playerid] -= 250;
    ASSERT_EQ(gSaldoTest[playerid], 750);
}

@testclose() TestTransferencia(playerid)
{
    gSaldoTest[playerid] = 0;
}
```

---

### Parámetros de Configuración y Filtros de Ejecución

Antes de `#include <YSI_Core\y_testing>`, puedes definir las siguientes directivas:

- `#define RUN_TESTS`: Compila y ejecuta los tests automáticamente al iniciar.
- `#define RUN_SLOW_TESTS`: Permite ejecutar aquellos tests marcados como lentos con `@test(.slow = true)`.
- `#define JUST_TEST NombreDelTest`: Ejecuta exclusivamente el test indicado, omitiendo todos los demás.
- `#define JUST_TEST_GROUP "NombreGrupo"`: Ejecuta únicamente la suite de tests perteneciente a `@test(.group = "NombreGrupo")`.

```pawn
#define RUN_TESTS
#define JUST_TEST_GROUP "Inventario"
#include <YSI_Core\y_testing>

@test(.group = "Inventario") TestAgregarItem()
{
    ASSERT_TRUE(true);
}

@test(.group = "Vehiculos") TestMotor() // Se omitirá
{
    ASSERT_TRUE(true);
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. No definir RUN_TESTS en el servidor de producción
Si olvidas remover `#define RUN_TESTS` al compilar la versión de producción, los tests se ejecutarán cada vez que el servidor inicie, demorando el arranque innecesariamente. Usa compilación condicional:
```pawn
#if defined MODO_DESARROLLO
    #define _DEBUG 3
    #define RUN_TESTS
#else
    #define _DEBUG 0
#endif
```

### 2. No realizar operaciones de estado global sin restaurar en @testclose
Si un test modifica variables globales (como la posición del jugador, el clima o variables estáticas), asegúrate de restaurarlas con `@testclose()`. De lo contrario, los tests subsiguientes se ejecutarán sobre un estado contaminado.

### 3. Usar cadenas formateadas dentro de P:N con modificadores correctos
`P:N` se traduce en una variante interna de `printf`. Proporcionar tipos discordantes (por ejemplo `%s` para un entero o `%d` para un float) puede ocasionar lecturas de memoria no alineadas en la máquina virtual AMX.
