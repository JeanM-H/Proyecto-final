#!/bin/bash
cd "C:\Users\Administrator\Documents\ADSO\proyecto final"
git rm .nvmrc 2>/dev/null || true
git add railway.json package.json
git commit -m "Remover .nvmrc corrupto y simplificar railway.json"
git push origin master
