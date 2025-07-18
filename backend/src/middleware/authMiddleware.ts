import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { IUser, AuthenticatedRequest, UserInstance } from '../types';
import User from '../../models/User'; // Adjust path as needed

// Assert the type of the imported User model
const UserModel = User as typeof User & (new () => UserInstance);

const generateToken = (id: number): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey', {
    expiresIn: '24h',
  });
};

const protect = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey') as { id: number };

      // Get user from the token
      const user = await UserModel.findByPk(decoded.id);

      if (!user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      req.user = user.toJSON() as IUser; // Convert Sequelize instance to plain object and cast to IUser

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export { generateToken, protect };