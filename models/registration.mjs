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
        type: String, required: true,
      }, role: {
        type: String,
        enum: ['member', 'master'],
        default: 'member',
      }, photo: {
        type: String,
      }, profileImage: {
        type: String,
      }, isOnline: {
        type: Boolean,
        default: false,
      }, lastSeen: {
        type: Date,
      }, bio: {
        type: String,
        default: '',
        maxlength: 2000,
      },
    },
    {timestamps: true},
);

const RegistrationModel = mongoose.model('RegistrationModel',
    registrationSchema);

export default RegistrationModel;