# Quick Start Guide

## System Status

✅ **All services running**  
✅ **Database reset to clean state**  
✅ **Test user ready**

---

## Access the System

### 1. Open Browser
```
http://localhost:3000
```

### 2. Login Credentials
```
Email: test@demo.com
Password: test123
```

---

## Testing Scenarios

### Scenario 1: First Login (Baseline Establishment)
1. Login with test@demo.com / test123
2. ✅ Should login directly (no MFA)
3. System learns: Your IP, device, location

### Scenario 2: Second Login (Same Device)
1. Logout and login again
2. ✅ Should login directly (no MFA)
3. System recognizes: Known IP + device

### Scenario 3: VPN Login (Different IP)
1. Connect to VPN
2. Login with test@demo.com / test123
3. ⚠️ **MFA REQUIRED** (unknown IP detected)
4. Check backend terminal for OTP code:
   ```
   🔐 OTP for test@demo.com: 123456
   ```
5. Enter code on MFA page
6. ✅ Login successful

### Scenario 4: New Device
1. Open incognito/private window
2. Login with test@demo.com / test123
3. ⚠️ **MFA REQUIRED** (unknown device detected)

---

## What to Observe

### Dashboard
- Login statistics
- Recent activity
- ML model metrics

### Login History
- All login attempts
- ML anomaly scores
- Geolocation data

### Alerts
- Security alerts when MFA triggered
- Anomaly reasons
- Severity levels

---

## ML Model Behavior

### ✅ Allows Login (No MFA)
- First login (establishing baseline)
- Known IP + Known device
- Recent successful login (< 30 min)
- ML score > -0.35

### ⚠️ Requires MFA
- Unknown IP address
- Unknown device
- Unknown country
- Late night login (1am-5am)
- Multiple failed attempts
- ML score < -0.35

---

## Reset Database

To start fresh:
```bash
cd backend
node reset_to_test_user.js
```

This will:
- Delete all login history
- Delete all alerts
- Delete all profiles
- Keep only test@demo.com user

---

## Troubleshooting

### Can't Login
- Check credentials: test@demo.com / test123
- Check backend is running (port 5000)
- Check MongoDB is running

### MFA Code Not Showing
- Check backend terminal for OTP
- Look for: `🔐 OTP for test@demo.com: XXXXXX`

### ML Model Not Working
- Check ML engine is running (port 8000)
- Check backend logs for ML service connection

---

## Services

| Service | Port | Status |
|---------|------|--------|
| Frontend | 3000 | ✅ Running |
| Backend | 5000 | ✅ Running |
| ML Engine | 8000 | ✅ Running |
| MongoDB | 27017 | ✅ Running |

---

## Next Steps

1. ✅ Test normal login flow
2. ✅ Test VPN/different IP
3. ✅ Check ML scores in login history
4. ✅ Review anomaly alerts
5. ✅ Explore dashboard metrics

---

**Ready to test!** 🚀
