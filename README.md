# Ivanti Backend - Temperature Tracking API

A Node.js backend API for tracking temperature records with person names, dates, and times. Built with Express.js and SQLite for easy deployment and data persistence.

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### Check your installations:

```bash
node --version
npm --version
```

## ️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/andrewwu531/ivanti-backend.git
cd ivanti-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```bash
# Create .env file
touch .env
```

Add the following content to `.env`:

```env
PORT=5000
NODE_ENV=development
```

### 4. Initialize the database

```bash
# Create database and tables
npm run populate:reset
```

## 🚀 Running the Application

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## 📊 Database Management

### View current data

```bash
npm run populate:show
```

### Reset database with sample data

```bash
npm run populate:reset
```

### Export current data

```bash
npm run populate:export
```

### Import data from export file

```bash
npm run populate:import
```

### Update populate.js with current database state

```bash
npm run populate:update
```

## API Endpoints

### Temperature Records

| Method   | Endpoint                | Description                       |
| -------- | ----------------------- | --------------------------------- |
| `GET`    | `/api/temperatures`     | Get all temperature records       |
| `GET`    | `/api/temperatures/:id` | Get a specific temperature record |
| `POST`   | `/api/temperatures`     | Create a new temperature record   |
| `PUT`    | `/api/temperatures/:id` | Update a temperature record       |
| `DELETE` | `/api/temperatures/:id` | Delete a temperature record       |

### Debug

| Method | Endpoint          | Description                |
| ------ | ----------------- | -------------------------- |
| `GET`  | `/api/debug/view` | View all database contents |
