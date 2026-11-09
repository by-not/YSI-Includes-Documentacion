# y_remote, y_stringhash & y_unique: Intercomunicación, Hashing y Símbolos

Este documento reúne tres de los módulos de soporte y metaprogramación más potentes de la suite YSI:
* **`y_remote`:** Comunicación tipada de alto nivel entre scripts (Gamemode y Filterscripts), sustituyendo al inseguro y tedioso `CallRemoteFunction`.
* **`y_stringhash`:** Cálculo de hashes criptográficos y no criptográficos en **tiempo de compilación**, permitiendo utilizar cadenas de texto directamente dentro de sentencias `switch-case`.
* **`y_unique`:** Generador de identificadores y símbolos únicos a nivel de preprocesador para evitar colisiones de nombres entre múltiples includes y macros.

## Cómo incluir los módulos

Puedes incluirlos individualmente según tus necesidades:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_remote>
#include <YSI_Coding\y_stringhash>
#include <YSI_Coding\y_unique>
```

## Parte 1: y_remote (Invocación Remota Tipada entre Scripts)

En SA-MP, comunicar el gamemode con un filterscript (o dos filterscripts entre sí) requiere tradicionalmente el uso de `CallRemoteFunction`:
```pawn
// Código nativo tradicional (propenso a errores de formato y sin chequeo de tipos):
CallRemoteFunction("OnPlayerMoneyAdded", "iis", playerid, amount, "Pago de sueldo");
```
Este método adolece de problemas críticos:
1. Si cometes un error tipográfico en el nombre del callback o en los especificadores `"iis"`, el compilador no emite ninguna advertencia.
2. No hay verificación de tags (`Float:`, `bool:`, enums).
3. No hay forma nativa sencilla de decidir si la función debe ejecutarse únicamente en el script local, transmitirse a todos los filterscripts o enviarse a un script específico.

`y_remote` resuelve esto proporcionando funciones remotas fuertemente tipadas con la sintaxis `remotefunc`.

---

### Resumen de Palabras Clave de y_remote

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`remotefunc`](#remotefunc) | Palabra clave / Modificador | Declara una función que puede ser invocada de forma local o remota entre scripts. |
| [`broadcastfunc`](#broadcastfunc) | Modificador de llamada | Invoca la función en **todos** los scripts cargados en el servidor (Gamemode y Filterscripts). |
| [`localfunc`](#localfunc) | Modificador de llamada | Invoca la función **únicamente** en el script actual donde se llama. |
| [`targetfunc`](#targetfunc) | Modificador de llamada | Envía la invocación exclusivamente a un script específico identificado por su ID. |

---

### remotefunc

- **Módulo requerido:** `#include <YSI_Coding\y_remote>`
- **Tipo:** Modificador de función
- **Descripción:** Declara o define una función con capacidad de invocación remota entre scripts. El compilador verifica los parámetros pasados al llamarla exactamente como si fuera una función local estándar.
- **Sintaxis:**
```pawn
// Definición de la función en el script servidor:
remotefunc TipoRetorno:NombreFuncion(parametros)
{
    // Código de la función
    return valor;
}

// Declaración (prototipo) en scripts clientes:
remotefunc TipoRetorno:NombreFuncion(parametros);
```
- **Reglas de tipos de datos en `y_remote`:**
  - Enteros, floats y booleanos se pasan de forma natural (`intVar`, `Float:floatVar`, `bool:cond`).
  - Las cadenas de texto **no** requieren parámetro de longitud, pero deben prefijarse con `string:` (ej. `string:mensaje[]`).
  - Los arrays de celdas **deben** ir seguidos inmediatamente por su parámetro de tamaño (ej. `array[], array_size`).
  - Las referencias a variables utilizan `&` (ej. `&resultado`).

---

### broadcastfunc, localfunc y targetfunc

- **Módulo requerido:** `#include <YSI_Coding\y_remote>`
- **Tipo:** Modificadores de llamada
- **Descripción:** Controlan el destino del paquete de llamada de la función remota:
```pawn
// 1. broadcastfunc: Se ejecuta en el Gamemode y en todos los Filterscripts
broadcastfunc NotificarActualizacion(playerid, "Datos sincronizados");

// 2. localfunc: Se ejecuta solo dentro del script actual (más rápido, sin saltos AMX externos)
new ret = localfunc ObtenerEstadoLocal(playerid);

// 3. targetfunc: Se envía solo al script ID indicado entre corchetes angulares <>
targetfunc EnviarAlAdminFS<targetScriptID>(playerid, 100);
```

---

### Ejemplo Práctico de y_remote

#### En el Filterscript de Administración (`admin_system.pwn`):
```pawn
#include <open.mp>
#include <YSI_Coding\y_remote>

// Definición de la función remota que otros scripts pueden invocar
remotefunc bool:Admin_RegistrarAccion(adminId, const string:accion[], const string:motivo[])
{
    printf("[ADMIN FS] Administrador %d ejecutó '%s' por motivo: %s", adminId, accion, motivo);
    return true;
}
```

#### En el Gamemode Principal (`gamemode.pwn`):
```pawn
#include <open.mp>
#include <YSI_Coding\y_remote>

// Prototipo de la función que reside en el filterscript
remotefunc bool:Admin_RegistrarAccion(adminId, const string:accion[], const string:motivo[]);

CMD:kick(playerid, params[])
{
    new targetid, motivo[64];
    if (sscanf(params, "us[64]", targetid, motivo)) return SendClientMessage(playerid, -1, "Uso: /kick [ID] [Motivo]");

    Kick(targetid);

    // Invocación remota tipada: El compilador verifica que los tipos coincidan
    broadcastfunc Admin_RegistrarAccion(playerid, "KICK", motivo);
    return 1;
}
```

## Parte 2: y_stringhash (Hashes en Tiempo de Compilación)

En Pawn, la instrucción `switch` es enormemente más rápida que una cadena de `if (!strcmp(...)) else if (!strcmp(...))` porque la máquina virtual utiliza tablas de salto binarias directas. Sin embargo, `switch` **únicamente admite números enteros constantes**, lo que impedía evaluar texto directamente.

`y_stringhash` soluciona esto calculando el valor hash de una cadena **en tiempo de compilación**. De este modo, el compilador traduce la cadena a un número entero constante en el archivo binario, permitiendo usar texto directamente en sentencias `switch-case`.

---

### Resumen de Macros de y_stringhash

| Elemento | Tipo | Descripción |
| :--- | :--- | :--- |
| [`_H<cadena>`](#h-cadena) | Macro de compilación | Genera el hash de la cadena literal sensible a mayúsculas usando el algoritmo djb2 (Bernstein). |
| [`_I<cadena>`](#i-cadena) | Macro de compilación | Genera el hash insensible a mayúsculas (*case-insensitive*) de la cadena. |
| [`_H@f<>` y `_H@a<>`](#algoritmos-alternativos-fnv-1-y-fnv-1a) | Macro de compilación | Hashes generados con algoritmos FNV-1 y FNV-1a para resolver colisiones. |
| [`YHash`](#yhash) | Función stock | Calcula el hash de una cadena en **tiempo de ejecución** para comparar contra `_H<>`. |

---

### `_H<cadena>`

- **Módulo requerido:** `#include <YSI_Coding\y_stringhash>`
- **Tipo:** Macro de tiempo de compilación
- **Descripción:** Convierte una cadena de texto en un entero constante de 32 bits en el momento de compilar. La cadena se escribe directamente sin comillas dobles entre los delimitadores `< >`.
- **Sintaxis:**
```pawn
_H<palabra o frase>
```
- **Ejemplo:**
```pawn
new const hashArma = _H<shotgun>; // El compilador calcula el entero constante
```

---

### `_I<cadena>`

- **Módulo requerido:** `#include <YSI_Coding\y_stringhash>`
- **Tipo:** Macro de tiempo de compilación
- **Descripción:** Versión **insensible a mayúsculas** (*case-insensitive*) de `_H<>`. Las cadenas `_I<Hola>` y `_I<hola>` producirán exactamente el mismo número constante entero.

---

### YHash

- **Módulo requerido:** `#include <YSI_Coding\y_stringhash>`
- **Tipo:** Función stock (Tiempo de ejecución)
- **Descripción:** Calcula el hash en tiempo de ejecución de una variable que contiene texto para poder evaluarla contra casos constantes creados con `_H<>` o `_I<>`.
- **Sintaxis:**
```pawn
YHash(const string[], bool:sensitive = true, e_HASH_TYPES:type = hash_bernstein, len = cellmax, bool:pack = false)
```
- **Parámetros:**
  - `string[]`: Variable o buffer de texto recibido en ejecución.
  - `sensitive`: Si es `true` (por defecto), distingue mayúsculas de minúsculas (`_H<>`). Si es `false`, es insensible (`_I<>`).
  - `type`: Algoritmo empleado (`hash_bernstein`, `hash_fnv1`, `hash_fnv1a`).
- **Retorno:** El número entero hash resultante.

---

### Algoritmos Alternativos (FNV-1 y FNV-1a)

Aunque las colisiones en el algoritmo djb2 (Bernstein) son estadísticamente raras, en tablas con cientos de comandos o palabras clave dos textos distintos podrían generar el mismo entero, provocando un error de compilación `duplicate case value`.

En ese caso, puedes cambiar de algoritmo tanto en `_H` como en `YHash`:
* **FNV-1:** `_H@f<palabra>` / `_I@f<palabra>` con `YHash(str, .type = hash_fnv1)`.
* **FNV-1a:** `_H@a<palabra>` / `_I@a<palabra>` con `YHash(str, .type = hash_fnv1a)`.

---

### Ejemplo Práctico: Switch-Case de Comandos y Parámetros

```pawn
#include <open.mp>
#include <YSI_Coding\y_stringhash>
#include <YSI_Coding\y_va>

CMD:comprar(playerid, params[])
{
    if (isnull(params))
    {
        return va_SendClientMessage(playerid, -1, "Uso: /comprar [arma | chaleco | comida | medicina]");
    }

    // Calculamos el hash en ejecución (insensible a mayúsculas)
    switch (YHash(params, .sensitive = false))
    {
        case _I<arma>:
        {
            GivePlayerWeapon(playerid, 24, 50);
            SendClientMessage(playerid, 0x00FF00AA, "Has comprado una Desert Eagle.");
        }
        case _I<chaleco>:
        {
            SetPlayerArmour(playerid, 100.0);
            SendClientMessage(playerid, 0x00FF00AA, "Has equipado un chaleco blindado.");
        }
        case _I<comida>, _I<pizza>:
        {
            SetPlayerHealth(playerid, 100.0);
            SendClientMessage(playerid, 0x00FF00AA, "Has consumido comida caliente.");
        }
        case _I<medicina>:
        {
            SendClientMessage(playerid, 0x00FF00AA, "Medicamentos aplicados.");
        }
        default:
        {
            SendClientMessage(playerid, 0xFF0000AA, "Artículo no disponible en la tienda.");
        }
    }
    return 1;
}
```

## Parte 3: y_unique (Generación de Símbolos Únicos)

En el preprocesador de C, existe la macro `__COUNTER__`, que incrementa un número entero cada vez que se expande, permitiendo generar identificadores de variables y funciones únicos. El compilador oficial de Pawn carece por completo de dicha directiva.

`y_unique` es una proeza de metaprogramación creada por Y_Less que simula un contador de preprocesador en Pawn mediante inclusiones sucesivas y anidadas de ficheros generados (`y_unique_0000_0063.inc`, etc.).

---

### ¿Cómo Funciona?

Cada vez que un archivo o macro incluye `<YSI_Coding\y_unique>`, el archivo:
1. Lee la constante de preprocesador `UNIQUE_SYMBOL`.
2. Incrementa su valor numérico en 1.
3. Redefine la macro `UNIQUE_FUNCTION<%0...%1>` asociando el sufijo numérico único correspondiente.

```pawn
#include <YSI_Coding\y_unique>
// Ahora UNIQUE_FUNCTION<MiFuncion@...> generará MiFuncion@00

#include <YSI_Coding\y_unique>
// Ahora generará MiFuncion@01
```

---

### Importancia en la Suite YSI

`y_unique` es el motor silencioso que hace posible la magia de **`y_hooks`**:
- Cuando utilizas `hook OnPlayerConnect(playerid)` en 15 archivos `.pwn` distintos, `y_hooks` se apoya en `y_unique` para nombrar internamente cada callback como `_yH_OnPlayerConnect@00`, `_yH_OnPlayerConnect@01`, etc.
- Gracias a esto, el compilador jamás emite el error `symbol already defined`, garantizando que múltiples librerías e includes coexistan pacíficamente sin importar cuántas veces intercepten los mismos eventos.

## Buenas Prácticas y Errores Comunes

1. **Colocar comillas en `_H<>`:**  
   La sintaxis correcta es `_H<texto>`, **sin** comillas dobles. Si escribes `_H<"texto">`, el macro generará un hash que incluirá los caracteres de las comillas literalmente, impidiendo que coincida con cadenas normales.

2. **No coincidencia de sensibilidad:**  
   Si en el `switch` utilizas `_H<auto>` (sensible a mayúsculas), pero en `YHash(str, .sensitive = false)` configuraste insensibilidad a mayúsculas, los hashes calculados no coincidirán. Utiliza siempre `_H` con `.sensitive = true` o `_I` con `.sensitive = false`.

3. **Verificación de firmas en `remotefunc`:**  
   Asegúrate de que la firma (número y tipos de parámetros) sea exactamente idéntica tanto en el script donde se define la función como en los scripts donde se declara su prototipo.

4. **Variables pasadas por referencia en scripts remotos:**  
   Si una `remotefunc` recibe un parámetro por referencia (`&variable`), ten presente que solo el script local modificará la celda directamente; los scripts remotos procesan las copias a través del puente de memoria de la máquina virtual.
