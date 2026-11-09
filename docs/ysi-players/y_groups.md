# y_groups

El módulo `y_groups` es uno de los componentes fundamentales del ecosistema YSI. Ofrece un sistema unificado y de alto rendimiento para agrupar jugadores y gestionar permisos, visibilidad y accesos en toda la suite YSI. Con `y_groups`, un grupo puede representar cualquier agrupación conceptual: niveles de administrador, facciones (Policía, Médicos), pandillas, equipos de minijuegos, clanes o estados VIP.

Gracias a la integración profunda con otros módulos de YSI como `y_commands`, `y_areas`, `y_classes`, `y_text` y `y_users`, cambiar a un jugador de grupo actualiza de inmediato sus comandos permitidos, las zonas a las que puede acceder, los textos que puede leer y sus privilegios globales sin necesidad de escribir comprobaciones manuales `if (PlayerInfo[playerid][pAdmin] < 3)` en cada callback o comando.

---

## Ventajas sobre los Métodos Tradicionales

1. **Gestión Basada en Bitsets de Alta Velocidad:** Internamente, la pertenencia a grupos se almacena utilizando bitarrays (`y_bit`), lo que hace que comprobar si un jugador pertenece a un grupo sea una operación a nivel de bits de un solo ciclo de CPU.
2. **Jerarquía y Herencia de Permisos:** Los grupos pueden ser anidados (grupos hijos). Si el grupo "SuperAdmin" es hijo de "Admin", cualquier permiso otorgado a "Admin" es heredado automáticamente por "SuperAdmin", eliminando la duplicación de código.
3. **Sincronización Transversal (YSI Master):** La pertenencia a grupos se comparte entre el Gamemode y todos los Filterscripts automáticamente sin necesidad de `CallRemoteFunction` manuales ni variables compartidas externas.
4. **Iteradores Nativos para `foreach`:** Permite iterar de forma eficiente únicamente sobre los miembros en línea de un grupo concreto mediante `foreach (new i : Group(gAdminGroup))`.
5. **Sobrecarga de Operadores Intuitiva:** Soporta sintaxis limpia como `gAdminGroup + playerid` (añadir), `gAdminGroup - playerid` (remover) y `if (gAdminGroup == playerid)` (comprobar).

---

## Inclusión en el Script

Para utilizar `y_groups`, se debe incluir después del core o de las dependencias estándar:

```pawn
#include <openmultiplayer> // o <a_samp>
#include <YSI_Players\y_groups>
```

> [!NOTE]
> Si utilizas `y_commands` junto con `y_groups`, asegúrate de incluir `y_groups` antes o permitir que `y_commands` detecte automáticamente el sistema de grupos para compilar las funciones de enlace `Group_SetCommand`.

## Tabla de Contenido

- [Conceptos Fundamentales](#conceptos-fundamentales)
- [Funciones y Macros de Grupos](#funciones-y-macros-de-grupos)
  - [Group_Create](#group_create)
  - [Group_Destroy](#group_destroy)
  - [Group_IsValid](#group_isvalid)
  - [Group_SetPlayer](#group_setplayer)
  - [Group_AddPlayer y Group_RemovePlayer](#group_addplayer-y-group_removeplayer)
  - [Group_GetPlayer](#group_getplayer)
  - [Group_SetGlobal](#group_setglobal)
  - [Group_GetCount](#group_getcount)
  - [Group_GetName / Group_SetName](#group_getname--group_setname)
  - [Group_GetID](#group_getid)
- [Jerarquías de Grupos (Padres e Hijos)](#jerarquias-de-grupos-padres-e-hijos)
  - [Group_SetGroup](#group_setgroup)
  - [Group_GetGroup](#group_getgroup)
  - [Group_IsDescendant](#group_isdescendant)
- [Iteradores para foreach](#iteradores-para-foreach)
- [Integración con Comandos (y_commands)](#integracion-con-comandos-y_commands)
  - [Group_SetCommand](#group_setcommand)
  - [Group_SetGlobalCommand](#group_setglobalcommand)
  - [GROUP_ADD](#group_add)
- [Integración con Áreas y Zonas (y_areas)](#integracion-con-areas-y-zonas-y_areas)
- [Ejemplo Práctico Completo: Sistema de Rangos Administrativos](#ejemplo-practico-completo-sistema-de-rangos-administrativos)
- [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Conceptos Fundamentales

### El Tipo de Dato `Group:`
Cada grupo creado se identifica mediante un tag numérico especial de tipo `Group:`. El identificador `INVALID_GROUP` indica un identificador inválido o error al crear el grupo.

### El Grupo Global
Existe un "Grupo Global" por defecto en YSI. Cualquier elemento configurado con estado global (`Group_SetGlobal...`) aplica de forma predeterminada a todos los jugadores del servidor a menos que un grupo específico anule la regla.

---

## Funciones y Macros de Grupos

### Group_Create

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Crea un nuevo grupo lógico dentro del sistema YSI y le asigna un nombre opcional para identificarlo o buscarlo dinámicamente.
- **Sintaxis:**
```pawn
Group:Group_Create(const name[] = "")
```
- **Parámetros:**
  - `const name[]`: Cadena con el nombre identificativo del grupo (opcional). Máximo `MAX_GROUP_NAME` caracteres.
- **Retorno:** Devuelve el identificador del grupo creado con tag `Group:`, o `INVALID_GROUP` si se alcanzó el límite máximo de grupos soportados.
- **Ejemplo:**
```pawn
new Group:g_AdminGroup = INVALID_GROUP;
new Group:g_PoliceGroup = INVALID_GROUP;

public OnGameModeInit()
{
    g_AdminGroup = Group_Create("Administradores");
    g_PoliceGroup = Group_Create("Policia");
    
    if (g_AdminGroup == INVALID_GROUP)
    {
        print("[ERROR] No se pudo crear el grupo de Administradores.");
    }
    return 1;
}
```
- **Notas:** Los nombres de los grupos facilitan la búsqueda cruzada entre scripts mediante `Group_GetID`.

---

### Group_Destroy

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Destruye un grupo previamente creado, liberando su identificador y removiendo automáticamente a todos los jugadores que formaban parte de él.
- **Sintaxis:**
```pawn
void:Group_Destroy(Group:group)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo que se desea destruir.
- **Retorno:** No retorna ningún valor (`void`).
- **Ejemplo:**
```pawn
public OnGameModeExit()
{
    if (Group_IsValid(g_AdminGroup))
    {
        Group_Destroy(g_AdminGroup);
        g_AdminGroup = INVALID_GROUP;
    }
    return 1;
}
```

---

### Group_IsValid

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Comprueba si un grupo existe, está asignado y se encuentra activo en el sistema.
- **Sintaxis:**
```pawn
bool:Group_IsValid(Group:group)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo a evaluar.
- **Retorno:** Devuelve `true` si el grupo es válido y está activo; `false` en caso contrario o si el identificador es `INVALID_GROUP`.
- **Ejemplo:**
```pawn
if (!Group_IsValid(g_AdminGroup))
{
    g_AdminGroup = Group_Create("Administradores");
}
```

---

### Group_SetPlayer

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Agrega o remueve a un jugador específico de un grupo determinado. Al ejecutar esta función, se recalculan inmediatamente los permisos de comandos, visibilidad de áreas y demás dependencias suscritas al jugador.
- **Sintaxis:**
```pawn
void:Group_SetPlayer(Group:group, playerid, bool:set)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo objetivo.
  - `playerid`: ID del jugador conectado.
  - `bool:set`: `true` para añadir al jugador al grupo; `false` para removerlo.
- **Retorno:** No retorna ningún valor (`void`).
- **Ejemplo:**
```pawn
// Añadir al jugador al grupo de administradores
Group_SetPlayer(g_AdminGroup, playerid, true);

// Remover al jugador del grupo
Group_SetPlayer(g_AdminGroup, playerid, false);
```

---

### Group_AddPlayer y Group_RemovePlayer

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Macro preprocesador / Alias convencional`
- **Descripción:** Envoltorios de alta legibilidad sobre `Group_SetPlayer` y los operadores sobrecargados de YSI. Permiten añadir o retirar jugadores de un grupo con claridad semántica.
- **Sintaxis:**
```pawn
#define Group_AddPlayer(%0,%1)    Group_SetPlayer((%0), (%1), true)
#define Group_RemovePlayer(%0,%1) Group_SetPlayer((%0), (%1), false)
```
- **Sobrecarga de Operadores en Pawn:**
YSI sobrecarga directamente los operadores `+` y `-` para el tipo `Group:`:
```pawn
// Añadir al jugador mediante operador '+':
g_AdminGroup + playerid;

// Remover al jugador mediante operador '-':
g_AdminGroup - playerid;
```
- **Ejemplo:**
```pawn
public OnPlayerConnect(playerid)
{
    // Usando macro o función:
    Group_SetPlayer(g_CivilianGroup, playerid, true);
    
    // O usando sobrecarga directa:
    g_CivilianGroup + playerid;
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    // YSI limpia automáticamente al jugador de todos los grupos al desconectarse,
    // pero si deseas quitarlo antes manualmente:
    g_AdminGroup - playerid;
    return 1;
}
```

---

### Group_GetPlayer

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Determina de forma inmediata si un jugador es miembro del grupo especificado.
- **Sintaxis:**
```pawn
bool:Group_GetPlayer(Group:group, playerid)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo a consultar.
  - `playerid`: ID del jugador a comprobar.
- **Retorno:** Devuelve `true` si el jugador pertenece al grupo, `false` si no pertenece o si el grupo/jugador no es válido.
- **Sobrecarga de Operadores:**
YSI permite utilizar `==` y `!=` directamente entre variables de tipo `Group:` y `playerid`:
```pawn
if (g_AdminGroup == playerid)
{
    // El jugador pertenece al grupo
}

if (g_AdminGroup != playerid)
{
    // El jugador NO pertenece al grupo
}
```
- **Ejemplo:**
```pawn
YCMD:panel(playerid, params[], help)
{
    if (g_AdminGroup != playerid)
    {
        return SendClientMessage(playerid, -1, "{FF0000}Error:{FFFFFF} No perteneces al equipo de administracion.");
    }
    
    SendClientMessage(playerid, -1, "{00FF00}Bienvenido al panel de control administrativo.");
    return 1;
}
```

---

### Group_SetGlobal

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Activa o desactiva la condición global de un grupo o configura los permisos por defecto a nivel global para todos los jugadores del servidor.
- **Sintaxis:**
```pawn
void:Group_SetGlobal(Group:group, bool:status)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo.
  - `bool:status`: `true` para hacer que el grupo actúe de forma global; `false` para revertirlo.
- **Ejemplo:**
```pawn
// Hace que el grupo de usuarios sea el grupo por defecto de todo jugador
Group_SetGlobal(g_UserGroup, true);
```

---

### Group_GetCount

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Devuelve la cantidad de jugadores conectados actualmente en el servidor que pertenecen al grupo especificado.
- **Sintaxis:**
```pawn
Group_GetCount(Group:group)
```
- **Parámetros:**
  - `Group:group`: Identificador del grupo.
- **Retorno:** Número de jugadores miembros conectados.
- **Ejemplo:**
```pawn
YCMD:admins(playerid, params[], help)
{
    new count = Group_GetCount(g_AdminGroup);
    new str[64];
    format(str, sizeof(str), "Hay %d administradores conectados.", count);
    SendClientMessage(playerid, -1, str);
    return 1;
}
```

---

### Group_GetName / Group_SetName

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Permiten obtener o redefinir el nombre textual asignado a un grupo.
- **Sintaxis:**
```pawn
// Obtener el nombre
Group_GetName(Group:group)

// Establecer un nuevo nombre
Group_SetName(Group:group, const name[])
```
- **Ejemplo:**
```pawn
new name[MAX_GROUP_NAME];
format(name, sizeof(name), "%s", Group_GetName(g_AdminGroup));
printf("Grupo: %s", name);

Group_SetName(g_AdminGroup, "Administracion Senior");
```

---

### Group_GetID

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Busca y devuelve el identificador `Group:` asociado a un nombre de grupo registrado en cualquier script del servidor.
- **Sintaxis:**
```pawn
Group:Group_GetID(const name[])
```
- **Parámetros:**
  - `const name[]`: Cadena exacta con el nombre del grupo.
- **Retorno:** El `Group:` correspondiente si se encuentra, o `INVALID_GROUP` si no existe ningún grupo con ese nombre.
- **Ejemplo:**
```pawn
new Group:policia = Group_GetID("Policia");
if (policia != INVALID_GROUP)
{
    Group_SetPlayer(policia, playerid, true);
}
```

---

## Jerarquías de Grupos (Padres e Hijos)

Una de las características más potentes de `y_groups` es la jerarquía de herencia. Puedes definir que un grupo pertenezca a otro grupo:

```
[Usuarios] (Nivel base: comandos públicos)
    └── [Moderadores] (Hereda todo de Usuarios + comandos de moderación)
            └── [Administradores] (Hereda todo de Moderadores y Usuarios + comandos máster)
```

### Group_SetGroup

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Establece o revoca una relación padre-hijo entre dos grupos. Si `child` se añade como hijo de `parent`, cualquier jugador añadido a `child` recibirá automáticamente la membresía y permisos de `parent`.
- **Sintaxis:**
```pawn
void:Group_SetGroup(Group:parent, Group:child, bool:set)
```
- **Parámetros:**
  - `Group:parent`: Grupo superior en la jerarquía.
  - `Group:child`: Grupo subordinado (hijo).
  - `bool:set`: `true` para vincular; `false` para desvincular.
- **Ejemplo:**
```pawn
new Group:g_Users;
new Group:g_Mods;
new Group:g_Admins;

public OnGameModeInit()
{
    g_Users = Group_Create("Usuarios");
    g_Mods = Group_Create("Moderadores");
    g_Admins = Group_Create("Administradores");

    // Los Moderadores heredan los permisos de Usuarios
    Group_SetGroup(g_Users, g_Mods, true);

    // Los Administradores heredan los permisos de Moderadores (y por ende de Usuarios)
    Group_SetGroup(g_Mods, g_Admins, true);
    return 1;
}
```

---

### Group_IsDescendant

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Función stock`
- **Descripción:** Verifica si un grupo `child` desciende (directa o indirectamente por recursión) de un grupo `parent`.
- **Sintaxis:**
```pawn
bool:Group_IsDescendant(Group:parent, Group:child)
```
- **Retorno:** `true` si `child` es descendiente de `parent`; `false` de lo contrario.

---

## Iteradores para foreach

`y_groups` se integra nativamente con `y_iterate` (`foreach`), permitiendo recorrer los miembros de un grupo o todos los grupos creados:

```pawn
// Iterar sobre todos los jugadores que están dentro de un grupo específico:
foreach (new playerid : Group(g_AdminGroup))
{
    SendClientMessage(playerid, 0xFFFF00FF, "[ALERTA ADMIN] Nuevo reporte recibido.");
}

// Iterar sobre todos los grupos existentes en el servidor:
foreach (new Group:g : CreatedGroup())
{
    printf("Grupo activo ID %d: %s", _:g, Group_GetName(g));
}
```

---

## Integración con Comandos (y_commands)

Cuando se usa `y_commands`, `y_groups` permite autorizar o denegar comandos completos por grupo de manera declarativa.

### Group_SetCommand

- **Módulo:** `#include <YSI_Players\y_groups>` y `#include <YSI_Visual\y_commands>`
- **Tipo:** `Función stock generada por integración`
- **Descripción:** Concede o revoca acceso a un comando para todos los miembros de un grupo.
- **Sintaxis:**
```pawn
void:Group_SetCommand(Group:group, command_id, bool:allow)
```
- **Parámetros:**
  - `Group:group`: Grupo al que se asignará el permiso.
  - `command_id`: Identificador del comando obtenido con `YCMD:comando` o `Command_GetID("comando")`.
  - `bool:allow`: `true` para autorizar ejecución; `false` para bloquearla.
- **Ejemplo:**
```pawn
public OnGameModeInit()
{
    // Bloquear el comando /ban globalmente para que nadie lo use por defecto
    Group_SetGlobalCommand(YCMD:ban, false);

    // Otorgar permiso de /ban únicamente al grupo de administradores
    Group_SetCommand(g_AdminGroup, YCMD:ban, true);
    return 1;
}
```

### GROUP_ADD

- **Módulo:** `#include <YSI_Players\y_groups>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Bloque de ámbito temporal para registrar comandos, áreas u objetos asignándolos de forma exclusiva e inmediata a un grupo determinado.
- **Sintaxis:**
```pawn
GROUP_ADD(Group:group)
{
    // Todos los comandos o elementos declarados aquí pertenecerán únicamente a este grupo
}
```

---

## Integración con Áreas y Zonas (y_areas)

Al incluir `y_areas`, se habilitan las funciones de visibilidad y acceso por grupo:

- `Group_SetArea(Group:group, Area:areaid, bool:allow)`: Permite o prohíbe que los miembros de un grupo detecten o activen una zona específica.
- `Group_SetGlobalArea(Area:areaid, bool:allow)`: Configura el acceso global a una zona.

```pawn
new Area:g_ZonaVIP;

public OnGameModeInit()
{
    g_ZonaVIP = Area_AddBox(100.0, 150.0, 200.0, 250.0);
    
    // Nadie puede entrar por defecto
    Group_SetGlobalArea(g_ZonaVIP, false);

    // Solo los jugadores en el grupo VIP activan callbacks de esta zona
    Group_SetArea(g_VIPGroup, g_ZonaVIP, true);
    return 1;
}
```

---

## Ejemplo Práctico Completo: Sistema de Rangos Administrativos

El siguiente ejemplo implementa una jerarquía realista con 3 rangos: **Usuario**, **Moderador** y **Administrador**. Muestra la creación de grupos, herencia jerárquica, asignación de permisos de comandos y gestión al conectar el jugador:

```pawn
#include <openmultiplayer>
#include <YSI_Players\y_groups>
#include <YSI_Visual\y_commands>
#include <YSI_Data\y_iterate>

// Identificadores de grupos
new Group:g_GroupUser    = INVALID_GROUP;
new Group:g_GroupMod     = INVALID_GROUP;
new Group:g_GroupAdmin   = INVALID_GROUP;

// Enumerador de niveles
enum (<<= 1)
{
    NIVEL_USUARIO = 0,
    NIVEL_MODERADOR,
    NIVEL_ADMINISTRADOR
}

public OnGameModeInit()
{
    // 1. Creación de los grupos
    g_GroupUser  = Group_Create("Usuarios");
    g_GroupMod   = Group_Create("Moderadores");
    g_GroupAdmin = Group_Create("Administradores");

    // 2. Establecer jerarquía de herencia:
    // Los moderadores heredan todo lo de los usuarios
    Group_SetGroup(g_GroupUser, g_GroupMod, true);
    // Los administradores heredan todo lo de moderadores y usuarios
    Group_SetGroup(g_GroupMod, g_GroupAdmin, true);

    // 3. Reglas globales de comandos:
    // Por defecto, /kick y /ban están bloqueados para todos
    Group_SetGlobalCommand(YCMD:kick, false);
    Group_SetGlobalCommand(YCMD:ban, false);
    Group_SetGlobalCommand(YCMD:a, false);

    // 4. Conceder permisos a los grupos respectivos:
    // Moderadores pueden usar /kick y chat de staff (/a)
    Group_SetCommand(g_GroupMod, YCMD:kick, true);
    Group_SetCommand(g_GroupMod, YCMD:a, true);

    // Administradores pueden usar /ban (y ya heredan /kick y /a)
    Group_SetCommand(g_GroupAdmin, YCMD:ban, true);

    print("[SISTEMA] Grupos y permisos inicializados con exito.");
    return 1;
}

public OnPlayerConnect(playerid)
{
    // Todo jugador que entra pertenece al grupo de usuarios por defecto
    Group_SetPlayer(g_GroupUser, playerid, true);
    return 1;
}

// Función para cambiar de rango a un jugador
stock AsignarRango(playerid, nivel)
{
    // Limpiar rangos de staff previos
    Group_SetPlayer(g_GroupMod, playerid, false);
    Group_SetPlayer(g_GroupAdmin, playerid, false);

    switch (nivel)
    {
        case NIVEL_MODERADOR:
        {
            Group_SetPlayer(g_GroupMod, playerid, true);
            SendClientMessage(playerid, 0x00FF00FF, "Has sido promovido a Moderador.");
        }
        case NIVEL_ADMINISTRADOR:
        {
            Group_SetPlayer(g_GroupAdmin, playerid, true);
            SendClientMessage(playerid, 0x00FFFFAA, "Has sido promovido a Administrador.");
        }
        default:
        {
            SendClientMessage(playerid, -1, "Ahora eres un usuario comun.");
        }
    }
}

// Comandos protegidos automáticamente por y_groups
YCMD:kick(playerid, params[], help)
{
    new targetid, razon[64];
    if (sscanf(params, "us[64]", targetid, razon))
    {
        return SendClientMessage(playerid, -1, "{FFFF00}Uso:{FFFFFF} /kick [playerid] [razon]");
    }
    
    if (!IsPlayerConnected(targetid))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "El jugador no esta conectado.");
    }

    Kick(targetid);
    return 1;
}

YCMD:ban(playerid, params[], help)
{
    new targetid, razon[64];
    if (sscanf(params, "us[64]", targetid, razon))
    {
        return SendClientMessage(playerid, -1, "{FFFF00}Uso:{FFFFFF} /ban [playerid] [razon]");
    }

    if (!IsPlayerConnected(targetid))
    {
        return SendClientMessage(playerid, 0xFF0000FF, "El jugador no esta conectado.");
    }

    Ban(targetid);
    return 1;
}

YCMD:a(playerid, params[], help)
{
    if (isnull(params))
    {
        return SendClientMessage(playerid, -1, "{FFFF00}Uso:{FFFFFF} /a [mensaje]");
    }

    new mensaje[144];
    format(mensaje, sizeof(mensaje), "[STAFF] %s(%d): %s", ReturnPlayerName(playerid), playerid, params);

    // Enviar solo a los moderadores y administradores usando el iterador de grupo
    foreach (new i : Group(g_GroupMod))
    {
        SendClientMessage(i, 0xFF9900AA, mensaje);
    }
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### Buenas Prácticas
1. **Desactivar Comandos Globalmente Antes de Asignarlos:** Si un comando no debe ser usado por jugadores normales, llama primero a `Group_SetGlobalCommand(YCMD:comando, false)` y luego a `Group_SetCommand(miGrupo, YCMD:comando, true)`.
2. **Aprovechar las Jerarquías de Grupos:** Evita añadir al Administrador en el grupo `g_Moderadores` y en `g_Administradores` al mismo tiempo de forma manual. Configura `Group_SetGroup(g_Moderadores, g_Administradores, true)` y solo añade al jugador a `g_Administradores`.
3. **Usar el Iterador `Group(grupo)`:** Para enviar mensajes a facciones o rangos, no hagas un bucle de 0 a `MAX_PLAYERS` con `Group_GetPlayer`. `foreach (new i : Group(grupo))` solo visita a los miembros conectados directamente, ahorrando tiempo de CPU.

### Errores Comunes
- **Tag Mismatch:** Olvidar colocar el tag `Group:` en la declaración de las variables del grupo generará advertencias de tipo en el compilador.
- **Destruir Grupos Sin Verificar:** Llamar a `Group_Destroy` sobre un identificador no inicializado o `INVALID_GROUP`.
- **Desconexión Manual Innecesaria:** Intentar limpiar al jugador de los grupos en `OnPlayerDisconnect` con código propio complejo. YSI ya resetea de forma automática e instantánea la pertenencia a grupos en `OnPlayerDisconnect`.
