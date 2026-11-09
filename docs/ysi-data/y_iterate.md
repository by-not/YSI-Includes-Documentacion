# y_iterate (foreach e Iteradores)

`y_iterate` (históricamente conocido en la comunidad como la biblioteca `foreach` desarrollada por Alex "Y_Less" Cole) es una de las herramientas más críticas y revolucionarias del ecosistema Pawn para SA-MP y open.mp. Proporciona un mecanismo de iteración de conjuntos dispersos (*sparse sets*) extremadamente rápido, transformando bucles tradicionales ineficientes en iteraciones de complejidad temporal óptima.

---

## Introducción y Propósito

En el desarrollo tradicional de SA-MP, recorrer jugadores o entidades conectadas suele realizarse con un bucle lineal convencional:

```pawn
// Enfoque clásico ineficiente
for (new i = 0; i < MAX_PLAYERS; i++)
{
    if (IsPlayerConnected(i))
    {
        // Lógica de juego
    }
}
```

### El Cuello de Botella de `MAX_PLAYERS`

Si tu servidor define `MAX_PLAYERS` como `1000` pero solo hay `25` usuarios en línea:
1. El bucle ejecutará **1,000 iteraciones completas**.
2. Realizará **1,000 llamadas nativas de AMX a C++** (`IsPlayerConnected(i)`), incurriendo en el costo de cambio de contexto de la máquina virtual AMX.
3. El 97.5% de los ciclos de CPU se desperdician evaluando IDs vacíos.
4. Si este bucle se ejecuta en `OnPlayerUpdate`, temporizadores repetitivos o streaming de objetos/vehículos, el rendimiento del hilo principal colapsa drásticamente (*server lag*).

### La Solución de `y_iterate`

`y_iterate` estructura los elementos válidos como una **lista enlazada cíclica estática** almacenada directamente en celdas adyacentes de un array sin necesidad de asignación dinámica de memoria (*zero heap overhead*). Cada índice almacena el número del siguiente elemento activo:

$$\mathcal{O}(N) \quad \text{en lugar de} \quad \mathcal{O}(\text{MAX\_PLAYERS})$$

Donde $N$ es el número exacto de elementos activos. Si hay 25 jugadores, el bucle se ejecuta exactamente **25 veces**, saltando instantáneamente de un ID conectado al siguiente sin llamadas nativas intermedias.

```mermaid
graph LR
    Start(["Inicio: sentinel"]) --> P2["Jugador 2"]
    P2 --> P7["Jugador 7"]
    P7 --> P19["Jugador 19"]
    P19 --> End(["Fin: sentinel"])
```

### Inclusión en el Proyecto

Para utilizar este módulo en tu gamemode o filterscript:

```pawn
#include <YSI_Data\y_iterate>
```

> [!NOTE]
> También puedes incluir `#include <YSI_Data\y_foreach>`. Ambos archivos son equivalentes en las versiones modernas de YSI v5.x.

## Tabla de Contenidos

1. [Sintaxis del Bucle `foreach`](#sintaxis-del-bucle-foreach)
2. [Iteradores Nativos Predefinidos](#iteradores-nativos-predefinidos)
3. [Declaración de Iteradores Personalizados](#declaracion-de-iteradores-personalizados)
4. [Manipulación de Iteradores (Funciones y Macros)](#manipulacion-de-iteradores)
   - [Iter_Add](#iter_add)
   - [Iter_Remove](#iter_remove)
   - [Iter_Clear](#iter_clear)
   - [Iter_Contains](#iter_contains)
   - [Iter_Count](#iter_count)
   - [Iter_Random](#iter_random)
   - [Iter_SafeRemove](#iter_saferemove)
   - [ITER_SAFE_REMOVE](#iter_safe_remove)
   - [Iter_Alloc](#iter_alloc)
   - [Iter_Free](#iter_free)
   - [Iter_IsEmpty e Iter_IsFull](#iter_isempty-e-iter_isfull)
   - [Iter_First, Iter_Last, Iter_Next, Iter_Prev](#funciones-de-recorrido-manual)
5. [Iteradores Multidimensionales (Arrays de Iteradores)](#iteradores-multidimensionales)
6. [Generadores Especiales de Bucle](#generadores-especiales-de-bucle)
7. [Ejemplos Prácticos Completos](#ejemplos-practicos-completos)
8. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Sintaxis del Bucle `foreach`

La macro preprocesadora `foreach` encapsula la lógica de avance por la lista enlazada interna:

```pawn
foreach (new variable : Iterador)
{
    // Código a ejecutar para cada elemento activo
}
```

O si la variable ya fue declarada previamente en el ámbito local:

```pawn
new i;
foreach (i : Iterador)
{
    // Código
}
```

---

## Iteradores Nativos Predefinidos

YSI proporciona de forma predeterminada iteradores globales gestionados automáticamente mediante hooks a los eventos nativos de SA-MP / open.mp:

| Iterador | Módulo | Descripción | Eventos Automáticos |
| :--- | :--- | :--- | :--- |
| `Player` | `y_iterate` | Todos los jugadores humanos conectados. | Se añade en `OnPlayerConnect` y se retira en `OnPlayerDisconnect`. |
| `Bot` | `y_iterate` | Todos los NPCs / bots conectados al servidor. | Gestionado automáticamente al registrar NPCs. |
| `Character` | `y_iterate` | Superconjunto que incluye tanto humanos (`Player`) como NPCs (`Bot`). | Mantenido internamente en paralelo. |
| `Vehicle` | `y_iterate` | Todos los vehículos existentes en el servidor. | Se añade en `CreateVehicle`/`AddStaticVehicleEx` y se retira en `DestroyVehicle`. |

### Ejemplo Rápido con `Player` y `Vehicle`:

```pawn
// Recorrer todos los jugadores humanos
foreach (new playerid : Player)
{
    SendClientMessage(playerid, 0xFFFFFFFF, "¡Mensaje global optimizado!");
}

// Recorrer todos los vehículos creados
foreach (new vehicleid : Vehicle)
{
    RepairVehicle(vehicleid);
}
```

---

## Declaración de Iteradores Personalizados

Puedes definir tus propias colecciones iterables para cualquier entidad de tu servidor (administradores conectados, casas ocupadas, zonas activas, etc.).

### Iterador Simple (Unidimensional)

```pawn
// Sintaxis: new Iterator:Nombre<CAPACIDAD_MAXIMA>;
new Iterator:AdminsOnline<MAX_PLAYERS>;
new Iterator:ZonasPeligro<64>;
```

- La capacidad indica el valor máximo absoluto $+ 1$ que podrá contener. Para un iterador de tamaño `<100>`, los valores válidos agregables van del `0` al `99`.

---

## Manipulación de Iteradores

### Iter_Add

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock envoltorio
- **Descripción:** Añade un valor específico a la lista enlazada del iterador. Si el elemento ya existe o está fuera del límite superior, no se duplicará.

#### Sintaxis
```pawn
Iter_Add(Iterator:iter<>, value);
```

#### Parámetros
- `iter`: Nombre del iterador unidimensional o índice de un iterador multidimensional.
- `value`: Valor entero a registrar en el conjunto (debe estar en el rango `0 <= value < CAPACIDAD`).

#### Retorno
Devuelve `1` si el valor fue insertado satisfactoriamente, o `0` si el valor ya estaba en el iterador o el índice superaba la capacidad máxima.

#### Ejemplo Práctico
```pawn
#include <openmultiplayer>
#include <YSI_Data\y_iterate>

new Iterator:StaffOnline<MAX_PLAYERS>;

public OnPlayerSpawn(playerid)
{
    // Asumamos que verificamos rango de staff
    if (GetPlayerScore(playerid) >= 100)
    {
        if (Iter_Add(StaffOnline, playerid))
        {
            printf("[STAFF] Jugador %d añadido a la lista activa de Staff.", playerid);
        }
    }
    return 1;
}
```

> [!WARNING]
> Intentar añadir un valor mayor o igual al tamaño declarado (por ejemplo `Iter_Add(iter, 100)` en un iterador `<100>`) causará desbordamiento de memoria (*buffer overflow*) en AMX.

---

### Iter_Remove

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Quita un valor específico del iterador y repara los punteros de la lista enlazada para mantener la integridad de los bucles futuros.

#### Sintaxis
```pawn
Iter_Remove(Iterator:iter<>, value);
```

#### Parámetros
- `iter`: Nombre del iterador.
- `value`: Valor a eliminar del iterador.

#### Retorno
Devuelve `1` si el elemento existía y fue removido, o `0` si no se encontraba en el iterador.

#### Ejemplo Práctico
```pawn
public OnPlayerDisconnect(playerid, reason)
{
    if (Iter_Contains(StaffOnline, playerid))
    {
        Iter_Remove(StaffOnline, playerid);
        printf("[STAFF] Jugador %d retirado del staff conectado.", playerid);
    }
    return 1;
}
```

> [!CAUTION]
> **NUNCA** utilices `Iter_Remove(iter, i)` dentro de un bucle `foreach (new i : iter)`. Modificar la lista que se está recorriendo en ese instante rompe el puntero al siguiente elemento y el bucle termina abruptamente o entra en ciclo infinito. Utiliza [Iter_SafeRemove](#iter_saferemove) en su lugar.

---

### Iter_Clear

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Vacía por completo el iterador, desvinculando todos los elementos y reiniciando el centinela de inicio/fin en $\mathcal{O}(1)$ o $\mathcal{O}(N)$ según la implementación.

#### Sintaxis
```pawn
Iter_Clear(Iterator:iter<>);
```

#### Parámetros
- `iter`: Nombre del iterador que se desea vaciar.

#### Retorno
Esta macro no devuelve ningún valor específico (`void`).

#### Ejemplo Práctico
```pawn
// Reiniciar ronda de evento
stock ReiniciarRondaMinijuego()
{
    // Vaciar lista de competidores vivos
    Iter_Clear(JugadoresVivosMinijuego);
    SendClientMessageToAll(0xFF0000AA, "El evento ha finalizado. Se han limpiado las listas de participantes.");
}
```

---

### Iter_Contains

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador
- **Descripción:** Verifica en tiempo constante $\mathcal{O}(1)$ si un valor determinado está presente en el conjunto de datos del iterador.

#### Sintaxis
```pawn
bool:Iter_Contains(Iterator:iter<>, value);
```

#### Parámetros
- `iter`: Nombre del iterador a inspeccionar.
- `value`: Valor o índice a buscar.

#### Retorno
Devuelve `true` si el valor pertenece al iterador; de lo contrario devuelve `false`.

#### Ejemplo Práctico
```pawn
stock bool:EsUsuarioAdministrador(playerid)
{
    if (!IsPlayerConnected(playerid)) return false;
    return Iter_Contains(StaffOnline, playerid);
}
```

---

### Iter_Count

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Obtiene la cantidad total de elementos activos actualmente presentes en el iterador en tiempo constante $\mathcal{O}(1)$ (el recuento se actualiza internamente con cada inserción o eliminación).

#### Sintaxis
```pawn
Iter_Count(Iterator:iter<>);
```

#### Parámetros
- `iter`: Nombre del iterador.

#### Retorno
Devuelve un número entero indicando el número de elementos contenidos.

#### Ejemplo Práctico
```pawn
YCMD:staff(playerid, params[], help)
{
    new count = Iter_Count(StaffOnline);
    new str[64];
    format(str, sizeof(str), "Hay %d miembro(s) del staff en línea.", count);
    SendClientMessage(playerid, 0x00FF00AA, str);
    return 1;
}
```

---

### Iter_Random

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock interna
- **Descripción:** Selecciona un elemento aleatorio presente en el iterador. Permite exclusiones encadenadas opcionales para obtener múltiples elementos aleatorios diferentes sin duplicados y sin algoritmos de reintento ineficientes.

#### Sintaxis
```pawn
Iter_Random(Iterator:iter<>, ... /* exclusiones opcionales */);
```

#### Parámetros
- `iter`: Nombre del iterador.
- `...` *(opcional)*: Valores adicionales a ignorar o excluir de la selección.

#### Retorno
Devuelve el elemento seleccionado al azar. Si el iterador está vacío, devuelve `-1`.

#### Ejemplo Práctico
```pawn
// Escoger 3 ganadores diferentes entre los jugadores conectados
stock SortearPremios()
{
    if (Iter_Count(Player) < 3)
    {
        print("No hay suficientes jugadores para sortear 3 premios.");
        return;
    }

    new primerLugar = Iter_Random(Player);
    // Excluir al primer lugar para la segunda rifa:
    new segundoLugar = Iter_Random(Player, primerLugar);
    // Excluir a ambos para el tercer lugar:
    new tercerLugar = Iter_Random(Player, primerLugar, segundoLugar);

    printf("Ganadores: 1ro: %d | 2do: %d | 3ro: %d", primerLugar, segundoLugar, tercerLugar);
}
```

---

### Iter_SafeRemove

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador
- **Descripción:** Permite eliminar un elemento de un iterador de forma segura mientras se está ejecutando un bucle sobre él, actualizando la variable de control del bucle para que el salto al siguiente elemento no se pierda.

#### Sintaxis
```pawn
Iter_SafeRemove(Iterator:iter<>, value, &next);
```

#### Parámetros
- `iter`: Nombre del iterador.
- `value`: Valor actual a eliminar.
- `&next`: Variable de control del bucle (pasada por referencia) que recibirá la posición adecuada para continuar la iteración.

#### Retorno
Devuelve `1` si el elemento fue eliminado, o `0` si no existía.

#### Ejemplo Práctico
```pawn
// Expulsar a jugadores ausentes recorriendo la lista de conectados
stock ExpulsarJugadoresInactivos(tiempoMaximo)
{
    foreach (new i : Player)
    {
        if (g_TiempoInactivo[i] > tiempoMaximo)
        {
            SendClientMessage(i, 0xFF0000AA, "Has sido expulsado por inactividad prolongada.");
            Kick(i);
            // Uso estándar: se pasa la variable del bucle tanto como 'value' y como '&next'
            Iter_SafeRemove(Player, i, i);
        }
    }
}
```

---

### ITER_SAFE_REMOVE

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador envoltorio de bloque
- **Descripción:** Permite envolver una llamada o bloque que modifica un iterador dentro de un bucle `foreach` asegurando que el índice actual se preserve de forma transparente.

#### Sintaxis
```pawn
ITER_SAFE_REMOVE(Iterator:iter<>, index)
{
    // Bloque o llamada a función que remueve el elemento
}
```

#### Ejemplo Práctico
```pawn
stock LimpiarVehiculosAbandonados()
{
    foreach (new vid : Vehicle)
    {
        if (g_VehiculoAbandonado[vid])
        {
            ITER_SAFE_REMOVE(Vehicle, vid)
            {
                DestroyVehicle(vid); // DestroyVehicle internamente llama a Iter_Remove(Vehicle, vid)
            }
        }
    }
}
```

---

### Iter_Alloc

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Busca el primer slot libre (no asignado) en el iterador, lo agrega a la lista de activos y devuelve el índice asignado en un solo paso atómico.

#### Sintaxis
```pawn
Iter_Alloc(Iterator:iter<>);
```

#### Parámetros
- `iter`: Nombre del iterador.

#### Retorno
Devuelve el slot entero libre asignado, o `-1` si el iterador está lleno al 100% de su capacidad.

#### Ejemplo Práctico
```pawn
new Iterator:ItemsSuelo<500>;

stock CrearItemEnSuelo(modelo, Float:x, Float:y, Float:z)
{
    new itemid = Iter_Alloc(ItemsSuelo);
    if (itemid == -1)
    {
        print("[ERROR] Límite de items en el suelo alcanzado.");
        return -1;
    }
    
    g_ItemObjeto[itemid] = CreateDynamicObject(modelo, x, y, z, 0.0, 0.0, 0.0);
    return itemid;
}
```

---

### Iter_Free

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador / Función stock
- **Descripción:** Encuentra el primer slot que **NO** está actualmente en uso dentro del iterador, sin modificar la lista.

#### Sintaxis
```pawn
Iter_Free(Iterator:iter<>);
```

#### Retorno
Devuelve el índice del primer slot no utilizado, o `-1` si no hay slots disponibles.

---

### Iter_IsEmpty e Iter_IsFull

- **Módulo requerido:** `#include <YSI_Data\y_iterate>`
- **Tipo:** Macro preprocesador
- **Descripción:** Comprueban rápidamente el estado de capacidad del iterador.

```pawn
bool:Iter_IsEmpty(Iterator:iter<>); // Devuelve true si no tiene ningún elemento.
bool:Iter_IsFull(Iterator:iter<>);  // Devuelve true si alcanzó la capacidad máxima.
```

---

### Funciones de Recorrido Manual

Para casos avanzados donde requieras control granular fuera del bucle `foreach`:

| Función | Descripción |
| :--- | :--- |
| `Iter_First(iter)` | Devuelve el primer valor válido almacenado en el iterador, o `Iter_End(iter)` si está vacío. |
| `Iter_Last(iter)` | Devuelve el último elemento válido registrado. |
| `Iter_Next(iter, cur)` | Obtiene el siguiente valor consecutivo a partir del índice `cur`. |
| `Iter_Prev(iter, cur)` | Obtiene el elemento anterior en la lista respecto a `cur` (operación más lenta). |
| `Iter_End(iter)` | Devuelve el centinela final que marca el término de la lista. |

---

## Iteradores Multidimensionales

`y_iterate` permite crear matrices de iteradores (*iterador multidimensional* o *array de iteradores*). Esto es indispensable cuando tienes múltiples grupos, facciones o categorías y deseas iterar de manera independiente sobre los miembros de cada una.

### Declaración

```pawn
// Sintaxis: new Iterator:Nombre[DIMENSION_1]<CAPACIDAD_ELEMENTOS>;
#define MAX_FACCIONES (10)
new Iterator:MiembrosFaccion[MAX_FACCIONES]<MAX_PLAYERS>;
```

### Inicialización con `Iter_Init`

En versiones modernas con compatibilidad de compilador completo, los iteradores multidimensionales pueden requerir inicialización si no se utiliza el nuevo compilador de Southclaws/open.mp:

```pawn
public OnGameModeInit()
{
    // Opcional en compiladores nuevos, recomendable para total portabilidad:
    Iter_Init(MiembrosFaccion);
    return 1;
}
```

### Recorrido de una Dimensión Específica

Para iterar sobre los miembros de una sola facción en particular:

```pawn
stock EnviarMensajeFaccion(faccionId, const mensaje[])
{
    if (!(0 <= faccionId < MAX_FACCIONES)) return;

    // Iterar únicamente sobre los jugadores asignados a 'faccionId'
    foreach (new playerid : MiembrosFaccion[faccionId])
    {
        SendClientMessage(playerid, 0x33CCFFAA, mensaje);
    }
}
```

### Inserción y Eliminación en Multidimensionales

```pawn
// Añadir un jugador a la facción 2:
Iter_Add(MiembrosFaccion[2], playerid);

// Quitar al jugador de la facción 2:
Iter_Remove(MiembrosFaccion[2], playerid);

// Verificar si pertenece a la facción 2:
if (Iter_Contains(MiembrosFaccion[2], playerid)) { ... }
```

---

## Generadores Especiales de Bucle

`y_iterate` incluye generadores funcionales que pueden ser invocados directamente dentro del encabezado `foreach`:

### Range
Emula un bucle numérico con paso configurable sin declarar contadores manuales:
```pawn
// Recorre de 10 a 98 de 2 en 2:
foreach (new val : Range(10, 100, 2))
{
    printf("Valor: %d", val);
}
```

### N
Optimizado para bucles de `0` hasta `N - 1`:
```pawn
foreach (new idx : N(10))
{
    // idx tomará valores de 0 a 9
}
```

### Random
Genera una cantidad determinada de números pseudoaleatorios en cada pasada:
```pawn
// Genera 5 números aleatorios entre 0 y 99:
foreach (new r : Random(5, 0, 100))
{
    printf("Aleatorio: %d", r);
}
```

---

## Ejemplos Prácticos Completos

### Ejemplo 1: Sistema de Moderación y Difusión de Alertas a Staff

```pawn
#include <openmultiplayer>
#include <YSI_Data\y_iterate>
#include <YSI_Visual\y_commands>

// Iterador para almacenar a los administradores activos en servicio
new Iterator:AdminsEnServicio<MAX_PLAYERS>;

// Al conectarse un jugador
public OnPlayerDisconnect(playerid, reason)
{
    if (Iter_Contains(AdminsEnServicio, playerid))
    {
        Iter_Remove(AdminsEnServicio, playerid);
    }
    return 1;
}

// Comando para entrar/salir de servicio de moderación
YCMD:duty(playerid, params[], help)
{
    if (GetPlayerScore(playerid) < 5) // Comprobación ficticia de nivel admin
    {
        return SendClientMessage(playerid, 0xFF0000AA, "No tienes permisos de administrador.");
    }

    if (Iter_Contains(AdminsEnServicio, playerid))
    {
        Iter_Remove(AdminsEnServicio, playerid);
        SendClientMessage(playerid, 0xFFFF00AA, "Has salido de servicio como administrador.");
    }
    else
    {
        Iter_Add(AdminsEnServicio, playerid);
        SendClientMessage(playerid, 0x00FF00AA, "Ahora estás en servicio. Recibirás alertas del servidor.");
    }
    return 1;
}

// Función para notificar a los administradores en servicio
stock NotificarStaff(const textoAlerta[])
{
    // Se itera ÚNICAMENTE sobre los administradores activos en servicio
    foreach (new adminid : AdminsEnServicio)
    {
        SendClientMessage(adminid, 0xE74C3CAA, textoAlerta);
    }
}
```

---

### Ejemplo 2: Gestión de Vehículos por Facciones

```pawn
#define MAX_FACTIONS (5)
#define MAX_VEHICULOS_SERVER (2000)

// Iterador bidimensional: Almacena los vehicleid pertenecientes a cada facción
new Iterator:VehiculosFaccion[MAX_FACTIONS]<MAX_VEHICULOS_SERVER>;

stock CrearVehiculoFaccion(faccionId, modelo, Float:x, Float:y, Float:z, Float:a, col1, col2)
{
    if (!(0 <= faccionId < MAX_FACTIONS)) return INVALID_VEHICLE_ID;

    new vid = CreateVehicle(modelo, x, y, z, a, col1, col2, -1);
    if (vid != INVALID_VEHICLE_ID)
    {
        Iter_Add(VehiculosFaccion[faccionId], vid);
    }
    return vid;
}

stock RespawnearVehiculosFaccion(faccionId)
{
    if (!(0 <= faccionId < MAX_FACTIONS)) return;

    // Itera solo sobre los vehículos de la facción solicitada
    foreach (new vid : VehiculosFaccion[faccionId])
    {
        SetVehicleToRespawn(vid);
    }
}

stock EliminarVehiculoFaccion(faccionId, vid)
{
    if (Iter_Contains(VehiculosFaccion[faccionId], vid))
    {
        Iter_Remove(VehiculosFaccion[faccionId], vid);
        DestroyVehicle(vid);
    }
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Modificar un Iterador Durante el Bucle sin `Iter_SafeRemove`
> [!CAUTION]
> **Incorrecto:**
> ```pawn
> foreach (new i : MiIterador)
> {
>     if (DebeEliminarse(i))
>     {
>         Iter_Remove(MiIterador, i); // ¡GRAVE ERROR! Rompe la cadena del bucle.
>     }
> }
> ```
> **Correcto:**
> ```pawn
> foreach (new i : MiIterador)
> {
>     if (DebeEliminarse(i))
>     {
>         Iter_SafeRemove(MiIterador, i, i); // Actualiza 'i' al siguiente puntero seguro.
>     }
> }
> ```

### 2. Definición Incorrecta de Capacidades
El valor pasado entre angulares `<TAMAÑO>` define el valor máximo más uno. Si tu entidad puede tener IDs desde `0` hasta `499`, la capacidad debe ser `<500>`.
- Intentar añadir un valor igual o superior al tamaño declarado genera corrupción de celdas en el array adyacente.

### 3. Diferencia entre open.mp y SA-MP Nativo
En open.mp existen componentes nativos de alto rendimiento, pero `y_iterate` continúa siendo el estándar absoluto de interoperabilidad en código Pawn gracias a su portabilidad y compatibilidad hacia atrás con scripts existentes.

### 4. Uso de Iteradores Multidimensionales
Recuerda que `Iter_Count(VehiculosFaccion)` sin corchetes no mide el total en todos los grupos; para medir el grupo 0 debes usar `Iter_Count(VehiculosFaccion[0])`.
