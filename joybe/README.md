# Joyverse Backend Server

## Environment Setup

### 1. Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token signing | `your_super_secure_jwt_secret_key_here` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/joyverse` |
| `PORT` | Server port (optional, defaults to 3002) | `3002` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### 3. JWT Secret Key Security

**IMPORTANT**: The JWT secret key should be:
- At least 32 characters long
- Contain a mix of letters, numbers, and special characters
- Be unique for each environment (development, staging, production)
- Never be committed to version control

Example of a strong JWT secret:
```
JWT_SECRET=joyverse_2024_super_secure_random_key_with_numbers_123_and_symbols_!@#
```

### 4. MongoDB Setup

#### Local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/joyverse
```

#### MongoDB Atlas (Cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/joyverse?retryWrites=true&w=majority
```

### 5. Starting the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 6. Security Notes

- The `.env` file is automatically ignored by git
- Never share your JWT secret key
- Use different JWT secrets for different environments
- Regularly rotate JWT secrets in production

## API Endpoints

### Authentication
- `POST /api/login` - Login with JWT token response

### Protected Routes
All routes that require authentication should include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## JWT Token Structure

The JWT token contains:
```json
{
  "id": "user_id",
  "username": "username",
  "role": "admin|superadmin|user",
  "adminId": "admin_id_for_children",
  "exp": "expiration_timestamp"
}
```

Token expires after 24 hours.
