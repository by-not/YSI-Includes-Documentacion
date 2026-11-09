# y_game_data (Datos de Juego: Vehículos y Armas)

El paquete `YSI_Game` compila dos de las bases de datos de información estática más completas, eficientes y optimizadas para Grand Theft Auto: San Andreas en SA-MP y open.mp:
1. **`y_vehicledata`**: Base de datos de modelos de vehículos (400–611), nombres oficiales, categorías, número de asientos, velocidades tope teóricas, velocidad real en KM/H y banderas de clasificación.
2. **`y_weapondata`**: Base de datos integral de armas (0–46), nombres, slots de inventario, tipos de fuego/daño, calibres de munición, rangos de alcance balístico y grupos de animación de disparo.

Ambas bibliotecas emplean cadenas empaquetadas (*packed strings*) y tablas precomputadas en memoria fija para garantizar tiempos de consulta $O(1)$ sin sobrecargar el servidor con consultas a bases de datos secundarias.

---

## Introducción

En el scripting convencional de SA-MP, tareas cotidianas como obtener el nombre legible de un coche ("Infernus"), saber cuántos pasajeros admite un vehículo o consultar a qué slot pertenece una escopeta suelen resolverse mediante estructuras `switch` kilométricas o arreglos dispersos copiados de foros con datos incompletos.

`YSI_Game` centraliza toda esta información mediante:
- **Cero duplicación de datos:** Tablas altamente comprimidas en el segmento de datos del binario AMX.
- **Acceso multidimensional unificado:** Permite consultar por ID de entidad del servidor (`vehicleid`), por modelo de GTA (`modelid` 400..611) o mediante el índice interno optimizado `VIM` (*Vehicle Internal Modelid*, 0..213).
- **Cálculos matemáticos integrados:** Funciones automáticas de cálculo de velocidad tridimensional con vectores de física.

### Inclusión en el proyecto

```pawn
#include <openmultiplayer>
#include <YSI_Game\y_vehicledata>
#include <YSI_Game\y_weapondata>
```

---

## Tabla de Contenido

1. [y_vehicledata: Datos de Vehículos](#y_vehicledata-datos-de-vehiculos)
   - [Las Tres Capas de Consulta: Vehicle_*, Model_* y VIM_*](#las-tres-capas-de-consulta)
   - [Nombres de Vehículos (Vehicle_Name / Vehicle_GetName)](#nombres-de-vehiculos)
   - [Asientos y Pasajeros (Vehicle_Seats)](#asientos-y-pasajeros)
   - [Velocidad Máxima Teórica (Vehicle_TopSpeed)](#velocidad-maxima-teorica)
   - [Velocidad Real de Conducción (Vehicle_Speed)](#velocidad-real-de-conduccion)
   - [Categorías de Vehículos (Vehicle_GetCategory)](#categorias-de-vehiculos)
   - [Banderas y Comprobaciones Booleanas (Vehicle_Is*)](#banderas-y-comprobaciones-booleanas)
2. [y_weapondata: Datos de Armas](#y_weapondata-datos-de-armas)
   - [Validación (Weapon_IsValid)](#validacion-weapon_isvalid)
   - [Slots de Inventario (Weapon_GetSlot)](#slots-de-inventario-weapon_getslot)
   - [Modelos de Objeto 3D (Weapon_GetModelID / Weapon_GetIDFromModelID)](#modelos-de-objeto-3d)
   - [Tipos de Disparo y Daño (Weapon_GetFireType)](#tipos-de-disparo-y-danio)
   - [Calibres de Munición (Weapon_GetAmmoName)](#calibres-de-municion)
   - [Rangos Balísticos Mínimo y Máximo (Weapon_GetMinRange / Weapon_GetMaxRange)](#rangos-balisticos)
   - [Grupos de Animación (Weapon_GetAnimGroup / Weapon_GetProAnimGroup)](#grupos-de-animacion)
   - [Clasificaciones Booleanas (Weapon_IsPistol, Weapon_IsShotgun, etc.)](#clasificaciones-booleanas)
3. [Ejemplos Prácticos Completos](#ejemplos-practicos-completos)
   - [Ejemplo 1: Velocímetro HUD en Pantalla](#ejemplo-1-velocimetro-hud-en-pantalla)
   - [Ejemplo 2: Sistema de Tienda Ammu-Nation Inteligente](#ejemplo-2-sistema-de-tienda-ammu-nation-inteligente)
4. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## y_vehicledata: Datos de Vehículos

### Las Tres Capas de Consulta

`y_vehicledata` organiza todas sus operaciones en 3 niveles conceptuales:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Vehicle_* (ID de Vehículo: 1..MAX_VEHICLES)              │
│    Obtiene el modelo con GetVehicleModel() y consulta VIM.  │
├─────────────────────────────────────────────────────────────┤
│ 2. Model_* (Modelo de SA-MP: 400..611)                      │
│    Convierte el modelo a índice interno VIM.                │
├─────────────────────────────────────────────────────────────┤
│ 3. VIM_* (Vehicle Internal Modelid: 0..213)                 │
│    Acceso directo en O(1) al índice crudo del array.        │
└─────────────────────────────────────────────────────────────┘
```

---

### Nombres de Vehículos

- **Módulo:** `#include <YSI_Game\y_vehicledata>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Obtiene el nombre oficial en inglés de GTA San Andreas correspondiente al vehículo.
  - `Vehicle_Name(vehicleid)`: Retorna la cadena empaquetada directamente.
  - `Vehicle_GetName(vehicleid, dest[], size = sizeof dest)`: Desempaqueta y copia el nombre en un arreglo de texto legible.
  - Equivalentes: `Model_Name(modelid)`, `Model_GetName(modelid, dest[])`.

#### Sintaxis
```pawn
Vehicle_Name(vehicleid)
Vehicle_GetName(vehicleid, dest[], size = sizeof (dest))
Model_Name(modelid)
Model_GetName(modelid, dest[], size = sizeof (dest))
```

#### Ejemplo Práctico
```pawn
public OnPlayerEnterVehicle(playerid, vehicleid, ispassenger)
{
    new nombreVehiculo[32];
    Vehicle_GetName(vehicleid, nombreVehiculo);
    va_SendClientMessage(playerid, -1, "Has subido a un {00FF00}%s{FFFFFF}.", nombreVehiculo);
    return 1;
}
```

---

### Asientos y Pasajeros

- **Módulo:** `#include <YSI_Game\y_vehicledata>`
- **Tipo:** Macro preprocesador
- **Descripción:** Retorna la capacidad total de asientos del vehículo (incluyendo al conductor).

#### Sintaxis
```pawn
Vehicle_Seats(vehicleid)
Model_Seats(modelid)
```

#### Retorno
Número entero de asientos (por ejemplo `2` para Infernus, `4` para Sultan, `1` para NRG-500, `0` para remolques).

---

### Velocidad Máxima Teórica

- **Módulo:** `#include <YSI_Game\y_vehicledata>`
- **Tipo:** Macro preprocesador
- **Descripción:** Retorna la velocidad tope teórica del vehículo según el archivo `handling.cfg` original del juego en kilómetros por hora (KM/H).

#### Sintaxis
```pawn
Vehicle_TopSpeed(vehicleid)
Model_TopSpeed(modelid)
```

---

### Velocidad Real de Conducción

- **Módulo:** `#include <YSI_Game\y_vehicledata>`
- **Tipo:** Función stock
- **Descripción:** Calcula la velocidad instantánea real del vehículo a partir del vector tridimensional de velocidad física (`GetVehicleVelocity`), aplicando el factor de conversión cinemática del motor de GTA.

#### Sintaxis
```pawn
stock Vehicle_Speed(vehicleid, bool:miles = false)
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `vehicleid` | Entero (`_`) | ID del vehículo en el servidor. |
| `miles` | Booleano (`bool:`) | Si es `true`, calcula en Millas por Hora (MPH); si es `false`, en Kilómetros por Hora (KM/H). |

#### Retorno
Entero con la velocidad escalar actual redondeada.

---

### Categorías de Vehículos

- **Módulo:** `#include <YSI_Game\y_vehicledata>`
- **Tipo:** Macro preprocesador
- **Descripción:** Clasifica el vehículo dentro de una categoría de diseño de GTA.

#### Sintaxis
```pawn
Vehicle_GetCategory(vehicleid)
Model_GetCategory(modelid)
```

#### Constantes de Categoría
- `CATEGORY_AIRPLANE`: Aviones a motor.
- `CATEGORY_HELICOPTER`: Helicópteros.
- `CATEGORY_BIKE`: Motocicletas y bicicletas.
- `CATEGORY_BOAT`: Embarcaciones marítimas.
- `CATEGORY_CONVERTIBLE`: Descapotables.
- `CATEGORY_INDUSTRIAL`: Camiones pesados, maquinaria de obras.
- `CATEGORY_LOWRIDER`: Vehículos con suspensión hidráulica.
- `CATEGORY_OFFROAD`: Todo terrenos (4x4).
- `CATEGORY_PUBLIC`: Transporte público (autobuses, taxis).
- `CATEGORY_SALOON`: Sedanes y coches familiares de 4 puertas.
- `CATEGORY_SPORT`: Deportivos de alta gama.
- `CATEGORY_STATIONWAGON`: Station Wagons.
- `CATEGORY_TRAILER`: Remolques y tráileres.
- `CATEGORY_UNIQUE`: Vehículos únicos (tanques, carritos de golf, barredoras).
- `CATEGORY_RC`: Vehículos a radiocontrol.

---

### Banderas y Comprobaciones Booleanas

`y_vehicledata` provee macros de verificación inmediata:

| Macro | Comprobación |
| :--- | :--- |
| `Vehicle_IsCar(v)` / `Model_IsCar(m)` | Es un automóvil convencional. |
| `Vehicle_IsBike(v)` / `Model_IsBike(m)` | Es una moto o bicicleta. |
| `Vehicle_IsBoat(v)` / `Model_IsBoat(m)` | Es una lancha o barco. |
| `Vehicle_IsPlane(v)` / `Model_IsPlane(m)` | Es un avión. |
| `Vehicle_IsHelicopter(v)` / `Model_IsHelicopter(m)` | Es un helicóptero. |
| `Vehicle_IsPolice(v)` / `Model_IsPolice(m)` | Es un vehículo de patrulla policial. |
| `Vehicle_IsAmbulance(v)` / `Model_IsAmbulance(m)` | Es una ambulancia médica. |
| `Vehicle_IsFire(v)` / `Model_IsFire(m)` | Es un camión de bomberos. |
| `Vehicle_IsMilitary(v)` / `Model_IsMilitary(m)` | Pertenece al ejército / fuerzas armadas. |
| `Vehicle_IsWeaponised(v)` / `Model_IsWeaponised(m)` | Posee armamento integrado (Hunter, Hydra, Rhino). |
| `Vehicle_HasNumberPlate(v)` / `Model_HasNumberPlate(m)` | Admite matrícula o placa visible personalizada. |

---

## y_weapondata: Datos de Armas

### Validación (Weapon_IsValid)

- **Módulo:** `#include <YSI_Game\y_weapondata>`
- **Tipo:** Función stock
- **Descripción:** Valida si un ID numérico corresponde a un arma real del juego ($1 \le id \le 18$ o $21 \le id \le 46$).

#### Sintaxis
```pawn
stock bool:Weapon_IsValid(weaponid)
```

---

### Slots de Inventario (Weapon_GetSlot)

- **Módulo:** `#include <YSI_Game\y_weapondata>`
- **Tipo:** Función stock
- **Descripción:** Devuelve el slot de inventario de SA-MP (0 a 12) al que pertenece el arma.

#### Sintaxis
```pawn
stock Weapon_GetSlot(weaponid)
```

#### Retorno
El número de slot (por ejemplo `2` para pistolas, `3` para escopetas, `5` para rifles de asalto). Retorna `-1` si el arma es inválida.

---

### Modelos de Objeto 3D

Permite correlacionar el ID de arma con el ID de modelo de objeto (*World Model ID*) para crear pickups, objetos adjuntos al cuerpo (*Attached Objects*) o soltar armas en el suelo:

```pawn
// Obtener el ID del modelo 3D a partir del arma (ej. arma 24 Desert Eagle -> modelo 348)
stock Weapon_GetModelID(weaponid)

// Obtener el ID de arma a partir del modelo de objeto 3D
stock Weapon_GetIDFromModelID(modelid)
```

---

### Tipos de Disparo y Daño

- **Módulo:** `#include <YSI_Game\y_weapondata>`
- **Tipo:** Función stock
- **Descripción:** Obtiene la naturaleza balística y el tipo de propagación del daño del arma.

#### Sintaxis
```pawn
stock Weapon_GetFireType(weaponid)
```

#### Valores de Retorno
- `WEAPON_FIRE_TYPE_MELEE` (`0`): Armas de combate cuerpo a cuerpo (puño, cuchillo, bate).
- `WEAPON_FIRE_TYPE_PROJECTILE` (`1`): Proyectiles arrojadizos o con trayectoria física (granadas, cohetes RPG).
- `WEAPON_FIRE_TYPE_INSTANT_HIT` (`2`): Armas de impacto instantáneo / raycasting (*hitscan*: pistolas, rifles, escopetas).
- `WEAPON_FIRE_TYPE_AREA_EFFECT` (`3`): Armas de dispersión por área continua (lanzallamas, extintor).
- `WEAPON_FIRE_TYPE_USE` (`4`): Objetos de accionamiento (detonador, paracaídas, gafas de visión nocturna).
- `WEAPON_FIRE_TYPE_CAMERA` (`5`): Cámara fotográfica.

---

### Calibres de Munición

- **Módulo:** `#include <YSI_Game\y_weapondata>`
- **Tipo:** Función stock
- **Descripción:** Copia en la cadena de destino el nombre oficial del calibre de proyectil utilizado por el arma en el lore de GTA:

#### Sintaxis
```pawn
stock bool:Weapon_GetAmmoName(weaponid, dest[], size = sizeof (dest))
```

#### Calibres Soportados
- `".45 ACP"` (Colt .45, Silenciada, Desert Eagle)
- `"9mm"` (Tec-9, Micro SMG, MP5)
- `"12 Guage"` (Shotgun, Sawnoff, Spas-12 Combat Shotgun)
- `"5.56mm"` (Carabina M4)
- `"7.62mm"` (AK-47, Rifle de caza, Minigun)
- `".300 Magnum"` (Rifle de francotirador / Sniper)
- `"Rocket"` (RPG, Heat-Seeking RPG)

---

### Rangos Balísticos

Permiten validar en sistemas anti-cheat si un disparo fue físicamente posible conforme a las distancias de diseño del juego:
- `Float:Weapon_GetMinRange(weaponid)`: Distancia mínima de efectividad balística en metros.
- `Float:Weapon_GetMaxRange(weaponid)`: Alcance balístico máximo en metros (por ejemplo `35.0m` para pistolas, `70.0m` para AK-47, `100.0m` para rifles).

---

### Grupos de Animación

Permiten consultar el bloque de animaciones empleado por el personaje al empuñar o disparar el arma:
- `Weapon_GetAnimGroup(weaponid, dest[], size = sizeof dest)`: Animación estándar (ej. `"colt45"`, `"shotgunbad"`, `"pythonbad"`).
- `Weapon_GetProAnimGroup(weaponid, dest[], size = sizeof dest)`: Animación para nivel de habilidad experto / asesino (*Hitman skill level*, ej. `"colt45pro"`, `"pythonpro"`).

---

### Clasificaciones Booleanas

Funciones stock para agrupar categorías de armas rápidamente:
- `Weapon_IsPistol(weaponid)`: Armas 22, 23, 24.
- `Weapon_IsShotgun(weaponid)`: Armas 25, 26, 27.
- `Weapon_IsSubmachineGun(weaponid)`: Armas 28, 29, 32.
- `Weapon_IsAssaultRifle(weaponid)`: Armas 30, 31 (AK-47 y M4).
- `Weapon_IsRifle(weaponid)`: Armas 33, 34.

---

## Ejemplos Prácticos Completos

### Ejemplo 1: Velocímetro HUD en Pantalla

```pawn
#include <openmultiplayer>
#include <YSI_Game\y_vehicledata>

public OnPlayerUpdate(playerid)
{
    if (IsPlayerInAnyVehicle(playerid) && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
    {
        new vehicleid = GetPlayerVehicleID(playerid);
        new velocidadActual = Vehicle_Speed(vehicleid); // En KM/H
        new velocidadTope = Vehicle_TopSpeed(vehicleid);

        new nombre[32];
        Vehicle_GetName(vehicleid, nombre);

        new mensaje[128];
        format(mensaje, sizeof (mensaje), "~g~%s~n~~w~Velocidad: ~y~%d ~w~/ %d KM/H",
            nombre, velocidadActual, velocidadTope);

        GameTextForPlayer(playerid, mensaje, 1000, 3);
    }
    return 1;
}
```

---

### Ejemplo 2: Sistema de Tienda Ammu-Nation Inteligente

```pawn
#include <openmultiplayer>
#include <YSI_Game\y_weapondata>

YCMD:comprararma(playerid, params[], help)
{
    new weaponid = strval(params);
    if (!Weapon_IsValid(weaponid))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "Error: ID de arma inexistente.");
    }

    new slot = Weapon_GetSlot(weaponid);
    new calibre[24];
    Weapon_GetAmmoName(weaponid, calibre);
    new Float:alcanceMax = Weapon_GetMaxRange(weaponid);

    va_SendClientMessage(playerid, 0x00FF00FF,
        "Compraste el arma ID %d en slot %d | Calibre: %s | Alcance: %.1fm",
        weaponid, slot, calibre, alcanceMax);

    GivePlayerWeapon(playerid, weaponid, 100);
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Desempaquetado de nombres
Las macros `Vehicle_Name` retornan strings empaquetados (`packed strings`). Si intentas concatenarlos o imprimirlos con funciones estándar de SA-MP que solo aceptan cadenas normales sin empaquetar, utiliza `Vehicle_GetName(vehicleid, dest)` para asegurar compatibilidad total.

### 2. Comprobación de vehículo existente
`Vehicle_GetVIM(vehicleid)` depende de que `vehicleid` exista y esté creado en el servidor. Si pasas un ID de vehículo inexistente, retornará un modelo `0` que puede generar valores erróneos. Valida siempre la existencia con `IsValidVehicle(vehicleid)` previamente.

### 3. Diferencia entre modelo de arma y modelo de objeto
No confundas el `weaponid` (ej. `24` para Desert Eagle) con su `modelid` de objeto 3D (ej. `348`). Para funciones como `CreatePickup` o `SetPlayerAttachedObject` debes usar siempre `Weapon_GetModelID(weaponid)`.
