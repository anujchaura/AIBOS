const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 8 },

  // RBAC
  role: {
    type: String,
    enum: ['super_admin', 'org_admin', 'dept_manager', 'employee', 'viewer'],
    default: 'employee',
  },

  // Organization links
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

  // Profile
  avatar:    { type: String },
  phone:     { type: String },
  title:     { type: String },
  bio:       { type: String },

  // MFA
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret:  { type: String },

  // Session
  refreshTokens: [{ token: String, createdAt: Date, expiresAt: Date, userAgent: String }],
  lastLogin:   { type: Date },
  isActive:    { type: Boolean, default: true },
  isVerified:  { type: Boolean, default: false },

  // Permissions (granular overrides)
  permissions: [{ type: String }],
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe output (no password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.mfaSecret;
  delete obj.refreshTokens;
  return obj;
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
