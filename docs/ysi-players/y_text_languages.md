# y_text & y_languages (Localización y Textos Dinámicos)

Los módulos `y_text` y `y_languages` conforman la solución definitiva de internacionalización (i18n), localización (l10n) y renderizado avanzado de textos en SA-MP y open.mp. Permiten separar por completo los textos y mensajes de la lógica del código fuente, almacenándolos en archivos de texto externos estructurados por idioma y cargándolos en memoria de forma optimizada.

Al combinarse, cuando envías un mensaje a un jugador mediante `Text_Send`, YSI detecta automáticamente el idioma de ese jugador y le muestra la versión traducida correspondiente con colores, formatos variables y estilos aplicados al instante.

---

## Ventajas sobre los Métodos Tradicionales

1. **Separación Limpia de Lógica y Presentación:** No más llamadas repetitivas a `format()` seguidas de `SendClientMessage()`. Los traductores pueden trabajar directamente en los archivos de texto sin tocar los scripts `.pwn`.
2. **Soporte Multilingüe Transparente:** Un único comando `Text_Send(playerid, $BIENVENIDA, nombre)` muestra el mensaje en español si el jugador configuró "ES", en inglés si configuró "EN", o recurre al idioma predeterminado de respaldo (*fallback*) automáticamente.
3. **Integración con Grupos y `PlayerSet`:** Puedes enviar un mensaje a un único jugador, a todos los jugadores (`ALL`) o a los miembros de un `Group:` (`Text_Send(g_AdminGroup, $ALERTA_REPORTE)`). Cada receptor leerá el mensaje en su respectivo idioma personal.
4. **Formateo y Renderizado de Alto Rendimiento:** Utiliza un formato intermedio tokenizado en bytecode que evita múltiples pasadas lentas de cadenas en tiempo de ejecución.
5. **Formatos Personalizados:** Permite registrar especificadores propios mediante la macro `FormatSpecifier` (por ejemplo, `%p` para formatear el nombre de un jugador o `%m` para cantidades de dinero).

---

## Inclusión en el Script

Para utilizar el sistema de textos e idiomas:

```pawn
#include <openmultiplayer> // o <a_samp>
#include <YSI_Players\y_languages>
#include <YSI_Players\y_text>
```

> [!NOTE]
> Al incluir `y_text`, se incluye internamente `y_languages`, pero es una buena práctica declarar ambos explícitamente si vas a gestionar idiomas de forma intensiva.

---

## Tabla de Contenido

- [Arquitectura de Archivos de Texto](#arquitectura-de-archivos-de-texto)
- [Módulo y_languages (Gestión de Idiomas)](#modulo-y_languages-gestion-de-idiomas)
  - [Langs_AddLanguage](#langs_addlanguage)
  - [Langs_GetPlayerLanguage](#langs_getplayerlanguage)
  - [Langs_SetPlayerLanguage](#langs_setplayerlanguage)
  - [Langs_SetPlayerCode](#langs_setplayercode)
  - [Langs_GetLanguage](#langs_getlanguage)
  - [Langs_GetCode / Langs_GetName](#langs_getcode--langs_getname)
  - [Langs_GetLanguageCount](#langs_getlanguagecount)
- [Módulo y_text (Renderizado y Carga)](#modulo-y_text-renderizado-y-carga)
  - [Macro loadtext](#macro-loadtext)
  - [Text_Send](#text_send)
  - [Text_Format](#text_format)
  - [Diálogos Localizados (Text_MessageBox, etc.)](#dialogos-localizados-text_messagebox-etc)
  - [FormatSpecifier (Especificadores Personalizados)](#formatspecifier-especificadores-personalizados)
- [Ejemplo Práctico Completo: Servidor Bilingüe (Español / Inglés)](#ejemplo-practico-completo-servidor-bilingue-espanol--ingles)
- [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Arquitectura de Archivos de Texto

Los archivos de texto deben alojarse dentro de la carpeta `scriptfiles/YSI/text/`. La convención de nombres sigue el formato:

```
scriptfiles/YSI/text/<nombre_archivo>.<CODIGO_IDIOMA>
```

### Ejemplo de Archivos

**`scriptfiles/YSI/text/mensajes.ES`** (Español):
```ini
[general]
BIENVENIDA = Bienvenido al servidor, %s! Tu nivel es %d.
DESPEDIDA = %s ha salido del servidor (%s).
NO_PERMISO = {FF0000}Error:{FFFFFF} No tienes autorizacion para este comando.
DINERO_INFO = Tienes {00FF00}$%d{FFFFFF} en tu billetera.
```

**`scriptfiles/YSI/text/mensajes.EN`** (Inglés):
```ini
[general]
BIENVENIDA = Welcome to the server, %s! Your level is %d.
DESPEDIDA = %s has left the server (%s).
NO_PERMISO = {FF0000}Error:{FFFFFF} You are not authorized to use this command.
DINERO_INFO = You have {00FF00}$%d{FFFFFF} in your pocket.
```

---

## Módulo y_languages (Gestión de Idiomas)

El tipo de dato `Language:` representa un idioma válido cargado en el servidor. `NO_LANGUAGE` indica un idioma nulo o no encontrado.

### Langs_AddLanguage

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock / foreign`
- **Descripción:** Registra un nuevo idioma en el sistema mediante un código ISO de 2 letras y un nombre descriptivo.
- **Sintaxis:**
```pawn
Language:Langs_AddLanguage(const string:code[], const string:name[])
```
- **Parámetros:**
  - `const string:code[]`: Código de 2 caracteres en mayúsculas o minúsculas (ej: `"ES"`, `"EN"`, `"PT"`).
  - `const string:name[]`: Nombre completo del idioma (ej: `"Español"`, `"English"`).
- **Retorno:** Identificador del idioma (`Language:`) o `NO_LANGUAGE` si se excedió `MAX_LANGUAGES`.
- **Ejemplo:**
```pawn
new Language:g_LangES = NO_LANGUAGE;
new Language:g_LangEN = NO_LANGUAGE;

public OnGameModeInit()
{
    g_LangES = Langs_AddLanguage("ES", "Español");
    g_LangEN = Langs_AddLanguage("EN", "English");
    return 1;
}
```

---

### Langs_GetPlayerLanguage

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Obtiene el idioma preferido actual asignado al jugador.
- **Sintaxis:**
```pawn
Language:Langs_GetPlayerLanguage(playerid)
```
- **Retorno:** El `Language:` configurado para el jugador. Por defecto, YSI asigna el primer idioma registrado al conectarse el jugador.

---

### Langs_SetPlayerLanguage

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Cambia el idioma asignado al jugador mediante su identificador numérico `Language:`.
- **Sintaxis:**
```pawn
Language:Langs_SetPlayerLanguage(playerid, Language:l)
```
- **Parámetros:**
  - `playerid`: ID del jugador.
  - `Language:l`: Identificador del idioma registrado.
- **Retorno:** Devuelve el nuevo idioma asignado, o `NO_LANGUAGE` si el idioma no es válido.

---

### Langs_SetPlayerCode

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Asigna el idioma al jugador utilizando directamente el código de 2 letras.
- **Sintaxis:**
```pawn
Language:Langs_SetPlayerCode(playerid, const string:code[])
```
- **Ejemplo:**
```pawn
Langs_SetPlayerCode(playerid, "ES");
```

---

### Langs_GetLanguage

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Busca y devuelve el identificador `Language:` correspondiente a un código de 2 letras o a un nombre completo.
- **Sintaxis:**
```pawn
Language:Langs_GetLanguage(const string:identifier[])
```
- **Ejemplo:**
```pawn
new Language:lang = Langs_GetLanguage("English");
if (lang != NO_LANGUAGE)
{
    Langs_SetPlayerLanguage(playerid, lang);
}
```

---

### Langs_GetCode / Langs_GetName

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Devuelven el código de 2 letras o el nombre completo asociado a un `Language:`.
- **Sintaxis:**
```pawn
Langs_GetCode(Language:l)
Langs_GetName(Language:l)
```

---

### Langs_GetLanguageCount

- **Módulo:** `#include <YSI_Players\y_languages>`
- **Tipo:** `Función stock`
- **Descripción:** Devuelve la cantidad total de idiomas registrados actualmente en el servidor.
- **Sintaxis:**
```pawn
Langs_GetLanguageCount()
```

---

## Módulo y_text (Renderizado y Carga)

### Macro loadtext

- **Módulo:** `#include <YSI_Players\y_text>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Declara la carga de una sección de un archivo de textos en el contexto local del script.
- **Sintaxis:**
```pawn
loadtext nombre_archivo[seccion];
```
- **Ejemplo:**
```pawn
// Carga la sección [general] del archivo YSI/text/mensajes.*
loadtext mensajes[general];
```

---

### Text_Send

- **Módulo:** `#include <YSI_Players\y_text>`
- **Tipo:** `Macro preprocesador / Función`
- **Descripción:** Envía un texto localizado y formateado al destinatario indicado. El destinatario puede ser un `playerid` individual, todos los jugadores (`ALL`), o un grupo (`Group:grupo`).
- **Sintaxis:**
```pawn
Text_Send(target, $CLAVE, {GLOBAL_TAG_TYPES, _}:...)
```
- **Parámetros:**
  - `target`: `playerid`, `ALL`, o `Group:id`.
  - `$CLAVE`: Identificador precedido por un signo de dólar `$`, correspondiente a la clave definida en el archivo `.ES` / `.EN`.
  - `...`: Parámetros variables para rellenar los especificadores `%s`, `%d`, `%f`, etc.
- **Ejemplo:**
```pawn
// Enviar al jugador en su idioma:
Text_Send(playerid, $BIENVENIDA, ReturnPlayerName(playerid), GetPlayerScore(playerid));

// Enviar a todos los jugadores (cada uno en su propio idioma):
Text_Send(ALL, $DESPEDIDA, ReturnPlayerName(playerid), "Desconectado voluntariamente");
```

---

### Text_Format

- **Módulo:** `#include <YSI_Players\y_text>`
- **Tipo:** `Macro preprocesador`
- **Descripción:** Formatea un texto localizado en una variable de cadena en lugar de enviarlo directamente al chat del cliente.
- **Sintaxis:**
```pawn
Text_Format(output[], sizeof(output), playerid, $CLAVE, ...)
```
- **Ejemplo:**
```pawn
new buffer[128];
Text_Format(buffer, sizeof(buffer), playerid, $DINERO_INFO, GetPlayerMoney(playerid));
SendClientMessage(playerid, -1, buffer);
```

---

### Diálogos Localizados (Text_MessageBox, etc.)

`y_text` se integra con `y_dialog` para mostrar cuadros de diálogo completamente traducidos:

- `Text_MessageBox(playerid, callback[], $TITULO, $MENSAJE, $BOTON1, $BOTON2)`
- `Text_InputBox(playerid, callback[], $TITULO, $MENSAJE, $BOTON1, $BOTON2)`
- `Text_ListBox(playerid, callback[], $TITULO, $LISTA, $BOTON1, $BOTON2)`
- `Text_PasswordBox(playerid, callback[], $TITULO, $MENSAJE, $BOTON1, $BOTON2)`

```pawn
Text_MessageBox(playerid, "DialogoRespuesta", $DIALOGO_TITULO, $DIALOGO_CUERPO, $BOTON_ACEPTAR, $BOTON_CANCELAR);
```

---

### FormatSpecifier (Especificadores Personalizados)

`y_text` permite registrar nuevos especificadores de formato (como `%p` para nombres o `%m` para moneda con separadores de miles):

```pawn
// Definición de un formateador personalizado para el especificador %p (Player Name)
FormatSpecifier<'p'>(output[], playerid)
{
    GetPlayerName(playerid, output, MAX_PLAYER_NAME);
}

// Ahora se puede usar %p directamente en los archivos de texto:
// BIENVENIDA = Bienvenido, %p!
```

---

## Ejemplo Práctico Completo: Servidor Bilingüe (Español / Inglés)

Asegúrate de haber creado los dos archivos en `scriptfiles/YSI/text/`:
1. `scriptfiles/YSI/text/core.ES`
2. `scriptfiles/YSI/text/core.EN`

Contenido de `scriptfiles/YSI/text/core.ES`:
```ini
[servidor]
SALUDO = {00FF00}Hola %s, bienvenido a la comunidad.{FFFFFF}
CAMBIO_IDIOMA = Tu idioma ha sido cambiado a: {FFFF00}Español{FFFFFF}.
INFO_JUGADORES = Actualmente hay {00FFFF}%d{FFFFFF} jugadores conectados.
```

Contenido de `scriptfiles/YSI/text/core.EN`:
```ini
[servidor]
SALUDO = {00FF00}Hello %s, welcome to the community.{FFFFFF}
CAMBIO_IDIOMA = Your language has been set to: {FFFF00}English{FFFFFF}.
INFO_JUGADORES = Currently there are {00FFFF}%d{FFFFFF} players online.
```

Código Pawn del Gamemode:

```pawn
#include <openmultiplayer>
#include <YSI_Players\y_languages>
#include <YSI_Players\y_text>
#include <YSI_Visual\y_commands>
#include <YSI_Data\y_iterate>

// Identificadores globales de idioma
new Language:g_LangES = NO_LANGUAGE;
new Language:g_LangEN = NO_LANGUAGE;

// Cargar la sección [servidor] del archivo "core"
loadtext core[servidor];

public OnGameModeInit()
{
    // 1. Registrar los idiomas admitidos
    g_LangES = Langs_AddLanguage("ES", "Español");
    g_LangEN = Langs_AddLanguage("EN", "English");

    print("[YSI_TEXT] Idiomas registrados correctamente.");
    return 1;
}

public OnPlayerConnect(playerid)
{
    // Por defecto se asigna Español al conectar
    Langs_SetPlayerLanguage(playerid, g_LangES);

    // Enviar mensaje localizado en su idioma
    new nombre[MAX_PLAYER_NAME];
    GetPlayerName(playerid, nombre, sizeof(nombre));
    Text_Send(playerid, $SALUDO, nombre);
    return 1;
}

// Comando para cambiar de idioma
YCMD:idioma(playerid, params[], help)
{
    if (isnull(params))
    {
        SendClientMessage(playerid, -1, "{FFFF00}Uso:{FFFFFF} /idioma [ES / EN]");
        return 1;
    }

    if (!strcmp(params, "ES", true))
    {
        Langs_SetPlayerLanguage(playerid, g_LangES);
        Text_Send(playerid, $CAMBIO_IDIOMA);
    }
    else if (!strcmp(params, "EN", true))
    {
        Langs_SetPlayerLanguage(playerid, g_LangEN);
        Text_Send(playerid, $CAMBIO_IDIOMA);
    }
    else
    {
        SendClientMessage(playerid, 0xFF0000FF, "Idioma no disponible. Opciones: ES, EN.");
    }
    return 1;
}

// Comando para mostrar jugadores conectados
YCMD:online(playerid, params[], help)
{
    new count = Iter_Count(Player);
    Text_Send(playerid, $INFO_JUGADORES, count);
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### Buenas Prácticas
1. **Definir Siempre el Primer Idioma como Idioma Base:** El primer idioma agregado con `Langs_AddLanguage` se convierte en el idioma por defecto y de respaldo (*fallback*). Si una cadena no está traducida en inglés, el servidor mostrará automáticamente la versión del idioma base en lugar de fallar.
2. **Convención de Códigos ISO:** Usa siempre códigos de 2 letras estándar (`ES`, `EN`, `FR`, `DE`, `RU`, `PT`).
3. **Mantener la Misma Cantidad y Tipo de Especificadores:** Si la clave en español tiene `%s` y `%d`, la versión en inglés debe esperar exactamente los mismos tipos de especificadores en el mismo orden para evitar lecturas de memoria erróneas.

### Errores Comunes
- **Ruta Incorrecta de Archivos:** Ubicar los archivos en `scriptfiles/` directamente en lugar de `scriptfiles/YSI/text/`.
- **Olvidar el Signo `$CLAVE`:** Escribir `Text_Send(playerid, BIENVENIDA)` sin el signo de dólar provocará un error de variable no declarada (`undefined symbol BIENVENIDA`).
- **Olvidar la Macro `loadtext`:** Intentar utilizar `$CLAVE` sin haber ejecutado previamente `loadtext archivo[seccion];` generará errores de compilación o cadenas vacías.
