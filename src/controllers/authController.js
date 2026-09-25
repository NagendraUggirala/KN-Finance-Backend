import jwt from 'jsonwebtoken';

/**
 * Super Admin Login
 * Route: POST /api/auth/superadmin/login
 * Authenticates using environment variables (process.env.SUPERADMIN_USERNAME & process.env.SUPERADMIN_PASSWORD)
 */
export const superAdminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const envUsername = process.env.SUPERADMIN_USERNAME;
    const envPassword = process.env.SUPERADMIN_PASSWORD;

    // Compare credentials with environment variables
    if (username !== envUsername || password !== envPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Super Admin credentials.'
      });
    }

    // Generate JWT token with required payload
    const payload = {
      role: 'superadmin',
      username: process.env.SUPERADMIN_USERNAME
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    // Return successful response without exposing password
    return res.status(200).json({
      success: true,
      message: 'Super Admin login successful',
      token,
      user: {
        role: 'superadmin',
        username: process.env.SUPERADMIN_USERNAME
      }
    });
  } catch (error) {
    next(error);
  }
};
