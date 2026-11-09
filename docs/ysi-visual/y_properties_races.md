# y_properties & y_races (Propiedades y Carreras)

Este documento detalla dos módulos visuales y de mecánicas de juego incluidos en YSI:
1. **`y_properties`**: Sistema integral de bienes raíces, negocios con ganancias pasivas, casas con interiores, bancos, armerías automáticas, teletransportes de peaje y áreas prohibidas con penalización de salud o expulsión.
2. **`y_races`**: Motor de carreras multijugador con checkpoints secuenciales, líneas de salida escalonadas, conteo regresivo sincronizado, soporte para vueltas (*laps*), premios automáticos por podio y cálculo de tiempos por vuelta y total.

---

## Módulos Requeridos

```pawn
#include <YSI_Visual\y_properties>
#include <YSI_Visual\y_races>
```

---

## Tabla de Contenido

- [Parte 1: y_properties (Economía y Bienes Raíces)](#parte-1-y_properties-economia-y-bienes-raices)
  - [CreateProperty (Negocios con Ingresos)](#createproperty)
  - [CreateHouse (Casas e Interiores)](#createhouse)
  - [CreateBank (Cajeros y Bancos)](#createbank)
  - [CreateAmmunation (Armería Dinámica)](#createammunation)
  - [CreateTeleport (Puertas y Teletransportes)](#createteleport)
  - [CreateForbiddenArea (Zonas Prohibidas)](#createforbiddenarea)
  - [CreateMoneyArea (Zonas de Recompensa)](#createmoneyarea)
  - [Configuración de Límites de Propiedades](#configuracion-de-limites-de-propiedades)
- [Parte 2: y_races (Sistema de Carreras Multijugador)](#parte-2-y_races-sistema-de-carreras-multijugador)
  - [Race_Create](#race_create)
  - [Race_AddCheckpoint](#race_addcheckpoint)
  - [Race_AddStart](#race_addstart)
  - [Race_Start](#race_start)
  - [Race_PlayerJoin / Race_PlayerLeave](#race_playerjoin--race_playerleave)
  - [Race_SetPrize](#race_setprize)
  - [Callbacks de Carreras](#callbacks-de-carreras)
- [Ejemplos Prácticos Completos](#ejemplos-practicos-completos)
- [Buenas Prácticas](#buenas-practicas)

---

# Parte 1: y_properties (Economía y Bienes Raíces)

### CreateProperty

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Registra un negocio comprable en el mapa. Genera beneficios periódicos para su dueño y permite ser recomprado por otros jugadores a un precio mayor.

#### Sintaxis
```pawn
stock CreateProperty(
    const string:name[], 
    Float:x, Float:y, Float:z, 
    price, 
    reward, 
    interval, 
    sell, 
    multi, 
    reduce
)
```

#### Parámetros
- `name[]`: Nombre comercial del negocio (ej: `"Gasolinera Idlewood"`).
- `Float:x`, `Float:y`, `Float:z`: Ubicación del punto de compra/cobro.
- `price`: Precio de compra inicial.
- `reward`: Cantidad de dinero que genera periódicamente a su propietario.
- `interval`: Intervalo de tiempo (en segundos) en el que se paga la recompensa.
- `sell`: Precio que recibe el dueño si decide vender la propiedad.
- `multi`: Porcentaje multiplicador de sobrecoste si otro jugador intenta arrebatarle el negocio al dueño actual.
- `reduce`: Reducción porcentual del precio si pasa mucho tiempo sin comprador.

#### Retorno
El identificador de la propiedad creada.

---

### CreateHouse

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Crea una residencia residencial con entrada exterior, salida interior, mundo virtual exclusivo e indicador de checkpoint.

#### Sintaxis
```pawn
stock CreateHouse(
    Float:extX, Float:extY, Float:extZ, 
    Float:intX, Float:intY, Float:intZ, 
    interior, 
    world, 
    price, 
    checkpoint
)
```

#### Parámetros
- `extX`, `extY`, `extZ`: Coordenadas exteriores (calle).
- `intX`, `intY`, `intZ`: Coordenadas interiores (al entrar a la casa).
- `interior`: ID de interior de GTA (para texturas e iluminación).
- `world`: Virtual World único para aislar a los habitantes de la vivienda.
- `price`: Coste de adquisición de la casa.
- `checkpoint`: `1` para dibujar marcador luminoso en la puerta exterior, `0` para ocultarlo.

---

### CreateBank

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Crea una entidad bancaria o cajero automático (ATM) donde los usuarios pueden depositar y retirar fondos. Los saldos pueden ser persistidos mediante `y_ini`.

#### Sintaxis
```pawn
stock CreateBank(Float:x, Float:y, Float:z, const string:name[])
```

---

### CreateAmmunation

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Registra una tienda de armas automatizada que genera menús de compra dinámicos con entrega inmediata o al respawnear.

#### Sintaxis
```pawn
stock CreateAmmunation(Float:x, Float:y, Float:z, spawn, instant, ...)
```

#### Parámetros
- `Float:x`, `Float:y`, `Float:z`: Ubicación del mostrador de venta.
- `spawn`: `1` si las armas compradas se entregan automáticamente cada vez que el jugador reaparece (*spawn weapons*); `0` si solo duran la vida actual.
- `instant`: `1` si las armas se entregan de inmediato en el inventario al pagar.
- `...`: Tríos ordenados de parámetros: `weaponid, municion, precio`.

#### Ejemplo de Armería
```pawn
// Armería en Ammu-Nation de Willowfield con Pistola 9mm y Escopeta
CreateAmmunation(
    286.0, -40.0, 1001.5, 
    0, 1,
    WEAPON_COLT45, 100, 250,
    WEAPON_SHOTGUN, 50, 600
);
```

---

### CreateTeleport

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Crea un portal instantáneo que traslada al jugador a una coordenada destino cobrándole una tasa de peaje o transporte.

#### Sintaxis
```pawn
stock CreateTeleport(
    Float:sx, Float:sy, Float:sz, 
    Float:tx, Float:ty, Float:tz, 
    cost, 
    const string:name[]
)
```

---

### CreateForbiddenArea

- **Módulo**: `#include <YSI_Visual\y_properties>`
- **Tipo**: `Función stock`
- **Descripción**: Asocia un área geográfica creada con `y_areas` para restringir el paso de jugadores. Puede empujarlos hacia atrás continuamente (`kick = 1`) o restarles vida gradualmente mientras permanezcan en ella.

#### Sintaxis
```pawn
stock CreateForbiddenArea(area, kick, health, invert, const string:name[])
```

---

### Configuración de Límites de Propiedades

```pawn
// Limitar a máximo 2 casas y 3 negocios por jugador
Property_SetMaxHouses(2);
Property_SetMaxProperties(3);
```

---

# Parte 2: y_races (Sistema de Carreras Multijugador)

`y_races` ofrece una solución integral para competiciones de vehículos o carreras a pie.

### Race_Create

- **Módulo**: `#include <YSI_Visual\y_races>`
- **Tipo**: `Función stock`
- **Descripción**: Inicializa una nueva instancia de carrera en el servidor.

#### Sintaxis
```pawn
stock Race_Create(
    laps = 0, 
    entryCost = 0, 
    countdown = 3, 
    bool:arial = false, 
    bool:fixedPrize = true, 
    exitTime = 0, 
    interior = 0, 
    world = 0
)
```

#### Parámetros
- `laps`: Número de vueltas (si es `0`, la carrera es de punto A a punto B en línea recta).
- `entryCost`: Tarifa de inscripción en dinero que debe abonar cada participante.
- `countdown`: Segundos de cuenta regresiva sincronizada antes del pistoletazo de salida (ej: 3, 2, 1, GO!).
- `arial`: `true` si es una carrera aérea (usa checkpoints cilíndricos aéreos de GTA), `false` para vehículos terrestres.
- `fixedPrize`: `true` si los premios están prefijados con `Race_SetPrize`, `false` si el pozo acumulado de las inscripciones se reparte entre los ganadores.
- `exitTime`: Segundos permitidos fuera del vehículo antes de ser descalificado.

---

### Race_AddCheckpoint

- **Módulo**: `#include <YSI_Visual\y_races>`
- **Tipo**: `Función stock`
- **Descripción**: Agrega un punto de control secuencial al trazado de la carrera.

```pawn
FOREIGN__ Race_AddCheckpoint(raceid, Float:x, Float:y, Float:z);
```

---

### Race_AddStart

- **Módulo**: `#include <YSI_Visual\y_races>`
- **Tipo**: `Función stock`
- **Descripción**: Agrega una posición de parrilla de salida con ángulo de orientación. Conforme los jugadores se unen, ocupan las posiciones disponibles sucesivamente.

```pawn
FOREIGN__ Race_AddStart(raceid, Float:x, Float:y, Float:z, Float:a);
```

---

### Race_Start / Race_PlayerJoin / Race_PlayerLeave

```pawn
// Unirse a la carrera
FOREIGN__ Race_PlayerJoin(playerid, raceid);

// Abandonar la carrera
forward Race_PlayerLeave(playerid, bool:refund = false);

// Iniciar el conteo regresivo de la carrera
FOREIGN__ Race_Start(raceid);
```

---

### Race_SetPrize

- **Módulo**: `#include <YSI_Visual\y_races>`
- **Tipo**: `Función stock`
- **Descripción**: Configura el monto en efectivo otorgado a los pilotos que finalicen en el podio.

```pawn
FOREIGN__ void:Race_SetPrize(raceid, position, amount);
```
- `position`: Posición de podio (1 para 1er puesto, 2 para 2do puesto, 3 para 3er puesto).

---

### Callbacks de Carreras

```pawn
// Se dispara cuando un corredor cruza la meta final
forward OnPlayerFinishRace(playerid, raceid, position, prize, time);

// Se dispara cuando la carrera concluye definitivamente para todos
forward OnRaceEnd(raceid);

// Se dispara si un corredor abandona o es descalificado
forward OnPlayerExitRace(playerid, raceid);
```

---

## Ejemplos Prácticos Completos

### Ejemplo: Creación y Ejecución de una Carrera Urbana en Los Santos

```pawn
#include <a_samp>
#include <YSI_Visual\y_races>
#include <YSI_Visual\y_commands>
#include <YSI_Coding\y_hooks>

new gCarreraLS;

public OnGameModeInit()
{
    // Carrera de 1 vuelta, costo $100, cuenta atrás de 3s
    gCarreraLS = Race_Create(.laps = 1, .entryCost = 100, .countdown = 3);

    // Posiciones en parrilla de salida (Grid)
    Race_AddStart(gCarreraLS, 1480.0, -1730.0, 13.5, 0.0);
    Race_AddStart(gCarreraLS, 1475.0, -1730.0, 13.5, 0.0);
    Race_AddStart(gCarreraLS, 1470.0, -1730.0, 13.5, 0.0);

    // Trazado de Checkpoints
    Race_AddCheckpoint(gCarreraLS, 1480.0, -1650.0, 13.5);
    Race_AddCheckpoint(gCarreraLS, 1420.0, -1650.0, 13.5);
    Race_AddCheckpoint(gCarreraLS, 1420.0, -1730.0, 13.5);
    Race_AddCheckpoint(gCarreraLS, 1480.0, -1730.0, 13.5); // Meta

    // Premios
    Race_SetPrize(gCarreraLS, 1, 1000); // 1er lugar: $1000
    Race_SetPrize(gCarreraLS, 2, 500);  // 2do lugar: $500
    Race_SetPrize(gCarreraLS, 3, 250);  // 3er lugar: $250

    return 1;
}

@cmd() unirse(playerid, params[], help)
{
    if (Race_PlayerJoin(playerid, gCarreraLS))
    {
        SendClientMessage(playerid, 0x00FF00AA, "¡Te has inscrito en la carrera! Espera al organizador.");
    }
    else
    {
        SendClientMessage(playerid, 0xFF0000AA, "No fue posible unirte (fondos insuficientes o carrera llena).");
    }
    return 1;
}

@cmd() iniciarcarrera(playerid, params[], help)
{
    Race_Start(gCarreraLS);
    SendClientMessageToAll(0xFFFF00AA, "¡La carrera de Los Santos está a punto de comenzar!");
    return 1;
}

hook OnPlayerFinishRace(playerid, raceid, position, prize, time)
{
    new nombre[MAX_PLAYER_NAME], str[144];
    GetPlayerName(playerid, nombre, sizeof(nombre));

    format(str, sizeof(str), "¡%s finalizó en posición #%d con un tiempo de %d ms! Premio: $%d", nombre, position, time, prize);
    SendClientMessageToAll(0x33CCFFAA, str);
    return 1;
}
```

---

## Buenas Prácticas

1. **Destruye carreras en desuso**: Si generas carreras dinámicas creadas por administradores, asegúrate de llamar a `Race_Destroy(raceid, true)` para reembolsar las inscripciones a los jugadores y no consumir ranuras del array de carreras.
2. **Combina `y_properties` con `y_ini`**: `y_properties` guarda automáticamente armas y balances bancarios en estructuras adler32 preparadas para vincularse con `y_ini` o bases de datos relacionales en `OnPlayerDisconnect`.
