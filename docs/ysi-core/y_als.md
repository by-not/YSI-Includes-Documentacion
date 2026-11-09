# y_als (Advanced Library Shield / ALS Hooking System)

`y_als` documenta el estándar de intercepción y encadenamiento de funciones y callbacks más influyente en la historia del lenguaje Pawn en SA-MP y open.mp: el patrón **ALS (Advanced Library Shield)**, diseñado originalmente por **Alex "Y_Less" Cole**.

Este patrón resuelve el problema fundamental de la modularidad en Pawn: permitir que múltiples librerías independientes intercepten (*hookeen*) los mismos callbacks o funciones nativas sin sobrescribirse, sin colisionar y sin requerir modificaciones en el código del usuario.

---

## Introducción

En los inicios de SA-MP (versiones 0.1 a 0.2), si dos librerías necesitaban ejecutar lógica en `OnPlayerConnect`:

```pawn
// LibreriaA.inc
public OnPlayerConnect(playerid)
{
    printf("Librería A ejecutada");
    return 1;
}

// LibreriaB.inc
public OnPlayerConnect(playerid) // ¡ERROR DE COMPILACIÓN! Redefinición de símbolo
{
    printf("Librería B ejecutada");
    return 1;
}
```

El compilador de Pawn arrojaba un error de símbolo duplicado (*symbol already defined*). El programador se veía obligado a fusionar manualmente el código de todas las librerías en un único script monolítico.

Para superar esta barrera, Y_Less inventó el patrón **ALS**, una técnica avanzada basada enteramente en macros del preprocesador de Pawn (`#if defined`, `#undef`, `#define`) y encadenamiento de nombres por redirección de prefijos.

### Ventajas del Patrón ALS
1. **Composición modular ilimitada:** Cualquier cantidad de librerías (`Streamer`, `sscanf`, `FCNPC`, sistemas de inventario, etc.) pueden interceptar el mismo callback en una cadena limpia.
2. **Independencia del orden:** Funciona independientemente del orden en que se incluyan los archivos `.inc`.
3. **Cero sobrecoste de CPU:** Todo el enlace se resuelve en tiempo de preprocesamiento y compilación, traduciéndose en llamadas a funciones ordinarias sin introspección lenta ni reflexión.

### Inclusión en el proyecto
Para utilizar las definiciones de soporte ALS de YSI:
```pawn
#include <openmultiplayer>
#include <YSI_Core\y_als>
```

---

## Tabla de Contenido

1. [Anatomía del Hooking de Callbacks con ALS](#anatomia-del-hooking-de-callbacks-con-als)
   - [Estructura Paso a Paso](#estructura-paso-a-paso)
   - [Diagrama de Encadenamiento](#diagrama-de-encadenamiento)
   - [Código Completo de Ejemplo](#codigo-completo-de-ejemplo)
2. [Anatomía del Hooking de Funciones Nativas](#anatomia-del-hooking-de-funciones-nativas)
   - [Estructura Paso a Paso](#estructura-paso-a-paso-1)
   - [Código Completo de Ejemplo](#codigo-completo-de-ejemplo-1)
3. [El Módulo y_als en YSI](#el-modulo-y_als-en-ysi)
   - [Constantes y Enums de Callbacks Oficiales](#constantes-y-enums-de-callbacks-oficiales)
   - [Valores de Retorno por Defecto (ALS_R_*)](#valores-de-retorno-por-defecto-als_r_)
4. [Transición de ALS a y_hooks](#transicion-de-als-a-y_hooks)
5. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Anatomía del Hooking de Callbacks con ALS

Para que un include intercepte un callback (por ejemplo, `OnPlayerConnect`) de forma compatible con ALS, debe seguir estrictamente un bloque de 5 pasos estandarizados:

### Estructura Paso a Paso

1. **Definir la función pública local del include:** Se declara `public OnPlayerConnect(playerid)` ejecutando la lógica propia.
2. **Encadenar al siguiente eslabón:** Se verifica mediante `#if defined Prefijo_OnPlayerConnect` si existe otra función posterior en la cadena para llamarla; de lo contrario, se retorna el valor por defecto (`return 1`).
3. **Verificar el escudo (_ALS_):** Comprobar si otra librería ya definió el escudo `_ALS_OnPlayerConnect`. Si es así, se desdefine (`#undef OnPlayerConnect`); si no, se define el escudo.
4. **Redirigir el nombre:** Reasignar mediante `#define OnPlayerConnect Prefijo_OnPlayerConnect` para que el siguiente include que use el nombre original sea redirigido hacia el nuevo prefijo.
5. **Declarar el forward previo:** Declarar `forward Prefijo_OnPlayerConnect(playerid)` si el símbolo ya fue definido en la compilación.

---

### Diagrama de Encadenamiento

```
                 LLAMADA DEL SERVIDOR
                          │
                          ▼
             ┌─────────────────────────┐
             │   LibreriaA (Include)   │
             │   OnPlayerConnect()     │
             └────────────┬────────────┘
                          │ Invoca a LibreriaA_OnPlayerConnect
                          ▼
             ┌─────────────────────────┐
             │   LibreriaB (Include)   │
             │ LibreriaA_OnPlayerConn  │ (Redirigido por #define)
             └────────────┬────────────┘
                          │ Invoca a LibreriaB_OnPlayerConnect
                          ▼
             ┌─────────────────────────┐
             │     Gamemode Principal  │
             │ LibreriaB_OnPlayerConn  │
             └─────────────────────────┘
```

---

### Código Completo de Ejemplo

A continuación se muestra una librería de ejemplo llamada `MiSistema.inc`:

```pawn
#if defined _INC_MiSistema
    #endinput
#endif
#define _INC_MiSistema

#include <openmultiplayer>

// 1. Implementación del callback interceptor
public OnPlayerConnect(playerid)
{
    printf("[MiSistema] Jugador conectado con ID: %d", playerid);

    // 2. Encadenar hacia el siguiente include o gamemode
    #if defined MiSis_OnPlayerConnect
        return MiSis_OnPlayerConnect(playerid);
    #else
        return 1;
    #endif
}

// 3. Gestión del escudo ALS
#if defined _ALS_OnPlayerConnect
    #undef OnPlayerConnect
#else
    #define _ALS_OnPlayerConnect
#endif

// 4. Redirección del nombre hacia nuestro prefijo
#define OnPlayerConnect MiSis_OnPlayerConnect

// 5. Declaración forward para evitar advertencias del compilador
#if defined MiSis_OnPlayerConnect
    forward MiSis_OnPlayerConnect(playerid);
#endif
```

---

## Anatomía del Hooking de Funciones Nativas

El patrón ALS no solo sirve para callbacks recibidos desde el servidor, sino también para **redefinir funciones nativas** de SA-MP u open.mp (por ejemplo, `SetPlayerPos`, `GivePlayerMoney`, `SendClientMessage`), permitiendo validar parámetros, sincronizar cachés locales o registrar métricas.

### Estructura Paso a Paso

1. Crear una función `stock` con un prefijo único que reciba los mismos argumentos que la nativa.
2. Ejecutar la lógica personalizada y llamar a la nativa original (la cual aún conserva su nombre original en este punto).
3. Gestionar el escudo ALS para esa nativa (`#if defined _ALS_FuncionNativa ...`).
4. Redefinir el nombre de la nativa hacia nuestra función `stock` (`#define FuncionNativa MiPrefijo_FuncionNativa`).

---

### Código Completo de Ejemplo

Librería de teletransporte seguro que guarda las coordenadas previas del jugador al invocar `SetPlayerPos`:

```pawn
#if defined _INC_SeguridadPos
    #endinput
#endif
#define _INC_SeguridadPos

#include <openmultiplayer>

// Variable interna del include
static Float:gUltimaPosX[MAX_PLAYERS];

// 1. Función sustituta con prefijo único
stock SegPos_SetPlayerPos(playerid, Float:x, Float:y, Float:z)
{
    // Lógica adicional previa
    gUltimaPosX[playerid] = x;
    printf("[TELEPORT] Jugador %d movido a X: %.2f", playerid, x);

    // Llamada a la nativa original de SA-MP / open.mp
    return SetPlayerPos(playerid, x, y, z);
}

// 2. Gestión del escudo ALS de la función nativa
#if defined _ALS_SetPlayerPos
    #undef SetPlayerPos
#else
    #define _ALS_SetPlayerPos
#endif

// 3. Redirección global del identificador
#define SetPlayerPos SegPos_SetPlayerPos
```

A partir de este punto, cualquier llamada en el código del usuario como `SetPlayerPos(playerid, 0.0, 0.0, 3.0)` será redirigida de forma transparente hacia `SegPos_SetPlayerPos`, ejecutando la lógica intermedia sin que el programador deba cambiar nada en su gamemode.

---

## El Módulo y_als en YSI

Dentro de la suite YSI, `y_als` provee tablas y constantes centralizadas para estandarizar el comportamiento de todos los callbacks de SA-MP y plugins de la comunidad (como Incognito Streamer).

### Constantes y Enums de Callbacks Oficiales
El archivo interno `y_als_impl.inc` define el `enum ALS`, que recopila flags binarios para cada callback del servidor:
- Callbacks principales: `ALS_OnGameModeInit`, `ALS_OnPlayerConnect`, `ALS_OnPlayerDisconnect`, `ALS_OnPlayerSpawn`, `ALS_OnPlayerText`, etc.
- Callbacks de vehículos: `ALS_OnVehicleSpawn`, `ALS_OnVehicleDeath`, `ALS_OnVehicleDamageStatusUpdate`.
- Callbacks de Streamer: `ALS_OnDynamicObjectMoved`, `ALS_OnPlayerEnterDynamicArea`, `ALS_OnPlayerEnterDynamicCP`.

### Valores de Retorno por Defecto (ALS_R_*)
Uno de los fallos más graves al escribir hooks ALS es retornar un valor erróneo que rompa el flujo de los demás scripts. Por ejemplo, en `OnPlayerCommandText`, retornar `1` indica que el comando fue procesado, impidiendo que otros scripts lo lean; por el contrario, debe retornar `0` si no fue manejado.

YSI define los retornos oficiales mediante constantes `ALS_R_*`:
```pawn
#define ALS_R_PlayerConnect 1
#define ALS_R_PlayerDisconnect 1
#define ALS_R_PlayerText 1
#define ALS_R_PlayerCommandText 0 // <- Nótese: 0 por defecto
#define ALS_R_RconCommand 1
#define ALS_R_DialogResponse 1
#define ALS_R_PlayerUpdate 1
```

---

## Transición de ALS a y_hooks

Si bien ALS es el estándar fundamental que todo desarrollador de librerías debe conocer y dominar, escribir manualmente el bloque de 5 directivas `#if defined` para decenas de callbacks resulta verboso y propenso a errores tipográficos.

Por este motivo, YSI introdujo posteriormente **`y_hooks`**, un módulo de alto nivel que automatiza el proceso por completo mediante el preprocesador:

```pawn
// Con y_hooks ya no necesitas escribir las macros ALS manualmente:
#include <YSI_Coding\y_hooks>

hook OnPlayerConnect(playerid)
{
    printf("¡Hook automático con y_hooks!");
    return 1;
}
```

> [!NOTE]
> `y_hooks` utiliza internamente una arquitectura avanzada basada en tablas de llamadas y ALS. Conocer la mecánica de ALS es vital cuando desarrollas librerías públicas agnósticas que deban compilar sin requerir YSI como dependencia forzada.

---

## Buenas Prácticas y Errores Comunes

### 1. Prefijos no únicos
El error más común es utilizar un prefijo genérico como `My_` o `Custom_`:
```pawn
// PELIGROSO:
#define OnPlayerConnect My_OnPlayerConnect

// RECOMENDADO: Usa un prefijo distintivo basado en el nombre de tu proyecto
#define OnPlayerConnect MiLibreriaEx_OnPlayerConnect
```

### 2. Olvidar el forward al final del bloque
Si omites:
```pawn
#if defined MiPrefijo_OnPlayerConnect
    forward MiPrefijo_OnPlayerConnect(playerid);
#endif
```
El compilador generará una advertencia `warning 235: public function lacks forward declaration` si este include es el último en la cadena de compilación.

### 3. Retornos incorrectos que abortan la cadena
En callbacks con lógica de interrupción (como `OnPlayerText` u `OnDialogResponse`), retornar un valor fijo sin consultar a la siguiente función puede silenciar mensajes de chat o romper interfaces de otros sistemas:
```pawn
// INCORRECTO: Siempre retorna 0, anulando al gamemode
public OnPlayerText(playerid, text[])
{
    FiltroSpam(text);
    return 0; // ¡Nadie más recibirá el texto!
}

// CORRECTO:
public OnPlayerText(playerid, text[])
{
    if (FiltroSpam(text)) return 0; // Solo corta si detectó spam

    #if defined MiFiltro_OnPlayerText
        return MiFiltro_OnPlayerText(playerid, text);
    #else
        return 1;
    #endif
}
```
