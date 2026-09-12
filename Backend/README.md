# Backend API Documentation

## Register User

Creates a new user account and returns an authentication token.

### Endpoint

```http
POST /users/register
```

The `/users` route is mounted by the backend application, so the complete endpoint is `/users/register`.

### Request Headers

```http
Content-Type: application/json
```

### Request Body

Send a JSON object with the following structure:

```json
{
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### Request Fields

| Field | Type | Required | Requirements |
| --- | --- | --- | --- |
| `fullname` | object | Yes | Contains the user's name. |
| `fullname.firstname` | string | Yes | Must contain at least 3 characters. |
| `fullname.lastname` | string | No | The last name is accepted by the API and stored when provided. |
| `email` | string | Yes | Must be a valid email address. |
| `password` | string | Yes | Must contain at least 8 characters. It is hashed before storage. |

### Successful Response

**Status:** `201 Created`

Example response received from the endpoint:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f1a2b3c4d5e6f789012345",
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john.doe@example.com"
  }
}
```

The response includes a JWT in `token` and the newly created user in `user`.

### Error Responses

#### Validation Error

**Status:** `400 Bad Request`

Returned when the email is invalid, the first name has fewer than 3 characters, or the password has fewer than 8 characters.

```json
{
  "errors": [
    {
      "type": "field",
      "value": "bad-email",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### User Already Exists

**Status:** `400 Bad Request`

Returned when a user with the submitted email already exists.

```json
{
  "message": "User already exists"
}
```

#### Server Error

**Status:** `500 Internal Server Error`

Returned when an unexpected server or database error occurs.

### Example cURL Request

```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

## Login User

Authenticates an existing user and returns an authentication token.

### Endpoint

```http
POST /users/login
```

### Request Headers

```http
Content-Type: application/json
```

### Request Body

Send a JSON object containing the user's email and password:

```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### Request Fields

| Field | Type | Required | Requirements |
| --- | --- | --- | --- |
| `email` | string | Yes | Must be a valid email address. |
| `password` | string | Yes | Must contain at least 8 characters. |

### Successful Response

**Status:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f1a2b3c4d5e6f789012345",
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john.doe@example.com"
  }
}
```

The response includes a JWT in `token` and the authenticated user in `user`.

### Error Responses

#### Validation Error

**Status:** `400 Bad Request`

Returned when the email is invalid or the password has fewer than 8 characters.

```json
{
  "errors": [
    {
      "type": "field",
      "value": "bad-email",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### Invalid Credentials

**Status:** `401 Unauthorized`

Returned when the email does not exist or the password is incorrect.

```json
{
  "message": "Invalid email or password"
}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```
