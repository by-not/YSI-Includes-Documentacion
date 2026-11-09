# y_areas (Zonas Geográficas y Detección 3D)

`y_areas` es un sistema de detección espacial de alto rendimiento para SA-MP y open.mp. Permite definir volúmenes geométricos tridimensionales (esferas, cubos, cajas 2D, cilindros, ovoides y polígonos irregulares) y detectar con precisión milimétrica cuándo un jugador entra o sale de ellos, todo ello optimizado mediante particionamiento del mapa en cuadrículas (*spatial grid partitioning*).

## Módulo Requerido

```pawn
#include <YSI_Visual\y_areas>
```

## Tabla de Contenido

- [Ventajas sobre Verificaciones Manuales](#ventajas-sobre-verificaciones-manuales)
- [Tipos de Formas Geométricas](#tipos-de-formas-geometricas)
- [Referencia de Creación de Áreas](#referencia-de-creacion-de-areas)
  - [Area_AddSphere (Esferas)](#area_addsphere)
  - [Area_AddCube (Cubos / Paralelepípedos)](#area_addcube)
  - [Area_AddBox (Cajas 2D)](#area_addbox)
  - [Area_AddCircle (Círculos / Cilindros)](#area_addcircle)
  - [Area_AddPoly (Polígonos Irregulares)](#area_addpoly)
  - [Area_AddOval / Area_AddOvoid](#area_addoval--area_addovoid)
  - [Area_Delete](#area_delete)
  - [Area_IsValid](#area_isvalid)
- [Gestión de Mundos Virtuales y Jugadores](#gestion-de-mundos-virtuales-y-jugadores)
  - [Area_SetWorld / Area_GetWorld](#area_setworld--area_getworld)
  - [Area_SetAllWorlds](#area_setallworlds)
  - [Area_SetPlayer / Area_GetPlayer](#area_setplayer--area_getplayer)
  - [Area_GetPlayerAreas](#area_getplayerareas)
- [Callbacks del Sistema](#callbacks-del-sistema)
  - [OnPlayerEnterArea](#onplayerenterarea)
  - [OnPlayerLeaveArea](#onplayerleavearea)
- [Ejemplo Práctico Completo: Zona Segura (GreenZone) y Hospital](#ejemplo-practico-completo-zona-segura-greenzone-y-hospital)
- [Buenas Prácticas y Rendimiento](#buenas-practicas-y-rendimiento)

---

## Ventajas sobre Verificaciones Manuales

Muchos servidores cometen el error de verificar distancias dentro de un temporizador recurrente con `IsPlayerInRangeOfPoint` o `OnPlayerUpdate` para decenas de zonas. Esto satura el hilo principal del servidor:

- **Particionamiento Espacial**: `y_areas` divide el mapa de San Andreas en zonas internas. Cuando un jugador se mueve, el servidor solo calcula colisiones contra las áreas que realmente intersectan su cuadrícula actual, logrando un costo computacional despreciable.
- **Soporte de Polígonos Complejos**: Permite delimitar barrios enteros con formas no rectangulares (como el aeropuerto, muelles o curvas de autopista).
- **Múltiples Áreas Simultáneas**: Un jugador puede encontrarse dentro de varias áreas al mismo tiempo (ej: dentro de un hospital que a su vez está dentro de una zona segura) y el sistema gestiona los eventos de entrada y salida de cada una sin conflictos.

---

## Tipos de Formas Geométricas

| Función | Forma | Dimensiones | Casos de Uso Habituales |
| :--- | :--- | :---: | :--- |
| `Area_AddSphere` | Esfera 3D | Radio (r) en XYZ | Puntos de control, interiores flotantes, pickups. |
| `Area_AddCube` | Ortoedro 3D | Min/Max en X, Y, Z | Edificios, habitaciones, interiores de tiendas. |
| `Area_AddBox` | Rectángulo 2D | Min/Max en X, Y | Territorios de bandas, zonas agrícolas sin techo. |
| `Area_AddCircle` | Cilindro vertical | Radio en XY + altura | Torres circulares, helipuertos, túneles. |
| `Area_AddPoly` | Polígono 2D/3D | Lista de puntos (X, Y) | Delimitación de islas, distritos urbanos complejos. |

---

## Referencia de Creación de Áreas

### Area_AddSphere

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Crea una zona esférica centrada en unas coordenadas tridimensionales con un radio específico.

#### Sintaxis
```pawn
GLOBAL__ Area_AddSphere(Float:x, Float:y, Float:z, Float:r)
```

#### Parámetros
- `Float:x`, `Float:y`, `Float:z`: Posición central de la esfera.
- `Float:r`: Radio de la esfera en unidades de GTA San Andreas.

#### Retorno
Devuelve el ID asignado al área, o `NO_AREA` (-1) si se superó el límite `MAX_AREAS`.

#### Ejemplo Práctico
```pawn
new gZonaHospital;

public OnGameModeInit()
{
    // Esfera de 25 metros alrededor de la entrada del hospital de Los Santos
    gZonaHospital = Area_AddSphere(1172.0, -1323.0, 15.0, 25.0);
    return 1;
}
```

---

### Area_AddCube

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Crea un paralelepípedo recto 3D (*caja delimitadora orientada a los ejes*) definido por dos esquinas opuestas: esquinas mínimas (X, Y, Z) y máximas (X, Y, Z).

#### Sintaxis
```pawn
GLOBAL__ Area_AddCube(Float:minx, Float:miny, Float:minz, Float:maxx, Float:maxy, Float:maxz)
```

#### Parámetros
- `Float:minx`, `Float:miny`, `Float:minz`: Coordenadas de la esquina inferior trasera.
- `Float:maxx`, `Float:maxy`, `Float:maxz`: Coordenadas de la esquina superior delantera.

#### Retorno
El identificador numérico del área creada.

---

### Area_AddBox

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Crea un área rectangular plana bidimensional sin límites de altura en el eje Z (abarca desde el fondo del mar hasta el cielo).

#### Sintaxis
```pawn
GLOBAL__ Area_AddBox(Float:minx, Float:miny, Float:maxx, Float:maxy)
```

---

### Area_AddCircle

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Crea un área cilíndrica vertical con radio horizontal y límites opcionales de techo (`height`) y suelo (`depth`).

#### Sintaxis
```pawn
GLOBAL__ Area_AddCircle(Float:x, Float:y, Float:r, Float:height = 0.0, Float:depth = 0.0)
```

---

### Area_AddPoly

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock`
- **Descripción**: Crea un área con forma de polígono arbitrario delimitado por una secuencia ordenada de puntos cartesianos `(X, Y)`. Si se pasa un número impar de argumentos numéricos, el primer valor se interpreta como la altura máxima del techo (`height`).

#### Sintaxis
```pawn
stock Area_AddPoly(Float:...)
```

#### Ejemplo Práctico
```pawn
// Polígono de 4 vértices para rodear un parque
new gZonaParque = Area_AddPoly(
    100.0, -50.0,  // Punto 1 (X, Y)
    200.0, -50.0,  // Punto 2 (X, Y)
    220.0, -150.0, // Punto 3 (X, Y)
    100.0, -140.0  // Punto 4 (X, Y)
);
```

---

### Area_AddOval / Area_AddOvoid

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock`
- **Descripción**: Crea áreas elípticas en 2D (`Oval`) con radios distintos en X e Y, o elipsoides completos en 3D (`Ovoid`) con radios independientes para cada eje `(rx, ry, rz)`.

---

### Area_Delete

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Destruye un área existente liberando su ranura en memoria. Si había jugadores dentro de ella, se disparará de forma segura el evento de salida.

#### Sintaxis
```pawn
GLOBAL__ void:Area_Delete(area)
```

---

### Area_IsValid

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock`
- **Descripción**: Comprueba si un identificador de área corresponde a una zona activa y registrada.

#### Sintaxis
```pawn
stock bool:Area_IsValid(area)
```

---

## Gestión de Mundos Virtuales y Jugadores

### Area_SetWorld / Area_GetWorld

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Habilita o deshabilita la detección de un área para un mundo virtual específico. Por defecto, las áreas nuevas están activas en todos los mundos.

```pawn
GLOBAL__ void:Area_SetWorld(area, world, bool:set)
GLOBAL__ bool:Area_GetWorld(area, world)
GLOBAL__ void:Area_SetAllWorlds(area, bool:set)
```

---

### Area_SetPlayer / Area_GetPlayer

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Controla si un jugador individual es capaz de disparar los eventos de esa área (activar o silenciar la detección para dicho jugador).

```pawn
GLOBAL__ void:Area_SetPlayer(area, playerid, bool:set)
GLOBAL__ bool:Area_GetPlayer(area, playerid)
GLOBAL__ void:Area_SetAllPlayers(area, bool:set)
```

---

### Area_GetPlayerAreas

- **Módulo**: `#include <YSI_Visual\y_areas>`
- **Tipo**: `Función stock`
- **Descripción**: Itera sobre todas las áreas en las que se encuentra actualmente un jugador.

#### Sintaxis
```pawn
stock Area_GetPlayerAreas(playerid, idx)
```

#### Retorno
Devuelve el ID del área en la posición `idx`, o `NO_AREA` (-1) cuando no hay más áreas en la lista.

---

## Callbacks del Sistema

### OnPlayerEnterArea

- **Tipo**: `Callback hookeable`
- **Descripción**: Se ejecuta en el instante exacto en que un jugador cruza el perímetro hacia el interior de un área activa.

#### Firma
```pawn
public OnPlayerEnterArea(playerid, areaid)
```

---

### OnPlayerLeaveArea

- **Tipo**: `Callback hookeable`
- **Descripción**: Se dispara inmediatamente cuando el jugador sale de los límites del área o cuando el área es eliminada mientras el jugador permanecía dentro.

#### Firma
```pawn
public OnPlayerLeaveArea(playerid, areaid)
```

---

## Ejemplo Práctico Completo: Zona Segura (GreenZone) y Hospital

```pawn
#include <a_samp>
#include <YSI_Visual\y_areas>
#include <YSI_Coding\y_hooks>

new gAreaZonaSegura = NO_AREA;
new gAreaHospital = NO_AREA;

public OnGameModeInit()
{
    // Creamos un cubo de Zona Segura en el Ayuntamiento
    gAreaZonaSegura = Area_AddCube(1450.0, -1820.0, 10.0, 1550.0, -1720.0, 40.0);

    // Creamos una esfera en la entrada de urgencias del Hospital
    gAreaHospital = Area_AddSphere(1177.0, -1323.0, 14.0, 15.0);

    print("[AREAS] Zonas geográficas cargadas correctamente.");
    return 1;
}

hook OnPlayerEnterArea(playerid, areaid)
{
    if (areaid == gAreaZonaSegura)
    {
        SetPlayerArmedWeapon(playerid, 0); // Desarmar al jugador
        GameTextForPlayer(playerid, "~g~ZONA SEGURA~n~~w~Armas prohibidas", 3000, 3);
        SendClientMessage(playerid, 0x00FF00AA, "[ZONA]: Has entrado a una zona segura. El daño está restringido.");
    }
    else if (areaid == gAreaHospital)
    {
        GameTextForPlayer(playerid, "~h~~r~HOSPITAL DE LOS SANTOS", 3000, 3);
        SetPlayerHealth(playerid, 100.0); // Curación automática de bienvenida
        SendClientMessage(playerid, 0x33CCFFAA, "[HOSPITAL]: Tu salud ha sido completamente restaurada.");
    }
    return 1;
}

hook OnPlayerLeaveArea(playerid, areaid)
{
    if (areaid == gAreaZonaSegura)
    {
        SendClientMessage(playerid, 0xFF6347AA, "[ZONA]: Has salido de la zona segura.");
    }
    else if (areaid == gAreaHospital)
    {
        SendClientMessage(playerid, 0xAAAAAAFF, "[HOSPITAL]: Que tengas un buen día.");
    }
    return 1;
}
```

---

## Buenas Prácticas y Rendimiento

1. **Usa `Area_AddSphere` o `Area_AddBox` siempre que sea posible**: Las esferas y cajas implican cálculos matemáticos muy sencillos (comparaciones directas y distancia euclidiana al cuadrado), siendo las más rápidas de evaluar.
2. **Evita polígonos con decenas de vértices innecesarios**: En `Area_AddPoly`, cada vértice extra agrega una iteración al algoritmo de inclusión punto-en-polígono. Mantén las figuras con los vértices estrictamente requeridos.
3. **Controla los mundos virtuales**: Si un área pertenece a una casa o interior que solo existe en el mundo virtual 5, llama a `Area_SetAllWorlds(area, false)` y luego `Area_SetWorld(area, 5, true)` para evitar comprobaciones innecesarias a jugadores en otros mundos.
