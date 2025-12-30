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
      
      // Lower confidence threshold for receipts
      if (ocrResult.confidence < 40) {
        console.log(`Receipt OCR confidence: ${ocrResult.confidence}%, proceeding with AI processing...`);
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
            - Ensure all prices are numbers
            - If text is unclear, make reasonable assumptions
            - If no clear items found, return at least one generic item`
          },
          {
            role: "user",
            content: `Parse this receipt text (OCR confidence: ${ocrResult.confidence}%):\n\n${ocrResult.text || 'No clear text detected'}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Ensure we always return a valid result
      return {
        vendor: result.vendor || 'Unknown Store',
        date: result.date || new Date().toISOString().split('T')[0],
        total: result.total || 0,
        items: result.items && result.items.length > 0 ? result.items : [
          {
            name: 'Scanned Item',
            quantity: 1,
            price: undefined,
            unit: 'piece'
          }
        ],
        category: result.category || 'grocery'
      } as ReceiptData;
    } catch (error) {
      console.error('Receipt processing failed:', error);
      
      // Return a fallback result instead of throwing an error
      return {
        vendor: 'Unknown Store',
        date: new Date().toISOString().split('T')[0],
        total: 0,
        items: [
          {
            name: 'Scanned Item',
            quantity: 1,
            price: undefined,
            unit: 'piece'
          }
        ],
        category: 'grocery'
      };
    }
  }

  /**
   * Process inventory item image and extract data
   */
  static async processInventoryItem(imageBuffer: Buffer): Promise<InventoryItemData> {
    try {
      // Extract text using OCR
      const ocrResult = await this.extractText(imageBuffer);
      
      // Lower confidence threshold for more flexibility
      if (ocrResult.confidence < 30) {
        console.log(`OCR confidence: ${ocrResult.confidence}%, proceeding with processing...`);
      }

      // Always try basic parsing first as fallback
      const basicResult = this.parseBasicInventoryItem(ocrResult.text);

      // Try to use OpenAI to enhance the data if available
      if (!openai) {
        console.log('OpenAI not configured, using basic OCR parsing...');
        return basicResult;
      }

      try {
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
              - Return null for missing information
              - If the text is unclear or garbled, make reasonable assumptions based on common food items
              - If no clear text is found, return a generic item with category "Other"`
            },
            {
              role: "user",
              content: `Identify this product from package text (OCR confidence: ${ocrResult.confidence}%):\n\n${ocrResult.text || 'No clear text detected'}`
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        
        // Merge AI result with basic result, preferring AI data when available
        return {
          name: result.name || basicResult.name,
          brand: result.brand || basicResult.brand,
          category: result.category || basicResult.category,
          expiryDate: result.expiryDate || basicResult.expiryDate,
          quantity: result.quantity || basicResult.quantity,
          unit: result.unit || basicResult.unit
        } as InventoryItemData;
      } catch (openaiError) {
        console.log('OpenAI API failed, using basic parsing:', openaiError instanceof Error ? openaiError.message : 'Unknown error');
        return basicResult;
      }
    } catch (error) {
      console.error('Inventory item processing failed:', error);
      
      // Return a fallback result instead of throwing an error
      return {
        name: 'Scanned Item',
        brand: undefined,
        category: 'Other',
        expiryDate: undefined,
        quantity: 1,
        unit: 'piece'
      };
    }
  }

  /**
   * Basic parsing without OpenAI - extracts simple patterns from OCR text
   */
  private static parseBasicInventoryItem(text: string): InventoryItemData {
    const cleanText = text.toLowerCase().trim();
    
    // Basic name extraction - take first meaningful line
    const lines = text.split('\n').filter(line => line.trim().length > 2);
    const name = lines[0]?.trim() || 'Scanned Item';
    
    // Basic quantity extraction - look for numbers followed by units
    const quantityMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pieces|pack|bottle|can)/i);
    const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
    const unit = quantityMatch ? quantityMatch[2].toLowerCase() : 'piece';
    
    // Basic date extraction - look for date patterns
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})|(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    let expiryDate: string | undefined = undefined;
    if (dateMatch) {
      try {
        // Try to parse the date
        const year = dateMatch[3]?.length === 4 ? dateMatch[3] : dateMatch[4] || '2024';
        const month = dateMatch[2] || dateMatch[5] || '01';
        const day = dateMatch[1] || dateMatch[6] || '01';
        expiryDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } catch (e) {
        // Invalid date, leave as undefined
      }
    }
    
    // Basic category guessing based on keywords
    let category = 'Other';
    if (cleanText.includes('milk') || cleanText.includes('cheese') || cleanText.includes('yogurt')) {
      category = 'Dairy';
    } else if (cleanText.includes('bread') || cleanText.includes('rice') || cleanText.includes('pasta')) {
      category = 'Grains & Cereals';
    } else if (cleanText.includes('apple') || cleanText.includes('banana') || cleanText.includes('fruit')) {
      category = 'Fruits';
    } else if (cleanText.includes('tomato') || cleanText.includes('onion') || cleanText.includes('vegetable')) {
      category = 'Vegetables';
    } else if (cleanText.includes('chicken') || cleanText.includes('beef') || cleanText.includes('fish')) {
      category = 'Meat & Fish';
    }
    
    return {
      name: name.length > 50 ? name.substring(0, 50) + '...' : name,
      brand: undefined,
      category,
      expiryDate,
      quantity,
      unit
    };
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