const mongoose = require('mongoose');
const User = require('./models/User');
const LoginEvent = require('./models/LoginEvent');
const UserProfile = require('./models/UserProfile');
const AnomalyAlert = require('./models/AnomalyAlert');

mongoose.connect('mongodb://localhost:27017/anomaly_detection')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Delete all users except test@demo.com
    const deleteResult = await User.deleteMany({ 
      email: { $ne: 'test@demo.com' } 
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} users (kept test@demo.com)`);
    
    // Delete all login events
    const loginDeleteResult = await LoginEvent.deleteMany({});
    console.log(`🗑️  Deleted ${loginDeleteResult.deletedCount} login events`);
    
    // Delete all user profiles
    const profileDeleteResult = await UserProfile.deleteMany({});
    console.log(`🗑️  Deleted ${profileDeleteResult.deletedCount} user profiles`);
    
    // Delete all anomaly alerts
    const alertDeleteResult = await AnomalyAlert.deleteMany({});
    console.log(`🗑️  Deleted ${alertDeleteResult.deletedCount} anomaly alerts`);
    
    // Check if test user exists, if not create it
    let testUser = await User.findOne({ email: 'test@demo.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@demo.com',
        password: 'test123',
        role: 'user'
      });
      console.log('\n✅ Created test user: test@demo.com / test123');
    } else {
      console.log('\n✅ Test user already exists: test@demo.com / test123');
    }
    
    console.log('\n📊 Database Status:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Login Events: ${await LoginEvent.countDocuments()}`);
    console.log(`   User Profiles: ${await UserProfile.countDocuments()}`);
    console.log(`   Anomaly Alerts: ${await AnomalyAlert.countDocuments()}`);
    
    console.log('\n✅ Database reset complete!');
    console.log('📝 Use test@demo.com / test123 to login\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
