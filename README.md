# Ivanti Backend - Temperature Tracking API

A Node.js backend API for tracking temperature records with person names, dates, and times.

## Features

- **CRUD Operations**: Create, Read, Update, Delete temperature records
- **Person Tracking**: Record temperature with person names
- **Timestamp Tracking**: Automatic date/time recording
- **Data Validation**: Input validation and error handling
- **Statistics**: Get summary statistics of temperature data
- **Filtering**: Filter records by person name and date range

## API Endpoints

### Temperature Records

- `GET /api/temperatures` - Get all temperature records (with optional filtering)
- `GET /api/temperatures/:id` - Get a specific temperature record
- `POST /api/temperatures` - Create a new temperature record
- `PUT /api/temperatures/:id` - Update a temperature record
- `DELETE /api/temperatures/:id` - Delete a temperature record

### Statistics

- `GET /api/temperatures/stats/summary` - Get temperature statistics

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:

   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/temperature-tracker
   NODE_ENV=development
   ```

3. **Start MongoDB**:
   Make sure MongoDB is running on your system.

4. **Run the server**:

   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## API Usage Examples

### Create a temperature record

```bash
curl -X POST http://localhost:5000/api/temperatures \
  -H "Content-Type: application/json" \
  -d '{
    "personName": "John Doe",
    "temperature": 37.2
  }'
```

### Get all temperature records

```bash
curl http://localhost:5000/api/temperatures
```

### Get records for a specific person

```bash
curl "http://localhost:5000/api/temperatures?personName=John"
```

### Get statistics

```bash
curl http://localhost:5000/api/temperatures/stats/summary
```

## Data Model

Each temperature record contains:

- `personName` (String, required): Name of the person
- `temperature` (Number, required): Temperature value (-100 to 100°C)
- `recordedAt` (Date): When the record was created (auto-generated)
- `createdAt` (Date): Record creation timestamp
- `updatedAt` (Date): Record last update timestamp

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## CORS Configuration

The API is configured to accept requests from any origin for development. In production, you should configure CORS to only allow requests from your frontend domain.
