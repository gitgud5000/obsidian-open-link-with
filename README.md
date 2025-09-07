# obsidian-open-link-with

[![all downloads](https://img.shields.io/github/downloads/mamoruds/obsidian-open-link-with/total?style=flat-square)](https://github.com/MamoruDS/obsidian-open-link-with)
[![latest release](https://img.shields.io/github/v/release/mamoruds/obsidian-open-link-with?style=flat-square)](https://github.com/MamoruDS/obsidian-open-link-with/releases/latest)

Choose your own way to open external links.

## Installation

### Manual installation

Download zip archive from [releases page](https://github.com/MamoruDS/obsidian-open-link-with/releases). Extract the archive into `<your vault>/.obsidian/plugins`
Enable `Open Link With` under `Settings > Community plugins > Installed Plugins`

## Usage

Select which browser you want to open external link with in plugin's setting menu.

<p align="center">
<img src="https://github.com/MamoruDS/obsidian-open-link-with/raw/main/assets/screenshot_00.png" style="width: 650px; max-width: 100%;">
</p>

### Web Viewer (Obsidian 1.9+)

Starting with Obsidian 1.9, this plugin supports the new **web viewer** option which provides an enhanced browser experience within Obsidian. This feature leverages Obsidian's built-in web browsing capabilities for a more integrated and native browsing experience.

The web viewer option:
- Uses Obsidian's native browser view when available (Obsidian 1.9+)
- Falls back gracefully to an enhanced iframe implementation for compatibility
- Provides better security and modern web features
- Supports all the same modifier key bindings as other browser options

To use the web viewer, simply select "web viewer (Obsidian 1.9+)" from the Browser dropdown in the plugin settings.

### Customization

Put your custom profile in plugin's settings menu. Profile should contain `name(string): commands(string[])` which is demonstrated in the following:
_PS._ If the name in the user defined profile is same as the preset, it will be _ignored_.

Examples:

<details><summary>For MacOS</summary>

```json
{
    "waterfox": [
        "/Applications/Waterfox.app/Contents/MacOS/waterfox"
    ],
    "waterfox-private": [
        "/Applications/Waterfox.app/Contents/MacOS/waterfox",
        "--private-window"
    ]
}
```

</details>

<details><summary>For Windows</summary>

```json
{
    "opera": [
        "c:/Users/mamoru/AppData/Local/Programs/Opera/launcher.exe"
    ],
    "opera-private": [
        "c:/Users/mamoru/AppData/Local/Programs/Opera/launcher.exe",
        "--private"
    ]
}
```

</details>

### Modifier key bindings

The plugin supports multiple open settings by binding modifier key after version `0.1.5`. You can set the modifier key bindings to match your personal preferences through the plugin's settings menus.

By default, any modifier key and any mouse button (left or middle button) click will use the _global_ browser, i.e. the browser profile selected in the setting `Browser`. You can create a custom modifier binding by clicking the `New` button and setting whether the binding is triggered only by middle mouse button clicks. You can create multiple bindings to personalize the plugin's behavior, and the bindings will be matched from top to bottom.

<p align="center">
<img src="https://github.com/MamoruDS/obsidian-open-link-with/raw/main/assets/screenshot_01.png" style="width: 650px; max-width: 100%;">
</p>

For example, in the above setting, the link will be opened by chrome when **shift** is pressed and the **middle** mouse button is clicked; the link will be opened by safari when **shift** is pressed and the **left** mouse button is clicked; in other cases, it will be opened by _global_ browser firefox.

## Changelog

[link](./CHANGELOG.md) of changelogs.
