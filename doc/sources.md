# Sources de données

## https://data.geo.admin.ch

Cette route permet de trouver les "assets" des couches liées au NPA :

https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo-vd.ortschaftenverzeichnis_plz/items

On peux trouver cette entrée qui contient le csv zippé avec toutes les données utiles pour nos entités :

```json
{
  "assets": {
    "ortschaftenverzeichnis_plz_4326.csv.zip": {
      "type": "application/x.csv+zip",
      "href": "https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_4326.csv.zip",
      "created": "2023-05-17T05:30:59.121922Z",
      "updated": "2026-03-01T03:14:24.717956Z",
      "proj:epsg": 4326,
      "checksum:multihash": "12209DE52BDA4BB2805EBBDDD6989536F96DA0572F7C504C39328E3572278210F43D"
    }
  }
}
```

## https://sms.bfs.admin.ch/

Cette source fournis les cantons, admin (district) et communes de Suisse sous forme d'un fichier CSV hiérarchisé.
