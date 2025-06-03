import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/joyverse';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Schemas
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  isSuperAdmin: Boolean,
  phone: { type: String, default: null },
  bio: { type: String, default: null },
  occupation: { type: String, default: null },
});

const childSchema = new mongoose.Schema({
  username: String,
  password: String,
  hint: String,
  adminId: String,
  phone: { type: String, default: null },
});

const feedbackSchema = new mongoose.Schema({
  sender: String,
  message: String,
  isSuperAdmin: Boolean,
  timestamp: { type: Date, default: Date.now },
});

const colorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

const gameDataSchema = new mongoose.Schema({
  username: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  gameName: { type: String, required: true },
  wordsFound: { type: Number, default: null },
  score: { type: Number, default: null },
  sequence: { type: [colorSchema], default: null },
  playerSequence: { type: [colorSchema], default: null },
  emotion: { type: String, required: true },
  timestamp: { type: Date, required: true },
  adminId: { type: String, default: null },
});

// New ChildRequest Schema for pending child requests
const childRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  therapistNumber: { type: String, required: true },
  adminId:{ type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

// New AdminRequest Schema for pending admin requests
const adminRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: false },
  age: { type: Number, required: false },
  occupation: { type: String, required: false },
  location: { type: String, required: false },
  bio: { type: String, required: false },
  links: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
});

// Models
const Admin = mongoose.model('Admin', adminSchema);
const Child = mongoose.model('Child', childSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Scores = mongoose.model('Scores', gameDataSchema);
const ChildRequest = mongoose.model('ChildRequest', childRequestSchema);
const AdminRequest = mongoose.model('AdminRequest', adminRequestSchema);

// Routes

// Admin Routes
app.get('/api/admins', async (req, res) => {
  const admins = await Admin.find({});
  res.json(admins);
});

app.post('/api/admins', async (req, res) => {
  const { username, password, phone, bio, occupation } = req.body;
  const exists = await Admin.findOne({ username });
  if (exists) return res.status(400).json({ error: 'Username already exists' });

  const newAdmin = new Admin({
    username,
    password: password || 'defaultPassword', // Ensure password is set
    isSuperAdmin: false,
    phone: phone || null,
    bio: bio || null,
    occupation: occupation || null,
  });
  await newAdmin.save();
  res.json({ id: newAdmin._id, username, isSuperAdmin: false, phone, bio, occupation });
});

app.post('/api/admins/delete', async (req, res) => {
  const { username } = req.body;
  console.log(`🔁 POST delete request received for admin: ${username}`);

  try {
    const deletedAdmin = await Admin.findOneAndDelete({ username });
    if (!deletedAdmin) {
      console.log(`❌ No admin found with username: ${username}`);
      return res.status(404).json({ error: 'Admin not found' });
    }

    console.log(`✅ Deleted admin: ${username}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`🔥 Error deleting admin (${username}):`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if admin username exists
app.get('/api/admins/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const exists = await Admin.findOne({ username });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error(`Error checking admin username (${username}):`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Child Delete Route
app.post('/api/children/delete', async (req, res) => {
  const { username, adminId } = req.body;
  console.log(`🔁 POST delete request received for child: ${username} by admin: ${adminId}`);

  try {
    const deletedChild = await Child.findOneAndDelete({ username, adminId });
    if (!deletedChild) {
      console.log(`❌ No child found with username: ${username} and adminId: ${adminId}`);
      return res.status(404).json({ error: 'Child not found or not associated with this admin' });
    }

    console.log(`✅ Deleted child: ${username}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`🔥 Error deleting child (${username}):`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if child username exists
app.get('/api/children/check-username', async (req, res) => {
  const { username } = req.query;
 xec: if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const exists = await Child.findOne({ username });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error(`Error checking child username (${username}):`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth Route with JWT
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check for admin
    const admin = await Admin.findOne({ username, password });
    if (admin) {
      const token = jwt.sign(
        {
          id: admin._id,
          username: admin.username,
          role: admin.isSuperAdmin ? 'superadmin' : 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        role: admin.isSuperAdmin ? 'superadmin' : 'admin',
        username: admin.username,
        id: admin._id
      });
    }

    // Check for child
    const child = await Child.findOne({ username, password });
    if (child) {
      const token = jwt.sign(
        {
          id: child._id,
          username: child.username,
          role: 'user',
          adminId: child.adminId
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        role: 'user',
        username: child.username,
        id: child._id
      });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Children Routes
app.get('/api/children', async (req, res) => {
  const adminId = req.query.admin;
  let query = {};
  
  if (adminId) query.adminId = adminId;

  try {
    const children = await Child.find(query);
    res.json(children);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

app.post('/api/children', async (req, res) => {
  const { username, password, hint, adminId } = req.body;
  const exists = await Child.findOne({ username });
  if (exists) return res.status(400).json({ error: 'Username already exists' });

  const newChild = new Child({
    username,
    password: password || 'defaultChildPassword', // Ensure password is set
    hint: hint || 'No hint provided',
    adminId,
  });
  await newChild.save();
  res.json({ id: newChild._id, username, hint, adminId });
});

// Child Request Routes
app.post('/api/child-requests', async (req, res) => {
  const { childName, password, phoneNumber, therapistNumber ,adminName} = req.body;
  console.log(req.body);
  if (!childName || !password || !phoneNumber || !therapistNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const newChildRequest = new ChildRequest({
    name: childName,
    password,
    phone: phoneNumber,
    therapistNumber,
    adminId:adminName
  });
  await newChildRequest.save();
  res.json({ message: 'Child request submitted successfully', id: newChildRequest._id });
});

app.get('/api/child-requests', async (req, res) => {
  try {
    const {adminId} = req.query;
    console.log(adminId);
    const childRequests = await ChildRequest.find({adminId});
    res.json(childRequests);
  } catch (err) {
    console.error('Error fetching child requests:', err);
    res.status(500).json({ error: 'Failed to fetch child requests' });
  }
});

// Delete child request after approval or rejection
app.post('/api/child-requests/delete', async (req, res) => {
  const { id } = req.body;
  try {
    const deletedRequest = await ChildRequest.findByIdAndDelete(id);
    if (!deletedRequest) {
      return res.status(404).json({ error: 'Child request not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting child request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Request Routes
app.post('/api/admin-requests', async (req, res) => {
  const { name, password, phoneNumber, age, occupation, location, bio, links } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }

  const newAdminRequest = new AdminRequest({
    name,
    password,
    phone: phoneNumber || null,
    age: age || null,
    occupation: occupation || null,
    location: location || null,
    bio: bio || null,
    links: links || null,
  });
  await newAdminRequest.save();
  res.json({ message: 'Admin request submitted successfully', id: newAdminRequest._id });
});

app.get('/api/admin-requests', async (req, res) => {
  try {
    const adminRequests = await AdminRequest.find();
    res.json(adminRequests);
  } catch (err) {
    console.error('Error fetching admin requests:', err);
    res.status(500).json({ error: 'Failed to fetch admin requests' });
  }
});

// Delete admin request after approval or rejection
app.post('/api/admin-requests/delete', async (req, res) => {
  const { id } = req.body;
  try {
    const deletedRequest = await AdminRequest.findByIdAndDelete(id);
    if (!deletedRequest) {
      return res.status(404).json({ error: 'Admin request not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting admin request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Game Scores
app.post('/save_game_data', async (req, res) => {
  try {
    const {
      username,
      age,
      gender,
      gameName,
      wordsFound,
      score,
      sequence,
      playerSequence,
      emotion,
      timestamp,
      adminId,
    } = req.body;

    if (!username || !gameName || !emotion || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gameData = new Scores({
      username,
      age,
      gender,
      gameName,
      wordsFound: wordsFound || null,
      score: score || null,
      
      emotion,
      timestamp: new Date(timestamp),
      adminId: adminId || null,
    });

    await gameData.save();

    console.log('Game data saved:', {
      username,
      gameName,
      wordsFound,
      score,
      emotion,
      timestamp,
      adminId,
      age,
      gender,
    });

    res.status(200).json({ message: 'Game data saved successfully' });
  } catch (err) {
    console.error('Error saving game data:', err);
    res.status(500).json({ error: 'Failed to save game data' });
  }
});

app.get('/get_admin_by_child/:username', async (req, res) => {
  try {
    const child = await Child.findOne({ username: req.params.username }).select('adminId');
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }
    res.json({ adminId: child.adminId });
  } catch (err) {
    console.error('Error fetching adminId:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/game_data', async (req, res) => {
  const { admin } = req.query;
  try {
    const children = await Child.find({ adminId: admin }, 'username');
    const usernames = children.map(child => child.username);

    const gameData = await Scores.find({ username: { $in: usernames } }).sort({ timestamp: -1 });
    res.json(gameData);
  } catch (err) {
    console.error('Error fetching game data:', err);
    res.status(500).json({ error: 'Failed to fetch game data' });
  }
});

// Feedback (Group Chat)
app.post('/api/feedback', async (req, res) => {
  const { sender, message, isSuperAdmin } = req.body;
  if (!sender || !message) {
    return res.status(400).json({ error: 'Sender and message are required' });
  }

  const newFeedback = new Feedback({ sender, message, isSuperAdmin });
  await newFeedback.save();
  res.json(newFeedback);
});

app.get('/api/feedback', async (req, res) => {
  const feedbacks = await Feedback.find().sort({ timestamp: 1 });
  res.json(feedbacks);
});

// Server Listen
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 JWT Secret loaded: ${JWT_SECRET ? '✅' : '❌'}`);
  console.log(`🗄️  MongoDB URI: ${MONGODB_URI}`);
});