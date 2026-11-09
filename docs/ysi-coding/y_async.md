# y_async: Programación Asíncrona y Corrutinas

La arquitectura de ejecución de SA-MP y open.mp se basa en un bucle principal de un solo hilo (*single-threaded main loop*). Cuando un servidor necesita ejecutar operaciones que toman tiempo (como consultas a bases de datos MySQL, cálculo de contraseñas con Bcrypt o esperar a que un usuario responda un diálogo), nunca se debe detener o congelar el hilo principal.

En el Pawn tradicional, esto obligaba a fragmentar el código en una cadena de múltiples callbacks públicos independientes (conocido comúnmente como *Callback Hell*). El flujo lógico quedaba esparcido en distintos lugares del archivo, dificultando el mantenimiento y la captura de errores.

El módulo `y_async` introduce en Pawn el patrón moderno **`async` / `await`** y corrutinas cooperativas. Permite redactar flujos de trabajo asíncronos en un formato secuencial y legible, pausando y reanudando la ejecución de la función sin bloquear jamás el tick del servidor.

## Cómo incluir el módulo

Para utilizar corrutinas y flujos asíncronos:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_async>
```

## Resumen de Funciones y Palabras Clave

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`async`](#async) | Palabra clave / Modificador | Declara una función asíncrona capaz de suspender su ejecución (*yield*) y reanudarse. |
| [`await`](#await) | Palabra clave / Operador | Suspende la ejecución de la corrutina hasta que la tarea o callback asíncrono se complete. |
| [`await ... -> (vars)`](#desempaquetado-con) | Sintaxis de extracción | Desempaqueta y captura los parámetros devueltos por el callback en variables locales. |
| [`using async`](#using-async) | Modificador de llamada | Convierte un callback convencional en una promesa operable con `await`. |
| [`ASYNC_DETACH`](#async_detach) | Macro de contexto | Desvincula una corrutina en segundo plano y devuelve inmediatamente un valor al invocador. |

## Comparativa: Callback Hell vs Flujo Asíncrono

### Método Tradicional (Fragmentado y difícil de seguir)
```pawn
// Paso 1: Conexión
public OnPlayerConnect(playerid)
{
    // Consulta SQL asíncrona
    mysql_tquery(g_SQL, "SELECT id, password FROM users WHERE ...", "OnAccountDataLoaded", "i", playerid);
    return 1;
}

// Paso 2: Callback de base de datos
forward OnAccountDataLoaded(playerid);
public OnAccountDataLoaded(playerid)
{
    if (!cache_num_rows())
    {
        // Mostrar diálogo de registro
        ShowPlayerDialog(playerid, DIALOG_REGISTER, DIALOG_STYLE_PASSWORD, "Registro", "Ingresa contraseña:", "Registrar", "Salir");
        return 1;
    }
    // Mostrar diálogo de login
    ShowPlayerDialog(playerid, DIALOG_LOGIN, DIALOG_STYLE_PASSWORD, "Login", "Ingresa tu clave:", "Entrar", "Salir");
    return 1;
}

// Paso 3: Callback de diálogo
public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    if (dialogid == DIALOG_LOGIN)
    {
        // Verificar hash con bcrypt en otro callback
        bcrypt_verify(playerid, "OnPasswordVerified", inputtext, gSavedHash[playerid]);
        return 1;
    }
    return 1;
}

// Paso 4: Callback de bcrypt
forward OnPasswordVerified(playerid, bool:success);
public OnPasswordVerified(playerid, bool:success)
{
    if (success) SendClientMessage(playerid, -1, "Autenticado con éxito.");
    return 1;
}
```

### Con y_async (Lineal, limpio y secuencial)
```pawn
async AutenticarJugador(playerid)
{
    // 1. Espera a que la base de datos responda sin congelar el servidor
    await MySQL_Query("SELECT id, password FROM users WHERE ...") -> (bool:userExists, storedHash[64]);

    if (!userExists)
    {
        SendClientMessage(playerid, -1, "La cuenta no existe.");
        return;
    }

    // 2. Espera la respuesta del diálogo de contraseña
    await Dialog_Show(playerid, DIALOG_STYLE_PASSWORD, "Login", "Ingresa tu contraseña:", "Entrar", "Salir") 
        -> (response, listitem, string:inputtext[]);

    if (!response)
    {
        Kick(playerid);
        return;
    }

    // 3. Espera la verificación criptográfica
    await Bcrypt_Verify(inputtext, storedHash) -> (bool:isValid);

    if (isValid)
    {
        SendClientMessage(playerid, 0x00FF00FF, "¡Contraseña correcta! Bienvenido.");
    }
    else
    {
        SendClientMessage(playerid, 0xFF0000FF, "Contraseña incorrecta.");
        Kick(playerid);
    }
}
```

## Sintaxis y Componentes

### async

- **Módulo requerido:** `#include <YSI_Coding\y_async>`
- **Tipo:** Modificador de función
- **Descripción:** Declara una función asíncrona. Transforma la función en una corrutina con un contexto de ejecución propio. Cuando se encuentra una instrucción `await`, la función guarda su estado interno, cede el control al bucle de eventos del servidor y queda a la espera de que la tarea asíncrona señale su conclusión.
- **Sintaxis:**
```pawn
async NombreCorrutina(parametros)
{
    // Código con soporte para await
}
```
- **Parámetros:**
  - `NombreCorrutina`: Identificador de la función.
  - `parametros`: Argumentos normales que recibe la función en su llamada inicial.
- **Retorno:** Las funciones `async` devuelven inmediatamente un valor o un contexto a su invocador inicial, continuando su trabajo en segundo plano.

---

### await

- **Módulo requerido:** `#include <YSI_Coding\y_async>`
- **Tipo:** Palabra clave / Operador
- **Descripción:** Suspende la ejecución de la función `async` actual hasta que la operación referenciada haya concluido. Durante esta pausa, el servidor SA-MP/open.mp continúa procesando paquetes de red, timers y eventos de todos los demás jugadores a máxima velocidad sin retrasos.
- **Sintaxis:**
```pawn
// Espera simple de una tarea
await OperacionAsincrona();

// Espera condicional dentro de una estructura de control
if (await ConsultaEstado())
{
    // Se ejecuta al completarse la promesa con verdadero
}
```

---

### Desempaquetado con `-> (vars)`

- **Módulo requerido:** `#include <YSI_Coding\y_async>`
- **Tipo:** Sintaxis de extracción
- **Descripción:** Cuando una operación asíncrona finaliza, suele entregar valores a su callback de retorno (por ejemplo, el resultado de una consulta, un código de respuesta o una cadena de texto). El operador flecha `-> (variables)` declara y asigna estos valores directamente en el ámbito local de la función `async`.
- **Sintaxis:**
```pawn
await TareaAsincrona(argumentos) -> (tipo:var1, var2, string:texto[longitud]);
```
- **Especificadores de tipo en la tupla:**
  - `var`: Entero normal sin tag (`_:`)
  - `Float:var`: Variable decimal de punto flotante
  - `bool:var`: Variable booleana
  - `string:nombre[tamaño]`: Cadena de texto empaquetada o desempaquetada
  - `array[tamaño]`: Array de celdas
- **Ejemplo:**
```pawn
// Espera un diálogo y extrae la respuesta y el texto ingresado
await Dialog_Show(playerid, DIALOG_STYLE_INPUT, "Nombre", "Escribe tu nombre:", "OK", "Cancelar") 
    -> (response, listitem, string:inputtext[32]);

if (response)
{
    printf("El usuario escribió: %s", inputtext);
}
```

---

### using async

- **Módulo requerido:** `#include <YSI_Coding\y_async>`
- **Tipo:** Modificador de llamada
- **Descripción:** Permite enlazar funciones y librerías tradicionales basadas en callbacks para que puedan ser consumidas con `await`. Le indica a la librería que genere un manejador de suspensión que capturará los parámetros del callback cuando este sea disparado.
- **Sintaxis:**
```pawn
await FuncionConCallback(param1, param2, using async) -> (resultado);
```

## Ejemplo Completo para SA-MP / open.mp

Demostración de un sistema de subasta donde el servidor ejecuta un temporizador de cuenta regresiva no bloqueante mediante corrutinas:

```pawn
#include <open.mp>
#include <YSI_Coding\y_async>
#include <YSI_Coding\y_va>

// Función auxiliar que simula una espera asíncrona de N milisegundos
stock Task:AsyncSleep(ms)
{
    // Internamente delega en un temporizador de y_inline o un manejador de tarea
}

// Corrutina que gestiona una cuenta regresiva de subasta
async IniciarSubastaVehiculo(playerid, vehicleModel, precioInicial)
{
    va_SendClientMessageToAll(0xFFFF00AA, "[SUBASTA] ¡Ha comenzado la subasta por un vehiculo ID %d! Precio inicial: $%d", vehicleModel, precioInicial);
    
    // Cuenta regresiva de 3 pasos sin bloquear el servidor
    for (new segundos = 3; segundos > 0; segundos--)
    {
        va_SendClientMessageToAll(0xFFCC00AA, "[SUBASTA] Tiempo restante: %d segundos...", segundos);
        
        // Pausa no bloqueante de 1 segundo (1000 ms)
        await AsyncSleep(1000);
    }

    va_SendClientMessageToAll(0x00FF00AA, "[SUBASTA] ¡Tiempo concluido! El martillo ha caído.");
    
    // Crear el vehículo y asignarlo
    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    CreateVehicle(vehicleModel, x + 2.0, y, z, 0.0, 1, 1, -1);
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/subastar", true))
    {
        // Disparamos la corrutina; el comando finaliza de inmediato
        // mientras la subasta progresa de fondo a lo largo del tiempo
        IniciarSubastaVehiculo(playerid, 411, 50000);
        return 1;
    }
    return 0;
}
```

## Buenas Prácticas y Errores Comunes

1. **No confundir `await` con `sleep()`:**  
   En lenguajes de bajo nivel, `sleep()` detiene el hilo del procesador por completo, lo que en SA-MP provocaría que todos los jugadores experimentaran un *Server Not Responding* y se desconectaran por timeout. `await` **nunca congela el servidor**; simplemente cede el turno para que otros eventos ocurran hasta que la tarea específica finalice.

2. **Usar `await` fuera de funciones `async`:**  
   La instrucción `await` solo es válida dentro del cuerpo de funciones declaradas explícitamente con el modificador `async`. Si intentas usar `await` dentro de un `public OnPlayerConnect` ordinario, el compilador emitirá un error de sintaxis.

3. **Desconexión de jugadores durante la espera:**  
   Si una corrutina espera una respuesta durante varios segundos o minutos, es muy probable que el jugador pueda desconectarse o morir mientras la operación estaba en pausa. **Siempre** verifica `if (!IsPlayerConnected(playerid)) return;` inmediatamente después de un punto de `await`.
