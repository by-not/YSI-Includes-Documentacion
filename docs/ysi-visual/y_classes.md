# y_classes (Selección Dinámica de Personaje)

El sistema nativo de selección de clases de SA-MP (`AddPlayerClass`) adolece de múltiples limitaciones históricas severas:
1. Solo admite hasta 3 armas iniciales de spawn por clase.
2. Es completamente estático: una vez agregada una clase, no puede eliminarse ni ocultarse selectivamente para ciertos jugadores o rangos sin reiniciar el servidor.
3. El callback nativo `OnPlayerRequestClass` sufre problemas de debouncing (cuando el jugador presiona Shift o las flechas de dirección repetidamente, se desincroniza la cámara o se ejecutan selecciones dobles).

**`y_classes`** rediseña por completo la selección de personaje implementando un ingenioso mecanismo de hot-swapping visual (mediante 3 clases ficticias de rotación infinita) que permite añadir **cientos de clases dinámicas**, asignarles **armas ilimitadas de spawn**, asociarlas a **grupos de permisos** (`y_groups`) y borrarlas o modificarlas en tiempo real.

---

## Módulo Requerido

```pawn
#include <YSI_Visual\y_classes>
```

---

## Tabla de Contenido

- [Arquitectura Interna y Resolución del Límite de SA-MP](#arquitectura-interna-y-resolucion-del-limite-de-sa-mp)
- [Referencia de Funciones](#referencia-de-funciones)
  - [Class_Add](#class_add)
  - [Class_AddForGroup](#class_addforgroup)
  - [Class_AddWithGroupSet](#class_addwithgroupset)
  - [Class_AddEx](#class_addex)
  - [Class_Delete](#class_delete)
  - [Class_SetPlayer / Class_GetPlayer](#class_setplayer--class_getplayer)
  - [Class_Get](#class_get)
- [Funciones de Comprobación de Estado del Jugador](#funciones-de-comprobacion-de-estado-del-jugador)
  - [Player_InSelection](#player_inselection)
  - [Player_HasSpawned](#player_hasspawned)
  - [Player_IsSpawned](#player_isspawned)
- [Callbacks Extendidos](#callbacks-extendidos)
  - [OnPlayerRequestClassEx](#onplayerrequestclassex)
  - [OnPlayerRequestSpawnEx](#onplayerrequestspawnex)
- [Ejemplo Práctico Completo: Selección de Facciones Policial y Criminal](#ejemplo-practico-completo-seleccion-de-facciones-policial-y-criminal)
- [Buenas Prácticas y Consejos](#buenas-practicas-y-consejos)

---

## Arquitectura Interna y Resolución del Límite de SA-MP

Para permitir que el selector de clases de GTA San Andreas se sienta completamente fluido (permitiendo al jugador desplazarse hacia la izquierda y derecha con las flechas del teclado sin saltos bruscos), SA-MP requiere saber si el usuario se movió hacia adelante o hacia atrás.

`y_classes` crea internamente solo **tres clases nativas reales** y captura la dirección del desplazamiento. Al detectar el cambio de selección, `y_classes` aplica en milisegundos `SetPlayerSkin` y `SetSpawnInfo` con los datos de tu clase virtual personalizada. De este modo:
- Puedes tener 500 clases distintas sin saturar la tabla de clases de SA-MP.
- Cada jugador solo ve en el carrusel las clases para las cuales tiene autorización (por ejemplo, los civiles nunca verán las skins de administradores o facciones secretas en su selector).

---

## Referencia de Funciones

### Class_Add

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock`
- **Descripción**: Registra una nueva clase de personaje accesible por defecto para todos los jugadores. A diferencia del nativo `AddPlayerClass`, permite pasar una lista ilimitada de pares (arma, munición).

#### Sintaxis
```pawn
stock Class_Add(skin, Float:x, Float:y, Float:z, Float:a, ...)
```

#### Parámetros
- `skin`: ID del modelo de personaje (0 a 311).
- `Float:x`, `Float:y`, `Float:z`: Posición tridimensional de spawn.
- `Float:a`: Ángulo de rotación inicial de la cámara/personaje.
- `...` (argumentos variables): Pares opcionales de arma y munición en formato `arma1, municion1, arma2, municion2, ...`.

#### Retorno
Devuelve el identificador de la clase virtual creada.

#### Ejemplo Práctico
```pawn
public OnGameModeInit()
{
    // Clase Civil con Skin de CJ, bate de béisbol y cámara fotográfica
    new claseCivil = Class_Add(
        0, 
        1753.0, -1894.0, 13.5, 90.0,
        WEAPON_BAT, 1,
        WEAPON_CAMERA, 50
    );
    return 1;
}
```

---

### Class_AddForGroup

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock`
- **Descripción**: Registra una clase que **únicamente** aparecerá en el carrusel de selección para los jugadores que pertenezcan al grupo de permisos especificado (`Group:group`).

#### Sintaxis
```pawn
stock Class_AddForGroup(Group:group, skin, Float:x, Float:y, Float:z, Float:a, ...)
```

---

### Class_AddWithGroupSet

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock`
- **Descripción**: Registra una clase abierta a cualquier jugador, pero al momento en que el jugador presiona `Spawn` y aparece en el mapa, es **añadido automáticamente** al grupo indicado.

#### Sintaxis
```pawn
stock Class_AddWithGroupSet(Group:group, skin, Float:x, Float:y, Float:z, Float:a, ...)
```

---

### Class_AddEx

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock`
- **Descripción**: Combina ambas capacidades: exige que el jugador pertenezca a `forgroup` para poder visualizar la clase, y al seleccionarla lo agrega al grupo `setgroup`.

#### Sintaxis
```pawn
stock Class_AddEx(Group:forgroup, Group:setgroup, skin, Float:x, Float:y, Float:z, Float:a, ...)
```

---

### Class_Delete

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Elimina por completo una clase virtual del servidor en tiempo de ejecución.

#### Sintaxis
```pawn
GLOBAL__ void:Class_Delete(classid)
```

---

### Class_SetPlayer / Class_GetPlayer

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Otorga o revoca el acceso a una clase específica para un único jugador individualmente.

#### Sintaxis
```pawn
GLOBAL__ void:Class_SetPlayer(classid, playerid, bool:set)
GLOBAL__ bool:Class_GetPlayer(classid, playerid)
```

---

### Class_Get

- **Módulo**: `#include <YSI_Visual\y_classes>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Devuelve la clase virtual que el jugador tiene seleccionada actualmente en pantalla.

#### Sintaxis
```pawn
GLOBAL__ Class_Get(playerid)
```

---

## Funciones de Comprobación de Estado del Jugador

`y_classes` incorpora utilidades fundamentales para conocer el ciclo de vida de spawn del jugador:

### Player_InSelection

```pawn
stock bool:Player_InSelection(playerid)
```
Devuelve `true` si el jugador se encuentra activamente en la pantalla de selección de personajes con las flechas y el botón de Spawn.

### Player_HasSpawned

```pawn
stock bool:Player_HasSpawned(playerid)
```
Devuelve `true` si el jugador ha aparecido (*spawned*) al menos una vez desde que se conectó al servidor.

### Player_IsSpawned

```pawn
stock bool:Player_IsSpawned(playerid)
```
Devuelve `true` únicamente si el jugador está vivo y en el juego activo (es decir, ya ha spawneado y no está actualmente en el menú de selección de personajes).

---

## Callbacks Extendidos

### OnPlayerRequestClassEx

- **Tipo**: `Callback hookeable`
- **Descripción**: Sustituto mejorado de `OnPlayerRequestClass`. Proporciona directamente el `classid` virtual real creado con `Class_Add`, en lugar del confuso índice rotativo interno de SA-MP.

#### Firma
```pawn
public OnPlayerRequestClassEx(playerid, classid)
```

#### Retorno
- `1`: Permite mostrar la clase.
- `0`: Fuerza a saltar a la siguiente clase permitida.

---

### OnPlayerRequestSpawnEx

- **Tipo**: `Callback hookeable`
- **Descripción**: Sustituto seguro de `OnPlayerRequestSpawn`. Incorpora protección anti-spam debouncing (evita que pulsar dos veces Shift rompa la lógica del script).

#### Firma
```pawn
public OnPlayerRequestSpawnEx(playerid, classid)
```

---

## Ejemplo Práctico Completo: Selección de Facciones Policial y Criminal

```pawn
#include <a_samp>
#include <YSI_Players\y_groups>
#include <YSI_Visual\y_classes>
#include <YSI_Coding\y_hooks>

new Group:gGrupoPolicia;
new gClasePoliciaLS;
new gClaseCivilCJ;

public OnGameModeInit()
{
    // Crear el grupo de policías
    gGrupoPolicia = Group_Create("Policia");

    // Clase Civil: abierta a todos, spawnea en la estación de trenes con una lata de spray
    gClaseCivilCJ = Class_Add(
        0, 
        1753.0, -1894.0, 13.5, 0.0,
        WEAPON_SPRAYCAN, 500
    );

    // Clase Policía: solo visible para quienes estén en el grupo policial
    // Aparece en la comisaría de Los Santos con Desert Eagle, M4 y Porra
    gClasePoliciaLS = Class_AddForGroup(
        gGrupoPolicia,
        280, 
        1553.0, -1675.0, 16.0, 90.0,
        WEAPON_NITESTICK, 1,
        WEAPON_DEAGLE, 150,
        WEAPON_M4, 300
    );

    return 1;
}

hook OnPlayerRequestClassEx(playerid, classid)
{
    // Configurar cámara atractiva frente al personaje
    SetPlayerPos(playerid, 254.0, -41.0, 1002.0);
    SetPlayerCameraPos(playerid, 258.0, -41.0, 1002.5);
    SetPlayerCameraLookAt(playerid, 254.0, -41.0, 1002.0);
    SetPlayerFacingAngle(playerid, 270.0);

    if (classid == gClasePoliciaLS)
    {
        GameTextForPlayer(playerid, "~b~DEPARTAMENTO DE POLICIA", 2000, 3);
    }
    else if (classid == gClaseCivilCJ)
    {
        GameTextForPlayer(playerid, "~y~CIUDADANO CIVIL", 2000, 3);
    }
    return 1;
}

hook OnPlayerRequestSpawnEx(playerid, classid)
{
    SendClientMessage(playerid, 0x00FF00AA, "¡Has aparecido en el servidor! Bienvenido.");
    return 1;
}
```

---

## Buenas Prácticas y Consejos

1. **Evita mezclar `AddPlayerClass` estándar con `Class_Add`**: `y_classes` intercepta el flujo del carrusel de personajes. Usar llamadas nativas `AddPlayerClass` tradicionales en paralelo puede desincronizar los punteros internos de la cámara.
2. **Utiliza `Class_AddForGroup` para roles cerrados**: En vez de rechazar al jugador en `OnPlayerRequestSpawn` cuando elige un skin prohibido, utiliza grupos para que los jugadores ni siquiera puedan navegar ni previsualizar skins que no les corresponden.
3. **Comprueba `Player_IsSpawned(playerid)` en comandos de teletransporte**: Comandos como `/ir` o `/traer` deben comprobar si el objetivo está actualmente jugando para no teletransportar a alguien que se encuentre en medio del menú de selección de personajes.
