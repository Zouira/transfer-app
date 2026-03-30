# Transfer Alert System v2.0

Application de gestion de transferts pour Marrakech.

## Installation

```bash
npm install
npm start
```

## Variables d'environnement

- `TWILIO_SID` - Twilio Account SID
- `TWILIO_TOKEN` - Twilio Auth Token  
- `TWILIO_PHONE` - Numéro Twilio
- `TWILIO_WHATSAPP` - Numéro WhatsApp Twilio
- `JWT_SECRET` - Clé secrète JWT
- `BASE_URL` - URL de l'application
- `PORT` - Port (3000 par défaut)

## Identifiants par défaut
- Username: admin
- Password: admin123

## Fonctionnalités
- Authentification JWT
- Gestion des chauffeurs
- Gestion des transferts
- Notifications WhatsApp automatiques
- Dashboard statistiques
- Export CSV
- Page de suivi client
