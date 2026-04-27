const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const UserProfile = require('../models/UserProfile');
const AnomalyAlert = require('../models/AnomalyAlert');
const { generateToken } = require('../config/jwt');
const { scoreLogin } = require('../services/mlService');
const { sendAnomalyAlert, sendMfaCode } = require('../services/emailService');
const RealDataCollector = require('../services/realDataCollector');
const realDataCollector = new RealDataCollector();
const getRealLoginData = async (ip, userAgent, acceptLanguage = '') => {
  try {
    const geoLocation = await realDataCollector.getRealGeolocation(ip);
    const deviceInfo = realDataCollector.generateDeviceFingerprint(userAgent, ip, acceptLanguage);
    const ipReputation = await realDataCollector.checkIPReputation(ip);
    return {
      geoLocation: {
        country: geoLocation.country || 'Unknown',
        country_name: geoLocation.country_name || 'Unknown',
        city: geoLocation.city || 'Unknown',
        latitude: geoLocation.latitude || 0,
        longitude: geoLocation.longitude || 0,
        timezone: geoLocation.timezone || 'Unknown',
        is_proxy: geoLocation.is_proxy || false,
        isp: geoLocation.isp || 'Unknown'
      },
      deviceInfo: {
        fingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        browser_version: deviceInfo.browser_version,
        os: deviceInfo.os,
        os_version: deviceInfo.os_version,
        device_type: deviceInfo.device_type,
        is_mobile: deviceInfo.is_mobile,
        is_tablet: deviceInfo.is_tablet,
        is_pc: deviceInfo.is_pc
      },
      ipReputation: ipReputation
    };
  } catch (error) {
    console.error('Real data collection failed:', error);
    return {
      geoLocation: {
        country: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC'
      },
      deviceInfo: {
        fingerprint: 'unknown',
        browser: 'Unknown',
        device_type: 'desktop'
      },
      ipReputation: 100
    };
  }
};
const updateUserProfile = async (userId, loginEvent) => {
  let profile = await UserProfile.findOne({ userId });
  if (!profile) profile = new UserProfile({ userId });
  profile.totalLogins += 1;
  profile.lastLogin = loginEvent.timestamp;
  profile.hourHistogram[loginEvent.hourOfDay] =
    (profile.hourHistogram[loginEvent.hourOfDay] || 0) + 1;
  profile.dayHistogram[loginEvent.dayOfWeek] =
    (profile.dayHistogram[loginEvent.dayOfWeek] || 0) + 1;
  const ipToStore = loginEvent.realExternalIP || loginEvent.ipAddress;
  const ipEntry = profile.knownIPs.find(e => e.ip === ipToStore);
  if (ipEntry) {
    ipEntry.count++;
    ipEntry.lastSeen = new Date();
  } else {
    profile.knownIPs.push({ ip: ipToStore, count: 1, lastSeen: new Date() });
    if (profile.knownIPs.length > 10) {
      profile.knownIPs.sort((a, b) => b.count - a.count);
      profile.knownIPs = profile.knownIPs.slice(0, 10);
    }
  }
  const country = loginEvent.geoLocation?.country;
  if (country && country !== 'Unknown') {
    const ce = profile.knownCountries.find(e => e.country === country);
    if (ce) ce.count++;
    else profile.knownCountries.push({ country, count: 1 });
  }
  const fp = loginEvent.deviceFingerprint;
  const devEntry = profile.knownDevices.find(e =>
    (fp && e.fingerprint && e.fingerprint === fp) ||
    (!fp && e.browser === loginEvent.browser && e.os === loginEvent.os)
  );
  if (devEntry) {
    devEntry.count++;
    devEntry.lastSeen = new Date();
  } else {
    profile.knownDevices.push({
      fingerprint: fp || null,
      userAgent: loginEvent.userAgent,
      browser: loginEvent.browser,
      os: loginEvent.os,
      deviceType: loginEvent.deviceType,
      count: 1,
      lastSeen: new Date(),
    });
    if (profile.knownDevices.length > 5) {
      profile.knownDevices.sort((a, b) => b.count - a.count);
      profile.knownDevices = profile.knownDevices.slice(0, 5);
    }
  }
  if (profile.totalLogins >= 30 && !profile.modelTrained) {
    profile.modelTrained = true;
    profile.lastModelUpdate = new Date();
  }
  profile.updatedAt = new Date();
  await profile.save();
  return profile;
};
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email: email.toLowerCase(), password });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    console.log(`🔍 Login attempt for: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +mfaCode +mfaExpires');
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    console.log(`✅ User found: ${user.email}`);
    if (user.isSuspended) {
      console.log(`❌ User suspended: ${user.email}`);
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });
    }
    console.log(`🔍 Login attempt: ${email}`);
    console.log(`🔍 User found: ${user ? 'YES' : 'NO'}`);
    console.log(`🔍 Testing password...`);
    const isMatch = await user.matchPassword(password);
    console.log(`🔍 Password match: ${isMatch}`);
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const devBypassMfa = isDev && String(process.env.DEV_SIMULATION_BYPASS_MFA || '').toLowerCase() === 'true'
      && String(req.headers['x-dev-bypass-mfa'] || '').toLowerCase() === 'true';
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                 (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
                 req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 '127.0.0.1';  // Final fallback
    let realIP = ip;
    const simulatedIpHeader = req.headers['x-simulated-ip'];
    if (isDev && typeof simulatedIpHeader === 'string' && simulatedIpHeader.trim()) {
      realIP = simulatedIpHeader.trim();
    }
    const usingSimulatedIp = isDev && typeof simulatedIpHeader === 'string' && simulatedIpHeader.trim();
    if (!usingSimulatedIp && (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.'))) {
        try {
            const axios = require('axios');
            const externalIPResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
            if (externalIPResponse.data && externalIPResponse.data.ip) {
                realIP = externalIPResponse.data.ip;
                console.log(`🌍 Using real external IP: ${realIP} instead of localhost: ${ip}`);
            }
        } catch (error) {
            console.log('⚠️  Could not get external IP, using:', ip);
            realIP = ip;
        }
    }
    const userAgent = req.deviceInfo?.userAgent || req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const realData = await getRealLoginData(realIP, userAgent, acceptLanguage);
    const loginEvent = await LoginEvent.create({
      userId:     user._id,
      email:      user.email,
      ipAddress:  ip,                    // Original request IP
      realExternalIP: realIP,           // Real external IP (if different)
      userAgent:  userAgent,
      deviceType: realData.deviceInfo.device_type,
      browser:    realData.deviceInfo.browser,
      os:         realData.deviceInfo.os,
      deviceFingerprint: realData.deviceInfo.fingerprint,  // Save device fingerprint!
      ipReputation: realData.ipReputation,
      geoLocation: realData.geoLocation,
      success:    isMatch,
      failReason: isMatch ? '' : 'wrong_password',
      isLocalhost: ip !== realIP,     // Track if localhost was detected
      ipDetectionMethod: isDev && typeof simulatedIpHeader === 'string' && simulatedIpHeader.trim()
        ? 'simulated_header'
        : (ip === realIP ? 'direct' : 'external_api')
    });
    if (!isMatch) {
      console.log(`❌ Password mismatch for: ${user.email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    console.log(`✅ Password matched for: ${user.email}`);
    const profile = await UserProfile.findOne({ userId: user._id });
    let mlResult = { score: null, isAnomaly: false, severity: 'none', reasons: [] };
    let mlContext = { isKnownIp: null, isKnownDevice: null, isKnownCountry: null, modelType: null };
    try {
      const userHistory = await LoginEvent.find({
        userId: user._id,
        success: true,
      }).sort({ timestamp: -1 }).limit(50);
      const previousLogins = await LoginEvent.find({
        userId: user._id,
        success: true,
      }).sort({ timestamp: -1 }).limit(5);
      let geoAnomaly = 0;
      if (previousLogins.length > 0) {
        const lastLogin = previousLogins[0];
        const lastGeo = lastLogin.geoLocation || lastLogin.geo_location;
        console.log('🔍 Debug - lastGeo:', lastGeo);
        console.log('🔍 Debug - realData.geoLocation:', realData.geoLocation);
        if (lastGeo && lastGeo.latitude && lastGeo.longitude &&
            realData.geoLocation && realData.geoLocation.latitude && realData.geoLocation.longitude) {
          const distance = realDataCollector.haversineDistance(
            lastGeo.latitude, lastGeo.longitude,
            realData.geoLocation.latitude, realData.geoLocation.longitude
          );
          if (distance < 100) geoAnomaly = 0.0;      // < 100km
          else if (distance < 500) geoAnomaly = 0.3;   // 100-500km
          else if (distance < 2000) geoAnomaly = 0.6;  // 500-2000km
          else geoAnomaly = 1.0;                        // > 2000km
          console.log(`🌍 Real distance: ${distance.toFixed(1)}km → Anomaly score: ${geoAnomaly}`);
        } else {
          console.log(`🌍 Insufficient geo data for anomaly calculation`);
        }
      }
      const temporalAnomaly = realDataCollector.calculateTemporalAnomaly(
        new Date(),
        userHistory
      );
      const velocityAnomaly = userHistory.length > 0 ?
        realDataCollector.calculateVelocityAnomaly(
          { geoLocation: realData.geoLocation, timestamp: new Date() },
          userHistory[0]
        ) : 0.0;
      const knownIPs = profile?.knownIPs || [];
      const knownDevices = profile?.knownDevices || [];
      const knownCountries = profile?.knownCountries || [];
      const isKnownIp = knownIPs.some(e => e.ip === realIP);
      const isKnownDevice = knownDevices.some(d => d.fingerprint === realData.deviceInfo.fingerprint);
      const isKnownCountry = knownCountries.some(c => c.country === (realData.geoLocation?.country || ''));
      mlContext = {
        isKnownIp,
        isKnownDevice,
        isKnownCountry,
        modelType: null,
      };
      const pythonDayOfWeek = (typeof loginEvent.dayOfWeek === 'number')
        ? (loginEvent.dayOfWeek + 6) % 7
        : 0;
      const featureVector = {
        user_id:        user.email,
        hour_of_day:    loginEvent.hourOfDay,
        day_of_week:    pythonDayOfWeek,
        is_weekend:     pythonDayOfWeek >= 5 ? 1 : 0,
        is_known_ip:    isKnownIp ? 1 : 0,
        is_known_device: isKnownDevice ? 1 : 0,
        is_known_country: isKnownCountry ? 1 : 0,
        latitude:       realData.geoLocation?.latitude || 0,
        longitude:      realData.geoLocation?.longitude || 0,
        inter_login_minutes: userHistory.length > 0 ?
          (new Date() - new Date(userHistory[0].timestamp)) / (1000 * 60) : 60,
        failed_attempts_before: await LoginEvent.countDocuments({
          userId: user._id,
          success: false,
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
        real_external_ip: realIP,
        is_localhost_detected: ip !== realIP,
      };
      mlResult = await scoreLogin(featureVector);
      mlContext.modelType = mlResult.modelType || null;
      if (geoAnomaly > 0.5) {
        const lastLogin = previousLogins[0];
        const lastGeo = lastLogin.geoLocation || lastLogin.geo_location;
        if (lastGeo && lastGeo.latitude && lastGeo.longitude) {
          const distance = realDataCollector.haversineDistance(
            lastGeo.latitude, lastGeo.longitude,
            realData.geoLocation.latitude, realData.geoLocation.longitude
          );
          const lastCity = lastGeo.city || 'Unknown';
          const currentCity = realData.geoLocation?.city || 'Unknown';
          const currentCountry = realData.geoLocation?.country || 'Unknown';
          mlResult.reasons.push(`Unusual location: ${currentCity}, ${currentCountry} (${distance.toFixed(1)}km from ${lastCity})`);
        } else {
          const currentCity = realData.geoLocation?.city || 'Unknown';
          const currentCountry = realData.geoLocation?.country || 'Unknown';
          mlResult.reasons.push(`Unusual location: ${currentCity}, ${currentCountry}`);
        }
      }
      if (temporalAnomaly > 0.5) {
        mlResult.reasons.push(`Unusual login time: ${loginEvent.hourOfDay}:00`);
      }
      if (velocityAnomaly > 0.5) {
        mlResult.reasons.push(`Impossible travel velocity detected`);
      }
      if (realData.ipReputation < 50) {
        mlResult.reasons.push(`Suspicious IP reputation: ${realData.ipReputation}%`);
      }
      if (ip !== realIP) {
        mlResult.reasons.push(`Real IP detected: ${realIP} (was ${ip})`);
      }
    } catch (error) {
      console.error('❌ Error in ML scoring:', error);
      mlResult = { score: null, isAnomaly: false, severity: 'none', reasons: ['ML processing error'] };
    }
    try {
      loginEvent.anomalyScore    = mlResult.score;
      loginEvent.isAnomaly       = mlResult.isAnomaly;
      loginEvent.anomalySeverity = mlResult.severity;
      loginEvent.anomalyReasons  = mlResult.reasons;
      loginEvent.mlProcessed     = true;
      await loginEvent.save();
      console.log(`💾 Login event saved: ID=${loginEvent._id}, DeviceFP=${loginEvent.deviceFingerprint}, RealIP=${loginEvent.realExternalIP}`);
    } catch (saveError) {
      console.error('❌ Error saving login event:', saveError);
    }
    const HIGH = parseFloat(process.env.HIGH_SEVERITY_THRESHOLD || '-0.40');
    const LOW  = parseFloat(process.env.ANOMALY_THRESHOLD       || '-0.15');
    console.log(`🔍 Checking for legitimate repeat login for ${user.email}`);
    console.log(`📊 Real IP: ${realIP}`);
    console.log(`📊 Local IP: ${ip}`);
    console.log(`📊 Device Fingerprint: ${realData.deviceInfo.fingerprint}`);
    console.log(`📊 ML Score: ${mlResult.score}`);
    console.log(`📊 Is Anomaly: ${mlResult.isAnomaly}`);
    console.log(`📊 ML Context: isKnownIp=${mlContext.isKnownIp}, isKnownDevice=${mlContext.isKnownDevice}, isKnownCountry=${mlContext.isKnownCountry}`);
    const allRecentLogins = await LoginEvent.find({
      userId: user._id,
      success: true,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(10);
    console.log(`📊 Found ${allRecentLogins.length} total recent logins for this user:`);
    allRecentLogins.forEach((login, index) => {
      console.log(`  ${index + 1}. IP: ${login.ipAddress}, RealIP: ${login.realExternalIP || 'N/A'}, Device: ${login.deviceFingerprint || 'N/A'}, Anomaly: ${login.isAnomaly}, Score: ${login.anomalyScore}`);
    });
    const recentLogins = await LoginEvent.find({
      userId: user._id,
      success: true,
      realExternalIP: realIP,  // ONLY check real external IP (not localhost)
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(5);
    console.log(`📊 Found ${recentLogins.length} recent logins with matching REAL IP (${realIP}):`);
    recentLogins.forEach((login, index) => {
      console.log(`  ${index + 1}. RealIP: ${login.realExternalIP || 'N/A'}, Device: ${login.deviceFingerprint || 'N/A'}, Anomaly: ${login.isAnomaly}, Score: ${login.anomalyScore}`);
    });
    const deviceLogins = await LoginEvent.find({
      userId: user._id,
      success: true,
      deviceFingerprint: realData.deviceInfo.fingerprint,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(5);
    console.log(`📊 Found ${deviceLogins.length} recent logins with same device fingerprint:`);
    deviceLogins.forEach((login, index) => {
      console.log(`  ${index + 1}. IP: ${login.ipAddress}, RealIP: ${login.realExternalIP || 'N/A'}, Device: ${login.deviceFingerprint || 'N/A'}, Anomaly: ${login.isAnomaly}, Score: ${login.anomalyScore}`);
    });
    const veryRecentLoginByIP = await LoginEvent.findOne({
      userId: user._id,
      success: true,
      realExternalIP: realIP,  // ONLY real IP
      timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
    }).sort({ timestamp: -1 });
    const veryRecentLoginByDevice = await LoginEvent.findOne({
      userId: user._id,
      success: true,
      deviceFingerprint: realData.deviceInfo.fingerprint,
      timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
    }).sort({ timestamp: -1 });
    const veryRecentLogin = veryRecentLoginByDevice || veryRecentLoginByIP;
    console.log(`📊 Very recent login found: ${veryRecentLogin ? 'YES' : 'NO'}`);
    if (veryRecentLogin) {
      console.log(`⏰ Recent login time: ${veryRecentLogin.timestamp}`);
      console.log(`⏰ Recent login IP: ${veryRecentLogin.realExternalIP}`);
    }
    const hasMatchingIPAndDevice = recentLogins.length > 0 && recentLogins.some(login => 
      login.deviceFingerprint === realData.deviceInfo.fingerprint
    );
    const hasSeenThisIP = recentLogins.length > 0;
    const hasDeviceHistory = deviceLogins.length > 0;
    console.log(`📊 Has matching IP+Device: ${hasMatchingIPAndDevice}`);
    console.log(`📊 Has seen this IP before: ${hasSeenThisIP}`);
    console.log(`📊 Has device history: ${hasDeviceHistory}`);
    const isRepeatLogin = hasSeenThisIP && recentLogins.length > 0;
    console.log(`📊 Is repeat login (has IP history): ${isRepeatLogin}`);
    console.log(`📊 Recent logins count: ${recentLogins.length}`);
    const isVeryRecent = veryRecentLogin !== null;
    console.log(`📊 Is very recent: ${isVeryRecent}`);
    console.log(`📊 Score >= threshold: ${mlResult.score !== null && mlResult.score >= LOW}`);
    const hasBaseline = !!profile && (profile.totalLogins || 0) > 0;
    if (!hasBaseline) {
      console.log(`✅ First login for ${user.email} - allowing to establish baseline`);
      console.log(`📊 Will save: IP=${realIP}, Device=${realData.deviceInfo.fingerprint}, Country=${realData.geoLocation?.country}`);
      await updateUserProfile(user._id, loginEvent);
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
      const token = generateToken(user._id);
      return res.json({
        success: true,
        requiresMfa: false,
        token,
        user: {
          id: user._id, name: user.name, email: user.email,
          role: user.role, lastLogin: user.lastLogin,
        },
        loginEvent: { id: loginEvent._id, score: mlResult.score, severity: 'none' },
      });
    }
    const unknownIpPolicy = hasBaseline && mlContext.isKnownIp === false;
    const shouldTriggerMfa =
      unknownIpPolicy ||
      mlResult.isAnomaly ||
      (mlResult.score === null && (mlContext.isKnownIp === false || mlContext.isKnownDevice === false));
    loginEvent.mlScore = mlResult.score;
    loginEvent.isAnomaly = mlResult.isAnomaly;
    await loginEvent.save();
    if (shouldTriggerMfa && !devBypassMfa) {
      console.log(`❌ MFA triggering conditions met for ${user.email}`);
      console.log(`📊 Reason: ${mlResult.isAnomaly ? 'ML marked as anomaly' : 'Unknown IP policy'}`);
      console.log(`📊 Condition check:`);
      console.log(`  - hasBaseline: ${hasBaseline}`);
      console.log(`  - isKnownIp: ${mlContext.isKnownIp}`);
      console.log(`  - isKnownDevice: ${mlContext.isKnownDevice}`);
      console.log(`  - isRepeatLogin: ${isRepeatLogin}`);
      console.log(`  - mlResult.isAnomaly: ${mlResult.isAnomaly}`);
      console.log(`  - mlResult.score: ${mlResult.score}`);
      const severity = mlResult.severity === 'high' ? 'high' : 'low';
        console.log(`⚠️ Anomaly detected - triggering MFA for ${user.email}`);
        console.log(`📊 Score: ${mlResult.score}, Severity: ${severity}`);
        console.log(`📊 Reasons: ${mlResult.reasons.join(', ')}`);
        const alert = await AnomalyAlert.create({
          userId:       user._id,
          loginEventId: loginEvent._id,
          severity,
          score:        mlResult.score,
          reasons:      mlResult.reasons,
          action:       severity === 'high' ? 'session_invalidated' : 'mfa_triggered',
          snapshot: {
            ipAddress: ip,
            country:   realData.geoLocation?.country || 'Unknown',
            city:      realData.geoLocation?.city || 'Unknown',
            device:    req.deviceInfo?.deviceType || 'unknown',
            browser:   req.deviceInfo?.browser    || 'unknown',
          },
        });
      if (severity === 'high') {
        const mfaCode = user.generateMfaCode();
        console.log(`\n🔐 OTP for ${user.email}: ${mfaCode}\n`);  // ← add this
        await user.save();
        await sendAnomalyAlert({
          to: user.email,
          userName: user.name,
          severity: 'high',
          loginDetails: {
            time:     new Date().toLocaleString(),
            ip,
            location: `${realData.geoLocation?.city || 'Unknown'}, ${realData.geoLocation?.country || 'Unknown'}`,
            device:   req.deviceInfo?.deviceType || 'unknown',
            browser:  req.deviceInfo?.browser    || 'unknown',
          },
          mfaCode,
        });
        return res.status(200).json({
          success: true,
          requiresMfa: true,
          mfaPending: true,
          severity: 'high',
          userId: user._id,
          message: 'Suspicious login detected. A verification code has been sent to your email.',
          alert: { id: alert._id, reasons: mlResult.reasons },
        });
      }
      const mfaCode = user.generateMfaCode();
      console.log(`\n🔐 OTP for ${user.email}: ${mfaCode}\n`);  
      await user.save();
      await sendMfaCode({ to: user.email, userName: user.name, code: mfaCode });
      return res.status(200).json({
        success: true,
        requiresMfa: true,
        mfaPending: true,
        severity: 'low',
        userId: user._id,
        message: 'Unusual login activity detected. Please verify with the code sent to your email.',
        alert: { id: alert._id, reasons: mlResult.reasons },
      });
    }
    if (shouldTriggerMfa && devBypassMfa) {
      console.log(`🧪 DEV MFA bypass active for ${user.email}`);
      loginEvent.mlScore = mlResult.score;
      loginEvent.isAnomaly = mlResult.isAnomaly;
      await loginEvent.save();
      await updateUserProfile(user._id, loginEvent);
    }
    if (isVeryRecent) {
      console.log(`✅ Very recent login detected - skipping MFA for ${user.email}`);
    } else if (isRepeatLogin) {
      console.log(`✅ Repeat login detected - skipping MFA for ${user.email}`);
    } else if (!mlResult.isAnomaly) {
      console.log(`✅ Clean ML score - skipping MFA for ${user.email}`);
      console.log(`📊 Score: ${mlResult.score}`);
    }
    await updateUserProfile(user._id, loginEvent);
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    const token = generateToken(user._id);
    res.json({
      success: true,
      requiresMfa: false,
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, lastLogin: user.lastLogin,
      },
      loginEvent: { id: loginEvent._id, score: mlResult.score, severity: 'none' },
    });
  } catch (err) {
    next(err);
  }
};
const verifyMfa = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, message: 'userId and code required' });
    }
    const user = await User.findById(userId).select('+mfaCode +mfaExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.mfaPending || !user.mfaCode) {
      return res.status(400).json({ success: false, message: 'No MFA pending for this user' });
    }
    if (new Date() > user.mfaExpires) {
      user.mfaPending = false; user.mfaCode = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: 'MFA code expired. Please log in again.' });
    }
    if (user.mfaCode !== code.toString().trim()) {
      return res.status(401).json({ success: false, message: 'Incorrect verification code' });
    }
    user.mfaPending  = false;
    user.mfaCode     = undefined;
    user.mfaExpires  = undefined;
    try {
      const latestLoginEvent = await LoginEvent.findOne({
        userId: user._id,
        success: true,
      }).sort({ timestamp: -1 });
      if (latestLoginEvent) {
        await updateUserProfile(user._id, latestLoginEvent);
      }
    } catch (profileErr) {
      console.error('⚠️  Failed updating user profile after MFA:', profileErr.message);
    }
    user.lastLogin   = new Date();
    user.loginCount  = (user.loginCount || 0) + 1;
    await user.save();
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, lastLogin: user.lastLogin },
    });
  } catch (err) {
    next(err);
  }
};
const getMe = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, lastLogin: user.lastLogin, loginCount: user.loginCount },
  });
};
const resendMfa = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { sendMfaCode } = require('../services/emailService');
    const code = user.generateMfaCode();
    console.log(`\n🔐 OTP for ${user.email}: ${code}\n`); 
    await user.save();
    await sendMfaCode({ to: user.email, userName: user.name, code });
    res.json({ success: true, message: 'New MFA code sent to your email' });
  } catch (err) { next(err); }
};
module.exports = { register, login, verifyMfa, getMe, resendMfa };
