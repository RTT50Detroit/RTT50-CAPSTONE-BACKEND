import bcrypt from 'bcrypt';
import Registration from '../models/registration.mjs';

const ensureMasterUser = async () => {
  const email = process.env.MASTER_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_PASSWORD;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error('MASTER_EMAIL and MASTER_PASSWORD must be configured together.');
  }

  const hashedPassword = await bcrypt.hash(password, 16);
  const master = await Registration.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          password: hashedPassword,
          role: 'master',
        },
        $setOnInsert: {
          name: 'Master User',
          age: 18,
          gender: 'other',
        },
      },
      { new: true, upsert: true, runValidators: true },
  );

  console.log(`Master user ready: ${master.email}`);
};

export default ensureMasterUser;
