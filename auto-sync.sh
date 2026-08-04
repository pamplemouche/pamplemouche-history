#!/bin/bash

# Dossier du projet
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🔄 Auto-sync GitHub activé pour : $DIR"

# Écoute les modifications, créations et suppressions de fichiers
inotifywait -m -r -e close_write,moved_to,create,delete --exclude '\.git' "$DIR" | while read -r path action file; do
    echo "⚡ Modification détectée : $file ($action)"
    
    # Petite pause de 2 secondes pour éviter les commits trop rapprochés si tu sauvegardes souvent
    sleep 2
    
    # Git add, commit et push
    git add .
    git commit -m "Auto-save: $(date +'%Y-%m-%d %H:%M:%S')"
    git push origin main
    
    echo "✅ Synchronisé sur GitHub !"
done