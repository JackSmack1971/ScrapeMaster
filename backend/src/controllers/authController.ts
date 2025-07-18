import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/authMiddleware';
import { AuthRequest, AuthResponse, AuthenticatedRequest, IUser, UserInstance } from '../types';
import User from '../../models/User'; // Adjust path as needed
import { CustomError } from '../middleware/errorMiddleware';

// Assert the type of the imported User model
const UserModel = User as typeof User & (new () => UserInstance);

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password }: AuthRequest = req.body;

  // Check if user exists
  const userExists = await User.findOne({ where: { email } });

  if (userExists) {
    throw new CustomError('User already exists', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await UserModel.create({
    username: username as string, // Cast to string
    email: email as string,       // Cast to string
    password_hash: hashedPassword, // Use password_hash
  });

  if (user) {
    res.status(201).json({
      token: generateToken(user.id as number), // Ensure id is number
      user: {
        id: user.id as number,
        username: user.username,
        email: user.email,
      },
    } as AuthResponse);
  } else {
    throw new CustomError('Invalid user data', 400);
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: AuthRequest = req.body;

  // Check for user email
  const user = await UserModel.findOne({ where: { email } }) as UserInstance; // Cast to UserInstance

  if (user && (await bcrypt.compare(password, user.password_hash as string))) { // Use password_hash
    res.json({
      token: generateToken(user.id as number), // Ensure id is number
      user: {
        id: user.id as number,
        username: user.username,
        email: user.email,
      },
    } as AuthResponse);
  } else {
    throw new CustomError('Invalid credentials', 400);
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Assuming the protect middleware has already validated the token and set req.user
  if (!req.user) {
    throw new CustomError('Not authorized, no user data in token', 401);
  }

  // Generate a new token for the authenticated user
  const newToken = generateToken(req.user.id as number);

  res.status(200).json({
    token: newToken,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    },
  } as AuthResponse);
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public (or Private, depending on implementation)
const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // For JWT, logout is typically handled client-side by deleting the token.
  // We can send a success message.
  res.status(200).json({ message: 'Logged out successfully' });
});

export { registerUser, loginUser, refreshToken, logoutUser };