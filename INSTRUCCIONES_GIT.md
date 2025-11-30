# 📤 Instrucciones para Publicar en GitHub

## Prerrequisitos

1. **Instalar Git**: Si no tienes Git instalado, descárgalo desde https://git-scm.com/download/win
2. **Tener una cuenta de GitHub**: Asegúrate de tener acceso al repositorio https://github.com/JuanPaVelandia/proyectocamaras.git

## Pasos para Publicar el Código

### 1. Abrir PowerShell o Terminal en la carpeta del proyecto

Navega a la carpeta `C:\frigate` en tu terminal.

### 2. Inicializar el repositorio Git (si no está inicializado)

```powershell
git init
```

### 3. Agregar el remote de GitHub

```powershell
git remote add origin https://github.com/JuanPaVelandia/proyectocamaras.git
```

Si el remote ya existe y quieres cambiarlo:

```powershell
git remote set-url origin https://github.com/JuanPaVelandia/proyectocamaras.git
```

### 4. Agregar todos los archivos

```powershell
git add .
```

### 5. Hacer commit

```powershell
git commit -m "Initial commit: Sistema de monitoreo con Frigate + Alertas Inteligentes"
```

### 6. Verificar la rama principal

```powershell
git branch -M main
```

### 7. Hacer push al repositorio

```powershell
git push -u origin main
```

Si es la primera vez, GitHub te pedirá autenticarte. Puedes usar:
- **Personal Access Token**: Crea uno en GitHub Settings > Developer settings > Personal access tokens
- **GitHub CLI**: Si tienes `gh` instalado, ejecuta `gh auth login`

## Si el repositorio ya tiene contenido

Si el repositorio remoto ya tiene commits, primero haz pull:

```powershell
git pull origin main --allow-unrelated-histories
```

Luego resuelve cualquier conflicto y haz push:

```powershell
git push -u origin main
```

## Comandos Útiles

### Ver el estado del repositorio
```powershell
git status
```

### Ver los archivos que se van a subir
```powershell
git status --short
```

### Ver los remotes configurados
```powershell
git remote -v
```

### Cambiar el mensaje del último commit
```powershell
git commit --amend -m "Nuevo mensaje"
```

## Nota sobre Archivos Sensibles

El archivo `.gitignore` ya está configurado para excluir:
- Archivos `.env` con credenciales
- Bases de datos locales
- Archivos de media/videos
- Logs
- Archivos temporales

**IMPORTANTE**: Nunca subas archivos con credenciales, tokens o contraseñas a GitHub.

