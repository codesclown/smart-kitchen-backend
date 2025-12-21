import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export interface RecipeGenerationInput {
  availableIngredients: string[];
  cuisine?: string;
  prepTime?: number;
  dietary?: string[];
}

export interface GeneratedRecipe {
  title: string;
  ingredients: any;
  steps: any;
  cuisine?: string;
  prepTime?: number;
  calories?: number;
  difficulty?: string;
  servings?: number;
}

export async function generateRecipeWithAI(input: RecipeGenerationInput): Promise<GeneratedRecipe> {
  const { availableIngredients, cuisine, prepTime, dietary } = input;

  // Check if OpenAI is configured
  if (!openai) {
    console.error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    throw new Error('AI service not available - OpenAI API key not configured');
  }

  // Validate API key format
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.error('Invalid OpenAI API key format. Please check OPENAI_API_KEY environment variable.');
    throw new Error('AI service not available - Invalid API key format');
  }

  const prompt = `
Generate a recipe using the following available ingredients: ${availableIngredients.join(', ')}.

Requirements:
${cuisine ? `- Cuisine: ${cuisine}` : ''}
${prepTime ? `- Preparation time: Maximum ${prepTime} minutes` : ''}
${dietary && dietary.length > 0 ? `- Dietary restrictions: ${dietary.join(', ')}` : ''}

IMPORTANT: Please provide realistic ingredient amounts with proper units:
- Use grams (g) for solid ingredients like vegetables, meat, flour
- Use milliliters (ml) for liquids like water, milk, oil
- Use teaspoons (tsp) or tablespoons (tbsp) for spices and small amounts
- Use pieces/cloves for items like garlic, onions
- Use cups only for rice, grains, or large volume ingredients

Examples of good amounts:
- Onion: "1 medium" or "150g"
- Garlic: "3 cloves"
- Oil: "2 tbsp"
- Salt: "1 tsp"
- Tomatoes: "2 medium" or "200g"
- Rice: "1 cup" or "200g"

Please provide a JSON response with the following structure:
{
  "title": "Recipe Name",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "realistic quantity with unit (e.g., 2 tbsp, 150g, 1 medium)",
      "unit": "unit type",
      "available": true/false
    }
  ],
  "steps": [
    {
      "step": 1,
      "instruction": "detailed instruction",
      "time": "time in minutes"
    }
  ],
  "cuisine": "cuisine type",
  "prepTime": number_in_minutes,
  "calories": estimated_calories_per_serving,
  "difficulty": "Easy/Medium/Hard",
  "servings": number_of_servings,
  "tips": ["cooking tip 1", "cooking tip 2"],
  "missingIngredients": ["ingredient1", "ingredient2"]
}

Focus on creating a practical, delicious recipe that maximizes the use of available ingredients with realistic, cookable amounts.
`;

  console.log('🤖 Calling OpenAI API for recipe generation...');
  console.log('Available ingredients:', availableIngredients);
  console.log('Cuisine:', cuisine);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional chef and recipe developer. Create practical, delicious recipes based on available ingredients. Always respond with valid JSON that includes realistic ingredient amounts with proper units (grams, tbsp, tsp, pieces, etc.).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    console.log('✅ OpenAI API response received');
    console.log('Raw response:', content);

    // Parse the JSON response
    let recipe;
    try {
      recipe = JSON.parse(content);
      console.log('✅ Successfully parsed AI recipe:', recipe.title);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('Raw content that failed to parse:', content);
      throw new Error('Invalid JSON response from AI');
    }
    
    return {
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      cuisine: recipe.cuisine,
      prepTime: recipe.prepTime,
      calories: recipe.calories,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
    };
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        console.error('🔑 Invalid OpenAI API key. Please check your API key configuration.');
        throw new Error('AI service not available - Invalid API key. Please check your OpenAI API key configuration.');
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        console.error('💳 OpenAI API quota exceeded or billing issue.');
        throw new Error('AI service not available - API quota exceeded. Please check your OpenAI billing.');
      }
    }
    
    // Don't use fallback in production - throw the error so the resolver can handle it
    throw error;
  }
}

export async function scanImageWithAI(imageUrl: string, scanType: string): Promise<any> {
  try {
    let prompt = '';
    
    switch (scanType) {
      case 'inventory':
        prompt = `
Analyze this image and identify all food items, ingredients, or kitchen products visible.
For each item, provide:
- name: clear, specific name
- category: food category (vegetables, fruits, dairy, grains, etc.)
- quantity: estimated quantity if visible
- unit: appropriate unit (kg, pieces, bottles, etc.)
- expiry: estimated expiry date if visible or typical shelf life
- location: suggested storage location (fridge, pantry, freezer)

Return as JSON array of items.
`;
        break;
        
      case 'receipt':
        prompt = `
Analyze this receipt/bill image and extract:
- vendor: store/restaurant name
- date: purchase date
- total: total amount
- items: array of purchased items with names, quantities, and prices
- category: type of purchase (grocery, restaurant, etc.)

Return as JSON object.
`;
        break;
        
      case 'recipe':
        prompt = `
Analyze this image of food/dish and provide:
- dishName: name of the dish
- ingredients: list of visible ingredients
- cuisine: type of cuisine
- difficulty: estimated difficulty level
- estimatedTime: preparation time

Return as JSON object.
`;
        break;
        
      default:
        prompt = 'Analyze this image and describe what you see in JSON format.';
    }

    if (!openai) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI vision');
    }

    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, return the raw content
      return { 
        raw: content, 
        confidence: 0.5,
        scanType,
      };
    }
  } catch (error) {
    console.error('AI vision scan error:', error);
    
    // Return a fallback result
    return {
      error: 'AI scan failed',
      confidence: 0,
      scanType,
      fallback: true,
    };
  }
}

export async function processAIScanResult(rawResult: any, scanType: string): Promise<any> {
  // Process and enhance the AI scan result
  // This could include validation, data cleaning, confidence scoring, etc.
  
  try {
    switch (scanType) {
      case 'inventory':
        return processInventoryScan(rawResult);
      case 'receipt':
        return processReceiptScan(rawResult);
      case 'recipe':
        return processRecipeScan(rawResult);
      default:
        return rawResult;
    }
  } catch (error) {
    console.error('Processing AI scan result failed:', error);
    return rawResult;
  }
}

function processInventoryScan(result: any): any {
  if (Array.isArray(result)) {
    return result.map(item => ({
      ...item,
      confidence: item.confidence || 0.8,
      processed: true,
      suggestions: {
        emoji: getEmojiForItem(item.name),
        category: normalizeCategory(item.category),
        storageLocation: item.location || 'PANTRY',
      },
    }));
  }
  return result;
}

function processReceiptScan(result: any): any {
  return {
    ...result,
    processed: true,
    confidence: result.confidence || 0.7,
    normalizedItems: result.items?.map((item: any) => ({
      ...item,
      category: categorizeReceiptItem(item.name),
    })) || [],
  };
}

function processRecipeScan(result: any): any {
  return {
    ...result,
    processed: true,
    confidence: result.confidence || 0.6,
    suggestions: {
      similarRecipes: [], // Could be populated from database
      missingIngredients: [],
    },
  };
}

function getEmojiForItem(itemName: string): string {
  const name = itemName.toLowerCase();
  
  if (name.includes('rice')) return '🌾';
  if (name.includes('milk')) return '🥛';
  if (name.includes('tomato')) return '🍅';
  if (name.includes('onion')) return '🧅';
  if (name.includes('potato')) return '🥔';
  if (name.includes('carrot')) return '🥕';
  if (name.includes('apple')) return '🍎';
  if (name.includes('banana')) return '🍌';
  if (name.includes('bread')) return '🍞';
  if (name.includes('egg')) return '🥚';
  if (name.includes('chicken')) return '🍗';
  if (name.includes('fish')) return '🐟';
  if (name.includes('oil')) return '🛢️';
  if (name.includes('sugar')) return '🍬';
  if (name.includes('salt')) return '🧂';
  
  return '🥫'; // Default
}

function normalizeCategory(category: string): string {
  const cat = category?.toLowerCase() || '';
  
  if (cat.includes('vegetable')) return 'Vegetables';
  if (cat.includes('fruit')) return 'Fruits';
  if (cat.includes('dairy')) return 'Dairy';
  if (cat.includes('meat') || cat.includes('protein')) return 'Protein';
  if (cat.includes('grain') || cat.includes('cereal')) return 'Grains';
  if (cat.includes('spice') || cat.includes('seasoning')) return 'Spices';
  if (cat.includes('beverage') || cat.includes('drink')) return 'Beverages';
  if (cat.includes('snack')) return 'Snacks';
  
  return 'Pantry'; // Default
}

function categorizeReceiptItem(itemName: string): string {
  // Similar logic to normalizeCategory but for receipt items
  return normalizeCategory(itemName);
}