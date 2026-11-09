# y_inline: Integraciones Externas (MySQL, Streamer, BCrypt y Timers)

El módulo `YSI_Extra` extiende el poder del sistema de funciones anónimas y clausuras (*closures*) de `y_inline` hacia los plugins de terceros más utilizados en la comunidad de SA-MP y open.mp.

Esta integración elimina la necesidad de declarar funciones públicas dispersas (`forward / public`) y pasar cadenas de formato complejas con `CallLocalFunction`, permitiendo escribir flujos asíncronos limpios donde el callback de respuesta se define directamente en el mismo punto de la llamada, capturando variables locales del contexto.

---

## Introducción

En el desarrollo tradicional, una consulta asíncrona a MySQL, un hash de contraseña o la entrada a un checkpoint dinámico de Streamer requiere partir la lógica en dos o más funciones separadas:
1. Una función que inicia la operación (ej. `mysql_tquery` o `CreateDynamicCP`).
2. Un callback público remoto (ej. `OnUserLogin` o `OnPlayerEnterDynamicCP`).
3. El pasaje manual de identificadores de jugador o datos de sesión a través de arreglos de argumentos.

Este enfoque fragmenta el código, dificulta el seguimiento de la lógica de negocio y puede causar fallos de concurrencia si el jugador se desconecta mientras la operación asíncrona está en tránsito en otro hilo (*thread*).

Las extensiones `y_inline_*` resuelven este problema mediante:
- **Flujo lineal de lectura:** La consulta y el procesamiento de sus resultados residen en el mismo bloque visual.
- **Captura automática de variables locales:** Puedes acceder a variables del ámbito padre dentro de la función inline sin declararlas como parámetros de transporte.
- **Gestión automática de memoria y ciclo de vida:** Las referencias indirectas (`Indirect_Claim` / `Indirect_Release`) aseguran que las clausuras se liberen al terminar o si el objeto asociado se destruye.

---

## Tabla de Contenido

1. [y_inline_mysql: Integración con MySQL (maddinat0r / pBlueG)](#y_inline_mysql-integracion-con-mysql)
   - [MySQL_TQueryInline y MySQL_PQueryInline](#mysql_tqueryinline-y-mysql_pqueryinline)
   - [Integración con ORM](#integracion-con-orm)
   - [Ejemplo Práctico Completo: Sistema de Autenticación](#ejemplo-practico-completo-sistema-de-autenticacion)
2. [y_inline_streamer: Integración con Incognito Streamer](#y_inline_streamer-integracion-con-incognito-streamer)
   - [Checkpoints Dinámicos (CreateDynamicCPCallback)](#checkpoints-dinamicos-createdynamiccpcallback)
   - [Pickups y Race Checkpoints](#pickups-y-race-checkpoints)
   - [Zonas Dinámicas (CreateDynamicAreaCallback)](#zonas-dinamicas-createdynamicareacallback)
   - [Movimiento de Objetos (MoveDynamicObjectCallback)](#movimiento-de-objetos-movedynamicobjectcallback)
   - [Destrucción y Liberación Automática](#destruccion-y-liberacion-automatica)
3. [y_inline_bcrypt: Hashing Asíncrono de Contraseñas](#y_inline_bcrypt-hashing-asincrono-de-contrasenas)
   - [BCrypt_HashInline](#bcrypt_hashinline)
   - [BCrypt_CheckInline](#bcrypt_checkinline)
   - [Ejemplo Práctico: Registro y Verificación](#ejemplo-practico-registro-y-verificacion)
4. [y_inline_timers: Temporizadores Anónimos](#y_inline_timers-temporizadores-anonimos)
   - [Timer_CreateCallback](#timer_createcallback)
   - [Timer_KillCallback](#timer_killcallback)
5. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## y_inline_mysql: Integración con MySQL

Requiere el plugin oficial `samp-mysql` de maddinat0r (v33+ o R40+).

```pawn
#include <a_mysql>
#include <YSI_Coding\y_inline>
#include <YSI_Extra\y_inline_mysql>
```

### MySQL_TQueryInline y MySQL_PQueryInline

- **Módulo:** `#include <YSI_Extra\y_inline_mysql>`
- **Tipo:** Funciones stock de ejecución asíncrona
- **Descripción:** Ejecuta una consulta asíncrona formateada en el hilo secundario de MySQL (`TQuery` para hilos compartidos, `PQuery` para hilos en paralelo). Al completarse la consulta, el motor devuelve la ejecución a la función `inline` especificada mediante la palabra clave `using inline`.

#### Sintaxis
```pawn
MySQL_TQueryInline(MySQL:handle, using inline CallbackName, const query[], GLOBAL_TAG_TYPES:...);
MySQL_PQueryInline(MySQL:handle, using inline CallbackName, const query[], GLOBAL_TAG_TYPES:...);
```

#### Parámetros
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `handle` | `MySQL:` | Conexión de base de datos activa. |
| `using inline CallbackName` | `Func:cb<>` | Referencia al callback anónimo declarado previamente con `inline`. |
| `query` | Cadena (`const []`) | Consulta SQL con especificadores de formato compatibles con `mysql_format`. |
| `...` | Opcional | Argumentos adicionales para sustituir en el query. |

---

### Integración con ORM

Permite vincular operaciones del Object-Relational Mapping (ORM) de MySQL con callbacks inline:

| Función | Descripción |
| :--- | :--- |
| `ORM_SelectInline(ORM:id, using inline Callback)` | Ejecuta un `SELECT` asíncrono sobre la entidad ORM. |
| `ORM_UpdateInline(ORM:id, using inline Callback)` | Ejecuta una actualización `UPDATE`. |
| `ORM_InsertInline(ORM:id, using inline Callback)` | Inserta un nuevo registro `INSERT`. |
| `ORM_DeleteInline(ORM:id, using inline Callback)` | Elimina el registro actual `DELETE`. |
| `ORM_LoadInline(ORM:id, using inline Callback)` | Carga los datos asociados. |
| `ORM_SaveInline(ORM:id, using inline Callback)` | Guarda los cambios realizados en el modelo. |

---

### Ejemplo Práctico Completo: Sistema de Autenticación

```pawn
#include <openmultiplayer>
#include <a_mysql>
#include <YSI_Coding\y_inline>
#include <YSI_Extra\y_inline_mysql>

new MySQL:gConexionSQL;

stock VerificarCuentaJugador(playerid)
{
    new nombreJugador[MAX_PLAYER_NAME + 1];
    GetPlayerName(playerid, nombreJugador, sizeof (nombreJugador));

    // Definición de la clausura inline
    inline OnResultadoConsulta()
    {
        // Validación de seguridad: verificar que el jugador siga conectado
        if (!IsPlayerConnected(playerid))
        {
            return 1;
        }

        new filas = cache_num_rows();
        if (filas > 0)
        {
            new passwordHash[65];
            cache_get_value_name(0, "password", passwordHash, sizeof (passwordHash));

            ShowPlayerDialog(playerid, 1001, DIALOG_STYLE_PASSWORD, "Iniciar Sesión",
                "Ingresa tu contraseña para acceder a la cuenta:", "Entrar", "Salir");
        }
        else
        {
            ShowPlayerDialog(playerid, 1002, DIALOG_STYLE_PASSWORD, "Registro",
                "Esta cuenta no está registrada. Crea una contraseña:", "Registrar", "Salir");
        }
        return 1;
    }

    // Ejecución asíncrona con paso de clausura
    MySQL_TQueryInline(gConexionSQL, using inline OnResultadoConsulta,
        "SELECT id, password FROM usuarios WHERE nombre = '%e' LIMIT 1;", nombreJugador);
}
```

---

## y_inline_streamer: Integración con Incognito Streamer

Permite asociar una función anónima directamente a un checkpoint, pickup, área o animación de objeto en el momento exacto de su creación.

```pawn
#include <streamer>
#include <YSI_Coding\y_inline>
#include <YSI_Extra\y_inline_streamer>
```

### Checkpoints Dinámicos (CreateDynamicCPCallback)

- **Módulo:** `#include <YSI_Extra\y_inline_streamer>`
- **Tipo:** Función stock
- **Descripción:** Crea un Checkpoint dinámico en el mundo y le asocia una clausura inline que se ejecutará en cuanto cualquier jugador ingrese en él.

#### Sintaxis
```pawn
STREAMER_TAG_CP:CreateDynamicCPCallback(using inline Callback, Float:x, Float:y, Float:z, Float:size, worldid = -1, interiorid = -1, playerid = -1, Float:streamdistance = STREAMER_CP_SD, STREAMER_TAG_AREA:areaid = STREAMER_TAG_AREA:-1, priority = 0);
```

#### Firma del Callback Inline
La función `inline` recibe dos parámetros enteros: `(checkpointid, playerid)`:
```pawn
inline OnEnterCP(checkpointid, playerid)
{
    // Acciones al ingresar
}
```

---

### Pickups y Race Checkpoints

- **`CreateDynamicPickupCallback`**: Asocia un callback a la recolección de un pickup.
- **`CreateDynamicRaceCPCallback`**: Asocia un callback a un punto de control de carrera.

#### Sintaxis
```pawn
CreateDynamicPickupCallback(using inline Callback, modelid, type, Float:x, Float:y, Float:z, ...);
CreateDynamicRaceCPCallback(using inline Callback, type, Float:x, Float:y, Float:z, Float:nextx, Float:nexty, Float:nextz, Float:size, ...);
```

---

### Zonas Dinámicas (CreateDynamicAreaCallback)

Permite escuchar el ingreso a zonas volumétricas:
- `CreateDynamicCircleCallback(using inline Callback, Float:x, Float:y, Float:size, ...)`
- `CreateDynamicRectangleCallback(using inline Callback, Float:minx, Float:miny, Float:maxx, Float:maxy, ...)`
- `CreateDynamicSphereCallback(using inline Callback, Float:x, Float:y, Float:z, Float:size, ...)`
- `CreateDynamicCubeCallback(using inline Callback, Float:minx, Float:miny, Float:minz, Float:maxx, Float:maxy, Float:maxz, ...)`
- `CreateDynamicPolygonCallback(using inline Callback, const Float:points[], Float:minz, Float:maxz, points_size, ...)`

---

### Movimiento de Objetos (MoveDynamicObjectCallback)

Ejecuta una función anónima inmediatamente cuando un objeto dinámico finaliza su trayectoria:

```pawn
stock AbrirPuertaBanco(DynamicObject:puertaid)
{
    inline OnPuertaAbierta()
    {
        printf("La compuerta del banco se abrió por completo.");
    }

    MoveDynamicObjectCallback(puertaid, using inline OnPuertaAbierta,
        1550.0, -1650.0, 15.0, 2.5, 0.0, 0.0, 90.0);
}
```

---

### Destrucción y Liberación Automática

El include hookea automáticamente las funciones nativas `DestroyDynamicObject`, `DestroyDynamicCP`, `DestroyDynamicPickup` y `DestroyDynamicArea`. Cuando destruyes el elemento, `y_inline_streamer` destruye de inmediato la referencia indirecta y libera la memoria del closure sin necesidad de intervención manual.

---

## y_inline_bcrypt: Hashing Asíncrono de Contraseñas

Soporta de forma unificada tanto el plugin `samp-bcrypt` de **Lassir** como el de **Sreyas-Sreelal**.

```pawn
#include <bcrypt>
#include <YSI_Coding\y_inline>
#include <YSI_Extra\y_inline_bcrypt>
```

### BCrypt_HashInline

- **Módulo:** `#include <YSI_Extra\y_inline_bcrypt>`
- **Tipo:** Función stock
- **Descripción:** Genera un hash criptográfico Blowfish asíncrono para una contraseña plana. Al terminar, la clausura recibe el hash resultante como un `string:`.

#### Sintaxis
```pawn
stock BCrypt_HashInline(const password[], cost = 12, using inline Callback);
```

#### Firma del Callback Inline
```pawn
inline OnHashComplete(string:hash[])
```

---

### BCrypt_CheckInline

- **Módulo:** `#include <YSI_Extra\y_inline_bcrypt>`
- **Tipo:** Función stock
- **Descripción:** Compara de manera asíncrona una contraseña en texto plano contra un hash previamente almacenado.

#### Sintaxis
```pawn
stock bool:BCrypt_CheckInline(const password[], const hash[], using inline Callback);
```

#### Firma del Callback Inline
Recibe un valor booleano o entero: `(bool:success)`:
```pawn
inline OnPasswordChecked(bool:success)
```

---

### Ejemplo Práctico: Registro y Verificación

```pawn
// === REGISTRO DE CUENTA ===
stock RegistrarPassword(playerid, const passwordPlana[])
{
    inline OnHashGenerado(string:hashFinal[])
    {
        if (!IsPlayerConnected(playerid)) return 1;

        printf("Hash generado para player %d: %s", playerid, hashFinal);
        // Guardar hashFinal en base de datos MySQL o archivo INI
        SendClientMessage(playerid, 0x00FF00FF, "Tu cuenta fue protegida con BCrypt exitosamente.");
        return 1;
    }

    BCrypt_HashInline(passwordPlana, 12, using inline OnHashGenerado);
}

// === VERIFICACIÓN DE LOGIN ===
stock ValidarPassword(playerid, const passwordIngresada[], const hashGuardado[])
{
    inline OnPasswordVerificada(bool:esCorrecta)
    {
        if (!IsPlayerConnected(playerid)) return 1;

        if (esCorrecta)
        {
            SendClientMessage(playerid, 0x00FF00FF, "¡Contraseña correcta! Bienvenido.");
        }
        else
        {
            SendClientMessage(playerid, 0xFF0000FF, "Contraseña incorrecta. Intento fallido.");
        }
        return 1;
    }

    BCrypt_CheckInline(passwordIngresada, hashGuardado, using inline OnPasswordVerificada);
}
```

---

## y_inline_timers: Temporizadores Anónimos

Permite definir temporizadores de disparo único o repeticiones finitas directamente dentro del cuerpo de cualquier función, sin necesidad de declarar un callback `public` con `SetTimerEx`.

```pawn
#include <YSI_Coding\y_inline>
#include <YSI_Extra\y_inline_timers>
```

### Timer_CreateCallback

- **Módulo:** `#include <YSI_Extra\y_inline_timers>`
- **Tipo:** Función stock
- **Descripción:** Crea un temporizador que ejecutará la clausura inline. Admite configurar retardo inicial, intervalo de repetición y número exacto de ejecuciones.

#### Sintaxis
```pawn
Timer_CreateCallback(using inline Callback, initialOrTime, timeOrCount = 0, count = -1);
```

#### Modos de Configuración de Tiempos
1. `Timer_CreateCallback(using inline CB, 1000);`
   - Se repite indefinidamente cada 1000 ms.
2. `Timer_CreateCallback(using inline CB, 1000, 5);`
   - Se ejecuta exactamente 5 veces, con un intervalo de 1000 ms entre cada una.
3. `Timer_CreateCallback(using inline CB, 500, 1000, 3);`
   - La primera ejecución ocurre a los 500 ms; las siguientes 2 ejecuciones ocurren cada 1000 ms (3 veces en total).

---

### Timer_KillCallback

- **Módulo:** `#include <YSI_Extra\y_inline_timers>`
- **Tipo:** Función stock
- **Descripción:** Detiene y destruye un temporizador creado previamente con `Timer_CreateCallback`, liberando la clausura de memoria.

#### Sintaxis
```pawn
Timer_KillCallback(timer_handle);
```

#### Ejemplo Práctico: Cuenta Regresiva de Descongelamiento
```pawn
stock CongelarTemporalmente(playerid, segundos)
{
    TogglePlayerControllable(playerid, false);
    SendClientMessage(playerid, 0xFFFF00FF, "Has sido congelado.");

    new cuentaRestante = segundos;

    inline OnTick()
    {
        if (!IsPlayerConnected(playerid)) return 1;

        --cuentaRestante;
        if (cuentaRestante <= 0)
        {
            TogglePlayerControllable(playerid, true);
            SendClientMessage(playerid, 0x00FF00FF, "¡Ya puedes moverte!");
        }
        else
        {
            va_SendClientMessage(playerid, -1, "Descongelando en: %d...", cuentaRestante);
        }
        return 1;
    }

    // Ejecutar cada 1000 ms tantas veces como dure la cuenta regresiva
    Timer_CreateCallback(using inline OnTick, 1000, segundos);
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Siempre verificar `IsPlayerConnected(playerid)`
Toda operación asíncrona (MySQL, BCrypt, temporizadores largos) tarda un lapso variable en responder. Durante ese tiempo, el jugador puede haberse desconectado o su ID pudo haber sido reasignado a otro usuario recién ingresado. Verifica siempre la conexión al inicio del cuerpo `inline`.

### 2. No abusar de variables modificadas en el scope padre
Las clausuras inline capturan el contexto de las variables locales al momento de ser ejecutadas. Si una variable local del ámbito externo es modificada antes de que el callback asíncrono responda, el callback leerá el valor modificado o podría provocar lecturas inválidas si la función padre ya retornó y desapiló memoria sin protección de YSI.

### 3. Matar temporizadores huérfanos
Si un jugador se desconecta mientras un `Timer_CreateCallback` infinito (`count = 0`) sigue activo, el temporizador continuará ejecutándose. Guarda el identificador del temporizador y llámale a `Timer_KillCallback` en `OnPlayerDisconnect`.
