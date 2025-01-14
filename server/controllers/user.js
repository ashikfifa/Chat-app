import user from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';



export const register = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  try {
    const existingUser = await user.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: 'User already Exits' });
    const fullname = firstname + ' ' + lastname;
    const newuser = new user({ email, password, name: fullname });
    const token = await newuser.generateAuthToken();
    await newuser.save();
    res.json({ message: 'success', token: token });
  } catch (error) {
    console.log('Error in register ' + error);
    res.status(500).send(error);
  }
};



export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const valid = await user.findOne({ email });
    if (!valid) res.status(200).json({ message: 'User dont exist' });
    const validPassword = await bcrypt.compare(password, valid.password);
    if (!validPassword) {
      res.status(200).json({ message: 'Invalid Credentials' });
    } else {
      const token = await valid.generateAuthToken();
      await valid.save();
      res.cookie('userToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token: token, status: 200 });
    }
  } catch (error) {
    res.status(500).json({ error: error });
  }
};
export const validUser = async (req, res) => {
  try {
    const validuser = await user
      .findOne({ _id: req.rootUserId })
      .select('-password');
    if (!validuser) res.json({ message: 'user is not valid' });
    res.status(201).json({
      user: validuser,
      token: req.token,
    });
  } catch (error) {
    res.status(500).json({ error: error });
    console.log(error);
  }
};


export const googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Initialize the OAuth2Client with your client ID
    const client = new OAuth2Client(process.env.CLIENT_ID);

    // Verify the token ID sent from the client
    const verify = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.CLIENT_ID, // The audience is your client ID
    });

    // Destructure payload from the verified token
    const { email_verified, email, name, picture } = verify.payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Email Not Verified' });
    }

    // Check if the user already exists
    const userExist = await user.findOne({ email }).select('-password');

    if (userExist) {
      // User exists, create the cookie with the token ID
      res.cookie('userToken', tokenId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // Cookie expires in 1 day
        secure: process.env.NODE_ENV === 'production', // Set secure flag in production
      });
      return res.status(200).json({ token: tokenId, user: userExist });
    } else {
      // User doesn't exist, create a new user
      const password = email + process.env.CLIENT_ID;
      const newUser = new user({
        name,
        profilePic: picture,
        password, // Use the generated password (you might want to hash it)
        email,
      });

      // Save the new user
      await newUser.save();

      // Set the cookie with the token ID
      res.cookie('userToken', tokenId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // Cookie expires in 1 day
        secure: process.env.NODE_ENV === 'production', // Set secure flag in production
      });

      return res.status(200).json({
        message: 'User registered Successfully',
        token: tokenId,
      });
    }
  } catch (error) {
    console.error('Error in googleAuth backend:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = (req, res) => {
  req.rootUser.tokens = req.rootUser.tokens.filter((e) => e.token != req.token);
};
export const searchUsers = async (req, res) => {
  // const { search } = req.query;
  const search = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  const users = await user.find(search).find({ _id: { $ne: req.rootUserId } });
  res.status(200).send(users);
};
export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const selectedUser = await user.findOne({ _id: id }).select('-password');
    res.status(200).json(selectedUser);
  } catch (error) {
    res.status(500).json({ error: error });
  }
};
export const updateInfo = async (req, res) => {
  const { id } = req.params;
  const { bio, name } = req.body;
  const updatedUser = await user.findByIdAndUpdate(id, { name, bio });
  return updatedUser;
};
