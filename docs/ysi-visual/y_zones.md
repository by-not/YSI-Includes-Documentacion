# y_zonenames & y_zonepulse (Zonas y GangZones Dinámicas)

Este documento cubre los dos módulos de YSI orientados a la gestión geográfica de zonas y territorios de bandas en el mapa y minimapa de GTA San Andreas:
1. **`y_zonenames`**: Detección cartográfica automática de todos los distritos, ciudades y barrios de San Andreas (más de 110 zonas mapeadas con precisión poligonal) y visualización del rótulo emergente oficial de la zona en pantalla al entrar a un nuevo barrio, emulando la estética de GTA San Andreas monojugador.
2. **`y_zonepulse`**: Sistema de animación de color suave (*fading / interpolación RGBA*) para zonas de bandas (`GangZone`) en el radar y mapa de pausa (`ESC`), permitiendo efectos de disputa de territorio (*turf war* palpitante) con cálculo matemático continuo entre dos colores.

---

## Módulos Requeridos

```pawn
#include <YSI_Visual\y_zonenames>
#include <YSI_Visual\y_zonepulse>
```

## Tabla de Contenido

- [Parte 1: y_zonenames (Rótulos de Barrios de GTA)](#parte-1-y_zonenames-rotulos-de-barrios-de-gta)
  - [Funcionamiento Automático](#funcionamiento-automatico)
  - [Zonas Incluidas](#zonas-incluidas)
  - [Referencia de Funciones](#referencia-de-funciones-y_zonenames)
    - [ZoneNames_Show](#zonenames_show)
- [Parte 2: y_zonepulse (Pulso y Fading de GangZones)](#parte-2-y_zonepulse-pulso-y-fading-de-gangzones)
  - [Fórmula de Interpolación de Color](#formula-de-interpolacion-de-color)
  - [Referencia de Funciones](#referencia-de-funciones-y_zonepulse)
    - [GangZonePulse](#gangzonepulse)
    - [GangZonePulseForPlayer](#gangzonepulseforplayer)
    - [GangZonePulseForAll](#gangzonepulseforall)
    - [GangZoneStopPulse](#gangzonestoppulse)
    - [GangZoneStopPulseForPlayer](#gangzonestoppulseforplayer)
    - [GangZoneStopPulseForAll](#gangzonestoppulseforall)
- [Ejemplos Prácticos Completos](#ejemplos-practicos-completos)
- [Buenas Prácticas](#buenas-practicas)

---

# Parte 1: y_zonenames (Rótulos de Barrios de GTA)

### Funcionamiento Automático

Al incluir `<YSI_Visual\y_zonenames>` en tu script, el módulo se engancha automáticamente mediante el sistema maestro (`y_master`) y `y_areas`:
- Al arrancar el servidor (`OnYSIInit`), crea en memoria las áreas tridimensionales y poligonales correspondientes a cada región de San Andreas.
- Cuando un jugador camina, conduce o vuela de un distrito a otro (por ejemplo, al cruzar de *Ganton* a *Idlewood*, o entrar a *Vinewood*), `y_zonenames` genera un textdraw en la esquina inferior de la pantalla con la tipografía oficial del juego, lo muestra durante 3 segundos y lo desvanece de forma limpia.
- Si el jugador muere o se desconecta, el textdraw se oculta de inmediato para no solaparse con la pantalla de reaparición o menús de login.

### Zonas Incluidas

`y_zonenames` abarca todo el archipiélago de San Andreas:
- **Ciudades**: Los Santos, San Fierro, Las Venturas.
- **Condados**: Red County, Flint County, Bone County, Tierra Robada, Whetstone.
- **Barrios Urbanos**: Ganton, Idlewood, Jefferson, Glen Park, Commerce, Market, Rodeo, Garcia, Hashbury, Queens, Paradiso, Calton Heights, The Strip, Redsands, Rockshore, Prickle Pine, entre muchos otros.

---

### Referencia de Funciones (`y_zonenames`)

#### ZoneNames_Show

- **Módulo**: `#include <YSI_Visual\y_zonenames>`
- **Tipo**: `Función stock`
- **Descripción**: Muestra manualmente el cartel de zona con el ID especificado a un jugador durante 3 segundos, ocultando cualquier rótulo previo.

##### Sintaxis
```pawn
stock ZoneNames_Show(playerid, id)
```

##### Parámetros
- `playerid`: ID del jugador que verá el textdraw.
- `id`: Índice numérico de la zona (0 a 111).

---

# Parte 2: y_zonepulse (Pulso y Fading de GangZones)

El sistema nativo de SA-MP (`GangZoneFlashForAll`) solo produce un parpadeo tosco y binario entre el color original y un color secundario mediante cortes bruscos.

`y_zonepulse` calcula en tiempo real mediante temporizadores de alta precisión la **transición gradual y continua** entre los cuatro canales de color (Rojo, Verde, Azul y Alfa), logrando una respiración o pulsación visualmente atractiva en el radar.

---

### Fórmula de Interpolación de Color

Cada `ZONE_PULSE_STAGE_TIME` (50 milisegundos por defecto), `y_zonepulse` descompone los colores hexadecimales en bytes independientes:
$$R_{actual} = R_{inicio} + \frac{(R_{destino} - R_{inicio}) \times etapa}{tiempo}$$
Esto permite que una zona verde de los *Grove Street Families* se transforme lentamente en el púrpura de los *Ballas* y luego regrese suavemente a su tonalidad original.

---

### Referencia de Funciones (`y_zonepulse`)

#### GangZonePulse

- **Módulo**: `#include <YSI_Visual\y_zonepulse>`
- **Tipo**: `Macro / Función stock`
- **Descripción**: Inicia la pulsación de una zona para un conjunto de jugadores (*PlayerSet* de `y_playerset`).

##### Sintaxis
```pawn
stock GangZonePulse(
    @PlayerSet:ps, 
    zone, 
    from, 
    to, 
    time, 
    delay = ZONE_PULSE_STAGE_TIME
)
```

#### Parámetros
- `@PlayerSet:ps`: Conjunto o grupo de jugadores receptores del efecto.
- `zone`: ID de la GangZone creada previamente con `GangZoneCreate`.
- `from`: Color RGBA de partida en formato hexadecimal (ej: `0x00FF0088` - verde translúcido).
- `to`: Color RGBA de destino en formato hexadecimal (ej: `0xFF000088` - rojo translúcido).
- `time`: Duración en milisegundos de la transición de ida (y de vuelta).
- `delay` (opcional): Tiempo de reposo en cada extremo del pulso antes de comenzar a regresar.

---

#### GangZonePulseForPlayer

- **Módulo**: `#include <YSI_Visual\y_zonepulse>`
- **Tipo**: `Macro / Función stock`
- **Descripción**: Inicia la animación de pulso de la GangZone únicamente para un jugador específico.

##### Sintaxis
```pawn
GangZonePulseForPlayer(playerid, zone, from, to, time, delay = ZONE_PULSE_STAGE_TIME)
```

---

#### GangZonePulseForAll

- **Módulo**: `#include <YSI_Visual\y_zonepulse>`
- **Tipo**: `Macro / Función stock`
- **Descripción**: Inicia la animación de pulso de la GangZone para todos los jugadores actualmente conectados en el servidor.

##### Sintaxis
```pawn
GangZonePulseForAll(zone, from, to, time, delay = ZONE_PULSE_STAGE_TIME)
```

---

#### GangZoneStopPulse / GangZoneStopPulseForPlayer / GangZoneStopPulseForAll

- **Módulo**: `#include <YSI_Visual\y_zonepulse>`
- **Tipo**: `Macro / Función stock`
- **Descripción**: Detiene de inmediato el temporizador de interpolación y fija la zona en su estado estático.

##### Sintaxis
```pawn
GangZoneStopPulse(@PlayerSet:ps, zone)
GangZoneStopPulseForPlayer(playerid, zone)
GangZoneStopPulseForAll(zone)
```

---

## Ejemplos Prácticos Completos

### Ejemplo: Territorio de Banda en Disputa (Ganton)

En este ejemplo realista, se crea una zona en Ganton. Cuando una banda inicia una conquista con `/atacar`, la zona comienza a palpitar entre verde y amarillo. Al terminar, la zona se detiene y adquiere el color definitivo de la banda ganadora.

```pawn
#include <a_samp>
#include <YSI_Visual\y_zonenames>
#include <YSI_Visual\y_zonepulse>
#include <YSI_Visual\y_commands>
#include <YSI_Coding\y_timers>

new gZonaGanton;
new bool:gEnDisputa = false;

// Definición de colores RGBA con transparencia
#define COLOR_GROVE_STREET   0x228B22AA // Verde
#define COLOR_VAGOS          0xFFD700AA // Amarillo

public OnGameModeInit()
{
    // Delimitamos el barrio de Ganton
    gZonaGanton = GangZoneCreate(2190.0, -1740.0, 2550.0, -1620.0);
    GangZoneShowForAll(gZonaGanton, COLOR_GROVE_STREET);

    print("[GANGZONES] Territorio de Ganton inicializado.");
    return 1;
}

@cmd() atacar(playerid, params[], help)
{
    if (gEnDisputa)
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Este territorio ya está en guerra actualmente.");
    }

    gEnDisputa = true;
    SendClientMessageToAll(0xFF6347AA, "¡ALERTA DE BANDA: El territorio de Ganton está siendo disputado!");

    // Iniciar pulsación suave entre Verde y Amarillo (duración 800ms por transición)
    GangZonePulseForAll(gZonaGanton, COLOR_GROVE_STREET, COLOR_VAGOS, 800);

    // Concluir la disputa tras 2 minutos (120,000 ms)
    defer FinalizarGuerraTerritorio();
    return 1;
}

timer FinalizarGuerraTerritorio[120000]()
{
    gEnDisputa = false;

    // Detener la animación de pulso para todos
    GangZoneStopPulseForAll(gZonaGanton);

    // Supongamos que los Vagos vencieron: dejamos el color amarillo estático
    GangZoneShowForAll(gZonaGanton, COLOR_VAGOS);

    SendClientMessageToAll(0xFFD700AA, "¡La guerra de bandas ha finalizado! Los Vagos han tomado Ganton.");
}
```

---

## Buenas Prácticas

1. **Ajusta `time` a valores no inferiores a 300 ms**: Si defines un tiempo de transición extremadamente bajo (por ejemplo, 50 ms), el cliente de SA-MP recibirá actualizaciones de color con excesiva frecuencia, saturando el ancho de banda innecesariamente. Una transición de entre 600 ms y 1200 ms ofrece un efecto visual agradable y fluido con muy bajo consumo de red.
2. **Detén la pulsación al desconectar un jugador**: Si utilizas `GangZonePulseForPlayer`, `y_zonepulse` limpia internamente las variables `PVar`, pero es una buena práctica llamar a `GangZoneStopPulseForPlayer` si el jugador abandona un minijuego o modo de arena antes de cambiar de mundo virtual.
3. **`y_zonenames` funciona de manera automática**: No requieres invocar callbacks manualmente para que los carteles de barrio aparezcan al explorar el mapa; la librería se encarga de todo el ciclo de vida a través de `OnPlayerEnterArea`.
