# Ivanti Backend - Temperature Tracking API

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

Create a `.env` file in the root directory and add the following content to `.env`:

```env
PORT=5000
NODE_ENV=development
```

### 4. Initialize the database

```bash
# Create database and tables
node database/setup.js
```

### 5. Update populate.js with current database state

```bash
npm run populate:import
```

### 6. Run the program

```bash
npm run dev
```

### 7. Run Jest test suite

```bash
npm run test
```
