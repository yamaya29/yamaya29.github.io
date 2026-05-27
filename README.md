# Web

Base inicial para un sitio estatico multipagina listo para publicar en GitHub Pages.

## Estructura

- `index.html`: pagina principal.
- `pages/`: paginas internas.
- `assets/css/`: estilos compartidos.
- `.github/workflows/deploy-pages.yml`: despliegue automatico con GitHub Actions.

## Cuando lo subamos a GitHub

1. Crear el repositorio en GitHub.
2. Conectar el remoto:
   `git remote add origin <URL_DEL_REPOSITORIO>`
3. Hacer el primer push:
   `git push -u origin main`
4. En GitHub, ir a `Settings > Pages` y confirmar que el sitio use `GitHub Actions`.

## Notas

- Los enlaces del sitio usan rutas relativas para que funcionen tanto en un repositorio de proyecto como en uno tipo `usuario.github.io`.
- El archivo `.nojekyll` evita que GitHub Pages procese el sitio con Jekyll.
