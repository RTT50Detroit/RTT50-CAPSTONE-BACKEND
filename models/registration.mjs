import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
      name: {
        type: String, required: true,
      }, age: {
        type: Number, required: true,
      }, gender: {
        type: String, required: true,
      }, email: {
        type: String, required: true, unique: true,
      }, password: {
        type: String,
      }, role: {
        type: String,
        enum: ['member', 'master'],
        default: 'member',
      }, oauthAccounts: {
        type: [{
          provider: { type: String, enum: ['google', 'facebook', 'apple', 'github'] },
          subject: { type: String },
          email: { type: String },
        }],
        default: [],
      }, emailVerified: {
        type: Boolean,
        default: false,
      }, photo: {
        type: String,
      }, profileImage: {
        type: String,
      }, isOnline: {
        type: Boolean,
        default: false,
      }, lastSeen: {
        type: Date,
      }, aboutMe: {
        type: String,
        default: '',
        maxlength: 2000,
      }, occupation: {
        type: String,
        default: '',
        maxlength: 120,
      }, hobbies: {
        type: [String],
        default: [],
        validate: {
          validator: (hobbies) => hobbies.length <= 20,
          message: 'A profile can have up to 20 hobbies.',
        },
      }, links: {
        type: [{
          label: { type: String, required: true, maxlength: 50 },
          url: { type: String, required: true, maxlength: 500 },
        }],
        default: [],
        validate: {
          validator: (links) => links.length <= 10,
          message: 'A profile can have up to 10 links.',
        },
      },
    },
    {timestamps: true},
);

const RegistrationModel = mongoose.model('RegistrationModel',
    registrationSchema);

export default RegistrationModel;