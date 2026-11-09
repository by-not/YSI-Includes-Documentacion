# y_commands (YCMD & @cmd)

`y_commands` es el procesador de comandos más veloz, modular, robusto y personalizable disponible para SA-MP y open.mp. Reemplaza por completo el lento procesamiento nativo por comparación lineal de cadenas (`strcmp` dentro de `OnPlayerCommandText`) mediante un sistema de **tablas hash indexadas en memoria AMX O(1)** con soporte para permisos por jugador y por grupos, alias dinámicos, comandos dependientes del contexto, comandos inline y prefijos alternativos.

## Módulo Requerido

```pawn
#include <YSI_Visual\y_commands>
```

## Tabla de Contenido

- [Ventajas sobre Procesadores Convencionales](#ventajas-sobre-procesadores-convencionales)
- [Declaración de Comandos](#declaracion-de-comandos)
  - [Sintaxis con Decorador @cmd()](#sintaxis-con-decorador-cmd)
  - [Sintaxis Clásica YCMD:](#sintaxis-clasica-ycmd)
  - [Compatibilidad con Sintaxis CMD:](#compatibilidad-con-sintaxis-cmd)
  - [El Parámetro `help`](#el-parametro-help)
- [Alias y Nombres Alternativos](#alias-y-nombres-alternativos)
- [Referencia de la API de Comandos](#referencia-de-la-api-de-comandos)
  - [Command_AddAlt / Command_AddAltNamed](#command_addalt--command_addaltnamed)
  - [Command_SetPlayer / Command_SetPlayerNamed](#command_setplayer--command_setplayernamed)
  - [Command_GetPlayer / Command_GetPlayerNamed](#command_getplayer--command_getplayernamed)
  - [Command_SetPlayerDisabled / Command_GetPlayerDisabled](#command_setplayerdisabled--command_getplayerdisabled)
  - [Command_SetDeniedReturn / Command_GetDeniedReturn](#command_setdeniedreturn--command_getdeniedreturn)
  - [Command_SetUnknownReturn](#command_setunknownreturn)
  - [Command_SetPrefix / Command_SetPrefixNamed](#command_setprefix--command_setprefixnamed)
  - [Command_ReProcess](#command_reprocess)
  - [Command_GetID](#command_getid)
  - [Command_AddCallback / Command_RemoveCallback (Comandos Dinámicos / Inline)](#command_addcallback--command_removecallback)
- [Callbacks del Sistema](#callbacks-del-sistema)
  - [OnPlayerCommandReceived](#onplayercommandreceived)
  - [OnPlayerCommandPerformed](#onplayercommandperformed)
  - [Enumeración de Errores e_COMMAND_ERRORS](#enumeracion-de-errores-e_command_errors)
- [Ejemplo Práctico Completo con sscanf2](#ejemplo-practico-completo-con-sscanf2)
- [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Ventajas sobre Procesadores Convencionales

| Característica | strcmp tradicional | ZCMD / I-ZCMD | y_commands (YSI v5) |
| :--- | :--- | :--- | :--- |
| **Tiempo de búsqueda** | O(N) lineal | O(1) vía CallLocalFunction | O(1) con hash directo en memoria |
| **Integración Filterscripts** | Nula o conflictiva | Requiere hooks manuales | Totalmente unificado vía `y_master` |
| **Permisos por Jugador** | Código manual repetitivo | Código manual repetitivo | Nativo (`Command_SetPlayer`, `Group_SetCommand`) |
| **Ayuda contextual** | Comandos separados | Comandos separados | Parámetro `help` integrado nativamente |
| **Prefijos alternativos** | Solo `/` | Solo `/` | Soporta `!`, `#`, `.`, `/` por comando o global |
| **Comandos Inline** | No soportado | No soportado | Sí, comandos únicos por jugador en tiempo real |

---

## Declaración de Comandos

### Sintaxis con Decorador `@cmd()`

Es la sintaxis moderna recomendada en YSI v5. Elimina la ambigüedad de los tags tradicionales de Pawn y permite pasar parámetros nombrados de configuración.

```pawn
@cmd() mi_comando(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /mi_comando - Muestra un mensaje de prueba.");
    }

    SendClientMessage(playerid, 0x00FF00AA, "¡Comando ejecutado exitosamente!");
    return 1;
}
```

#### Parámetros con nombre de `@cmd()`:
- `.disabled`: Si es `true`, el comando inicia deshabilitado para todos los jugadores hasta activarlo con `Command_SetPlayer` o permisos de grupos.
- `.hidden`: Si es `true`, el comando se puede usar pero no aparece en los listados automáticos de comandos del jugador.
- `.name`: Define el texto visible del comando en caso de usar caracteres no estándar o idiomas distintos al inglés (ej: `@cmd(.name = "vehículo") veh(playerid, params[], help)`).
- `.alts`: Lista de nombres alternativos como array de strings (ej: `@cmd(.alts = {"v", "auto"}) veh(...)`).
- `.group`: Grupo asignado por defecto para la ejecución del comando.

---

### Sintaxis Clásica `YCMD:`

Sintaxis estándar de YSI disponible para proyectos existentes:

```pawn
YCMD:dinero(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /dinero [cantidad]");
    }

    new cantidad;
    if (sscanf(params, "i", cantidad))
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Debes ingresar una cantidad válida.");
    }

    GivePlayerMoney(playerid, cantidad);
    return 1;
}
```

---

### Compatibilidad con Sintaxis `CMD:`

Si migras código existente de ZCMD o I-ZCMD, puedes seguir escribiendo:

```pawn
CMD:curar(playerid, params[])
{
    SetPlayerHealth(playerid, 100.0);
    SendClientMessage(playerid, 0x00FF00AA, "Has sido curado.");
    return 1;
}
```
`y_commands` traduce automáticamente la macro `CMD:` a su estructura interna sin pérdida de rendimiento.

---

### El Parámetro `help`

En SA-MP, normalmente los desarrolladores llenan su gamemode con un comando gigantesco `/ayuda` o `/comandos` que requiere mantenimiento manual continuo. 

En `y_commands`, cada comando gestiona su propia ayuda mediante el parámetro booleano `help`:
1. Si un usuario ejecuta `/comando`, el parámetro `help` recibe el valor `0` (false).
2. Si se ejecuta mediante el comando central `/ayuda` usando `Command_ReProcess(playerid, params, true)`, `help` recibe `1` (true).

#### Implementación del comando maestro `/ayuda`:
```pawn
@cmd() ayuda(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /ayuda [nombre_de_comando]");
    }

    if (IsNull(params))
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Escribe el comando del cual deseas información. Ejemplo: /ayuda ban");
    }

    // Re-procesa el comando indicando help = true
    if (!Command_ReProcess(playerid, params, true))
    {
        SendClientMessage(playerid, 0xFF0000AA, "El comando especificado no existe o no tienes permiso para usarlo.");
    }
    return 1;
}
```

---

## Alias y Nombres Alternativos

Puedes crear alias estáticos directamente en tiempo de compilación asignando la función con el operador `=`:

```pawn
// El comando original:
@cmd() teleport(playerid, params[], help)
{
    SetPlayerPos(playerid, 0.0, 0.0, 5.0);
    return 1;
}

// Dos alias exactos hacia la misma función sin duplicar código:
YCMD:tp(playerid, params[], help) = teleport;
YCMD:goto(playerid, params[], help) = teleport;
```

---

## Referencia de la API de Comandos

### Command_AddAlt / Command_AddAltNamed

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Registra un alias en tiempo de ejecución para un comando existente. `Command_AddAlt` utiliza el ID interno del comando, mientras que `Command_AddAltNamed` toma el nombre canónico de la función en formato string.

#### Sintaxis
```pawn
stock Command_AddAlt(oidx, const string:cmd[], bool:inherit = false)
stock Command_AddAltNamed(const string:function[], const string:altname[], bool:inherit = false)
```

#### Parámetros
- `oidx` / `function[]`: ID del comando original o nombre de la función en cadena (ej: `"teleport"`).
- `cmd[]` / `altname[]`: Nuevo nombre para el comando alias (sin la barra diagonal inicial).
- `inherit` (`bool`, opcional, por defecto `false`): Si es `true`, el alias hereda automáticamente los permisos del comando original. Si es `false`, el alias tiene su propia lista de permisos independiente.

#### Retorno
Devuelve el ID numérico asignado al nuevo comando alias, o `COMMAND_NOT_FOUND` (-1) en caso de fallo.

#### Ejemplo Práctico
```pawn
public OnGameModeInit()
{
    // Añade el alias /gotopos para el comando canónico "teleport"
    Command_AddAltNamed("teleport", "gotopos", true);
    return 1;
}
```

---

### Command_SetPlayer / Command_SetPlayerNamed

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Concede o deniega de forma explícita el acceso a un comando para un jugador individual.

#### Sintaxis
```pawn
GLOBAL__ bool:Command_SetPlayer(command, playerid, bool:set)
stock bool:Command_SetPlayerNamed(const string:funcname[], playerid, bool:set)
```

#### Parámetros
- `command` / `funcname[]`: ID del comando o nombre de la función en texto. Puedes obtener el identificador usando `YCMD:nombre` o `Command_GetID("nombre")`.
- `playerid`: ID del jugador al que se aplica el cambio.
- `set`: `true` para autorizar el uso del comando, `false` para revocar el acceso.

#### Retorno
Devuelve `true` si la operación tuvo éxito, `false` si el comando o el jugador son inválidos.

#### Ejemplo Práctico
```pawn
// Dar acceso a /crearvehiculo solo tras iniciar sesión como Administrador
public OnPlayerAdminLogin(playerid, adminLevel)
{
    if (adminLevel >= 3)
    {
        Command_SetPlayerNamed("crearvehiculo", playerid, true);
        SendClientMessage(playerid, 0x00FF00AA, "Acceso concedido al comando /crearvehiculo.");
    }
    return 1;
}
```

---

### Command_GetPlayer / Command_GetPlayerNamed

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Consulta si un jugador determinado tiene permiso para ejecutar un comando específico.

#### Sintaxis
```pawn
GLOBAL__ bool:Command_GetPlayer(command, playerid)
stock bool:Command_GetPlayerNamed(const string:funcname[], playerid)
```

#### Parámetros
- `command` / `funcname[]`: Identificador del comando (ej: `YCMD:ban`) o nombre de la función.
- `playerid`: ID del jugador a comprobar.

#### Retorno
Devuelve `true` si el jugador puede ejecutar el comando; `false` en caso contrario.

---

### Command_SetPlayerDisabled / Command_GetPlayerDisabled

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Deshabilita o habilita **todos** los comandos para un jugador determinado de manera simultánea. Es la solución ideal cuando un jugador entra a la cárcel, es esposado, o se encuentra en la pantalla de login antes de registrarse.

#### Sintaxis
```pawn
GLOBAL__ void:Command_SetPlayerDisabled(playerid, bool:set)
GLOBAL__ bool:Command_GetPlayerDisabled(playerid)
```

#### Parámetros
- `playerid`: ID del jugador objetivo.
- `set`: `true` para bloquear todos los comandos, `false` para desbloquearlos.

#### Ejemplo Práctico
```pawn
public OnPlayerConnect(playerid)
{
    // Bloquear todos los comandos hasta que ingrese su contraseña
    Command_SetPlayerDisabled(playerid, true);
    return 1;
}

public OnPlayerLoginSuccess(playerid)
{
    // Restablecer el uso normal de comandos
    Command_SetPlayerDisabled(playerid, false);
    return 1;
}
```

---

### Command_SetDeniedReturn / Command_GetDeniedReturn

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Configura cómo responde el servidor cuando un jugador intenta utilizar un comando que existe, pero para el cual **no tiene permiso**.

#### Sintaxis
```pawn
GLOBAL__ void:Command_SetDeniedReturn(bool:set)
GLOBAL__ bool:Command_GetDeniedReturn()
```

#### Parámetros
- `set`: 
  - Si es `false` (comportamiento predeterminado): el servidor devuelve `0` a SA-MP, mostrando el mensaje nativo `"SERVER: Unknown command."` (ocultando que el comando realmente existe para que los usuarios no sepan qué comandos de administrador hay en el servidor).
  - Si es `true`: el servidor devuelve `1` silenciosamente, permitiendo manejar el mensaje de rechazo personalizado en el callback `OnPlayerCommandReceived`.

---

### Command_SetUnknownReturn

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Controla el retorno general cuando se introduce un comando que no existe en absoluto en el servidor.

#### Sintaxis
```pawn
GLOBAL__ void:Command_SetUnknownReturn(bool:set)
GLOBAL__ bool:Command_GetUnknownReturn()
```

---

### Command_SetPrefix / Command_SetPrefixNamed

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Permite modificar el carácter inicial requerido para activar un comando. Por defecto es `/`, pero puede cambiarse a `!`, `#`, `.`, `@`, `$`, etc.

> [!NOTE]
> Requiere definir `#define Y_COMMANDS_USE_CHARS` antes de incluir `y_commands`.

#### Sintaxis
```pawn
GLOBAL__ bool:Command_SetPrefix(command, prefix)
GLOBAL__ bool:Command_SetPrefixNamed(const string:c[], prefix)
```

#### Parámetros
- `command` / `c[]`: ID del comando o nombre de la función.
- `prefix`: Carácter ASCII que actuará de prefijo (ej: `'!'` o `'#'`).

#### Ejemplo Práctico
```pawn
#define Y_COMMANDS_USE_CHARS
#include <YSI_Visual\y_commands>

public OnGameModeInit()
{
    // El comando de chat de facción se activará con '!f [mensaje]' en vez de '/f'
    Command_SetPrefixNamed("f", '!');
    return 1;
}

@cmd() f(playerid, params[], help)
{
    if (IsNull(params)) return SendClientMessage(playerid, -1, "Uso: !f <mensaje>");
    SendClientMessageToAll(-1, params);
    return 1;
}
```

---

### Command_ReProcess

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock / Global RPC`
- **Descripción**: Reenvía manualmente un comando al motor de `y_commands` como si el jugador lo hubiera escrito por teclado.

#### Sintaxis
```pawn
GLOBAL__ bool:Command_ReProcess(playerid, const string:cmdtext[], help)
```

#### Parámetros
- `playerid`: ID del jugador que ejecuta la acción.
- `cmdtext[]`: Texto completo del comando (puede incluir o no el prefijo `/`).
- `help`: `1` para invocar la rama de ayuda del comando, `0` para ejecutar el comando normalmente.

#### Retorno
Devuelve `true` si el comando se encontró y procesó; `false` si falló o no existe.

---

### Command_GetID

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Obtiene el identificador numérico interno asignado por YSI a un comando a partir del nombre de su función.

#### Sintaxis
```pawn
GLOBAL__ Command_GetID(const string:function[])
```

#### Parámetros
- `function[]`: Nombre de la función del comando (ej: `"ban"`, `"kick"`).

#### Retorno
El ID interno del comando, o `COMMAND_NOT_FOUND` (-1) si no existe.

---

### Command_AddCallback / Command_RemoveCallback

- **Módulo**: `#include <YSI_Visual\y_commands>`
- **Tipo**: `Función stock`
- **Descripción**: Registra o destruye un comando dinámico exclusivo para un solo jugador utilizando funciones en línea (*closures* con `y_inline`). Permite crear comandos temporales o contextuales (por ejemplo, responder rápidamente con `/r` al último mensaje privado recibido).

#### Sintaxis
```pawn
stock Command_AddCallback(const string:cmd[], playerid, {F@_@s, F@_@is, F@_@isi}:ptr, tag = tagof (ptr))
stock Command_RemoveCallback(const string:cmd[], playerid, {_, F@_@s, F@_@is, F@_@isi}:owner = cellmin, tag = tagof (owner))
```

#### Parámetros
- `cmd[]`: Nombre del comando dinámico (sin barra).
- `playerid`: Jugador que tendrá acceso exclusivo a este comando.
- `ptr`: Puntero a la función en línea (`using inline ...`).
- `owner`: Propietario del callback o temporizador de caducidad (`TBC`).

#### Ejemplo Práctico: Sistema `/pm` y `/r` (Respuesta Rápida)
```pawn
@cmd() pm(playerid, params[], help)
{
    new targetid, mensaje[128];
    if (help || sscanf(params, "us[128]", targetid, mensaje))
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /pm <id/nombre> <mensaje>");
    }

    if (!IsPlayerConnected(targetid) || targetid == playerid)
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Jugador inválido.");
    }

    // Enviar el mensaje privado
    new str[144];
    format(str, sizeof(str), "[PM de %d]: %s", playerid, mensaje);
    SendClientMessage(targetid, 0xFFFF00AA, str);

    // Creamos dinámicamente el comando /r para que el receptor pueda responder:
    Command_RemoveCallback("r", targetid); // Limpia versiones anteriores

    inline const Responder(string:respuesta[])
    {
        new rstr[144];
        format(rstr, sizeof(rstr), "[Respuesta de %d]: %s", targetid, respuesta);
        SendClientMessage(playerid, 0x00FF00AA, rstr);
        @return 1;
    }
    // El comando /r expirará automáticamente en 60 segundos gracias a TBC()
    Command_AddCallback("r", targetid, TBC(60000, using inline Responder));

    SendClientMessage(playerid, 0x00FF00AA, "Mensaje enviado.");
    return 1;
}
```

---

## Callbacks del Sistema

`y_commands` proporciona dos callbacks hookeables que interceptan todo el ciclo de vida de los comandos ejecutados en el servidor:

### OnPlayerCommandReceived

- **Tipo**: `Callback hookeable`
- **Descripción**: Se ejecuta inmediatamente antes de llamar a la función del comando, una vez comprobados los permisos del jugador. Permite cancelar la ejecución, registrar auditorías o personalizar respuestas a errores.

#### Firma
```pawn
public e_COMMAND_ERRORS:OnPlayerCommandReceived(playerid, cmdtext[], e_COMMAND_ERRORS:success)
```

#### Parámetros
- `playerid`: ID del jugador que digitó el comando.
- `cmdtext[]`: Texto completo introducido en el chat.
- `success`: Estado inicial determinado por el motor (ver la enumeración `e_COMMAND_ERRORS`).

#### Retorno
- `COMMAND_OK`: Permite que la ejecución del comando continúe con normalidad.
- Cualquier otro valor de `e_COMMAND_ERRORS`: Cancela la llamada a la función del comando.

#### Ejemplo de Hook
```pawn
#include <YSI_Coding\y_hooks>

hook OnPlayerCommandReceived(playerid, cmdtext[], e_COMMAND_ERRORS:success)
{
    if (success == COMMAND_DENIED)
    {
        SendClientMessage(playerid, 0xFF0000AA, "Acceso Denegado: No tienes nivel suficiente para este comando.");
        return COMMAND_DENIED;
    }
    else if (success == COMMAND_UNDEFINED)
    {
        SendClientMessage(playerid, 0xAAAAAAFF, "Comando desconocido. Utiliza /ayuda para ver las opciones disponibles.");
        return COMMAND_SILENT; // Evita mostrar "Unknown command"
    }
    return COMMAND_OK;
}
```

---

### OnPlayerCommandPerformed

- **Tipo**: `Callback hookeable`
- **Descripción**: Se dispara inmediatamente después de haberse ejecutado la función del comando.

#### Firma
```pawn
public e_COMMAND_ERRORS:OnPlayerCommandPerformed(playerid, cmdtext[], e_COMMAND_ERRORS:success)
```

#### Parámetros
- `playerid`: ID del jugador.
- `cmdtext[]`: Texto introducido.
- `success`: Resultado devuelto por el comando (`COMMAND_OK` si devolvió 1, `COMMAND_ZERO_RET` si devolvió 0).

---

### Enumeración de Errores `e_COMMAND_ERRORS`

Declarada en `y_commands_impl.inc`:

```pawn
enum e_COMMAND_ERRORS
{
    COMMAND_ZERO_RET      = 0,  // La función del comando retornó 0
    COMMAND_OK            = 1,  // Comando procesado y ejecutado exitosamente
    COMMAND_UNDEFINED     = 2,  // El comando solicitado no existe
    COMMAND_DENIED        = 3,  // El jugador no tiene permiso para este comando
    COMMAND_HIDDEN        = 4,  // El comando está oculto para este jugador
    COMMAND_NO_PLAYER     = 6,  // Jugador desconectado o ID inválido
    COMMAND_DISABLED      = 7,  // Todos los comandos están deshabilitados para el jugador
    COMMAND_BAD_PREFIX    = 8,  // Se utilizó un prefijo incorrecto (ej: '/' en vez de '#')
    COMMAND_INVALID_INPUT = 10, // Entrada vacía o formato de comando inválido
    COMMAND_SILENT        = 11  // Finaliza inmediatamente sin emitir mensajes
}
```

---

## Ejemplo Práctico Completo con sscanf2

A continuación se muestra un módulo realista de administración con manejo de parámetros numéricos, texto, cadenas y el flag de ayuda:

```pawn
#include <a_samp>
#include <sscanf2>
#include <YSI_Visual\y_commands>

// Comando para expulsar (kick) a un jugador
@cmd() kick(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /kick <id/nombre> <motivo>");
    }

    new targetid, motivo[64];
    if (sscanf(params, "us[64]", targetid, motivo))
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Sintaxis incorrecta. Uso: /kick <id/nombre> <motivo>");
    }

    if (!IsPlayerConnected(targetid))
    {
        return SendClientMessage(playerid, 0xFF0000AA, "El jugador especificado no se encuentra en línea.");
    }

    new str[144], adminName[MAX_PLAYER_NAME], targetName[MAX_PLAYER_NAME];
    GetPlayerName(playerid, adminName, sizeof(adminName));
    GetPlayerName(targetid, targetName, sizeof(targetName));

    format(str, sizeof(str), "AdmCmd: %s fue expulsado por %s. Motivo: %s", targetName, adminName, motivo);
    SendClientMessageToAll(0xFF6347AA, str);

    Kick(targetid);
    return 1;
}

// Alias directo para /kick: /expulsar
YCMD:expulsar(playerid, params[], help) = kick;
```

---

## Buenas Prácticas y Errores Comunes

1. **Usa siempre `IsNull(params)`**: Nunca verifiques parámetros vacíos mediante `strlen(params) == 0`. La macro `IsNull(params)` de YSI es segura ante punteros nulos y órdenes de evaluación.
2. **Retorna siempre `1` en comandos exitosos**: Si tu comando retorna `0`, `y_commands` interpretará el retorno como `COMMAND_ZERO_RET`, lo que puede provocar que el servidor envíe el mensaje de comando no reconocido según la configuración.
3. **No dupliques nombres de funciones canónicas**: Si tienes dos comandos con el mismo nombre para contextos distintos (por ejemplo, `/comprar` en una tienda vs `/comprar` en una gasolinera), usa nombres canónicos distintos combinados con el parámetro nombrado `.name`:
   ```pawn
   @cmd(.name = "comprar") comprar_tienda(playerid, params[], help) { ... }
   @cmd(.name = "comprar") comprar_gasolinera(playerid, params[], help) { ... }
   ```
4. **Cuidado con `Y_COMMANDS_USE_CHARS`**: Si activas prefijos alternativos, asegúrate de no elegir caracteres comunes de texto a menos que sea estrictamente necesario, para evitar que mensajes normales del chat sean interceptados como comandos.
