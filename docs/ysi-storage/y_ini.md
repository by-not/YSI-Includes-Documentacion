# y_ini (Lector y Escritor INI de Alto Rendimiento)

`y_ini` es el parser y serializador de archivos INI nativo de YSI. Es reconocido como el sistema de archivos INI más rápido, seguro y avanzado disponible para Pawn en SA-MP y open.mp, superando ampliamente a sistemas históricos como Dini, dini2 o SII.

A diferencia de los parsers tradicionales que abren, leen todo el archivo línea por línea y lo cierran por cada clave individual que se desea leer o escribir (lo que provoca cientos de operaciones de disco por segundo y caídas severas de FPS), `y_ini` utiliza un algoritmo de lectura en un solo pase por flujo (*streaming*) y un sistema de buffer en memoria para la escritura que preserva intactos los comentarios, espacios en blanco y la estructura original del archivo.

---

## Ventajas sobre los Métodos Tradicionales (Dini / SII)

1. **Lectura en una Única Pasada:** Lee el archivo completo una sola vez. Cada línea es analizada e inyectada directamente al callback de la sección correspondiente mediante tablas de llamadas internas.
2. **Buffer de Escritura Diferencial:** Al modificar valores, `y_ini` no destruye el archivo existente. Solo reescribe las claves alteradas o nuevas, conservando comentarios (`;` o `#`) y el formato original.
3. **Manejo Seguro de Archivos Temporales:** Emplea archivos temporales intermedios durante el volcado en disco para prevenir la corrupción de datos ante caídas imprevistas del servidor (*crashes*).
4. **Cero Límites Artificiales:** Sin límites estrictos en el tamaño de clave o cantidad de etiquetas (*tags*), con soporte total para cadenas de texto de cualquier longitud y números enteros de 32 bits de rango completo.
5. **Enrutamiento por Secciones y Parámetros Extra:** Soporta el paso de parámetros contextuales (como `playerid`) directamente al callback que procesa la sección.

---

## Inclusión en el Script

Para incluir `y_ini` en tu proyecto:

```pawn
#include <openmultiplayer> // o <a_samp>
#include <YSI_Storage\y_ini>
```

## Tabla de Contenido

- [Arquitectura y Funcionamiento Interno](#arquitectura-y-funcionamiento-interno)
- [Lectura y Parseo de Archivos](#lectura-y-parseo-de-archivos)
  - [INI_ParseFile](#ini_parsefile)
  - [INI_Load](#ini_load)
  - [Declaración de Secciones: Macro INI:](#declaracion-de-secciones-macro-ini)
- [Macros Extractoras de Tipos de Datos](#macros-extractoras-de-tipos-de-datos)
  - [INI_Int](#ini_int)
  - [INI_Float](#ini_float)
  - [INI_String](#ini_string)
  - [INI_Bool](#ini_bool)
  - [INI_Hex e INI_Bin](#ini_hex-e-ini_bin)
- [Escritura y Modificación de Archivos](#escritura-y-modificacion-de-archivos)
  - [INI_Open](#ini_open)
  - [INI_Close](#ini_close)
  - [INI_SetTag](#ini_settag)
  - [INI_DeleteTag](#ini_deletetag)
  - [INI_WriteInt](#ini_writeint)
  - [INI_WriteFloat](#ini_writefloat)
  - [INI_WriteString](#ini_writestring)
  - [INI_WriteBool](#ini_writebool)
  - [INI_WriteHex e INI_WriteBin](#ini_writehex-e-ini_writebin)
  - [INI_RemoveEntry](#ini_removeentry)
- [Ejemplo Práctico Completo: Sistema de Cuenta de Jugador](#ejemplo-practico-completo-sistema-de-cuenta-de-jugador)
- [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Arquitectura y Funcionamiento Interno

Un archivo INI estándar se divide en etiquetas o secciones delimitadas por corchetes `[Seccion]` y pares de `clave = valor`:

```ini
; Archivo de configuración del servidor
[ajustes]
servidor_nombre = Mi Servidor SA-MP
max_jugadores = 50
puerto = 7777
es_abierto = true

[premios]
dinero_inicial = 5000
recompensa_login = 150.75
```

### El Flujo de Lectura
Cuando ejecutas `INI_ParseFile("servidor.ini", "Cargar_%s")`, `y_ini` hace lo siguiente:
1. Abre el archivo en modo de solo lectura.
2. Lee cada línea secuencialmente. Si encuentra una cabecera `[ajustes]`, busca la función pública `Cargar_ajustes` en el script.
3. Para cada línea subsiguiente con formato `clave = valor`, ejecuta dicha función pasando los parámetros `(name[], value[])`.
4. Las macros como `INI_Int` comparan `name` y, si coincide, convierten `value` al tipo correspondiente y asignan la variable.
5. Cierra el archivo. Todo el archivo se procesó en milisegundos.

---

## Lectura y Parseo de Archivos

### INI_ParseFile

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Lee un archivo INI desde la carpeta `scriptfiles/` y dispara los callbacks correspondientes para cada sección encontrada.
- **Sintaxis:**
```pawn
INI_ParseFile(const filename[], const remoteFormat[], bool:bFileFirst = false, bool:bExtra = false, extra = 0, bool:bLocal = true, bool:bPassTag = false, bool:bFilter = false, const filter[] = "")
```
- **Parámetros:**
  - `const filename[]`: Ruta relativa del archivo dentro de `scriptfiles/` (ej: `"cuentas/%s.ini"` o `"config.ini"`).
  - `const remoteFormat[]`: Patrón del nombre de la función que procesará las secciones (ej: `"Cargar_%s"` o `"@INI_%s"`). El especificador `%s` se sustituye por el nombre de la sección en minúsculas.
  - `bool:bFileFirst`: Si es `true`, formatea primero el nombre del archivo y luego la sección en el patrón.
  - `bool:bExtra`: `true` si se desea pasar un parámetro adicional (como `playerid`) a los callbacks de sección.
  - `extra`: Valor entero del parámetro adicional (típicamente `playerid`).
  - `bool:bLocal`: Si es `true`, busca los callbacks en el script actual (`CallLocalFunction`); si es `false`, busca en todos los scripts (`CallRemoteFunction`).
- **Retorno:** Devuelve `1` si el archivo se abrió y leyó exitosamente; `0` si el archivo no existe o hubo un error.
- **Ejemplo:**
```pawn
// Carga simple sin parámetro extra:
INI_ParseFile("config.ini", "Config_%s");

// Carga con playerid como parámetro extra:
new ruta[64];
format(ruta, sizeof(ruta), "usuarios/%s.ini", ReturnPlayerName(playerid));
INI_ParseFile(ruta, "Usuario_%s", .bExtra = true, .extra = playerid);
```

---

### INI_Load

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Envoltorio simplificado de `INI_ParseFile` diseñado para utilizarse en conjunto con la macro `INI:`. Busca callbacks con la firma predeterminada `@INI_%s`.
- **Sintaxis:**
```pawn
INI_Load(const filename[], bool:bExtra = false, extra = 0)
```
- **Ejemplo:**
```pawn
INI_Load("servidor.ini");
```

---

### Declaración de Secciones: Macro INI:

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Declara de forma automática la función forward y public que recibirá los pares clave-valor de una sección determinada de un archivo INI.
- **Sintaxis:**
```pawn
// Formato sin especificar archivo (aplica a cualquier archivo que tenga esa sección):
INI:NombreSeccion(extra, name[], value[])
{
    // Extracción de claves
    return 1;
}

// Formato especificando archivo y sección:
INI:NombreArchivo[NombreSeccion](extra, name[], value[])
{
    return 1;
}
```

---

## Macros Extractoras de Tipos de Datos

Dentro de los callbacks de sección (`INI:`), se emplean las siguientes macros para extraer los valores. Cada macro compara `name`, realiza la conversión correspondiente y finaliza la llamada con `return 1` si hubo coincidencia.

### INI_Int

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Compara el nombre de la clave y extrae un número entero (`cell`).
- **Sintaxis:**
```pawn
INI_Int(const name[], &variable)
```
- **Ejemplo:**
```pawn
INI_Int("Dinero", g_UserData[playerid][pDinero]);
INI_Int("Nivel", g_UserData[playerid][pNivel]);
```

---

### INI_Float

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Compara el nombre de la clave y extrae un número decimal de coma flotante (`Float:`).
- **Sintaxis:**
```pawn
INI_Float(const name[], &Float:variable)
```
- **Ejemplo:**
```pawn
INI_Float("Salud", g_UserData[playerid][pSalud]);
INI_Float("Armadura", g_UserData[playerid][pArmadura]);
```

---

### INI_String

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Compara el nombre de la clave y copia la cadena de texto en un array destino.
- **Sintaxis:**
```pawn
INI_String(const name[], output[], len = sizeof(output))
```
- **Ejemplo:**
```pawn
INI_String("Contrasena", g_UserData[playerid][pPassword], 64);
INI_String("UltimaIP", g_UserData[playerid][pIP], 16);
```

---

### INI_Bool

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Compara la clave y extrae un valor booleano (`true`/`false`, `1`/`0`, `yes`/`no`).
- **Sintaxis:**
```pawn
INI_Bool(const name[], &bool:variable)
```
- **Ejemplo:**
```pawn
INI_Bool("EstaBaneado", g_UserData[playerid][pBaneado]);
INI_Bool("LicenciaConducir", g_UserData[playerid][pLicencia]);
```

---

### INI_Hex e INI_Bin

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Extrae números en formato hexadecimal (`0xRRGGBB` o `RRGGBB`) o binario (`0b...`).
- **Sintaxis:**
```pawn
INI_Hex(const name[], &variable)
INI_Bin(const name[], &variable)
```
- **Ejemplo:**
```pawn
INI_Hex("ColorVehiculo", g_UserData[playerid][pColorVehiculo]);
```

---

## Escritura y Modificación de Archivos

La escritura en `y_ini` se realiza abriendo un manejador de tipo `INI:`, estableciendo una sección activa con `INI_SetTag`, escribiendo las claves deseadas y finalizando obligatoriamente con `INI_Close`.

### INI_Open

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Abre o crea un búfer en memoria para el archivo especificado.
- **Sintaxis:**
```pawn
INI:INI_Open(const filename[])
```
- **Retorno:** Devuelve un puntero manejador con tag `INI:`, o `INI_NO_FILE` si no se pudo abrir o inicializar el archivo.
- **Ejemplo:**
```pawn
new INI:handle = INI_Open("config.ini");
if (handle == INI_NO_FILE)
{
    print("[ERROR] No se pudo abrir config.ini para escritura.");
    return 0;
}
```

---

### INI_Close

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Escribe en disco de forma segura todos los datos acumulados en el búfer de memoria y cierra el archivo.
- **Sintaxis:**
```pawn
void:INI_Close(INI:file)
```
- **Ejemplo:**
```pawn
INI_Close(handle);
```

> [!IMPORTANT]
> Si olvidas llamar a `INI_Close`, los cambios no se guardarán en el disco físico y se perderán en memoria.

---

### INI_SetTag

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Establece la etiqueta o sección `[tag]` activa. Todas las escrituras siguientes se situarán bajo esta sección.
- **Sintaxis:**
```pawn
void:INI_SetTag(INI:file, const tag[])
```
- **Ejemplo:**
```pawn
INI_SetTag(handle, "datos_generales");
```

---

### INI_DeleteTag

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Elimina una sección completa junto con todas las claves y valores contenidos en ella.
- **Sintaxis:**
```pawn
void:INI_DeleteTag(INI:file, const tag[])
```

---

### INI_WriteInt

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Escribe un número entero bajo la sección actual.
- **Sintaxis:**
```pawn
void:INI_WriteInt(INI:file, const key[], value)
```

---

### INI_WriteFloat

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Escribe un valor decimal de coma flotante.
- **Sintaxis:**
```pawn
void:INI_WriteFloat(INI:file, const key[], Float:value, accuracy = 4)
```

---

### INI_WriteString

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Escribe una cadena de texto.
- **Sintaxis:**
```pawn
void:INI_WriteString(INI:file, const key[], const value[])
```

---

### INI_WriteBool

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Escribe un valor booleano (`true` o `false`).
- **Sintaxis:**
```pawn
void:INI_WriteBool(INI:file, const key[], bool:value)
```

---

### INI_RemoveEntry

- **Módulo:** `#include <YSI_Storage\y_ini>`
- **Tipo:** `Función stock`
- **Descripción:** Elimina una clave individual dentro de la sección actual.
- **Sintaxis:**
```pawn
void:INI_RemoveEntry(INI:file, const key[])
```

---

## Ejemplo Práctico Completo: Sistema de Cuenta de Jugador

A continuación se presenta un sistema completo y realista de carga y guardado de cuentas de usuario usando `y_ini`:

```pawn
#include <openmultiplayer>
#include <YSI_Storage\y_ini>
#include <YSI_Coding\y_hooks>

enum E_JUGADOR_DATOS
{
    jDinero,
    jScore,
    Float:jSalud,
    Float:jArmadura,
    bool:jLicenciaArmas,
    jPassword[65]
}

new g_Jugador[MAX_PLAYERS][E_JUGADOR_DATOS];

// Función auxiliar para obtener la ruta del archivo del jugador
stock ObtenerRutaCuenta(playerid, output[], maxlen = sizeof(output))
{
    new nombre[MAX_PLAYER_NAME];
    GetPlayerName(playerid, nombre, sizeof(nombre));
    format(output, maxlen, "cuentas/%s.ini", nombre);
}

// -------------------------------------------------------------
// Callbacks de Parseo y Lectura (y_ini)
// -------------------------------------------------------------

// Sección [cuenta]: Contraseña y credenciales
forward Usuario_cuenta(playerid, name[], value[]);
public Usuario_cuenta(playerid, name[], value[])
{
    INI_String("password", g_Jugador[playerid][jPassword], 65);
    return 1;
}

// Sección [estadisticas]: Dinero, Score, Armas
forward Usuario_estadisticas(playerid, name[], value[]);
public Usuario_estadisticas(playerid, name[], value[])
{
    INI_Int("dinero", g_Jugador[playerid][jDinero]);
    INI_Int("score", g_Jugador[playerid][jScore]);
    INI_Float("salud", g_Jugador[playerid][jSalud]);
    INI_Float("armadura", g_Jugador[playerid][jArmadura]);
    INI_Bool("licencia_armas", g_Jugador[playerid][jLicenciaArmas]);
    return 1;
}

// -------------------------------------------------------------
// Carga de la Cuenta
// -------------------------------------------------------------
stock CargarCuenta(playerid)
{
    new ruta[64];
    ObtenerRutaCuenta(playerid, ruta);

    if (!fexist(ruta))
    {
        return 0; // La cuenta no existe
    }

    // Parsear el archivo pasando playerid como parámetro extra
    INI_ParseFile(ruta, "Usuario_%s", .bExtra = true, .extra = playerid);

    // Aplicar los datos cargados al jugador
    ResetPlayerMoney(playerid);
    GivePlayerMoney(playerid, g_Jugador[playerid][jDinero]);
    SetPlayerScore(playerid, g_Jugador[playerid][jScore]);
    SetPlayerHealth(playerid, g_Jugador[playerid][jSalud]);
    SetPlayerArmour(playerid, g_Jugador[playerid][jArmadura]);

    SendClientMessage(playerid, 0x00FF00FF, "[CUENTA] Tus datos han sido cargados con exito.");
    return 1;
}

// -------------------------------------------------------------
// Guardado de la Cuenta
// -------------------------------------------------------------
stock GuardarCuenta(playerid)
{
    new ruta[64];
    ObtenerRutaCuenta(playerid, ruta);

    new INI:archivo = INI_Open(ruta);
    if (archivo == INI_NO_FILE)
    {
        printf("[ERROR] No se pudo crear o abrir %s para guardar.", ruta);
        return 0;
    }

    // Actualizar variables en memoria antes de guardar
    g_Jugador[playerid][jDinero] = GetPlayerMoney(playerid);
    g_Jugador[playerid][jScore] = GetPlayerScore(playerid);
    GetPlayerHealth(playerid, g_Jugador[playerid][jSalud]);
    GetPlayerArmour(playerid, g_Jugador[playerid][jArmadura]);

    // 1. Escribir sección de credenciales
    INI_SetTag(archivo, "cuenta");
    INI_WriteString(archivo, "password", g_Jugador[playerid][jPassword]);

    // 2. Escribir sección de estadísticas
    INI_SetTag(archivo, "estadisticas");
    INI_WriteInt(archivo, "dinero", g_Jugador[playerid][jDinero]);
    INI_WriteInt(archivo, "score", g_Jugador[playerid][jScore]);
    INI_WriteFloat(archivo, "salud", g_Jugador[playerid][jSalud]);
    INI_WriteFloat(archivo, "armadura", g_Jugador[playerid][jArmadura]);
    INI_WriteBool(archivo, "licencia_armas", g_Jugador[playerid][jLicenciaArmas]);

    // 3. Confirmar y cerrar búfer
    INI_Close(archivo);
    printf("[CUENTA] Cuenta guardada: %s", ruta);
    return 1;
}

// Hooks de conexión y desconexión
hook OnPlayerConnect(playerid)
{
    new ruta[64];
    ObtenerRutaCuenta(playerid, ruta);

    if (fexist(ruta))
    {
        SendClientMessage(playerid, 0xFFFF00FF, "Tu cuenta existe en el servidor. Cargando...");
        CargarCuenta(playerid);
    }
    else
    {
        SendClientMessage(playerid, 0x00FFFFFF, "Eres nuevo en el servidor. Creando cuenta base...");
        format(g_Jugador[playerid][jPassword], 65, "clave123");
        g_Jugador[playerid][jDinero] = 500;
        g_Jugador[playerid][jScore] = 1;
        g_Jugador[playerid][jSalud] = 100.0;
        g_Jugador[playerid][jArmadura] = 0.0;
        g_Jugador[playerid][jLicenciaArmas] = false;
        GuardarCuenta(playerid);
    }
    return 1;
}

hook OnPlayerDisconnect(playerid, reason)
{
    GuardarCuenta(playerid);
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### Buenas Prácticas
1. **Verificar Retorno de `INI_Open`:** Asegúrate siempre de comprobar si el manejador devuelto es distinto de `INI_NO_FILE` antes de escribir.
2. **Cerrar Siempre con `INI_Close`:** Si el script sale o falla antes de llamar a `INI_Close`, la información no se consolidará en el disco.
3. **Secciones en Minúsculas:** `y_ini` convierte las secciones a minúsculas internamente al resolver los callbacks; nombra tus callbacks con minúsculas (ej: `Usuario_estadisticas`).
4. **Organización por Secciones:** Agrupa datos afines en etiquetas `[cuenta]`, `[vehiculo]`, `[propiedad]`. Esto facilita la lectura manual y la escalabilidad.

### Errores Comunes
- **Directorio Inexistente:** Intentar guardar en `cuentas/Juan.ini` cuando la subcarpeta `scriptfiles/cuentas` no ha sido creada previamente en el sistema operativo provocará que `INI_Open` devuelva `INI_NO_FILE`.
- **Olvidar `.bExtra = true`:** Al usar `INI_ParseFile` con callbacks que reciben `playerid`, si no pasas `.bExtra = true`, el callback recibirá parámetros desalineados.
- **Sobrescribir Cadenas sin Tamaño Suficiente:** No definir el tamaño de buffer adecuado en `INI_String` puede provocar desbordamientos de pila (*stack overflow*).
