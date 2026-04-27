# Project Structure - Clean & Production Ready

## Root Directory

```
anomaly-system/
├── backend/                    # Node.js Express Backend
├── frontend/                   # React Frontend
├── ml_engine/                  # Python ML Service
├── CLEANUP_SUMMARY.md          # Database cleanup documentation
├── FINAL_PROJECT_REPORT.md     # Complete project report
├── QUICK_START.md              # Quick start guide
└── PROJECT_STRUCTURE.md        # This file
```

---

## Backend Structure

```
backend/
├── config/
│   ├── database.js             # MongoDB connection
│   └── jwt.js                  # JWT token utilities
│
├── controllers/
│   ├── alertController.js      # Alert management
│   ├── anomalyController.js    # Anomaly detection logic
│   ├── authController.js       # Authentication & MFA
│   └── userController.js       # User management
│
├── middleware/
│   ├── authMiddleware.js       # JWT authentication
│   ├── deviceParser.js         # Device fingerprinting
│   ├── errorMiddleware.js      # Error handling
│   └── rateLimiter.js          # Rate limiting
│
├── models/
│   ├── AnomalyAlert.js         # Alert schema
│   ├── LoginEvent.js           # Login event schema
│   ├── User.js                 # User schema
│   └── UserProfile.js          # Behavioral profile schema
│
├── routes/
│   ├── alertRoutes.js          # Alert endpoints
│   ├── anomalyRoutes.js        # Anomaly endpoints
│   ├── authRoutes.js           # Auth endpoints
│   └── userRoutes.js           # User endpoints
│
├── services/
│   ├── emailService.js         # Email notifications
│   ├── mlService.js            # ML API client
│   └── realDataCollector.js   # Geolocation & device data
│
├── .env                        # Environment variables
├── .env.example                # Environment template
├── package.json                # Dependencies
├── reset_to_test_user.js       # Database reset utility
└── server.js                   # Express app entry point
```

---

## Frontend Structure

```
frontend/
├── public/
│   └── index.html              # HTML template
│
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── Layout.jsx      # Main layout with sidebar
│   │
│   ├── context/
│   │   └── AuthContext.js      # Global auth state
│   │
│   ├── pages/
│   │   ├── AdminPage.jsx       # Admin panel
│   │   ├── AlertsPage.jsx      # Security alerts
│   │   ├── DashboardPage.jsx   # Main dashboard
│   │   ├── LoginHistoryPage.jsx # Login history
│   │   ├── LoginPage.jsx       # Login form
│   │   ├── MfaPage.jsx         # MFA verification
│   │   └── RegisterPage.jsx    # Registration form
│   │
│   ├── services/
│   │   └── api.js              # Axios API client
│   │
│   ├── App.js                  # Main app component
│   ├── index.css               # Global styles
│   └── index.js                # React entry point
│
├── .env                        # Environment variables
├── .env.example                # Environment template
└── package.json                # Dependencies
```

---

## ML Engine Structure

```
ml_engine/
├── models/
│   └── user_*.pkl              # Trained model files (generated)
│
├── enhanced_model.py           # Main ML service (Flask API)
├── realistic_test.py           # 100-event test script
└── requirements.txt            # Python dependencies
```

---

## Key Files Explained

### Backend

**server.js**
- Express app initialization
- Middleware setup
- Route mounting
- MongoDB connection
- Server startup

**authController.js**
- User registration
- Login with ML scoring
- MFA verification
- Real IP detection
- Device fingerprinting

**mlService.js**
- ML API client
- Feature vector preparation
- Score interpretation
- Error handling

**realDataCollector.js**
- Geolocation via IP-API
- Device fingerprinting
- IP reputation checking
- Distance calculations

### Frontend

**LoginPage.jsx**
- Login form
- Real IP detection display
- Demo credentials
- Device info collection

**DashboardPage.jsx**
- Login statistics
- Recent activity
- ML model metrics
- System health

**AuthContext.js**
- Global auth state
- Token management
- User data storage
- Protected routes

### ML Engine

**enhanced_model.py**
- Flask API server
- Isolation Forest + K-Means
- Feature extraction
- Model training
- Anomaly scoring
- Performance metrics

**realistic_test.py**
- 100-event test suite
- Diverse scenarios
- Performance evaluation
- Metrics calculation

---

## Essential Files Only

All unnecessary files have been removed:
- ❌ Test scripts (check_users.js, create_users.js, etc.)
- ❌ Old ML scripts (quick_test_50.py, train_and_test.py)
- ❌ Empty folders (visualizations, scripts)
- ❌ Python cache (__pycache__)
- ❌ VSCode settings (.vscode)
- ❌ Clear/utility scripts

---

## File Count Summary

```
Backend:
  - Core files: 6 (server.js, .env, package.json, etc.)
  - Config: 2
  - Controllers: 4
  - Middleware: 4
  - Models: 4
  - Routes: 4
  - Services: 3
  Total: 27 files

Frontend:
  - Core files: 5 (App.js, index.js, package.json, etc.)
  - Pages: 7
  - Components: 1
  - Services: 1
  - Context: 1
  Total: 15 files

ML Engine:
  - Core files: 3 (enhanced_model.py, realistic_test.py, requirements.txt)
  Total: 3 files

Documentation:
  - 4 markdown files

Grand Total: 49 essential files
```

---

## Production Ready

✅ Clean codebase  
✅ No unnecessary files  
✅ No comments  
✅ Organized structure  
✅ Clear separation of concerns  
✅ Ready for deployment  

---

**Last Updated**: April 27, 2026  
**Status**: Production Ready
