#!/bin/bash

# 🚦 CityFlow Analytics - Script de Démarrage Rapide
# =================================================

set -e

echo "
🚦 ====================================
   CityFlow Analytics
   Dashboard Temps Réel - Setup
   ====================================
"

# Vérifier les prérequis
check_requirements() {
    echo "📋 Vérification des prérequis..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js n'est pas installé"
        echo "   Installer avec: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker n'est pas installé (optionnel pour développement)"
    fi
    
    echo "✅ Prérequis OK"
}

# Installation des dépendances
install_dependencies() {
    echo ""
    echo "📦 Installation des dépendances npm..."
    npm install
    echo "✅ Dépendances installées"
}

# Créer les répertoires nécessaires
setup_directories() {
    echo ""
    echo "📁 Création des répertoires..."
    mkdir -p public
    mkdir -p mosquitto/data
    mkdir -p mosquitto/log
    echo "✅ Répertoires créés"
}

# Copier le dashboard dans public
setup_dashboard() {
    echo ""
    echo "🎨 Configuration du dashboard..."
    cp cityflow-dashboard.html public/index.html
    echo "✅ Dashboard configuré"
}

# Démarrer le serveur en mode développement
start_dev() {
    echo ""
    echo "🚀 Démarrage du serveur en mode développement..."
    echo ""
    echo "   Dashboard: http://localhost:8080"
    echo "   API Health: http://localhost:8080/api/health"
    echo ""
    echo "   Appuyez sur Ctrl+C pour arrêter"
    echo ""
    node backend-server.js
}

# Démarrer avec Docker Compose
start_docker() {
    echo ""
    echo "🐳 Démarrage avec Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose n'est pas installé"
        exit 1
    fi
    
    docker-compose up -d
    
    echo ""
    echo "✅ Services démarrés:"
    echo "   - Dashboard: http://localhost:8080"
    echo "   - Grafana: http://localhost:3000 (admin/admin)"
    echo "   - Prometheus: http://localhost:9090"
    echo ""
    echo "   Logs: docker-compose logs -f"
    echo "   Arrêt: docker-compose down"
}

# Menu principal
main() {
    check_requirements
    
    echo ""
    echo "Choisissez le mode de démarrage:"
    echo "1) Mode Développement (Node.js local)"
    echo "2) Mode Production (Docker Compose)"
    echo "3) Installation uniquement"
    echo "4) Quitter"
    echo ""
    read -p "Votre choix (1-4): " choice
    
    case $choice in
        1)
            install_dependencies
            setup_directories
            setup_dashboard
            start_dev
            ;;
        2)
            start_docker
            ;;
        3)
            install_dependencies
            setup_directories
            setup_dashboard
            echo ""
            echo "✅ Installation terminée!"
            echo "   Démarrer avec: npm start"
            ;;
        4)
            echo "Au revoir! 👋"
            exit 0
            ;;
        *)
            echo "❌ Choix invalide"
            exit 1
            ;;
    esac
}

# Lancer le script
main
