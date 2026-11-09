# y_inline: Funciones Anidadas y Closures en Pawn

El módulo `y_inline` es una de las tecnologías más revolucionarias de la biblioteca YSI. Introduce en el lenguaje Pawn el concepto de **funciones anidadas** (*nested functions*) y **clausuras léxicas** (*closures*), características presentes en lenguajes modernos como JavaScript, Rust, Swift o C#.

Tradicionalmente en SA-MP, gestionar respuestas a eventos asíncronos (como la respuesta de un jugador a un `ShowPlayerDialog`, una consulta a MySQL o un temporizador) obligaba a los programadores a dispersar su lógica en callbacks públicos globales como `OnDialogResponse` y a crear variables globales multidimensionales (por ejemplo, `gDialogState[playerid]`, `gPendingBuyPrice[playerid]`) únicamente para recordar qué acción estaba realizando el usuario.

Con `y_inline`, puedes escribir la función de respuesta directamente dentro del bloque donde se origina la acción, capturando y utilizando todas las variables locales del ámbito superior de forma automática y segura.

## Cómo incluir el módulo

Para utilizar funciones inline en tu script o gamemode:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_inline>
```

## Resumen de Funciones y Macros

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`inline Nombre(params)`](#inline) | Palabra clave / Macro | Declara una función anidada local dentro del cuerpo de otra función. |
| [`inline const Nombre(params)`](#inline-const) | Palabra clave / Macro | Declara una función anidada de solo lectura, omitiendo la sincronización de variables capturadas. |
| [`using inline`](#using-inline) | Palabra clave de llamada | Especifica y empaqueta la función inline junto a su clausura para pasarla como argumento. |
| [`Func:callback<tipos>`](#funccallbacktipos) | Tag de parámetro | Permite que una función receptora acepte funciones inline o callbacks con verificación de tipos. |
| [`@.callback(args)`](#sintaxis-de-invocacion) | Sintaxis de llamada | Invoca la función almacenada en un parámetro de tipo `Func:`. |
| [`Callback_Restore`](#callback_restore) | Función stock | Sincroniza las variables capturadas modificadas de vuelta a la pila (*stack*) de la función padre. |
| [`Callback_Release`](#callback_release) | Función stock | Libera los recursos de memoria asignados a una clausura persistente en el heap de YSI. |

## Sintaxis Fundamental

### inline

- **Módulo requerido:** `#include <YSI_Coding\y_inline>`
- **Tipo:** Macro / Palabra clave
- **Descripción:** Declara una función anidada dentro del cuerpo de una función normal. La función `inline` tiene acceso directo a todos los parámetros y variables locales declaradas previamente en la función contenedora (ámbito léxico).
- **Sintaxis:**
```pawn
FuncionPadre(param1, param2)
{
    new variableLocal = 100;

    inline NombreInline(paramInline1, paramInline2)
    {
        // Se tiene acceso a param1, param2, variableLocal y a los propios parámetros del inline
        printf("Suma: %d", variableLocal + paramInline1);
    }
}
```
- **Parámetros:**
  - `NombreInline`: Identificador local asignado a la función anidada.
  - `paramInline1, ...`: Argumentos que la función receptora enviará al invocar el callback.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_inline>
#include <YSI_Visual\y_dialog>

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/comprararma", true))
    {
        new const weaponId = 24; // Desert Eagle
        new const weaponCost = 1500;

        inline OnConfirmDialog(pid, dialogid, response, listitem, string:inputtext[])
        {
            #pragma unused dialogid, listitem, inputtext
            if (response)
            {
                if (GetPlayerMoney(pid) < weaponCost)
                {
                    SendClientMessage(pid, 0xFF0000FF, "No tienes suficiente dinero.");
                    return 1;
                }
                GivePlayerMoney(pid, -weaponCost);
                GivePlayerWeapon(pid, weaponId, 100);
                SendClientMessage(pid, 0x00FF00FF, "Has adquirido una Desert Eagle.");
            }
            return 1;
        }

        Dialog_ShowCallback(playerid, using inline OnConfirmDialog, DIALOG_STYLE_MSGBOX, 
            "Armería", "¿Deseas comprar una Desert Eagle por $1500?", "Comprar", "Cancelar");
        return 1;
    }
    return 0;
}
```
- **Notas / Advertencias:**
  - El código de la función `inline` no se ejecuta en el punto donde se declara; se ejecuta únicamente cuando el receptor (en este caso el diálogo) lo llama como callback.

---

### using inline

- **Módulo requerido:** `#include <YSI_Coding\y_inline>`
- **Tipo:** Palabra clave de pase de argumentos
- **Descripción:** Se coloca delante del identificador de la función inline al pasarla como argumento a una función o API compatible (como `Dialog_ShowCallback`, `Timer_CreateCallback`, o librerías de MySQL/Bcrypt). Empaqueta la dirección de la función junto con el estado capturado de sus variables locales.
- **Sintaxis:**
```pawn
InvocarOperacion(arg1, using inline MiFuncionInline, arg3);
```
- **Ejemplo práctico:**
```pawn
inline OnTimerElapsed()
{
    SendClientMessage(playerid, -1, "El tiempo de espera ha concluido.");
}

// Pasamos la clausura a un temporizador
Timer_CreateCallback(using inline OnTimerElapsed, 5000, 1);
```

---

### inline const

- **Módulo requerido:** `#include <YSI_Coding\y_inline>`
- **Tipo:** Macro / Palabra clave
- **Descripción:** Declara una función inline que garantiza que las variables capturadas del ámbito superior no necesitan persistir sus modificaciones entre sucesivas llamadas o de vuelta a la función padre.
- **Sintaxis:**
```pawn
inline const NombreInline(parametros)
{
    // Solo lectura de variables capturadas
}
```
- **Ventajas:**
  - Elimina el código de compilación y las instrucciones de copia de memoria que sincronizan las variables de la clausura.
  - Ideal para funciones de búsqueda, iteración o filtros donde los valores externos se consultan pero no se alteran.

## Cómo Funcionan las Clausuras (Closures)

Una **clausura** es la combinación de una función y el entorno léxico en el cual fue declarada. En Pawn, las variables locales residen temporalmente en la pila (*stack*) de la máquina virtual AMX. Cuando una función termina, su marco de pila se destruye.

`y_inline` resuelve esto mediante dos estrategias según el tipo de invocación:

### 1. Invocación Sincrónica (In-Stack)
Ocurre cuando la función receptora llama a la función `inline` **antes** de que la función padre termine (por ejemplo, en un algoritmo de ordenamiento o filtrado de arrays):
```pawn
// Función receptora que toma un callback con un entero
ProcesarLista(array[], size, Func:callback<i>)
{
    for (new i = 0; i < size; i++)
    {
        @.callback(array[i]);
    }
    // Sincroniza los cambios de vuelta al stack del padre
    Callback_Restore(callback);
}

CalcularValores()
{
    new totalPares = 0;

    inline Contar(numero)
    {
        if (numero % 2 == 0)
        {
            totalPares++; // Modifica la variable del ámbito superior
        }
    }

    new datos[5] = { 2, 5, 8, 10, 13 };
    ProcesarLista(datos, sizeof(datos), using inline Contar);

    // Gracias a Callback_Restore, totalPares ahora vale 3
    printf("Total de números pares: %d", totalPares);
}
```

### 2. Invocación Asincrónica (Out-of-Stack)
Ocurre cuando la función receptora llama al inline **después** de que la función original ha concluido y abandonado la pila (por ejemplo, cuando un jugador responde un diálogo minutos después o un temporizador expira):
- YSI copia automáticamente todas las variables locales capturadas a un bloque de memoria seguro administrado por su propio heap (`y_malloc`).
- Cuando el callback se activa, la función inline utiliza estas variables copiadas como si la función contenedora aún existiera.

## Creación de Funciones Receptoras con `Func:`

Si deseas escribir tus propias librerías o funciones que acepten callbacks e inlines con seguridad de tipos en tiempo de compilación, utiliza la etiqueta `Func:nombre<especificadores>`:

### Especificadores de tipo de parámetro:
* `i`, `d`, `c`: Entero (integer / cell)
* `f`: Flotante (`Float:`)
* `s`: Cadena de texto (`const string:[]`)
* `a`: Array (debe ir acompañado de una dimensión)
* `v`: Parámetro por referencia (`&variable`)

```pawn
// Función que acepta una función inline con parámetros (jugador, entero)
EjecutarAccion(playerid, Func:cb<ii>)
{
    new score = GetPlayerScore(playerid);
    // Invocación mediante el operador @.
    @.cb(playerid, score);
}

// Uso desde cualquier punto
VerificarUsuario(playerid)
{
    new adminLevel = 3;

    inline AlRecibirPuntaje(pid, score)
    {
        printf("Jugador: %d | Score: %d | Admin: %d", pid, score, adminLevel);
    }

    EjecutarAccion(playerid, using inline AlRecibirPuntaje);
}
```

## Gestión de Memoria y Ciclo de Vida

Para evitar fugas de memoria (*memory leaks*) en operaciones asíncronas avanzadas:

### Callback_Restore

- **Módulo requerido:** `#include <YSI_Coding\y_inline>`
- **Tipo:** Función stock
- **Descripción:** Copia los datos modificados de la clausura de vuelta al stack de la función contenedora original.
- **Sintaxis:**
```pawn
stock Callback_Restore(Func:callback<>)
```
- **Uso:** Exclusivamente en funciones **sincrónicas** donde la función contenedora todavía se encuentra viva en la pila de ejecución. Jamás la utilices en callbacks de temporizadores o diálogos.

---

### Callback_Release

- **Módulo requerido:** `#include <YSI_Coding\y_inline>`
- **Tipo:** Función stock
- **Descripción:** Destruye y libera la memoria dinámica asignada por YSI para almacenar el estado de la clausura.
- **Sintaxis:**
```pawn
stock Callback_Release(Func:callback<>)
```
- **Uso:** Normalmente, librerías como `y_dialog` o `y_inline_timers` liberan la clausura automáticamente tras ejecutarse. Si diseñas tu propio sistema asíncrono que retiene una función durante múltiples ciclos, debes llamar a `Callback_Release` cuando la función ya no se vaya a utilizar más.

## Ejemplo Completo para SA-MP / open.mp

En este ejemplo realista, implementamos un sistema bancario con transferencia entre jugadores utilizando diálogos inline encadenados, capturando el ID del destinatario y la cantidad de dinero sin ninguna variable global:

```pawn
#include <open.mp>
#include <YSI_Coding\y_inline>
#include <YSI_Visual\y_dialog>

CMD:transferir(playerid, params[])
{
    new targetid, amount;
    if (sscanf(params, "ui", targetid, amount))
    {
        SendClientMessage(playerid, 0xFFFFFFFF, "Uso: /transferir [ID/ParteDelNombre] [Cantidad]");
        return 1;
    }

    if (!IsPlayerConnected(targetid) || targetid == playerid)
    {
        SendClientMessage(playerid, 0xFF0000FF, "Destinatario no válido.");
        return 1;
    }

    if (amount <= 0 || GetPlayerMoney(playerid) < amount)
    {
        SendClientMessage(playerid, 0xFF0000FF, "Cantidad inválida o fondos insuficientes.");
        return 1;
    }

    new targetName[MAX_PLAYER_NAME];
    GetPlayerName(targetid, targetName, sizeof(targetName));

    new promptMsg[128];
    format(promptMsg, sizeof(promptMsg), "¿Confirmas la transferencia de $%d hacia el ciudadano %s?", amount, targetName);

    // Declaramos la función inline que capturará 'targetid', 'amount' y 'targetName'
    inline OnConfirmTransfer(pid, dialogid, response, listitem, string:inputtext[])
    {
        #pragma unused dialogid, listitem, inputtext
        if (response)
        {
            // Verificamos que el destinatario siga conectado al momento de aceptar
            if (!IsPlayerConnected(targetid))
            {
                SendClientMessage(pid, 0xFF0000FF, "El destinatario se ha desconectado durante la transacción.");
                return 1;
            }

            if (GetPlayerMoney(pid) < amount)
            {
                SendClientMessage(pid, 0xFF0000FF, "Ya no posees los fondos necesarios.");
                return 1;
            }

            GivePlayerMoney(pid, -amount);
            GivePlayerMoney(targetid, amount);

            new msg[128];
            format(msg, sizeof(msg), "[BANCO] Has transferido $%d a %s con éxito.", amount, targetName);
            SendClientMessage(pid, 0x00FF00FF, msg);

            new senderName[MAX_PLAYER_NAME];
            GetPlayerName(pid, senderName, sizeof(senderName));
            format(msg, sizeof(msg), "[BANCO] Has recibido $%d de %s.", amount, senderName);
            SendClientMessage(targetid, 0x00FF00FF, msg);
        }
        else
        {
            SendClientMessage(pid, 0xFFAAAAFF, "Transacción bancaria cancelada.");
        }
        return 1;
    }

    // Mostramos el diálogo usando la función inline
    Dialog_ShowCallback(playerid, using inline OnConfirmTransfer, DIALOG_STYLE_MSGBOX, 
        "Confirmación Bancaria", promptMsg, "Transferir", "Cancelar");

    return 1;
}
```

## Buenas Prácticas y Errores Comunes

1. **Variables modificadas en clausuras asíncronas:**  
   Si una función padre termina, las variables locales ya no existen en la pila original. Modificar una variable capturada dentro de un diálogo o temporizador diferido **no** alterará ninguna variable fuera de la clausura. Solo sirve para recordar su valor en el momento en que se creó el inline.

2. **Llamar a `Callback_Restore` de forma asíncrona:**  
   Jamás llames a `Callback_Restore` dentro de un inline que se active desde un evento diferido (como un temporizador o diálogo). Provocarás corrupción de memoria en la pila, ya que el espacio original que ocupaba la función en el stack habrá sido sobrescrito por otras llamadas.

3. **Inlines anidados profundos sin necesidad:**  
   Aunque es técnicamente posible anidar inlines dentro de otros inlines, hacerlo en más de 2 niveles dificulta la lectura del código. Si la lógica es muy extensa, modularízala en funciones normales.

4. **Uso de `inline const` para rendimiento:**  
   Si tu función inline solo necesita consultar las variables del ámbito superior (por ejemplo, para formatear un texto o comprobar un ID), antepón siempre `inline const`. Esto genera código ensamblador más limpio y ligero.
