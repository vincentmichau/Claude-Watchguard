# 📚 Documentation API - Night Watch

## Base URL
```
Production: https://api.nightwatch.com
Development: http://localhost:5000/api
```

## Authentication

Toutes les routes (sauf `/auth/login`) nécessitent un JWT token dans le header:
```
Authorization: Bearer <access_token>
```

### Refresh Token
Si le token expire (401), utiliser le refresh token pour obtenir un nouveau token.

## Routes

### 🔐 Authentication

#### POST /auth/login
Connexion utilisateur

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "night_watch"
  }
}
```

#### POST /auth/refresh
Rafraîchir le token

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST /auth/logout
Déconnexion

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### GET /auth/me
Obtenir l'utilisateur actuel

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "night_watch",
  "created_at": "2024-01-01T00:00:00.000Z",
  "last_login": "2024-01-15T10:30:00.000Z"
}
```

---

### 📄 Reports

#### GET /reports
Liste des rapports avec filtres

**Query Parameters:**
- `status`: draft | validated | sent
- `siteId`: number
- `startDate`: ISO date
- `endDate`: ISO date

**Response:**
```json
[
  {
    "id": 1,
    "shift_id": 10,
    "user_id": 5,
    "site_id": 2,
    "title": "Rapport de nuit - 15/01",
    "summary": "Nuit calme, aucun incident",
    "status": "validated",
    "site_name": "Site A",
    "client_name": "Client X",
    "validated_at": "2024-01-15T08:00:00.000Z",
    "created_at": "2024-01-15T06:00:00.000Z"
  }
]
```

#### GET /reports/:id
Détail d'un rapport avec événements et photos

**Response:**
```json
{
  "id": 1,
  "title": "Rapport de nuit",
  "summary": "Résumé...",
  "status": "validated",
  "site_name": "Site A",
  "site_logo": "https://...",
  "client_name": "Client X",
  "client_logo": "https://...",
  "events": [
    {
      "id": 1,
      "type": "incident",
      "severity": "medium",
      "title": "Alarme déclenchée",
      "description": "Alarme zone B",
      "location": "Bâtiment 2",
      "event_time": "2024-01-15T02:30:00.000Z"
    }
  ],
  "photos": [
    {
      "id": 1,
      "file_name": "photo.jpg",
      "file_size": 1024000,
      "uploaded_at": "2024-01-15T03:00:00.000Z"
    }
  ]
}
```

#### POST /reports
Créer un rapport

**Request:**
```json
{
  "shiftId": 10,
  "title": "Rapport de nuit",
  "summary": "Nuit calme"
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Rapport créé avec succès"
}
```

#### PUT /reports/:id
Modifier un rapport (seulement si status = draft)

**Request:**
```json
{
  "title": "Nouveau titre",
  "summary": "Nouveau résumé"
}
```

#### POST /reports/:id/validate
Valider un rapport (le rend non-modifiable)

**Response:**
```json
{
  "message": "Rapport validé avec succès"
}
```

#### DELETE /reports/:id
Supprimer un rapport (seulement si status = draft)

---

### 🎯 Events

#### POST /events
Créer un événement

**Request:**
```json
{
  "reportId": 1,
  "type": "incident",
  "severity": "high",
  "title": "Intrusion détectée",
  "description": "Mouvement détecté zone C",
  "location": "Parking",
  "eventTime": "2024-01-15T03:00:00.000Z"
}
```

**Types:** incident | observation | maintenance | other
**Severity:** low | medium | high | critical

#### PUT /events/:id
Modifier un événement

#### DELETE /events/:id
Supprimer un événement

#### GET /events/report/:reportId
Liste des événements d'un rapport

---

### 📅 Shifts

#### GET /shifts
Liste des shifts

**Query Parameters:**
- `userId`: number
- `siteId`: number
- `startDate`: ISO date
- `endDate`: ISO date

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "site_id": 2,
    "start_time": "2024-01-15T22:00:00.000Z",
    "end_time": "2024-01-16T06:00:00.000Z",
    "status": "completed",
    "site_name": "Site A",
    "user_email": "veilleur@example.com"
  }
]
```

#### POST /shifts
Créer un shift (admin/manager only)

**Request:**
```json
{
  "userId": 5,
  "siteId": 2,
  "startTime": "2024-01-15T22:00:00.000Z",
  "endTime": "2024-01-16T06:00:00.000Z",
  "notes": "Notes optionnelles"
}
```

#### PUT /shifts/:id
Modifier un shift

#### DELETE /shifts/:id
Supprimer un shift

#### POST /shifts/sync-combo
Synchroniser avec Combo HR API

**Response:**
```json
{
  "message": "15 shifts importés depuis Combo",
  "imported": 15
}
```

#### GET /shifts/export/ical
Exporter le planning en format iCal

**Query Parameters:**
- `userId`: number (optionnel)

**Response:** Fichier .ics téléchargeable

---

### 📸 Photos

#### POST /photos/upload
Upload une photo

**Request:** multipart/form-data
- `photo`: file
- `reportId`: number
- `eventId`: number (optionnel)

**Formats acceptés:** JPG, PNG, WEBP
**Taille max:** 5MB

**Response:**
```json
{
  "id": 1,
  "fileName": "photo.jpg",
  "fileSize": 1024000,
  "message": "Photo téléchargée"
}
```

#### GET /photos/:id
Télécharger une photo

**Response:** Image file

#### DELETE /photos/:id
Supprimer une photo

---

### 📄 PDF

#### GET /pdf/generate/:reportId
Générer et télécharger un PDF

**Response:** PDF file

#### POST /pdf/send/:reportId
Envoyer le rapport par email

**Response:**
```json
{
  "message": "Email envoyé avec succès",
  "recipients": 3
}
```

---

### 👥 Admin - Users

#### GET /admin/users
Liste des utilisateurs (admin only)

#### POST /admin/users
Créer un utilisateur (admin only)

**Request:**
```json
{
  "email": "new@example.com",
  "password": "Password123!",
  "role": "night_watch",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Roles:** admin | manager | night_watch

#### PUT /admin/users/:id
Modifier un utilisateur

**Request:**
```json
{
  "role": "manager",
  "isActive": true
}
```

#### DELETE /admin/users/:id
Supprimer un utilisateur

---

### 🏢 Admin - Clients & Sites

#### GET /admin/clients
Liste des clients

#### POST /admin/clients
Créer un client

**Request:**
```json
{
  "name": "Client A",
  "logoUrl": "https://...",
  "contactEmail": "contact@client-a.com"
}
```

#### PUT /admin/clients/:id
Modifier un client

#### GET /admin/sites
Liste des sites

#### POST /admin/sites
Créer un site

**Request:**
```json
{
  "clientId": 1,
  "name": "Site Paris Nord",
  "logoUrl": "https://...",
  "address": "123 Rue Example, 75001 Paris",
  "contactName": "Marie Dupont",
  "contactPhone": "+33 1 23 45 67 89"
}
```

#### PUT /admin/sites/:id
Modifier un site

---

### 📧 Admin - Email Recipients

#### GET /admin/recipients
Liste des destinataires d'emails

**Query Parameters:**
- `siteId`: number
- `clientId`: number

#### POST /admin/recipients
Ajouter un destinataire

**Request:**
```json
{
  "siteId": 1,
  "email": "recipient@example.com",
  "name": "Jean Martin",
  "type": "primary"
}
```

**Types:** primary | cc | bcc

---

## Error Responses

Toutes les erreurs suivent ce format:

```json
{
  "error": "Message d'erreur descriptif"
}
```

### Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (token invalide/expiré)
- `403` - Forbidden (permissions insuffisantes)
- `404` - Not Found
- `413` - Payload Too Large
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Rate Limiting

- **Routes générales:** 100 requêtes / 15 minutes
- **Login:** 5 tentatives / 15 minutes

En cas de dépassement:
```json
{
  "error": "Trop de requêtes, veuillez réessayer plus tard."
}
```

---

## WebSocket Events (Chat)

### Connection
```javascript
socket.emit('authenticate', { userId: 1 });
```

### Send Message
```javascript
socket.emit('send_message', {
  recipientId: 2,
  message: "Bonjour",
  siteId: 1  // optional
});
```

### Receive Message
```javascript
socket.on('new_message', (data) => {
  console.log(data);
  // {
  //   id: 1,
  //   senderId: 2,
  //   message: "Bonjour",
  //   sentAt: "2024-01-15T10:00:00.000Z"
  // }
});
```

### Typing Indicator
```javascript
socket.emit('typing', { recipientId: 2 });
socket.emit('stop_typing', { recipientId: 2 });
```

### Get History
```javascript
socket.emit('get_messages', {
  recipientId: 2,
  limit: 50
});

socket.on('messages_history', (messages) => {
  console.log(messages);
});
```

---

## Best Practices

1. **Toujours vérifier le status du rapport** avant modification
2. **Utiliser le refresh token** pour éviter les déconnexions
3. **Valider les données côté client** avant envoi
4. **Gérer les erreurs 401** pour rediriger vers login
5. **Respecter le rate limiting** pour éviter les blocages

---

## Support

Pour toute question: support@nightwatch.com
Documentation complète: https://docs.nightwatch.com
