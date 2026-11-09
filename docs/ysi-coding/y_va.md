# y_va: Formato Variable y Paso de Argumentos

En el desarrollo tradicional de SA-MP y open.mp, formatear texto para mostrar mensajes a los jugadores es una de las tareas más comunes, repetitivas y propensas a errores. Para enviar un simple mensaje con variables, un programador debe:
1. Declarar un buffer intermedio de celdas (`new str[144];`).
2. Llamar a `format(str, sizeof(str), "Hola %s, tu saldo es $%d", nombre, saldo);`.
3. Invocar la nativa de envío (`SendClientMessage(playerid, color, str);`).

Este patrón llena el gamemode de miles de líneas de código redundante, desperdicia memoria en el stack y con frecuencia provoca truncamiento de cadenas o problemas de desbordamiento. Además, Pawn carece nativamente de una instrucción equivalente a `vprintf` para reenviar argumentos variables (`...`) entre funciones personalizadas.

El módulo `y_va` (Variable Arguments) de YSI revoluciona este aspecto: permite usar cadenas con formato **directamente** en las funciones de SA-MP y proporciona el operador `___(n)` para reenviar listas de argumentos variables entre funciones de forma instantánea.

## Cómo incluir el módulo

Para utilizar `y_va`:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_va>
```

### Modo Automático vs `YSI_NO_AUTO_VA`
Por defecto, al incluir `y_va`, las funciones nativas de SA-MP (`SendClientMessage`, `GameTextForPlayer`, etc.) son **redefinidas automáticamente** para aceptar argumentos de formato directamente. Si un mensaje no contiene argumentos de formato, `y_va` detecta la situación y salta el formateo para no perder rendimiento.

Si prefieres conservar las firmas originales sin alteraciones y utilizar exclusivamente las versiones con prefijo explícito `va_*`, define lo siguiente antes del include:

```pawn
#define YSI_NO_AUTO_VA
#include <open.mp>
#include <YSI_Coding\y_va>
```

## Resumen de Funciones y Operadores

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`va_SendClientMessage`](#va_sendclientmessage) | Función stock | Envía un mensaje formateado a un jugador específico sin buffers intermedios. |
| [`va_SendClientMessageToAll`](#va_sendclientmessagetoall) | Función stock | Difunde un mensaje formateado a todos los jugadores conectados. |
| [`va_format`](#va_format) | Función stock | Formatea un buffer utilizando el paso de argumentos variables de YSI. |
| [`va_GameTextForPlayer`](#va_gametextforplayer) | Función stock | Muestra un GameText formateado en la pantalla de un jugador. |
| [`va_GameTextForAll`](#va_gametextforall) | Función stock | Muestra un GameText formateado a todos los jugadores en el servidor. |
| [`va_SetPlayerChatBubble`](#va_setplayerchatbubble) | Función stock | Coloca una burbuja de chat flotante formateada sobre un jugador. |
| [`va_CallLocalFunction`](#va_calllocalfunction) | Función stock | Invoca una función pública local con argumentos variables tipados. |
| [`va_CallRemoteFunction`](#va_callremotefunction) | Función stock | Invoca una función pública remota (gamemode/filterscripts) con argumentos variables. |
| [`___(n)` (Operador Varargs)](#el-operador-de-reenvio-___n) | Operador preprocesador | Reenvía la lista de argumentos variables recibida a otra función varargs. |

## Comparativa: Código Tradicional vs y_va

### Método Tradicional (Tedioso y redundante)
```pawn
CMD:stats(playerid, params[])
{
    new targetid;
    if (sscanf(params, "u", targetid)) return SendClientMessage(playerid, -1, "Uso: /stats [ID]");
    if (!IsPlayerConnected(targetid)) return SendClientMessage(playerid, -1, "Jugador desconectado.");

    new name[MAX_PLAYER_NAME];
    GetPlayerName(targetid, name, sizeof(name));
    new money = GetPlayerMoney(targetid);
    new score = GetPlayerScore(targetid);

    // Buffer temporal requerido
    new buffer[144];

    format(buffer, sizeof(buffer), "=== ESTADISTICAS DE %s (ID: %d) ===", name, targetid);
    SendClientMessage(playerid, 0xFFFF00AA, buffer);

    format(buffer, sizeof(buffer), "Dinero en mano: $%d | Puntuacion: %d", money, score);
    SendClientMessage(playerid, 0xFFFFFFFF, buffer);

    return 1;
}
```

### Con y_va (Limpio, directo y legible)
```pawn
CMD:stats(playerid, params[])
{
    new targetid;
    if (sscanf(params, "u", targetid)) return va_SendClientMessage(playerid, -1, "Uso: /stats [ID]");
    if (!IsPlayerConnected(targetid)) return va_SendClientMessage(playerid, -1, "Jugador desconectado.");

    new name[MAX_PLAYER_NAME];
    GetPlayerName(targetid, name, sizeof(name));

    // Formateo directo en la misma línea
    va_SendClientMessage(playerid, 0xFFFF00AA, "=== ESTADISTICAS DE %s (ID: %d) ===", name, targetid);
    va_SendClientMessage(playerid, 0xFFFFFFFF, "Dinero en mano: $%d | Puntuacion: %d", GetPlayerMoney(targetid), GetPlayerScore(targetid));

    return 1;
}
```

## Documentación de Funciones

### va_SendClientMessage

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Da formato a una cadena y la envía directamente al chat del jugador especificado en una sola instrucción.
- **Sintaxis:**
```pawn
va_SendClientMessage(playerid, color, const format[], GLOBAL_TAG_TYPES:...);
```
- **Parámetros:**
  - `playerid`: ID del jugador receptor.
  - `color`: Color en formato RGBA hexadecimal (ej. `0x33CCFFAA`).
  - `format[]`: Cadena con especificadores (`%s`, `%d`, `%f`, `%x`, etc.).
  - `...`: Lista opcional de argumentos a insertar en la cadena.
- **Retorno:** Retorna `1` en caso de éxito, `0` si el jugador no está conectado.
- **Ejemplo práctico:**
```pawn
va_SendClientMessage(playerid, 0x00FF00AA, "[INFO] Te has conectado desde la IP: %s (Ping: %d ms)", playerIP, GetPlayerPing(playerid));
```

---

### va_SendClientMessageToAll

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Aplica formato a una cadena y la transmite a la totalidad de los jugadores presentes en el servidor.
- **Sintaxis:**
```pawn
va_SendClientMessageToAll(color, const format[], GLOBAL_TAG_TYPES:...);
```
- **Parámetros:**
  - `color`: Color del mensaje en hexadecimal.
  - `format[]`: Texto con especificadores de formato.
  - `...`: Valores a insertar.
- **Retorno:** Retorna `1`.
- **Ejemplo práctico:**
```pawn
va_SendClientMessageToAll(0xFF0000AA, "[ALERTA GLOBAL] El jugador %s ha sido expulsado por: %s", bannedName, reason);
```

---

### va_format

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Alternativa mejorada a `format()` compatible con el sistema de etiquetas globales `GLOBAL_TAG_TYPES` y el operador de paso de argumentos variables `___(n)`.
- **Sintaxis:**
```pawn
va_format(output[], size, const format[], GLOBAL_TAG_TYPES:...);
```
- **Parámetros:**
  - `output[]`: Array de destino donde se escribirá el texto formateado.
  - `size`: Tamaño máximo del buffer receptor (`sizeof(output)`).
  - `format[]`: Cadena plantilla.
  - `...`: Argumentos o llamada a `___(n)`.
- **Retorno:** No retorna valor directo; modifica el buffer de destino.

---

### va_GameTextForPlayer

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Muestra un mensaje GameText en la pantalla de un jugador aplicando formateo de texto directamente.
- **Sintaxis:**
```pawn
va_GameTextForPlayer(playerid, const format[], time, style, GLOBAL_TAG_TYPES:...);
```
- **Parámetros:**
  - `playerid`: ID del jugador.
  - `format[]`: Texto con formato y estilos de color de GTA (`~r~`, `~g~`, `~w~`).
  - `time`: Duración en milisegundos.
  - `style`: Estilo visual de GameText (0 a 6).
  - `...`: Argumentos de sustitución.
- **Retorno:** Retorna `1` si tuvo éxito.
- **Ejemplo práctico:**
```pawn
va_GameTextForPlayer(playerid, "~g~+$%d ~w~BONIFICACION", 3000, 1, bonusAmount);
```

---

### va_GameTextForAll

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Muestra un GameText formateado a todos los usuarios del servidor.
- **Sintaxis:**
```pawn
va_GameTextForAll(const format[], time, style, GLOBAL_TAG_TYPES:...);
```
- **Ejemplo práctico:**
```pawn
va_GameTextForAll("~y~EVENTO: ~w~%s ~r~INICIADO!", 4000, 3, eventName);
```

---

### va_SetPlayerChatBubble

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Muestra un texto flotante temporal sobre la cabeza de un personaje con variables formateadas.
- **Sintaxis:**
```pawn
va_SetPlayerChatBubble(playerid, const format[], color, Float:drawDistance, expireTime, GLOBAL_TAG_TYPES:...);
```
- **Parámetros:**
  - `playerid`: Jugador sobre el cual se mostrará el texto.
  - `format[]`: Texto a formatear.
  - `color`: Color del texto.
  - `drawDistance`: Distancia máxima en metros para visualizar la burbuja.
  - `expireTime`: Tiempo en milisegundos antes de desaparecer.
  - `...`: Variables a formatear.
- **Retorno:** Retorna `1`.
- **Ejemplo práctico:**
```pawn
va_SetPlayerChatBubble(playerid, "* Dice: %s *", 0xAAAAAAFF, 20.0, 4000, playerSaidText);
```

---

### va_CallLocalFunction y va_CallRemoteFunction

- **Módulo requerido:** `#include <YSI_Coding\y_va>`
- **Tipo:** Función stock
- **Descripción:** Versiones adaptadas de `CallLocalFunction` y `CallRemoteFunction` que integran compatibilidad total con reenvío de listas de parámetros mediante `___(n)`.
- **Sintaxis:**
```pawn
va_CallLocalFunction(const function[], const specifiers[], GLOBAL_TAG_TYPES:...);
va_CallRemoteFunction(const function[], const specifiers[], GLOBAL_TAG_TYPES:...);
```
- **Retorno:** El valor entero devuelto por la función pública llamada.

## El Operador de Reenvío: `___(n)`

Uno de los problemas más frustrantes de Pawn es la imposibilidad de crear funciones intermedias que reciban parámetros variables (`...`) y los pasen a otra función. Por ejemplo, crear tu propia función de log o mensajes de chat con prefijo de rango.

`y_va` introduce el operador preprocesador `___(n)`:
* **Regla mnemotécnica:** *3 puntos (`...`) para recibir variables, 3 guiones bajos (`___`) para enviarlas.*
* **El parámetro `n`:** Representa cuántos argumentos estándar tiene la función actual antes del `...`. `y_va` ignorará esos primeros `n` parámetros y reenviará todos los restantes por referencia.

### Ejemplo Práctico de Reenvío Varargs
```pawn
#include <open.mp>
#include <YSI_Coding\y_va>

// Esta función tiene 2 parámetros regulares (playerid, nivel) antes de '...'
// Por lo tanto, usamos ___(2) para pasar el resto a va_SendClientMessage
EnviarMensajeRango(playerid, nivel, const formato[], ...)
{
    if (GetPlayerAdminLevel(playerid) < nivel) return 0;

    // Pasamos el formato y todos los argumentos variables restantes con ___(2)
    va_SendClientMessage(playerid, 0xFFCC00AA, formato, ___(2));
    return 1;
}

// Función con 1 parámetro regular antes de '...' -> usamos ___(1)
AuditoriaServidor(const formato[], ...)
{
    new entry[256];
    format(entry, sizeof(entry), formato, ___(1));
    printf("[AUDIT] %s", entry);
}

main()
{
    AuditoriaServidor("Servidor iniciado con exito en el puerto %d (Modo: %s)", 7777, "Roleplay");
}
```

## Etiquetas Globales: GLOBAL_TAG_TYPES y CUSTOM_TAG_TYPES

En Pawn, si declaras `MiFuncion(const formato[], ...)` el compilador asumirá que los argumentos adicionales son enteros sin etiqueta (`_:`). Si intentas pasar un `Float:`, un `Timer:`, un `Text3D:` o un tag propio, el compilador emitirá un molesto warning:
`warning 213: tag mismatch`

`y_va` define internamente `GLOBAL_TAG_TYPES:...`, que engloba automáticamente los tags más utilizados en SA-MP:
`{_, Language, Bit, Text, Menu, Style, XML, Bintree, Group, Timer, File, Float, Text3D, CUSTOM_TAG_TYPES}`

### Añadir tus Propios Tags con `CUSTOM_TAG_TYPES`
Si en tu gamemode utilizas tags específicos (como `DB:`, `MySQL:`, `BitArray:`) y quieres que sean admitidos sin advertencias en las funciones de `y_va`, define `CUSTOM_TAG_TYPES` antes de incluir la librería:

```pawn
#define CUSTOM_TAG_TYPES MiTag,OtroTag,E_PLAYER_DATA
#include <open.mp>
#include <YSI_Coding\y_va>
```

## Lista de Funciones Nativas Sobrecargadas

Si **no** defines `YSI_NO_AUTO_VA`, las siguientes funciones nativas de SA-MP aceptan argumentos de formato directamente sin necesidad de anteponer `va_`:

* `SendClientMessage(playerid, color, const format[], ...)`
* `SendClientMessageToAll(color, const format[], ...)`
* `SendPlayerMessageToPlayer(playerid, senderid, const format[], ...)`
* `SendPlayerMessageToAll(senderid, const format[], ...)`
* `GameTextForPlayer(playerid, const format[], time, style, ...)`
* `GameTextForAll(const format[], time, style, ...)`
* `SetPlayerChatBubble(playerid, const format[], color, Float:drawDistance, expireTime, ...)`
* `Create3DTextLabel(const format[], color, Float:x, Float:y, Float:z, Float:drawDistance, virtualWorld, bool:testLOS, ...)`
* `Update3DTextLabelText(Text3D:id, color, const format[], ...)`
* `CreatePlayer3DTextLabel(playerid, const format[], color, Float:x, Float:y, Float:z, Float:drawDistance, ...)`
* `UpdatePlayer3DTextLabelText(playerid, PlayerText3D:id, color, const format[], ...)`
* `TextDrawCreate(Float:x, Float:y, const format[], ...)`
* `TextDrawSetString(Text:text, const format[], ...)`
* `CreatePlayerTextDraw(playerid, Float:x, Float:y, const format[], ...)`
* `PlayerTextDrawSetString(playerid, PlayerText:text, const format[], ...)`
* `SetGameModeText(const format[], ...)`
* `SendRconCommand(const format[], ...)`

## Ejemplo Completo para SA-MP / open.mp

Demostración de un sistema de mensajería y administración completo aprovechando `y_va` y reenvío de argumentos con `___(n)`:

```pawn
#include <open.mp>
#include <YSI_Coding\y_va>

// Función personalizada de anuncio con prefijo de facción
// Tiene 3 parámetros regulares: (playerid, factionName, color) -> usa ___(3)
SendFactionBroadcast(playerid, const factionName[], color, const format[], ...)
{
    new fullFormat[192];
    // Inyectamos el prefijo de la facción
    format(fullFormat, sizeof(fullFormat), "[RADIO %s] %s", factionName, format);

    // Reenviamos todos los parámetros del llamador a va_SendClientMessage
    va_SendClientMessage(playerid, color, fullFormat, ___(3));
    return 1;
}

CMD:radio(playerid, params[])
{
    if (isnull(params))
    {
        return va_SendClientMessage(playerid, 0xFF0000AA, "Uso: /radio [mensaje]");
    }

    new pName[MAX_PLAYER_NAME];
    GetPlayerName(playerid, pName, sizeof(pName));

    // Llamamos a nuestra función personalizada de radio
    SendFactionBroadcast(playerid, "POLICIA", 0x33CCFFAA, "%s transmite: %s", pName, params);

    // Burbuja sobre la cabeza formateada directamente
    va_SetPlayerChatBubble(playerid, "* Habla por la radio policial: %s *", 0xFFFF00AA, 15.0, 3500, params);
    return 1;
}

CMD:sancionar(playerid, params[])
{
    new targetid, reason[64];
    if (sscanf(params, "us[64]", targetid, reason))
    {
        return va_SendClientMessage(playerid, -1, "Uso: /sancionar [ID] [Motivo]");
    }

    if (!IsPlayerConnected(targetid))
    {
        return va_SendClientMessage(playerid, 0xFF0000AA, "El usuario indicado no se encuentra en línea.");
    }

    new adminName[MAX_PLAYER_NAME], targetName[MAX_PLAYER_NAME];
    GetPlayerName(playerid, adminName, sizeof(adminName));
    GetPlayerName(targetid, targetName, sizeof(targetName));

    // Difusión global a todos los jugadores en una sola línea
    va_SendClientMessageToAll(0xFF0000AA, "[ADMIN] %s fue sancionado por el Administrador %s. Razon: %s", targetName, adminName, reason);

    // GameText personalizado en pantalla
    va_GameTextForPlayer(targetid, "~r~HAS SIDO SANCIONADO~n~~w~%s", 5000, 3, reason);
    return 1;
}
```

## Buenas Prácticas y Errores Comunes

1. **Cálculo incorrecto del índice en `___(n)`:**  
   El valor de `n` debe ser la cantidad exacta de parámetros ordinarios declarados antes de los `...`. Si declaras `Log(categoria, nivel, const msg[], ...)` y colocas `___(1)`, el compilador o la máquina virtual leerá parámetros equivocados. El valor correcto es `___(3)`.

2. **No pasar variables por valor a `___(n)`:**  
   `___(n)` funciona mediante paso por referencia en la pila. No intentes pasar variables escalares fijas directamente en el hueco de `___(n)`; este operador solo debe usarse dentro de funciones que recibieron `...`.

3. **Sobrecarga innecesaria de formateo:**  
   Si vas a enviar un mensaje puramente estático que no contiene `%s` ni `%d` (por ejemplo: `"Bienvenido al servidor"`), utiliza texto plano sin formato adicional. `y_va` detecta automáticamente que no hay parámetros adicionales y evita invocar `format()`, asegurando un rendimiento óptimo.
