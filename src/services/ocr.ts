import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ReceiptData {
  vendor?: string;
  date?: string;
  total?: number;
  items: Array<{
    name: string;
    quantity?: number;
    price?: number;
    unit?: string;
  }>;
  category?: string;
}

export interface InventoryItemData {
  name: string;
  brand?: string;
  category?: string;
  expiryDate?: string;
  quantity?: number;
  unit?: string;
}

export class OCRService {
  /**
   * Extract text from image using Tesseract.js
   */
  static async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m)
      });

      return {
        text: data.text,
        confidence: data.confidence
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Process receipt image and extract structured data
   */
  static async processReceipt(imageBuffer: Buffer): Promise<ReceiptData> {
    try {
      // First extract text using OCR
      const ocrResult = await this.extractText(imageBuffer);
      
      if (ocrResult.confidence < 60) {
        throw new Error('Image quality too low for reliable OCR processing');
      }

      // Use OpenAI to structure the receipt data
      if (!openai) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at parsing receipt text and extracting structured data. 
            Parse the following receipt text and return a JSON object with this structure:
            {
              "vendor": "store name",
              "date": "YYYY-MM-DD format",
              "total": number,
              "items": [
                {
                  "name": "item name (cleaned and standardized)",
                  "quantity": number or null,
                  "price": number or null,
                  "unit": "kg/liter/pieces/etc or null"
                }
              ],
              "category": "grocery/restaurant/pharmacy/etc"
            }
            
            Guidelines:
            - Clean up item names (remove codes, standardize)
            - Infer quantities and units when possible
            - Group similar items if needed
            - Focus on food/kitchen items
            - Return null for missing data
            - Ensure all prices are numbers`
          },
          {
            role: "user",
            content: `Parse this receipt text:\n\n${ocrResult.text}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result as ReceiptData;
    } catch (error) {
      console.error('Receipt processing failed:', error);
      throw new Error('Failed to process receipt data');
    }
  }

  /**
   * Process inventory item image and extract data
   */
  static async processInventoryItem(imageBuffer: Buffer): Promise<InventoryItemData> {
    try {
      // Extract text using OCR
      const ocrResult = await this.extractText(imageBuffer);
      
      if (ocrResult.confidence < 50) {
        throw new Error('Image quality too low for reliable OCR processing');
      }

      // Use OpenAI to structure the inventory item data
      if (!openai) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at identifying food and kitchen items from package text/labels.
            Parse the following text from a product package and return a JSON object:
            {
              "name": "clean product name",
              "brand": "brand name or null",
              "category": "category like 'dairy', 'grains', 'vegetables', etc",
              "expiryDate": "YYYY-MM-DD format or null",
              "quantity": number or null,
              "unit": "kg/liter/pieces/grams/ml/etc or null"
            }
            
            Guidelines:
            - Extract the main product name (not marketing text)
            - Identify expiry/best before dates
            - Determine quantity and unit from package
            - Categorize appropriately for kitchen inventory
            - Return null for missing information`
          },
          {
            role: "user",
            content: `Identify this product from package text:\n\n${ocrResult.text}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result as InventoryItemData;
    } catch (error) {
      console.error('Inventory item processing failed:', error);
      throw new Error('Failed to process inventory item data');
    }
  }

  /**
   * Process barcode/QR code from image
   */
  static async processBarcode(imageBuffer: Buffer): Promise<string | null> {
    try {
      // For now, use OCR to detect numeric codes
      // In production, you might want to use a dedicated barcode library
      const ocrResult = await this.extractText(imageBuffer);
      
      // Look for barcode patterns (typically 8-13 digits)
      const barcodeMatch = ocrResult.text.match(/\b\d{8,13}\b/);
      return barcodeMatch ? barcodeMatch[0] : null;
    } catch (error) {
      console.error('Barcode processing failed:', error);
      return null;
    }
  }
}