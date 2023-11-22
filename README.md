# Clicoscan
Desktop application for scanning student nfc cards.

This application is part of a set of applications responsible for student attendance listing.

# Technologies
- Rust + Tauri (backend)
- JavaScript + React (frontend)

## Dependancies
- Rust [install](https://www.rust-lang.org/tools/install).
- Cargo [install](https://doc.rust-lang.org/cargo/getting-started/installation.html).
- libusb & libnfc [git](https://github.com/nfc-tools/libnfc).
- npm 

# How do I use this solution in my city ?
The complete solution is composed of [clikodrome](https://github.com/JulienAldon/Clikodrome) backend and `Clicoscan` desktop application.
- Clikodrome is a dashboard application, it manages `promotions`, `sessions`, and `students` attendance.
- Clicoscan will connect to the `clikodrome` backend, list sessions and allow a user (pedago or assistant) to set presence for a student using a clicable list or by scanning nfc card.

## First setup Azure Oauth2 application
- Go to [azure portal](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
- Create a new application (save the `CLIENT_SECRET` it'll be used with [clikodrome api](https://github.com/JulienAldon/Clikodrome)).
- Get the `TENANT_ID` and `CLIENT_ID` these variables are required for the application to work properly.
- Inside `Expose an API` Create an application ID URI, then `add a scope` name it : `<ID-URI>/Attendance.Read`.
- You can then setup the rest of the application see [setup for clikodrome](https://github.com/JulienAldon/Clikodrome#Setup).

## Launch development application
```bash
export tenant_id=<tenant_id>
export client_id=<client_id>
export back_url=<back_url>

cargo tauri dev
```

## Build application
```bash
cargo tauri build
```

If you need internal logging to debug the application.
```bash
cargo tauri build --debug
```

# Usage github workflow
You can build the application for your system, but you can also build for other systems.
By default the repository contains a github workflow file. It allows you to build the application for Linux, Windows and MacOS

## Configure Github secrets
Go to `Settings > Secrets and variables > Actions > New repository secret`
Create a new `TENANT_ID` and `CLIENT_ID`

Then you can run manually the workflow inside `Actions` tab.

A release is published once all build are passed.