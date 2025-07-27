#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Installation des dépendances ---
echo "--- Installing backend dependencies ---"
cd backend
npm install --quiet --no-progress
npm install dotenv
npm audit fix --force
cd ..

echo "--- Installing frontend dependencies ---"
cd frontend
npm install --quiet --no-progress
npx tsc
npm audit fix --force
cd ..

echo "--- Configuring .env file ---"
ENV_FILE="backend/.env"

# Le build échouera si le fichier .env ou le SESSION_SECRET sont manquants.
if [ ! -f "$ENV_FILE" ]; then
  echo "ERREUR: Fichier $ENV_FILE manquant. Il doit être créé avant le build." >&2
  exit 1
fi

# Fonction pour ajouter une variable si elle n'existe pas
add_var_if_missing() {
  local key="$1"
  local value="$2"
  # `tr -d '\r'` supprime les caractères de retour chariot de Windows avant que grep ne lise le fichier.
  if ! grep -q -E "^${key}=" <(tr -d '\r' < "$ENV_FILE"); then
    echo "Adding ${key} to .env file..."
    echo "${key}=${value}" >> "$ENV_FILE"
  else
    echo "Variable ${key} already exists in .env file. Skipping."
  fi
}

# Vérifier la présence de SESSION_SECRET
if ! grep -q -E "^SESSION_SECRET=" <(tr -d '\r' < "$ENV_FILE"); then
    echo "ERREUR: Variable SESSION_SECRET manquante dans $ENV_FILE." >&2
    exit 1
fi
echo "SESSION_SECRET found."

# --- Ajout des variables manquantes (si nécessaire) ---
add_var_if_missing "PORT" "3000"
add_var_if_missing "URL_ALLOWED" "https://localhost:3000, https://127.0.0.1:3000"
add_var_if_missing "IP" "127.0.0.1"

echo "--- .env configuration finished ---"

# --- DEBUGGING STEP: AFFICHER LE CONTENU FINAL DU FICHIER .env ---
echo "--- Final content of $ENV_FILE (as seen by the script): ---"
cat "$ENV_FILE"
echo "---------------------------------------------------------"
