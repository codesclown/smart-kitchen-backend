# OCR API Documentation

## Overview
The OCR API provides endpoints for processing images to extract inventory item data and receipt information using AI-powered optical character recognition. The API is designed to be forgiving with image quality and will always return a result, even with low-quality images.

## Endpoints

### 1. Process Inventory Item
**POST** `/ocr/inventory`

Processes an image of a product/package to extract inventory item information.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with a file field containing the image

#### Supported File Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

#### File Size Limit
- Maximum: 10MB

#### Response Format
```json
{
  "success": true,
  "data": {
    "name": "Product Name",
    "brand": "Brand Name",
    "category": "dairy|grains|vegetables|etc",
    "expiryDate": "YYYY-MM-DD",
    "quantity": 1,
    "unit": "kg|liter|pieces|etc"
  },
  "message": "Image processed successfully"
}
```

#### Fallback Behavior
- If OCR confidence is low (< 30%), the API will still process the image using AI
- If processing fails completely, returns a generic "Scanned Item" with default values
- Always returns a valid response, never fails completely

#### Error Response
```json
{
  "error": "Error Type",
  "message": "Error description",
  "statusCode": 400|500
}
```

### 2. Process Receipt
**POST** `/ocr/receipt`

Processes a receipt image to extract structured shopping data.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with a file field containing the receipt image

#### Response Format
```json
{
  "success": true,
  "data": {
    "vendor": "Store Name",
    "date": "YYYY-MM-DD",
    "total": 25.99,
    "items": [
      {
        "name": "Item Name",
        "quantity": 2,
        "price": 5.99,
        "unit": "pieces"
      }
    ],
    "category": "grocery"
  },
  "message": "Receipt processed successfully"
}
```

#### Fallback Behavior
- If OCR confidence is low (< 40%), the API will still process using AI
- If processing fails, returns a generic receipt with "Unknown Store" and "Scanned Item"
- Always returns at least one item in the items array

## Usage Examples

### JavaScript/Frontend
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/ocr/inventory', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data); // Always contains valid item data
```

### cURL
```bash
curl -X POST http://localhost:4000/ocr/inventory \
  -F "file=@/path/to/image.jpg"
```

## Error Codes
- **400**: Bad Request (no file, invalid file type, file too large)
- **500**: Internal Server Error (rare - API has extensive fallback handling)

## Features
- **Robust Processing**: Works with low-quality images
- **AI Enhancement**: Uses OpenAI to improve OCR results
- **Graceful Degradation**: Always returns usable data
- **Smart Categorization**: Automatically categorizes food items
- **Date Recognition**: Extracts expiry dates from packages
- **Quantity Detection**: Identifies package sizes and units

## Requirements
- OpenAI API key must be configured in environment variables
- Tesseract.js for OCR processing
- Images should be clear and well-lit for best results (but not required)

## Tips for Best Results
- Ensure good lighting when taking photos
- Keep text areas in focus
- Avoid shadows and glare
- Take photos straight-on rather than at angles
- For receipts, flatten the paper to avoid creases