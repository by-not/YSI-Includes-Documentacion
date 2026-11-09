# y_master (Sincronización Gamemode-Filterscript y Sistema Maestro)

`y_master` es uno de los componentes de arquitectura interna más avanzados y sofisticados de toda la suite YSI. Provee un mecanismo transparente y descentralizado para comunicar, delegar responsabilidades y compartir estructuras de memoria entre el Gamemode principal y múltiples Filterscripts (o módulos AMX independientes), sin necesidad de plugins externos, bases de datos intermedias, sockets ni archivos de texto.

---

## Introducción

En la arquitectura clásica de SA-MP, el Gamemode y cada Filterscript operan en instancias aisladas de la Máquina Virtual AMX. La comunicación tradicional entre scripts dependía de `CallRemoteFunction` y `CallLocalFunction`, las cuales sufren de serias limitaciones:
- **Ausencia de chequeo de tipos en compilación:** Los errores tipográficos en el nombre de la función o en el especificador de formato (ej. usar `"is"` en vez de `"si"`) compilan sin advertencias pero fallan silenciosamente en tiempo de ejecución.
- **Pérdida de rendimiento por llamadas remotas:** Se incurre en sobrecoste de búsqueda en la tabla de funciones públicas de la máquina AMX incluso si la función está en el mismo script.
- **Pérdida de estado al recargar scripts:** Al reiniciar un Filterscript con `rcon reloadfs`, toda la memoria en RAM (variables, sesiones de usuarios, propiedades de vehículos) se destruye.

`y_master` resuelve estos problemas introduciendo:
1. Las palabras clave **`foreign`** y **`global`**, que proporcionan comprobación estricta de parámetros en tiempo de compilación para llamadas entre scripts.
2. Un sistema basado en **autómatas finitos (*states*) de Pawn**, en el que el script que posee el control (*Master*) ejecuta las funciones localmente a velocidad nativa, mientras que los scripts clientes delegan la llamada automáticamente mediante una capa proxy sin bucles infinitos.
3. El sistema de distribución de datos **`DISTRIBUTE`**, capaz de transferir estructuras y arrays enteros de un script saliente a un script nuevo durante un *hot-reload* sin desconectar a los jugadores ni reiniciar el servidor.

### Inclusión en el proyecto

```pawn
#define MASTER 1 // Identificador numérico del subsistema maestro
#include <YSI_Core\y_master>
```

---

## Tabla de Contenido

1. [Conceptos Clave: foreign y global](#conceptos-clave-foreign-y-global)
   - [foreign](#foreign)
   - [global](#global)
2. [Tipos de Controlador (Roles de Script)](#tipos-de-controlador-roles-de-script)
   - [YSI_IS_SERVER](#ysi_is_server)
   - [YSI_IS_CLIENT](#ysi_is_client)
   - [YSI_IS_STUB](#ysi_is_stub)
   - [Modo Automático ("Cloud")](#modo-automatico-cloud)
3. [Niveles de Master y Múltiples Módulos](#niveles-de-master-y-multiples-modulos)
4. [Compartir Estructuras de Datos con DISTRIBUTE](#compartir-estructuras-de-datos-con-distribute)
   - [__declspec(distributed)](#__declspecdistributed)
   - [DISTRIBUTE()](#distribute)
5. [Mecánica Interna: Autómatas Finitos y Handover](#mecanica-interna-automatas-finitos-y-handover)
6. [Ejemplo Completo: Hot-Reload de un Sistema de Cuentas](#ejemplo-completo-hot-reload-de-un-sistema-de-cuentas)
7. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Conceptos Clave: foreign y global

En lugar de utilizar las directivas estándar `forward` y `public`, `y_master` introduce un paradigma de funciones distribuidas:

### foreign

- **Módulo:** `#include <YSI_Core\y_master>`
- **Tipo:** Declaración de interfaz de enlace remoto
- **Descripción:** Declara que una función existe en alguna parte del ecosistema de scripts del servidor (ya sea en el script actual o en otro AMX en ejecución). Funciona como una firma previa (*header*). Si la función no existe en el script local, el compilador permitirá llamarla normalmente y delegará la llamada hacia el script que actúe como *Master*.

#### Reglas de Declaración de Parámetros
1. **Cadenas de texto:** Las cadenas de caracteres deben llevar obligatoriamente la etiqueta `string:` (por ejemplo `string:nombre[]`).
2. **Arreglos estándar (no strings):** Deben ir inmediatamente seguidos de su tamaño como parámetro (por ejemplo `datos[], tamanio`).

#### Sintaxis
```pawn
foreign NombreFuncion(playerid, string:mensaje[], Float:valor);
```

---

### global

- **Módulo:** `#include <YSI_Core\y_master>`
- **Tipo:** Definición de cuerpo de función distribuida
- **Descripción:** Implementa la lógica ejecutable de la función declarada con `foreign`. Cuando el script es designado como el *Master*, esta implementación se invoca directamente en memoria local sin penalización de rendimiento. Si se llama desde otro script, la máquina virtual de Pawn gestiona el salto remoto de forma segura.

#### Sintaxis
```pawn
global NombreFuncion(playerid, string:mensaje[], Float:valor)
{
    // Código de ejecución del Master
    return 1;
}
```

> [!IMPORTANT]
> Si una función `global` no devuelve ningún valor, se debe etiquetar de forma obligatoria y explícita con `void:`:
> ```pawn
> foreign void:NotificarAdmin(playerid, string:texto[]);
> global void:NotificarAdmin(playerid, string:texto[])
> {
>     printf("[ADMIN] %d: %s", playerid, texto);
> }
> ```
> De igual manera, si devuelve un string, debe etiquetarse con `string:` y retornar un array de dimensión `YSI_MAX_STRING` (por defecto 144 celdas).

---

## Tipos de Controlador (Roles de Script)

Cada script puede configurar de qué forma participará en la red de maestros antes de incluir `y_master`:

```
┌──────────────────────────────────────────────────────────────┐
│                    TIPOS DE CONTROLADOR                      │
├─────────────────┬────────────────────────────────────────────┤
│ YSI_IS_SERVER   │ Script "propietario". Siempre asume el rol │
│                 │ de Master al iniciar.                      │
├─────────────────┼────────────────────────────────────────────┤
│ YSI_IS_CLIENT   │ Script cliente consumidor. Solo invoca; el │
│                 │ compilador optimiza y descarta los global. │
├─────────────────┼────────────────────────────────────────────┤
│ YSI_IS_STUB     │ Interfaz pura (solo 'foreign', prohíbe     │
│                 │ 'global'). Similar a un .h de C.           │
├─────────────────┼────────────────────────────────────────────┤
│ "Cloud"         │ Comportamiento por defecto. Negocia con los│
│ (Sin definir)   │ demás scripts en base a orden y versión.   │
└─────────────────┴────────────────────────────────────────────┘
```

### YSI_IS_SERVER
Indica que este script es el servidor autoritativo de la lógica. Al cargarse en el servidor, toma el control inmediato de la biblioteca correspondiente a su número de `MASTER`.
```pawn
#define YSI_IS_SERVER
#define MASTER 3
#include <YSI_Core\y_master>
```

### YSI_IS_CLIENT
Indica que este script consume las funciones pero no desea ejecutarlas localmente. El compilador de Pawn optimiza el código y remueve los bloques `global` para reducir el tamaño final del archivo `.amx`.
```pawn
#define YSI_IS_CLIENT
#define MASTER 3
#include <YSI_Core\y_master>
```

### YSI_IS_STUB
Declara una cabecera de solo interfaz. Si se incluye una definición `global` en este modo, el compilador generará un error fatal. Es el equivalente a los archivos de cabecera (`.h`) de C/C++, diseñado para distribuir a desarrolladores externos o miembros de equipo sin compartir el código fuente interno.

### Modo Automático ("Cloud")
Si no se especifica ninguna directiva `YSI_IS_*`, el script entra en modo negociado. El primer script que cargue el servidor tomará el control. Si posteriormente se carga otro script con mayor versión, el control se transfiere pacíficamente sin interrupciones.

---

## Niveles de Master y Múltiples Módulos

El preprocesador permite segmentar las librerías utilizando números de `MASTER` distintos (de `0` a `MAX_MASTERS - 1`, típicamente hasta 64). De este modo, las funciones de un sistema de administración no interfieren con las funciones de un sistema de vehículos:

```pawn
// === Definición del subsistema 1: Usuarios ===
#define MASTER 1
#include <YSI_Core\y_master>

foreign bool:IsPlayerAdminEx(playerid);
foreign void:SetPlayerAdminEx(playerid, bool:admin);

// === Definición del subsistema 2: Economía ===
#define MASTER 2
#include <YSI_Core\y_master>

foreign GetPlayerMoneyEx(playerid);
foreign void:GivePlayerMoneyEx(playerid, amount);
```

---

## Compartir Estructuras de Datos con DISTRIBUTE

Cuando un script que opera como *Master* es detenido o reemplazado en caliente (*hot-reload* con `reloadmodule`), los datos en memoria se perderían a menos que se utilicen variables distribuidas.

### __declspec(distributed)

- **Módulo:** `#include <YSI_Core\y_master>`
- **Tipo:** Modificador de almacenamiento de datos
- **Descripción:** Marca una variable escalar o un arreglo para que `y_master` genere automáticamente las rutinas de serialización y sincronización remota mediante instrucciones AMX `memcpy`.

#### Sintaxis
```pawn
static __declspec(distributed) MiVariable;
static __declspec(distributed) MiArreglo[MAX_PLAYERS];
```

---

### DISTRIBUTE()

- **Módulo:** `#include <YSI_Core\y_master>`
- **Tipo:** Macro de disparo de sincronización
- **Descripción:** Provoca la transferencia forzada de la variable especificada hacia el nuevo script que ha tomado el rol de *Master*.

#### Sintaxis
```pawn
DISTRIBUTE(MiVariable);
DISTRIBUTE(MiArreglo);
```

---

## Mecánica Interna: Autómatas Finitos y Handover

Internamente, `y_master` utiliza la característica de **estados (*states*) nativa de Pawn**. Cada script compila múltiples versiones de la misma función asociadas a un autómata:

```
                  ┌──────────────┐
     Inicia Script│   State: n   │ (No es Master: redirige
                  │ (Not Master) │  llamadas con CallRemoteFunction)
                  └──────┬───────┘
                         │
             ¿Existe un Master activo?
             ┌───────────┴───────────┐
             │ No                    │ Sí (Tiene mayor versión o es SERVER)
             ▼                       ▼
      ┌──────────────┐        ┌──────────────┐
      │   State: y   │        │   State: u   │ (Reclama control,
      │ (Is Master)  │        │  (Unseated)  │  inicia transferencia)
      └──────────────┘        └──────┬───────┘
             ▲                       │ Handover completado
             └───────────────────────┘
```

1. **Estado `y` (*Yes*):** El script actual es el Master oficial. Toda llamada a `MiFuncion()` se ejecuta directamente en el procesador sin intermediarios.
2. **Estado `n` (*No*):** El script actual no es el Master. Toda llamada invoca una función interna que ejecuta `CallRemoteFunction` apuntando al Master en ejecución.
3. **Estado `u` (*Unseated*):** Estado transitorio donde un nuevo script reclama el trono y solicita los datos al Master saliente.
4. **Estado `p` (*Passed* / *Purged*):** El script anterior ha empaquetado su memoria con `Distribute_Do` y renuncia al control pacíficamente.
5. **Estado `w` (*Waiting*):** Estado especial de apagado ordenado del Gamemode para evitar bucles durante el cierre del servidor.

---

## Ejemplo Completo: Hot-Reload de un Sistema de Cuentas

A continuación se muestra un caso de uso empresarial: separar la lógica de cuentas en un módulo independiente sin perder la sesión de los jugadores al actualizar el código.

### 1. Archivo de interfaz: `modulos/cuentas_api.inc`

```pawn
#if defined _INC_cuentas_api
    #endinput
#endif
#define _INC_cuentas_api

#define MASTER 10
#include <YSI_Core\y_master>

// Firmas accesibles por todos los scripts del servidor
foreign bool:IsUserLoggedIn(playerid);
foreign GetUserLevel(playerid);
foreign void:SetUserLevel(playerid, level);
```

### 2. Módulo de lógica autoritativo: `modules/cuentas.pwn`

```pawn
#include <openmultiplayer>

#define YSI_IS_SERVER
#include "cuentas_api.inc"

// Variables sincronizables entre recargas en caliente
static __declspec(distributed) gUsuarioLogueado[MAX_PLAYERS];
static __declspec(distributed) gNivelSeguridad[MAX_PLAYERS];

global bool:IsUserLoggedIn(playerid)
{
    return bool:gUsuarioLogueado[playerid];
}

global GetUserLevel(playerid)
{
    return gNivelSeguridad[playerid];
}

global void:SetUserLevel(playerid, level)
{
    gNivelSeguridad[playerid] = level;
    gUsuarioLogueado[playerid] = 1;
}

public OnFilterScriptExit()
{
    // Al recargar el módulo, traspasa los datos de los jugadores en línea
    DISTRIBUTE(gUsuarioLogueado);
    DISTRIBUTE(gNivelSeguridad);
    return 1;
}
```

### 3. Gamemode principal: `gamemodes/main.pwn`

```pawn
#include <openmultiplayer>

#define YSI_IS_CLIENT
#include "cuentas_api.inc"

public OnPlayerSpawn(playerid)
{
    // Se invoca directamente con verificación de tipo en compilación
    if (!IsUserLoggedIn(playerid))
    {
        SendClientMessage(playerid, 0xFF0000FF, "Debes iniciar sesión primero.");
        Kick(playerid);
        return 0;
    }

    printf("Jugador %d conectado con nivel de seguridad: %d", playerid, GetUserLevel(playerid));
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Olvidar la etiqueta `string:` en parámetros de texto
En `foreign` y `global`, una cadena debe llevar obligatoriamente `string:`:
```pawn
// INCORRECTO: El preprocesador asumirá que es un array numérico y exigirá el tamaño
foreign GuardarNombre(playerid, nombre[]);

// CORRECTO:
foreign GuardarNombre(playerid, string:nombre[]);
```

### 2. Olvidar incluir `y_master` al redefinir `MASTER`
Cada vez que cambies el identificador `MASTER` en un mismo archivo para agrupar subsistemas, debes incluir nuevamente el archivo de entrada:
```pawn
#define MASTER 1
#include <YSI_Core\y_master>
foreign FuncA();

#define MASTER 2
#include <YSI_Core\y_master> // OBLIGATORIO
foreign FuncB();
```

### 3. Confusión de roles al desplegar
Nunca definas `YSI_IS_SERVER` en más de un Filterscript simultáneo para el mismo número de `MASTER`, ya que ambos intentarán forzar el rol y la asignación final será indefinida. Si varios scripts contienen la misma implementación, déjalos en modo por defecto (Cloud) para que negocien automáticamente.
