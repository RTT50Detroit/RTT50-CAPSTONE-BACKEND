import mongoose from 'mongoose';

const About = mongoose.model('AboutMe', new mongoose.Schema({
  content: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationModel' }
}));

export default About;