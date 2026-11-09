# y_dialog (Diálogos Modernos sin IDs)

En el desarrollo tradicional de SA-MP, el sistema de diálogos nativo (`ShowPlayerDialog`) adolece de una limitación de diseño crítica: requiere asignar manualmente un número entero arbitrario (`dialogid`) a cada cuadro de diálogo. En servidores grandes o modulares con múltiples filterscripts e includes, esto desemboca rápidamente en el llamado **"infierno de colisiones de IDs"**, donde dos scripts independientes utilizan el mismo número (por ejemplo, diálogo `10` para un cajero y diálogo `10` para el registro), causando que la respuesta de un diálogo sea procesada por el script incorrecto. Además, obliga a centralizar todo el código de respuestas en un gigantesco y desordenado callback `OnDialogResponse`.

**`y_dialog`** revoluciona este paradigma gestionando automáticamente los identificadores en segundo plano y permitiendo vincular cada diálogo a **funciones en línea (*closures* con `y_inline`)** o callbacks independientes.

## Módulo Requerido

```pawn
#include <YSI_Visual\y_dialog>
```

## Tabla de Contenido

- [¿Por qué usar y_dialog?](#por-que-usar-y_dialog)
- [Estilos de Diálogo Soportados](#estilos-de-dialogo-soportados)
- [Referencia de Funciones](#referencia-de-funciones)
  - [Dialog_ShowCallback](#dialog_showcallback)
  - [Dialog_Show](#dialog_show)
  - [Dialog_Hide](#dialog_hide)
  - [Dialog_Get](#dialog_get)
- [Firmas de Callback Soportadas](#firmas-de-callback-soportadas)
- [Ejemplos Prácticos](#ejemplos-practicos)
  - [Ejemplo 1: Diálogo de Confirmación (MSGBOX con Inline)](#ejemplo-1-dialogo-de-confirmacion-msgbox-con-inline)
  - [Ejemplo 2: Menú de Tienda con Lista Tabulada (TABLIST_HEADERS)](#ejemplo-2-menu-de-tienda-con-lista-tabulada-tablist_headers)
  - [Ejemplo 3: Formulario de Entrada Segura (PASSWORD e INPUT)](#ejemplo-3-formulario-de-entrada-segura-password-e-input)
- [Buenas Prácticas y Gotchas](#buenas-practicas-y-gotchas)

---

## ¿Por qué usar y_dialog?

| Característica | Sistema Nativo (ShowPlayerDialog) | Con y_dialog (YSI v5) |
| :--- | :--- | :--- |
| **Identificadores** | Manuales (`dialogid` 0 a 32767). Propenso a colisiones catastróficas. | Completamente automático. Se reservan IDs hash únicos por script. |
| **Organización de Código** | Un único switch masivo en `OnDialogResponse` de miles de líneas. | Lógica encapsulada localmente junto a la función que abrió el diálogo. |
| **Captura de Variables** | Requiere guardar variables temporales en arrays globales o PVars. | Las funciones en línea pueden acceder a variables locales del ámbito padre (*closures*). |
| **Seguridad Multi-script** | Los filterscripts pueden interceptar diálogos del gamemode sin querer. | Sincronización transparente vía `y_master`; ningún script pisa a otro. |

---

## Estilos de Diálogo Soportados

`y_dialog` es totalmente compatible con todos los estilos estándar de SA-MP y open.mp:

| Constante | Valor | Descripción |
| :--- | :---: | :--- |
| `DIALOG_STYLE_MSGBOX` | 0 | Cuadro de mensaje con texto informativo y dos botones. |
| `DIALOG_STYLE_INPUT` | 1 | Cuadro con campo de entrada de texto visible. |
| `DIALOG_STYLE_LIST` | 2 | Lista vertical seleccionable por filas. |
| `DIALOG_STYLE_PASSWORD` | 3 | Campo de texto oculto con asteriscos (para contraseñas). |
| `DIALOG_STYLE_TABLIST` | 4 | Lista con columnas tabuladas mediante tabulaciones (`\t`). |
| `DIALOG_STYLE_TABLIST_HEADERS` | 5 | Lista con cabeceras de columna fijas y filas de datos. |

---

## Referencia de Funciones

### Dialog_ShowCallback

- **Módulo**: `#include <YSI_Visual\y_dialog>`
- **Tipo**: `Función stock`
- **Descripción**: Muestra un cuadro de diálogo a un jugador vinculando directamente su respuesta a una función en línea (*inline callback*). Elimina la necesidad de usar `OnDialogResponse`.

#### Sintaxis
```pawn
stock bool:Dialog_ShowCallback(
    playerid, 
    {F@_@iiiis, F@_@iis}:callback, 
    DIALOG_STYLE:style, 
    const string:title[], 
    const string:caption[], 
    const string:button1[], 
    const string:button2[] = "", 
    tag = tagof (callback)
)
```

#### Parámetros
- `playerid`: ID del jugador al que se mostrará el diálogo.
- `callback`: Expresión `using inline NombreCallback`.
- `style`: Estilo del diálogo (`DIALOG_STYLE_MSGBOX`, `INPUT`, `LIST`, `TABLIST`, etc.).
- `title[]`: Título de la ventana emergente.
- `caption[]`: Cuerpo del texto del diálogo.
- `button1[]`: Texto del botón principal (ej: `"Aceptar"`).
- `button2[]` (opcional): Texto del botón secundario (ej: `"Cancelar"`). Si se omite, solo se mostrará un botón.

#### Retorno
Devuelve `true` si el diálogo fue enviado exitosamente al cliente, `false` si el jugador no está conectado.

---

### Dialog_Show

- **Módulo**: `#include <YSI_Visual\y_dialog>`
- **Tipo**: `Función stock`
- **Descripción**: Muestra un diálogo sin un callback en línea, delegando su captura en hooks estándar de `OnDialogResponse` pero protegiendo el ID para evitar conflictos entre scripts.

#### Sintaxis
```pawn
stock bool:Dialog_Show(
    playerid, 
    DIALOG_STYLE:style, 
    const string:title[], 
    const string:caption[], 
    const string:button1[], 
    const string:button2[] = ""
)
```

---

### Dialog_Hide

- **Módulo**: `#include <YSI_Visual\y_dialog>`
- **Tipo**: `Función stock`
- **Descripción**: Cierra de inmediato cualquier diálogo visible en la pantalla del jugador y libera la memoria de los callbacks asociados en todos los scripts.

#### Sintaxis
```pawn
stock bool:Dialog_Hide(playerid)
```

#### Retorno
Devuelve `true` si se ocultó la ventana; `false` si falló la operación.

---

### Dialog_Get

- **Módulo**: `#include <YSI_Visual\y_dialog>`
- **Tipo**: `Función stock`
- **Descripción**: Consulta el identificador de diálogo actualmente activo para el jugador en el script local, o `-1` si no tiene diálogos abiertos.

#### Sintaxis
```pawn
stock Dialog_Get(playerid)
```

---

## Firmas de Callback Soportadas

Al crear funciones en línea con `inline` para usarlas en `Dialog_ShowCallback`, `y_dialog` acepta de forma automática cualquiera de las dos firmas siguientes:

### Firma Simplificada (3 Parámetros)
Ideal para la mayoría de casos de uso comunes:
```pawn
inline const MiRespuesta(response, listitem, string:inputtext[])
```
- `response`: `1` si presionó el primer botón o seleccionó con doble clic; `0` si presionó el segundo botón o cerró con ESC.
- `listitem`: Índice de la fila seleccionada (0-indexado) en diálogos de tipo lista; `-1` en otros estilos.
- `string:inputtext[]`: Texto ingresado en el campo o contenido de la fila seleccionada.

### Firma Completa (5 Parámetros)
Útil cuando necesitas explícitamente el `playerid` o el `dialogid` dentro de funciones auxiliares:
```pawn
inline const MiRespuesta(playerid, dialogid, response, listitem, string:inputtext[])
```

---

## Ejemplos Prácticos

### Ejemplo 1: Diálogo de Confirmación (`MSGBOX` con Inline)

En este ejemplo se muestra una confirmación para suicidarse o reiniciar personaje, capturando el estado directamente dentro del mismo comando:

```pawn
#include <a_samp>
#include <YSI_Visual\y_commands>
#include <YSI_Visual\y_dialog>

@cmd() suicidio(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, -1, "Uso: /suicidio - Pide confirmación antes de morir.");
    }

    // Declaramos la función inline que manejará la respuesta
    inline const ConfirmarSuicidio(response, listitem, string:inputtext[])
    {
        #pragma unused listitem, inputtext
        if (response)
        {
            SetPlayerHealth(playerid, 0.0);
            SendClientMessage(playerid, 0xFF0000AA, "Te has quitado la vida.");
        }
        else
        {
            SendClientMessage(playerid, 0x00FF00AA, "Has cancelado la acción.");
        }
        @return 1;
    }

    Dialog_ShowCallback(
        playerid, 
        using inline ConfirmarSuicidio, 
        DIALOG_STYLE_MSGBOX, 
        "Confirmación Crítica", 
        "¿Estás seguro de que deseas terminar con la vida de tu personaje?", 
        "Sí, Seguro", 
        "Cancelar"
    );
    return 1;
}
```

---

### Ejemplo 2: Menú de Tienda con Lista Tabulada (`TABLIST_HEADERS`)

Uso de cabeceras de columnas y selección de artículos:

```pawn
@cmd() tienda(playerid, params[], help)
{
    new contenido[256];
    format(contenido, sizeof(contenido), 
        "Artículo\tPrecio\n"\
        "Chaleco Antibalas\t$200\n"\
        "Bate de Béisbol\t$50\n"\
        "Kit de Primeros Auxilios\t$100"
    );

    inline const AlComprar(response, listitem, string:inputtext[])
    {
        #pragma unused inputtext
        if (!response) return SendClientMessage(playerid, -1, "Saliste de la tienda.");

        switch (listitem)
        {
            case 0: // Chaleco
            {
                if (GetPlayerMoney(playerid) < 200) return SendClientMessage(playerid, 0xFF0000AA, "No tienes suficiente dinero.");
                GivePlayerMoney(playerid, -200);
                SetPlayerArmour(playerid, 100.0);
                SendClientMessage(playerid, 0x00FF00AA, "Compraste un Chaleco Antibalas.");
            }
            case 1: // Bate
            {
                if (GetPlayerMoney(playerid) < 50) return SendClientMessage(playerid, 0xFF0000AA, "No tienes suficiente dinero.");
                GivePlayerMoney(playerid, -50);
                GivePlayerWeapon(playerid, 5, 1);
                SendClientMessage(playerid, 0x00FF00AA, "Compraste un Bate de Béisbol.");
            }
            case 2: // Botiquín
            {
                if (GetPlayerMoney(playerid) < 100) return SendClientMessage(playerid, 0xFF0000AA, "No tienes suficiente dinero.");
                GivePlayerMoney(playerid, -100);
                SetPlayerHealth(playerid, 100.0);
                SendClientMessage(playerid, 0x00FF00AA, "Compraste un Botiquín.");
            }
        }
        @return 1;
    }

    Dialog_ShowCallback(
        playerid, 
        using inline AlComprar, 
        DIALOG_STYLE_TABLIST_HEADERS, 
        "Tienda 24/7", 
        contenido, 
        "Comprar", 
        "Salir"
    );
    return 1;
}
```

---

### Ejemplo 3: Formulario de Entrada Segura (`PASSWORD` e `INPUT`)

Validación de contraseña con reintento automático si el campo viene vacío:

```pawn
stock MostrarLogin(playerid)
{
    inline const RespuestaLogin(response, listitem, string:inputtext[])
    {
        #pragma unused listitem
        if (!response)
        {
            SendClientMessage(playerid, 0xFF0000AA, "Debes ingresar tu contraseña para jugar.");
            Kick(playerid);
            @return 1;
        }

        if (IsNull(inputtext))
        {
            SendClientMessage(playerid, 0xFF0000AA, "La contraseña no puede estar vacía.");
            MostrarLogin(playerid); // Reabre el diálogo de forma recursiva
            @return 1;
        }

        // Aquí se validaría el hash de la contraseña (ejemplo con bcrypt)
        SendClientMessage(playerid, 0x00FF00AA, "Contraseña recibida. Autenticando...");
        @return 1;
    }

    Dialog_ShowCallback(
        playerid, 
        using inline RespuestaLogin, 
        DIALOG_STYLE_PASSWORD, 
        "Acceso al Servidor", 
        "Introduce tu contraseña registrada para continuar:", 
        "Entrar", 
        "Salir"
    );
}
```

---

## Buenas Prácticas y Gotchas

1. **Usa `@return 1;` dentro del bloque `inline`**: En lugar de `return 1;`, utiliza `@return 1;` dentro de funciones en línea. Esto previene advertencias de retorno en ciertas versiones del compilador de la comunidad.
2. **Usa siempre `IsNull(inputtext)` en estilos `INPUT` y `PASSWORD`**: Cuando un usuario presiona la tecla Enter en un diálogo de texto sin haber escrito nada, `inputtext` puede contener caracteres basura o punteros vacíos. `IsNull(inputtext)` previene cuelgues del servidor.
3. **No reutilices los IDs numéricos reservados de YSI**: `y_dialog` intercepta las llamadas nativas `ShowPlayerDialog`. Si llamas manualmente a `ShowPlayerDialog` con los IDs internos calculados por YSI, el módulo emitirá un error de depuración: `Trying to show a dialog with YSI reserved ID`. Confía plenamente en `Dialog_ShowCallback` y olvídate de los IDs numéricos.
