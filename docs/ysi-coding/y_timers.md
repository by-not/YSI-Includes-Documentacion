# y_timers: Temporizadores y Tareas Asíncronas

El módulo `y_timers` de la suite YSI proporciona un reemplazo integral, seguro y de alto rendimiento para el anticuado sistema nativo de temporizadores de SA-MP (`SetTimer` y `SetTimerEx`). 

En el desarrollo de SA-MP y open.mp, los temporizadores tradicionales presentan severos problemas históricos:
* **Falta de verificación en compilación:** `SetTimerEx` utiliza cadenas de especificadores de formato (como `"ifi"`) que no son validadas por el compilador; un error tipográfico causa fallos en tiempo de ejecución o corrupción del stack.
* **Corrupción con cadenas y arrays:** El paso de arrays o strings a través de `SetTimerEx` contiene errores intrínsecos de punteros en la máquina virtual AMX original.
* **Picos de lag por colisiones de ticks:** Si defines múltiples temporizadores con el mismo intervalo (por ejemplo, 1000 ms), todos se ejecutan en el mismo milisegundo, provocando congelamientos perceptibles (lag spikes).
* **Falta de modularidad:** La firma de la función, su periodicidad y sus llamadas se encuentran dispersas en el código.

`y_timers` soluciona todos estos inconvenientes mediante algoritmos de compensación temporal (*scheduling & offsetting*), soporte nativo de tipos para arrays y cadenas, comprobación estricta de sintaxis y palabras clave expresivas como `timer`, `task`, `ptask`, `defer` y `repeat`.

---

## Cómo incluir el módulo

Para utilizar `y_timers`, incluye la librería después de las dependencias base (`a_samp` u `open.mp`):

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_timers>
```

---

## Resumen de Funciones y Macros

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`timer`](#timer) | Macro preprocesador | Declara una función que puede ser invocada de forma diferida o repetitiva con argumentos tipados. |
| [`task`](#task) | Macro preprocesador | Declara una tarea global que se ejecuta automáticamente en segundo plano a intervalos definidos. |
| [`ptask`](#ptask) | Macro preprocesador | Declara una tarea periódica balanceada por cada jugador conectado (`playerid`). |
| [`defer`](#defer) | Macro / Palabra clave | Ejecuta un `timer` una única vez tras cumplirse el intervalo definido o sobreescrito. |
| [`repeat`](#repeat) | Macro / Palabra clave | Ejecuta un `timer` continuamente en bucle a cada intervalo, o un número fijo de repeticiones. |
| [`stop`](#stop) | Macro / Palabra clave | Detiene inmediatamente la ejecución de un temporizador activo asignado a un identificador. |
| [`Timer_IsRunning`](#timer_isrunning) | Función stock | Comprueba si un temporizador específico (`Timer:`) sigue activo y en ejecución. |
| [`Timer_GetCallCount`](#timer_getcallcount) | Función stock | Obtiene el número de veces que se ha ejecutado un temporizador repetitivo activo. |

---

## Definición y Ejecución de Temporizadores

### timer

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro preprocesador
- **Descripción:** Declara una función temporizada personalizada. A diferencia de las funciones normales o públicas, define en su propia cabecera un tiempo de espera por defecto (en milisegundos) y puede recibir argumentos fuertemente tipados. El compilador valida la concordancia de tipos al invocarla mediante `defer` o `repeat`.
- **Sintaxis:**
```pawn
timer NombreFuncion[intervalo_ms](parametros)
{
    // Código a ejecutar
}
```
- **Parámetros:**
  - `NombreFuncion`: Identificador de la función.
  - `intervalo_ms`: Expresión entera constante o cálculo en milisegundos para el retardo predeterminado.
  - `parametros`: Lista de argumentos que recibirá la función. Soporta valores escalares, floats, arrays y cadenas de texto.
- **Retorno:** No retorna valor directo al llamador; internamente genera las estructuras y funciones públicas necesarias para el AMX.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

// Temporizador diferido por defecto a 3 segundos (3000 ms)
timer UnfreezePlayer[3000](playerid)
{
    if (IsPlayerConnected(playerid))
    {
        TogglePlayerControllable(playerid, true);
        SendClientMessage(playerid, 0x00FF00FF, "[SISTEMA] Tus movimientos han sido restaurados.");
    }
}
```
- **Notas / Advertencias:**
  - Los arrays pasados a un `timer` **deben** ir seguidos inmediatamente por su parámetro de longitud (`arr[], len`).
  - Las cadenas de texto **deben** declararse con la etiqueta especial `string:` (ej. `string:mensaje[]`).

---

### task

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro preprocesador
- **Descripción:** Declara una tarea que se inicia de manera automática al inicializarse el script (`OnCodeInit`) y se repite indefinidamente en el fondo a intervalos regulares. Las tareas con el mismo intervalo son distribuidas automáticamente en el tiempo (*offsetting*) para balancear la carga del servidor y evitar caídas bruscas de FPS.
- **Sintaxis:**
```pawn
task NombreTarea[intervalo_ms]()
{
    // Código de la tarea periódica
}
```
- **Parámetros:**
  - `NombreTarea`: Identificador único de la tarea.
  - `intervalo_ms`: Tiempo en milisegundos entre cada ejecución.
  - No admite parámetros en su lista de argumentos (`()`).
- **Retorno:** Las tareas no devuelven un valor útil al servidor.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

// Tarea ejecutada cada 60 segundos para sincronizar el tiempo del mundo
task WorldClockUpdate[60000]()
{
    new hours, minutes, seconds;
    gettime(hours, minutes, seconds);
    SetWorldTime(hours);
    printf("[SERVIDOR] Hora sincronizada a las %02d:%02d.", hours, minutes);
}
```
- **Notas / Advertencias:**
  - No intentes añadir argumentos a un `task`. Si requieres que la tarea itere sobre jugadores de manera equilibrada, utiliza `ptask`.
  - Aunque se ejecutan de manera automática, puedes llamar a la función directamente como una función ordinaria en cualquier punto de tu código (`WorldClockUpdate();`).

---

### ptask

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro preprocesador
- **Descripción:** Declara una tarea periódica que se ejecuta automáticamente de forma individual para cada jugador conectado en el servidor. `y_timers` distribuye internamente los ticks entre todos los jugadores conectados de modo que no se procesen todos en el mismo ciclo, manteniendo estable la tasa de ticks del servidor.
- **Sintaxis:**
```pawn
ptask NombreTarea[intervalo_ms](playerid)
{
    // Código ejecutado periódicamente para cada jugador
}
```
- **Parámetros:**
  - `NombreTarea`: Identificador único de la tarea.
  - `intervalo_ms`: Tiempo en milisegundos de frecuencia por jugador.
  - `playerid`: Variable que contendrá el ID del jugador procesado en cada ciclo.
- **Retorno:** No aplica.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

// Se ejecuta cada 1000 ms por cada jugador conectado
ptask PlayerSurvivalCheck[1000](playerid)
{
    new Float:health;
    GetPlayerHealth(playerid, health);

    // Advertencia de salud crítica
    if (health > 0.0 && health < 15.0)
    {
        GameTextForPlayer(playerid, "~r~SALUD CRITICA! VISITA UN MEDICO", 800, 3);
    }
}
```
- **Notas / Advertencias:**
  - `ptask` garantiza que `playerid` corresponde a un jugador actualmente conectado; si no hay usuarios en el servidor, no se consume CPU innecesaria.
  - El único parámetro permitido es el identificador del jugador (`playerid`).

---

### defer

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro / Palabra clave
- **Descripción:** Invoca un `timer` para que sea ejecutado una sola vez tras haber transcurrido el tiempo asignado. Permite conservar el intervalo por defecto declarado en la firma o sobreescribirlo opcionalmente usando corchetes `[nuevo_tiempo_ms]`.
- **Sintaxis:**
```pawn
// Uso con tiempo por defecto:
Timer:id = defer NombreTimer(argumentos);

// Sobreescribiendo el tiempo definido:
Timer:id = defer NombreTimer[tiempo_ms](argumentos);
```
- **Parámetros:**
  - `NombreTimer`: Identificador de la función declarada con `timer`.
  - `[tiempo_ms]` *(Opcional)*: Nuevo tiempo en milisegundos que reemplaza el valor predeterminado.
  - `argumentos`: Lista de parámetros requeridos por la definición del `timer`.
- **Retorno:** Devuelve un manejador de tipo `Timer:` que identifica la instancia creada. Puede asignarse a una variable para cancelarlo posteriormente mediante `stop`.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

timer WelcomeDelayed[2500](playerid)
{
    SendClientMessage(playerid, 0x33CCFFAA, "Bienvenido al servidor. Esperamos que disfrutes tu estancia.");
}

public OnPlayerSpawn(playerid)
{
    // Ejecuta el temporizador tras 2.5 segundos
    defer WelcomeDelayed(playerid);

    // Si quisiéramos cambiar el tiempo a 5 segundos en esta llamada puntual:
    // defer WelcomeDelayed[5000](playerid);
    return 1;
}
```
- **Notas / Advertencias:**
  - No es obligatorio guardar el resultado en una variable `Timer:` si no necesitas cancelar el temporizador antes de que concluya.

---

### repeat

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro / Palabra clave
- **Descripción:** Inicia la ejecución recurrente de un `timer`. Se ejecutará cada intervalo de forma indefinida hasta que sea detenido explícitamente con `stop`. Opcionalmente, soporta una sintaxis avanzada de conteo de repeticiones `repeat[repeticiones] NombreTimer(argumentos)`.
- **Sintaxis:**
```pawn
// Bucle indefinido con intervalo predeterminado:
Timer:id = repeat NombreTimer(argumentos);

// Bucle indefinido con intervalo sobreescrito:
Timer:id = repeat NombreTimer[intervalo_ms](argumentos);

// Conteo limitado de repeticiones:
Timer:id = repeat[veces] NombreTimer(argumentos);
```
- **Parámetros:**
  - `NombreTimer`: Función declarada con `timer`.
  - `[intervalo_ms]` *(Opcional)*: Intervalo en milisegundos entre cada llamada.
  - `[veces]` *(Opcional)*: Entero con la cantidad de ejecuciones antes de auto-detenerse.
  - `argumentos`: Parámetros que coincidan con la firma del `timer`.
- **Retorno:** Retorna un identificador con tag `Timer:` para control y cancelación.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

static Timer:gCountdownTimer[MAX_PLAYERS];
static gPlayerCount[MAX_PLAYERS];

timer RaceCountdown[1000](playerid)
{
    if (gPlayerCount[playerid] > 0)
    {
        new str[16];
        format(str, sizeof(str), "~y~%d", gPlayerCount[playerid]);
        GameTextForPlayer(playerid, str, 900, 3);
        PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);
        gPlayerCount[playerid]--;
    }
    else
    {
        GameTextForPlayer(playerid, "~g~YA!", 1000, 3);
        PlayerPlaySound(playerid, 1057, 0.0, 0.0, 0.0);
        stop gCountdownTimer[playerid];
        gCountdownTimer[playerid] = Timer:0;
    }
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/iniciarconteo", true))
    {
        gPlayerCount[playerid] = 3;
        // Iniciar repetición cada segundo
        gCountdownTimer[playerid] = repeat RaceCountdown(playerid);
        return 1;
    }
    return 0;
}
```
- **Notas / Advertencias:**
  - Guarda siempre el manejador devuelto si necesitas detener el temporizador manualmente antes de que el script sea descargado o cuando el jugador se desconecte.

---

### stop

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Macro / Palabra clave
- **Descripción:** Detiene de manera inmediata y segura un temporizador activo (`Timer:`) antes de su siguiente ciclo. Además, si se invoca dentro de la propia función `timer` sin parámetros (`stop;`), detiene inmediatamente la ejecución en curso del temporizador actual.
- **Sintaxis:**
```pawn
// Detener un timer por su identificador:
stop identificador_timer;

// Detener el timer actual desde dentro de sí mismo:
stop;
```
- **Parámetros:**
  - `identificador_timer`: Variable de tipo `Timer:` que contiene el identificador obtenido de `defer` o `repeat`.
- **Retorno:** No retorna valor.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

static Timer:gPlayerBeacon[MAX_PLAYERS];

timer EmitBeacon[2000](playerid)
{
    // Auto-detención si el jugador está muerto o desconectado
    if (!IsPlayerConnected(playerid))
    {
        stop; // Cancela el timer actual de forma autónoma
        return;
    }

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    SetPlayerChatBubble(playerid, "* Señal GPS emitida *", 0x00FF00FF, 30.0, 1500);
}

public OnPlayerDisconnect(playerid, reason)
{
    // Detención externa segura
    if (gPlayerBeacon[playerid])
    {
        stop gPlayerBeacon[playerid];
        gPlayerBeacon[playerid] = Timer:0;
    }
    return 1;
}
```
- **Notas / Advertencias:**
  - Aplicar `stop` múltiples veces sobre el mismo identificador o sobre un temporizador ya destruido es completamente seguro en `y_timers` y no provoca advertencias ni errores en el servidor.
  - Tras invocar `stop miTimer;`, es recomendable reiniciar la variable a `Timer:0` para identificar visualmente su inactividad en comparaciones lógicas.

---

### Timer_IsRunning

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Función stock
- **Descripción:** Consulta si el temporizador identificado por el handle indicado se encuentra activo y registrado en el planificador interno de YSI.
- **Sintaxis:**
```pawn
stock bool:Timer_IsRunning(Timer:slot = Timer:-1)
```
- **Parámetros:**
  - `slot`: Manejador de temporizador (`Timer:`). Si se omite o es `Timer:-1`, evalúa el temporizador en ejecución actual.
- **Retorno:** Retorna `true` si el temporizador está vivo y esperando ejecución; `false` si ha sido detenido, ya expiró o no existe.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

static Timer:gActionTimer[MAX_PLAYERS];

timer ProcessingTask[5000](playerid)
{
    SendClientMessage(playerid, -1, "Proceso finalizado.");
    gActionTimer[playerid] = Timer:0;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/procesar", true))
    {
        if (Timer_IsRunning(gActionTimer[playerid]))
        {
            SendClientMessage(playerid, 0xFF0000FF, "Error: Ya tienes un proceso en ejecución.");
            return 1;
        }

        gActionTimer[playerid] = defer ProcessingTask(playerid);
        SendClientMessage(playerid, 0x00FF00FF, "Proceso iniciado, espera 5 segundos...");
        return 1;
    }
    return 0;
}
```

---

### Timer_GetCallCount

- **Módulo requerido:** `#include <YSI_Coding\y_timers>`
- **Tipo:** Función stock
- **Descripción:** Obtiene la cantidad de veces consecutivas que un temporizador repetitivo (`repeat`) ha sido ejecutado desde que se inició.
- **Sintaxis:**
```pawn
stock Timer_GetCallCount(Timer:slot = Timer:-1)
```
- **Parámetros:**
  - `slot`: El identificador `Timer:` a consultar (por defecto el actual con `Timer:-1`).
- **Retorno:** Retorna el número entero de llamadas realizadas hasta el momento. Si el slot no es válido, retorna 0.
- **Ejemplo práctico:**
```pawn
timer MetricPulse[1000]()
{
    new calls = Timer_GetCallCount();
    if (calls % 10 == 0)
    {
        printf("[ESTADISTICA] MetricPulse se ha ejecutado %d veces.", calls);
    }
}
```

---

## Paso de Argumentos Especiales: Arrays y Cadenas

En el SA-MP original, enviar arrays o texto a `SetTimerEx` requería trucos de memoria o plugins de terceros debido al famoso error de desreferenciación. En `y_timers`, el manejo de memoria dinámica está integrado transparentemente:

### Paso de Arrays (`arr[], len`)

Cualquier array que se transfiera a través de un temporizador **debe** tener obligatoriamente un segundo argumento que indique la longitud de elementos:

```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

// La definición EXIGE que el array sea seguido por su tamaño
timer ProcessInventory[1500](items[], items_count)
{
    printf("Procesando inventario con %d articulos:", items_count);
    for (new i = 0; i < items_count; i++)
    {
        printf(" -> Item #%d: ID %d", i, items[i]);
    }
}

public OnGameModeInit()
{
    new playerItems[4] = { 321, 322, 325, 330 };
    // Se envía el array y su longitud sizeof
    defer ProcessInventory(playerItems, sizeof(playerItems));
    return 1;
}
```

### Paso de Cadenas (`string:str[]`)

Para transferir texto sin requerir el parámetro de longitud, utiliza la etiqueta `string:` en la declaración del parámetro. YSI asignará memoria interna segura para retener el texto durante el retardo:

```pawn
#include <open.mp>
#include <YSI_Coding\y_timers>

// La etiqueta string: le indica a YSI que copie la cadena en su heap interno
timer BroadcastAnnouncement[5000](const string:mensaje[], color)
{
    SendClientMessageToAll(color, mensaje);
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/anuncio", true))
    {
        defer BroadcastAnnouncement("El evento comenzará en 10 minutos en el estadio.", 0xFFFF00AA);
        SendClientMessage(playerid, -1, "Anuncio programado en 5 segundos.");
        return 1;
    }
    return 0;
}
```

---

## Ejemplo Completo para SA-MP / open.mp

A continuación se muestra un caso de uso completo que reúne `defer`, `repeat`, `task`, `ptask` y detención segura en un único script:

```pawn
#define YSI_YES_HEAP_MALLOC
#include <open.mp>
#include <YSI_Coding\y_timers>

// -------------------------------------------------------------
// Variables globales
// -------------------------------------------------------------
static Timer:gPlayerRegenTimer[MAX_PLAYERS];
static bool:gIsFrozen[MAX_PLAYERS];

// -------------------------------------------------------------
// 1. defer: Congelar jugador temporalmente con reversión automática
// -------------------------------------------------------------
timer RestorePlayerControl[4000](playerid)
{
    if (IsPlayerConnected(playerid) && gIsFrozen[playerid])
    {
        TogglePlayerControllable(playerid, true);
        gIsFrozen[playerid] = false;
        SendClientMessage(playerid, 0x00FF00AA, "[STUN] Te has recuperado del aturdimiento.");
    }
}

stock StunPlayer(playerid, time_ms = 4000)
{
    if (!IsPlayerConnected(playerid)) return 0;
    
    TogglePlayerControllable(playerid, false);
    gIsFrozen[playerid] = true;
    SendClientMessage(playerid, 0xFF0000AA, "[STUN] Has sido aturdido temporalmente.");
    
    // Sobreescribe el intervalo si se especifica otro tiempo
    defer RestorePlayerControl[time_ms](playerid);
    return 1;
}

// -------------------------------------------------------------
// 2. repeat: Regeneración gradual de salud
// -------------------------------------------------------------
timer HealthRegeneration[1500](playerid)
{
    if (!IsPlayerConnected(playerid))
    {
        stop; // Auto-cancelar si se desconectó
        return;
    }

    new Float:hp;
    GetPlayerHealth(playerid, hp);
    if (hp >= 100.0)
    {
        SendClientMessage(playerid, 0x22FF22AA, "[MEDICINA] Salud completamente restablecida.");
        stop; // Fin de la regeneración
        gPlayerRegenTimer[playerid] = Timer:0;
        return;
    }

    SetPlayerHealth(playerid, floatmin(hp + 5.0, 100.0));
    PlayerPlaySound(playerid, 1150, 0.0, 0.0, 0.0);
}

// -------------------------------------------------------------
// 3. ptask: Chequeo de zona y chaleco balanceado por jugador
// -------------------------------------------------------------
ptask PlayerGuardDuty[1000](playerid)
{
    // Verificación constante de caídas al agua o fuera de límites
    new Float:z;
    GetPlayerPos(playerid, Float:z, Float:z, z);
    if (z < -80.0)
    {
        SetPlayerHealth(playerid, 0.0); // Prevenir caída al vacío infinita
    }
}

// -------------------------------------------------------------
// 4. task: Limpieza global del servidor cada 10 minutos
// -------------------------------------------------------------
task CleanUnusedVehicles[600000]()
{
    new count = 0;
    for (new i = 1; i <= MAX_VEHICLES; i++)
    {
        // Lógica de inspección de vehículos desocupados
    }
    printf("[MANTENIMIENTO] Limpieza periódica de vehículos ejecutada.");
}

// -------------------------------------------------------------
// Callbacks del servidor
// -------------------------------------------------------------
public OnPlayerDisconnect(playerid, reason)
{
    if (gPlayerRegenTimer[playerid])
    {
        stop gPlayerRegenTimer[playerid];
        gPlayerRegenTimer[playerid] = Timer:0;
    }
    gIsFrozen[playerid] = false;
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/curar", true))
    {
        if (Timer_IsRunning(gPlayerRegenTimer[playerid]))
        {
            SendClientMessage(playerid, 0xFF0000AA, "Ya te estás regenerando.");
            return 1;
        }
        gPlayerRegenTimer[playerid] = repeat HealthRegeneration(playerid);
        SendClientMessage(playerid, 0x00FF00AA, "Iniciando regeneración asistida...");
        return 1;
    }

    if (!strcmp(cmdtext, "/aturdir", true))
    {
        StunPlayer(playerid, 5000); // Aturdir 5 segundos
        return 1;
    }
    return 0;
}
```

---

## Buenas Prácticas y Errores Comunes

1. **Olvidar la longitud tras un array:**  
   Si defines `timer MiTimer[1000](items[])` sin un parámetro posterior de tamaño, el compilador emitirá un error. Siempre debes declarar `timer MiTimer[1000](items[], items_size)`.

2. **Omitir `string:` en parámetros textuales:**  
   Si declaras `timer Saludo[1000](texto[])`, `y_timers` lo tratará como un array de celdas no delimitado y requerirá una longitud. Decláralo siempre como `timer Saludo[1000](string:texto[])`.

3. **Confundir `task` y `ptask`:**  
   `task` corre de forma única y global para todo el script. `ptask` corre una vez por cada jugador que esté online. Jamás añadas un bucle que itere por todos los jugadores dentro de un `ptask`, pues multiplicarías la carga por `N * N`.

4. **Variables `Timer:` no reseteadas:**  
   Cuando un temporizador diferido (`defer`) finaliza por sí solo, la variable en la que guardaste el retorno (`Timer:t`) continuará conteniendo un número entero distinto de cero, aunque ya haya expirado. Si utilizas comprobaciones lógicas del tipo `if (miTimer != Timer:0)`, restablece manualmente la variable dentro del callback con `miTimer = Timer:0;` o utiliza `Timer_IsRunning(miTimer)`.

5. **Llamadas redundantes a `stop`:**  
   En `y_timers` llamar a `stop` sobre un temporizador cancelado o inválido es seguro y no ocasionará crashes, a diferencia del nativo `KillTimer` de SA-MP que podía comportarse de forma indeterminada.
