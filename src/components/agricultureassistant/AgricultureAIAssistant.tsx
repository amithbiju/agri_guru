import React, { useEffect, useState, useCallback, memo } from "react";
import { type Tool, SchemaType } from "@google/generative-ai";
import { app } from "../../firebase/Config";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  limit,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

// Additional utility functions for external API integrations
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const MARKET_API_KEY = process.env.REACT_APP_MARKET_API_KEY;

// Real weather API integration (OpenWeatherMap example)
const getWeatherData = async (location: string) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${WEATHER_API_KEY}&units=metric`
    );
    const data = await response.json();
    return {
      location: data.name,
      temperature: `${data.main.temp}°C`,
      humidity: `${data.main.humidity}%`,
      description: data.weather[0].description,
      wind_speed: `${data.wind.speed} m/s`,
      rainfall_prediction: "Check 5-day forecast for rain prediction",
    };
  } catch (error) {
    console.error("Weather API error:", error);
    return null;
  }
};

// Disease diagnosis database
const diagnoseCropDisease = (symptoms: string, crop: string) => {
  const diseaseDatabase = {
    rice: {
      "yellow leaves": {
        disease: "Bacterial Leaf Blight",
        treatment: "Apply copper-based fungicide",
        prevention: "Avoid overhead watering, ensure good drainage",
      },
      "brown spots": {
        disease: "Rice Blast",
        treatment: "Apply Tricyclazole fungicide",
        prevention: "Balanced fertilization, avoid water stress",
      },
    },
    wheat: {
      "rust colored spots": {
        disease: "Wheat Rust",
        treatment: "Apply Propiconazole fungicide",
        prevention: "Use resistant varieties, proper spacing",
      },
      "powdery coating": {
        disease: "Powdery Mildew",
        treatment: "Apply sulfur-based fungicide",
        prevention: "Ensure good air circulation",
      },
    },
    tomato: {
      "yellowing leaves": {
        disease: "Tomato Yellow Leaf Curl Virus",
        treatment: "Remove affected plants, control whiteflies",
        prevention: "Use virus-free seeds, control vectors",
      },
      "black spots": {
        disease: "Early Blight",
        treatment: "Apply Mancozeb fungicide",
        prevention: "Crop rotation, proper spacing",
      },
    },
  };

  const cropDiseases =
    diseaseDatabase[crop.toLowerCase() as keyof typeof diseaseDatabase];
  if (!cropDiseases) {
    return {
      disease: "Unknown crop or disease",
      treatment: "Consult local agricultural extension officer",
      prevention: "Follow general crop management practices",
    };
  }

  const symptomKey = Object.keys(cropDiseases).find((key) =>
    symptoms.toLowerCase().includes(key.toLowerCase())
  );

  return symptomKey
    ? (
        cropDiseases as Record<
          string,
          { disease: string; treatment: string; prevention: string }
        >
      )[symptomKey]
    : {
        disease: "Symptoms not recognized",
        treatment: "Send photos to agricultural expert for diagnosis",
        prevention: "Maintain good field hygiene",
      };
};

// Crop calendar and growth stage calculator
type CropName = "rice" | "wheat" | "maize";

const getCropGrowthStage = (crop: string, plantingDate: Date) => {
  const now = new Date();
  const daysSincePlanting = Math.floor(
    (now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const cropCalendars: Record<
    CropName,
    Record<string, { start: number; end: number }>
  > = {
    rice: {
      germination: { start: 0, end: 10 },
      vegetative: { start: 10, end: 55 },
      reproductive: { start: 55, end: 85 },
      maturity: { start: 85, end: 120 },
    },
    wheat: {
      germination: { start: 0, end: 15 },
      vegetative: { start: 15, end: 70 },
      reproductive: { start: 70, end: 110 },
      maturity: { start: 110, end: 130 },
    },
    maize: {
      germination: { start: 0, end: 10 },
      vegetative: { start: 10, end: 60 },
      reproductive: { start: 60, end: 90 },
      maturity: { start: 90, end: 120 },
    },
  };

  const cropKey = crop.toLowerCase() as CropName;
  const calendar = cropCalendars[cropKey];
  if (!calendar) return "Unknown crop";

  for (const [stage, period] of Object.entries(calendar)) {
    if (daysSincePlanting >= period.start && daysSincePlanting <= period.end) {
      return stage;
    }
  }
  return "Harvest ready";
};

// Soil health assessment
const assessSoilHealth = (
  soilType: string,
  pH: number,
  organicMatter: number
) => {
  const recommendations = [];

  if (pH < 6.0) {
    recommendations.push("Apply lime to increase pH");
  } else if (pH > 8.0) {
    recommendations.push("Apply sulfur to decrease pH");
  }

  if (organicMatter < 2.0) {
    recommendations.push("Add compost or organic matter");
  }

  const soilSpecificAdvice = {
    clay: "Improve drainage, add organic matter to enhance structure",
    sandy: "Increase water retention with organic matter",
    loamy: "Maintain current soil structure with regular organic amendments",
    silt: "Prevent compaction, improve drainage if needed",
  };

  return {
    pH_status: pH < 6 ? "Acidic" : pH > 7 ? "Alkaline" : "Neutral",
    organic_matter_level:
      organicMatter < 2 ? "Low" : organicMatter > 4 ? "High" : "Adequate",
    recommendations: recommendations,
    soil_specific_advice:
      soilSpecificAdvice[
        soilType.toLowerCase() as keyof typeof soilSpecificAdvice
      ] || "General soil management practices",
  };
};

// Market price prediction algorithm
const predictMarketTrend = (
  historicalPrices: number[],
  currentPrice: number
) => {
  if (historicalPrices.length < 3) return "Insufficient data";

  const recentPrices = historicalPrices.slice(-3);
  const avgRecentPrice =
    recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;

  if (currentPrice > avgRecentPrice * 1.1) {
    return "Upward trend - Good time to sell";
  } else if (currentPrice < avgRecentPrice * 0.9) {
    return "Downward trend - Consider holding if storage available";
  } else {
    return "Stable prices - Neutral market";
  }
};

// Government scheme matcher
type SchemeCategory = "subsidy" | "insurance" | "loan" | "technology";

const matchGovernmentSchemes = (farmerProfile: any, category: string) => {
  const schemes = {
    subsidy: [
      {
        name: "PM-KISAN",
        eligibility: "All farmers",
        benefit: "₹6,000 per year",
        application: "Online or Common Service Centers",
      },
      {
        name: "Fertilizer Subsidy",
        eligibility: "All farmers",
        benefit: "50% subsidy on fertilizers",
        application: "Through authorized dealers",
      },
    ],
    insurance: [
      {
        name: "Pradhan Mantri Fasal Bima Yojana",
        eligibility: "All farmers",
        benefit: "Crop insurance coverage",
        application: "Banks and insurance companies",
      },
    ],
    loan: [
      {
        name: "Kisan Credit Card",
        eligibility: "Farmers with land documents",
        benefit: "Low-interest agricultural loans",
        application: "Banks and cooperative societies",
      },
    ],
    technology: [
      {
        name: "Sub-Mission on Agricultural Mechanization",
        eligibility: "Small and marginal farmers",
        benefit: "50% subsidy on agricultural machinery",
        application: "State agriculture departments",
      },
    ],
  };

  const key = category.toLowerCase() as SchemeCategory;
  return schemes[key] || schemes.subsidy;
};

// Water requirement calculator
const calculateWaterRequirement = (
  crop: string,
  stage: string,
  weather: any,
  soilType: string
) => {
  const cropWaterRequirements = {
    rice: { vegetative: 8, reproductive: 12, maturity: 6 }, // mm/day
    wheat: { vegetative: 4, reproductive: 6, maturity: 3 },
    maize: { vegetative: 5, reproductive: 8, maturity: 4 },
    tomato: { vegetative: 4, reproductive: 6, maturity: 3 },
  };

  type CropKey = keyof typeof cropWaterRequirements;
  type StageKey = keyof (typeof cropWaterRequirements)["rice"];

  const cropKey = crop.toLowerCase() as CropKey;
  const stageKey = stage.toLowerCase() as StageKey;

  const baseRequirement = cropWaterRequirements[cropKey]?.[stageKey] ?? 5;

  // Adjust for weather conditions
  let adjustment = 1;
  if (weather?.temperature && parseInt(weather.temperature) > 30) {
    adjustment *= 1.2; // Increase for hot weather
  }
  if (weather?.humidity && parseInt(weather.humidity) < 50) {
    adjustment *= 1.1; // Increase for low humidity
  }

  // Adjust for soil type
  const soilAdjustment = {
    sandy: 1.3,
    clay: 0.8,
    loamy: 1.0,
    silt: 0.9,
  };

  adjustment *=
    soilAdjustment[soilType.toLowerCase() as keyof typeof soilAdjustment] ||
    1.0;

  return Math.round(baseRequirement * adjustment);
};

// Types
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  isAIMessage: boolean;
}

interface FarmerProfile {
  name: string;
  age: number;
  place: string;
  district: string;
  land_size: number;
  soil_type: string;
  crops_grown: string[];
  tools_owned: string[];
  experience_years: number;
  phone_number?: string;
  created_at: Date;
  updated_at: Date;
}

interface CropDecision {
  event: string;
  decision: string;
  result: string;
  crop_name: string;
  season: string;
  timestamp: Date;
}

interface Reminder {
  id: string;
  task: string;
  date_time: Date;
  is_completed: boolean;
  farmer_id: string;
  created_at: Date;
}

interface WeeklyPlan {
  farmer_id: string;
  week_start: Date;
  tasks: {
    task: string;
    priority: "high" | "medium" | "low";
    estimated_duration: string;
    weather_dependent: boolean;
  }[];
  crop_stage: string;
  weather_considerations: string;
}

interface ToolResponse {
  functionResponses: LiveFunctionResponse[];
}

interface LiveFunctionResponse {
  id: string;
  name: string;
  response: {
    result: {
      string_value?: string;
      object_value?: any;
    };
  };
}

// Extended Tool Definitions with all agriculture functions
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      // Database Integration Functions
      {
        name: "create_farmer_profile",
        description: "Creates a new farmer profile with basic information",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            age: { type: SchemaType.NUMBER },
            place: { type: SchemaType.STRING },
            district: { type: SchemaType.STRING },
            land_size: { type: SchemaType.NUMBER },
            soil_type: { type: SchemaType.STRING },
            crops_grown: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            tools_owned: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            experience_years: { type: SchemaType.NUMBER },
            phone_number: { type: SchemaType.STRING },
          },
          required: [
            "name",
            "age",
            "place",
            "district",
            "land_size",
            "soil_type",
            "experience_years",
          ],
        },
      },
      {
        name: "update_farmer_profile",
        description: "Updates specific farmer profile information",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            data_type: { type: SchemaType.STRING },
            value: { type: SchemaType.STRING },
          },
          required: ["data_type", "value"],
        },
      },
      {
        name: "get_personalized_advice",
        description:
          "Generates personalized farming advice based on farmer profile and current conditions",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            current_crop: { type: SchemaType.STRING },
            growth_stage: { type: SchemaType.STRING },
            specific_concern: { type: SchemaType.STRING },
          },
          required: ["current_crop"],
        },
      },
      {
        name: "record_past_decision",
        description:
          "Records farming decisions and their outcomes for learning",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            event: { type: SchemaType.STRING },
            decision: { type: SchemaType.STRING },
            result: { type: SchemaType.STRING },
            crop_name: { type: SchemaType.STRING },
            season: { type: SchemaType.STRING },
          },
          required: ["event", "decision", "result"],
        },
      },
      {
        name: "generate_weekly_plan",
        description:
          "Creates a weekly farming plan based on crop stage and weather",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            current_crop: { type: SchemaType.STRING },
            crop_stage: { type: SchemaType.STRING },
            weather_forecast: { type: SchemaType.STRING },
          },
          required: ["current_crop", "crop_stage"],
        },
      },
      {
        name: "compare_crop_choices",
        description:
          "Recommends best crop choices based on season and land area",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            season: { type: SchemaType.STRING },
            land_area: { type: SchemaType.NUMBER },
          },
          required: ["season", "land_area"],
        },
      },
      {
        name: "reminder_set",
        description: "Sets farming task reminders",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            task: { type: SchemaType.STRING },
            date_time: { type: SchemaType.STRING },
          },
          required: ["task", "date_time"],
        },
      },
      {
        name: "get_reminders",
        description: "Retrieves upcoming farming reminders",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            days_ahead: { type: SchemaType.NUMBER },
          },
        },
      },

      // External API Integration Functions
      {
        name: "get_weather_forecast",
        description: "Provides localized weather updates",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            location: { type: SchemaType.STRING },
            days: { type: SchemaType.NUMBER },
          },
          required: ["location"],
        },
      },
      {
        name: "crop_advice",
        description: "Gives context-aware crop advice",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            crop_name: { type: SchemaType.STRING },
            growth_stage: { type: SchemaType.STRING },
            location: { type: SchemaType.STRING },
          },
          required: ["crop_name", "growth_stage", "location"],
        },
      },
      {
        name: "soil_health_recommendation",
        description: "Suggests soil amendments and nutrient plans",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            soil_type: { type: SchemaType.STRING },
            pH: { type: SchemaType.NUMBER },
            crop_type: { type: SchemaType.STRING },
          },
          required: ["soil_type", "crop_type"],
        },
      },
      {
        name: "disease_diagnosis",
        description:
          "Diagnoses crop diseases and provides treatment recommendations",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symptoms: { type: SchemaType.STRING },
            crop_name: { type: SchemaType.STRING },
          },
          required: ["symptoms", "crop_name"],
        },
      },
      {
        name: "market_price_info",
        description: "Provides real-time market prices",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            crop_name: { type: SchemaType.STRING },
            location: { type: SchemaType.STRING },
          },
          required: ["crop_name", "location"],
        },
      },
      {
        name: "govt_scheme_info",
        description:
          "Provides information about government schemes for farmers",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            category: { type: SchemaType.STRING },
            state: { type: SchemaType.STRING },
          },
          required: ["category"],
        },
      },
      {
        name: "speak_text",
        description: "Converts text to speech",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING },
          },
          required: ["text"],
        },
      },

      // Extra Functions
      {
        name: "connect_to_agri_expert",
        description: "Connects farmer to agricultural experts",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            expertise_needed: { type: SchemaType.STRING },
          },
          required: ["question"],
        },
      },
      {
        name: "community_query",
        description: "Fetches advice from nearby farmers",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            crop_type: { type: SchemaType.STRING },
          },
          required: ["question"],
        },
      },
      {
        name: "send_alert_to_nearby_farmers",
        description: "Sends alerts to nearby farmers about pests or diseases",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            alert_type: { type: SchemaType.STRING },
            severity: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
          },
          required: ["alert_type", "description"],
        },
      },
      {
        name: "water_need_prediction",
        description: "Predicts irrigation requirements",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            crop_type: { type: SchemaType.STRING },
            days_since_rain: { type: SchemaType.NUMBER },
            soil_moisture: { type: SchemaType.NUMBER },
          },
          required: ["crop_type", "days_since_rain"],
        },
      },
      {
        name: "harvest_prediction",
        description: "Predicts harvest date and market timing",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            crop_name: { type: SchemaType.STRING },
            planting_date: { type: SchemaType.STRING },
            growth_stage: { type: SchemaType.STRING },
          },
          required: ["crop_name"],
        },
      },
    ],
  },
];

// System Instructions for Agriculture AI
const systemInstructionObject = {
  parts: [
    {
      text: `You are an AI assistant named 'Agriguru', designed to support farmers and agricultural workers in managing their daily farming activities and decision-making. Your role is to:

- Provide personalized farming advice based on location, crop type, season, and user experience level
- Suggest best practices for soil preparation, sowing, irrigation, fertilization, pest control, and harvesting
- Explain complex agricultural information in simple, easy-to-understand language
- Alert users about weather forecasts, pest outbreaks, market prices, and government schemes
- Help troubleshoot common farming issues such as nutrient deficiencies, crop diseases, and irrigation problems
- Connect users to verified resources like agriculture officers, local cooperatives, or farm supply centers when needed
- Help plan crop rotation, intercropping, and sustainable farming techniques
- Read instructions or advice aloud when requested
- Maintain a respectful, encouraging, and empowering tone
- Translate agricultural terms into regional language when necessary
- Keep messages clear, helpful, and culturally sensitive
- Avoid slang or jargon that might confuse less tech-savvy users
- Encourage eco-friendly and cost-effective methods wherever possible
- Use structured lists or step-by-step formats for clarity
- Always verify facts before responding to ensure trust and safety

Before giving farming advice or alerts, check for user's location, crop details, and current issues (if provided). Your goal is to be a patient, friendly, and knowledgeable digital companion for every farmer—whether small-scale or large-scale—helping them grow smarter and live better.`,
    },
  ],
};

const AgricultureAIAssistantComponent: React.FC<{ currentUserId: string }> = ({
  currentUserId,
}) => {
  const { client, setConfig, connect, connected } = useLiveAPIContext();
  const db = getFirestore(app);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: systemInstructionObject,
      tools: toolObject,
    });
  }, [setConfig]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  // Mock external API functions (replace with real API calls)
  const mockWeatherAPI = async (location: string) => {
    // Replace with actual weather API call
    return {
      location,
      temperature: "28°C",
      humidity: "65%",
      rainfall_prediction: "Light rain expected tomorrow",
      wind_speed: "12 km/h",
    };
  };

  const mockCropAdviceAPI = async (
    crop_name: string,
    growth_stage: string,
    location: string
  ) => {
    // Replace with actual agriculture API
    return {
      advice: `For ${crop_name} in ${growth_stage} stage at ${location}, apply balanced fertilizer and ensure proper drainage.`,
      fertilizer_recommendation: "NPK 20-10-10",
      watering_schedule: "Water every 3-4 days",
    };
  };

  const mockMarketPriceAPI = async (crop_name: string, location: string) => {
    // Replace with actual market price API
    return {
      current_price: "₹2,500 per quintal",
      market_trend: "Stable",
      nearby_mandis: ["Kochi Mandi", "Ernakulam Market"],
    };
  };

  // Handle tool calls
  useEffect(() => {
    const onToolCall = async (toolCall: any) => {
      const fCalls = toolCall.functionCalls;
      const functionResponses: LiveFunctionResponse[] = [];

      if (fCalls.length > 0) {
        for (const fCall of fCalls) {
          let functionResponse: LiveFunctionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: {
                string_value: `${fCall.name} completed successfully.`,
              },
            },
          };

          try {
            switch (fCall.name) {
              case "create_farmer_profile": {
                const args = fCall.args as any;
                const profileData: FarmerProfile = {
                  ...args,
                  created_at: new Date(),
                  updated_at: new Date(),
                };

                await setDoc(
                  doc(db, "farmer_profiles", currentUserId),
                  profileData
                );
                functionResponse.response.result = {
                  string_value: "Farmer profile created successfully!",
                };
                break;
              }

              case "update_farmer_profile": {
                const args = fCall.args as any;
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                await updateDoc(profileRef, {
                  [args.data_type]: args.value,
                  updated_at: new Date(),
                });
                functionResponse.response.result = {
                  string_value: `Profile updated: ${args.data_type} set to ${args.value}`,
                };
                break;
              }

              case "get_personalized_advice": {
                const args = fCall.args as any;
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                const profileDoc = await getDoc(profileRef);

                if (profileDoc.exists()) {
                  const profileData = profileDoc.data();
                  const advice = {
                    general_advice: `Based on your ${profileData.experience_years} years of experience with ${args.current_crop}, here's personalized advice for your ${profileData.land_size} acre farm.`,
                    soil_specific: `For ${profileData.soil_type} soil, consider organic amendments.`,
                    weather_based:
                      "Current weather conditions suggest adjusting irrigation schedule.",
                  };
                  functionResponse.response.result = {
                    object_value: advice,
                  };
                } else {
                  functionResponse.response.result = {
                    string_value:
                      "Please create your farmer profile first to get personalized advice.",
                  };
                }
                break;
              }

              case "record_past_decision": {
                const args = fCall.args as any;
                const decisionData: CropDecision = {
                  ...args,
                  timestamp: new Date(),
                };

                await addDoc(collection(db, "crop_decisions"), {
                  ...decisionData,
                  farmer_id: currentUserId,
                });
                functionResponse.response.result = {
                  string_value: "Decision recorded for future learning.",
                };
                break;
              }

              case "generate_weekly_plan": {
                const args = fCall.args as any;
                const weeklyPlan: WeeklyPlan = {
                  farmer_id: currentUserId,
                  week_start: new Date(),
                  crop_stage: args.crop_stage,
                  weather_considerations:
                    args.weather_forecast || "Normal weather expected",
                  tasks: [
                    {
                      task: `Monitor ${args.current_crop} growth`,
                      priority: "high",
                      estimated_duration: "2 hours",
                      weather_dependent: false,
                    },
                    {
                      task: "Check soil moisture",
                      priority: "medium",
                      estimated_duration: "1 hour",
                      weather_dependent: true,
                    },
                  ],
                };

                await addDoc(collection(db, "weekly_plans"), weeklyPlan);
                functionResponse.response.result = {
                  object_value: weeklyPlan,
                };
                break;
              }

              case "compare_crop_choices": {
                const args = fCall.args as any;
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                const profileDoc = await getDoc(profileRef);

                const recommendations = {
                  season: args.season,
                  recommended_crops: ["Rice", "Wheat", "Maize"],
                  profit_potential: {
                    rice: "High",
                    wheat: "Medium",
                    maize: "High",
                  },
                  suitability_score: {
                    rice: 85,
                    wheat: 70,
                    maize: 90,
                  },
                };

                functionResponse.response.result = {
                  object_value: recommendations,
                };
                break;
              }

              case "reminder_set": {
                const args = fCall.args as any;
                const reminderData: Reminder = {
                  id: `reminder_${Date.now()}`,
                  task: args.task,
                  date_time: new Date(args.date_time),
                  is_completed: false,
                  farmer_id: currentUserId,
                  created_at: new Date(),
                };

                await addDoc(collection(db, "reminders"), reminderData);
                functionResponse.response.result = {
                  string_value: `Reminder set for ${args.task} on ${args.date_time}`,
                };
                break;
              }

              case "connect_to_agri_expert": {
                const args = fCall.args as any;

                const expertRequest = {
                  id: `expert_request_${Date.now()}`,
                  question: args.question,
                  expertise_needed: args.expertise_needed || "general",
                  farmer_id: currentUserId,
                  status: "pending", // You can update this later when an expert is assigned
                  created_at: new Date(),
                };

                await addDoc(collection(db, "expert_requests"), expertRequest);

                functionResponse.response.result = {
                  string_value: `Your request has been sent to an agricultural expert. You will be contacted shortly for help with "${args.question}".`,
                };
                break;
              }

              case "get_reminders": {
                const args = fCall.args as any;
                const days = args.days_ahead || 7;
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + days);

                const remindersRef = collection(db, "reminders");
                const q = query(
                  remindersRef,
                  where("farmer_id", "==", currentUserId),
                  where("date_time", "<=", futureDate),
                  where("is_completed", "==", false),
                  orderBy("date_time")
                );

                const querySnapshot = await getDocs(q);
                const reminders = querySnapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                functionResponse.response.result = {
                  object_value: { reminders },
                };
                break;
              }

              case "get_weather_forecast": {
                const args = fCall.args as any;
                const weatherData = await mockWeatherAPI(args.location);
                functionResponse.response.result = {
                  object_value: weatherData,
                };
                break;
              }

              case "crop_advice": {
                const args = fCall.args as any;
                const adviceData = await mockCropAdviceAPI(
                  args.crop_name,
                  args.growth_stage,
                  args.location
                );
                functionResponse.response.result = {
                  object_value: adviceData,
                };
                break;
              }

              case "soil_health_recommendation": {
                const args = fCall.args as any;
                const soilRecommendation = assessSoilHealth(
                  args.soil_type,
                  args.pH || 7,
                  args.organic_matter || 2
                );

                // Store soil test results
                await addDoc(collection(db, "soil_tests"), {
                  farmer_id: currentUserId,
                  soil_type: args.soil_type,
                  pH: args.pH,
                  crop_type: args.crop_type,
                  test_date: new Date(),
                  recommendations: soilRecommendation,
                });

                functionResponse.response.result = {
                  object_value: soilRecommendation,
                };
                break;
              }

              case "disease_diagnosis": {
                const args = fCall.args as any;
                const diagnosis = diagnoseCropDisease(
                  args.symptoms,
                  args.crop_name
                );

                // Store disease report
                await addDoc(collection(db, "disease_reports"), {
                  farmer_id: currentUserId,
                  crop_name: args.crop_name,
                  symptoms: args.symptoms,
                  diagnosis: diagnosis,
                  report_date: new Date(),
                  location: "farmer_location", // Get from profile
                });

                functionResponse.response.result = {
                  object_value: {
                    ...diagnosis,
                    emergency_contact:
                      "Contact local agricultural extension officer immediately if symptoms worsen",
                  },
                };
                break;
              }

              case "market_price_info": {
                const args = fCall.args as any;

                // Try to get real market data (mock implementation)
                const priceInfo = await mockMarketPriceAPI(
                  args.crop_name,
                  args.location
                );

                // Store price query for trend analysis
                await addDoc(collection(db, "price_queries"), {
                  farmer_id: currentUserId,
                  crop_name: args.crop_name,
                  location: args.location,
                  queried_price: priceInfo.current_price,
                  query_date: new Date(),
                });

                // Get historical prices for trend analysis
                const priceHistoryRef = collection(db, "price_history");
                const priceQuery = query(
                  priceHistoryRef,
                  where("crop_name", "==", args.crop_name),
                  where("location", "==", args.location),
                  orderBy("date", "desc"),
                  limit(30)
                );

                const priceSnapshot = await getDocs(priceQuery);
                const historicalPrices = priceSnapshot.docs.map(
                  (doc) => doc.data().price
                );

                const trendAnalysis = predictMarketTrend(
                  historicalPrices,
                  parseInt(priceInfo.current_price.replace(/[^\d]/g, ""))
                );

                functionResponse.response.result = {
                  object_value: {
                    ...priceInfo,
                    trend_analysis: trendAnalysis,
                    price_history: historicalPrices.slice(0, 7), // Last 7 days
                  },
                };
                break;
              }

              case "govt_scheme_info": {
                const args = fCall.args as any;

                // Get farmer profile for targeted scheme matching
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                const profileDoc = await getDoc(profileRef);
                const profileData = profileDoc.exists()
                  ? profileDoc.data()
                  : null;

                const schemes = matchGovernmentSchemes(
                  profileData,
                  args.category
                );

                functionResponse.response.result = {
                  object_value: {
                    category: args.category,
                    matched_schemes: schemes,
                    personalized_eligibility: profileData
                      ? `Based on your ${profileData.land_size} acre farm, you are eligible for most schemes`
                      : "Create your profile for personalized scheme recommendations",
                  },
                };
                break;
              }

              case "water_need_prediction": {
                const args = fCall.args as any;

                // Get farmer profile for soil type
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                const profileDoc = await getDoc(profileRef);
                const profileData = profileDoc.exists()
                  ? profileDoc.data()
                  : null;

                // Get current weather
                const weatherData = await mockWeatherAPI(
                  profileData?.place || "default"
                );

                const dailyWaterReq = calculateWaterRequirement(
                  args.crop_type,
                  "vegetative", // Default stage
                  weatherData,
                  profileData?.soil_type || "loamy"
                );

                const waterPrediction = {
                  crop_type: args.crop_type,
                  days_since_rain: args.days_since_rain,
                  soil_moisture: args.soil_moisture || "unknown",
                  daily_water_requirement: `${dailyWaterReq} mm/day`,
                  irrigation_needed:
                    args.days_since_rain > 3 ? "Yes" : "Monitor",
                  irrigation_amount:
                    args.days_since_rain > 3
                      ? `${dailyWaterReq * args.days_since_rain} mm total`
                      : "Check soil moisture first",
                  next_irrigation:
                    args.days_since_rain > 3
                      ? "Irrigate immediately"
                      : "Check again in 24 hours",
                  water_saving_tips: [
                    "Use drip irrigation if available",
                    "Mulch around plants",
                    "Irrigate early morning or evening",
                  ],
                };

                // Store irrigation record
                await addDoc(collection(db, "irrigation_records"), {
                  farmer_id: currentUserId,
                  crop_type: args.crop_type,
                  prediction: waterPrediction,
                  recorded_date: new Date(),
                });

                functionResponse.response.result = {
                  object_value: waterPrediction,
                };
                break;
              }

              case "harvest_prediction": {
                const args = fCall.args as any;

                // Get farmer profile and crop records
                const profileRef = doc(db, "farmer_profiles", currentUserId);
                const profileDoc = await getDoc(profileRef);
                const profileData = profileDoc.exists()
                  ? profileDoc.data()
                  : null;

                // Calculate harvest date based on planting date
                const plantingDate = args.planting_date
                  ? new Date(args.planting_date)
                  : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago default

                const currentStage = getCropGrowthStage(
                  args.crop_name,
                  plantingDate
                );

                // Calculate expected harvest date
                const cropDurations = {
                  rice: 120,
                  wheat: 130,
                  maize: 120,
                  tomato: 80,
                };
                type CropDurationKey = keyof typeof cropDurations;
                const cropKey = args.crop_name.toLowerCase() as CropDurationKey;
                const duration = cropDurations[cropKey] || 100;
                const expectedHarvest = new Date(
                  plantingDate.getTime() + duration * 24 * 60 * 60 * 1000
                );
                const daysToHarvest = Math.ceil(
                  (expectedHarvest.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );

                const harvestPrediction = {
                  crop_name: args.crop_name,
                  planting_date: plantingDate.toDateString(),
                  current_growth_stage: currentStage,
                  estimated_harvest_date: expectedHarvest.toDateString(),
                  days_to_harvest: daysToHarvest > 0 ? daysToHarvest : 0,
                  harvest_readiness:
                    daysToHarvest <= 0
                      ? "Ready for harvest"
                      : daysToHarvest <= 14
                      ? "Harvest soon"
                      : "Still growing",
                  market_timing_advice:
                    daysToHarvest <= 7
                      ? "Check current market prices before harvesting"
                      : "Monitor market trends for optimal timing",
                  preparation_checklist: [
                    "Check crop maturity indicators",
                    "Prepare harvesting equipment",
                    "Arrange storage or immediate sale",
                    "Check weather forecast for harvest window",
                  ],
                };

                // Store harvest prediction
                await addDoc(collection(db, "harvest_predictions"), {
                  farmer_id: currentUserId,
                  prediction: harvestPrediction,
                  predicted_date: new Date(),
                });

                functionResponse.response.result = {
                  object_value: harvestPrediction,
                };
                break;
              }

              default:
                functionResponse.response.result = {
                  string_value: `Function ${fCall.name} not implemented yet.`,
                };
            }
          } catch (error) {
            console.error(`Error in ${fCall.name}:`, error);
            functionResponse.response.result = {
              string_value: `Error executing ${fCall.name}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            };
          }

          functionResponses.push(functionResponse);
        }

        const newToolResponse: ToolResponse = {
          functionResponses: functionResponses,
        };
        setToolResponse(newToolResponse);
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, currentUserId, db]);

  // Send tool responses back to the model
  useEffect(() => {
    if (toolResponse) {
      client.sendToolResponse(toolResponse);
      setToolResponse(null);
    }
  }, [toolResponse, client]);

  // Reminder notification system
  useEffect(() => {
    if (!currentUserId) return;

    const checkReminders = async () => {
      const now = new Date();
      const remindersRef = collection(db, "reminders");
      const q = query(
        remindersRef,
        where("farmer_id", "==", currentUserId),
        where("date_time", "<=", now),
        where("is_completed", "==", false)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        const reminderData = doc.data();
        // Send reminder through voice
        client.send({
          text: `Reminder: ${reminderData.task}`,
        });

        // Mark reminder as completed
        await updateDoc(doc.ref, { is_completed: true });
      });
    };

    // Check reminders every minute
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [currentUserId, db, client]);

  return (
    <div className="flex h-screen p-4 bg-green-50">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-green-800 mb-4">
            🌾 Agriguru - Your Smart Farming Assistant
          </h1>
          <div className="text-gray-600 mb-4">
            Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>
          <div className="text-sm text-gray-500">
            Say "Hey Agriguru" to start conversation. Available functions:
            <ul className="mt-2 space-y-1">
              <li>• Create and update farmer profile</li>
              <li>• Get personalized farming advice</li>
              <li>• Set farming reminders</li>
              <li>• Check weather forecast</li>
              <li>• Get crop advice and disease diagnosis</li>
              <li>• Check market prices</li>
              <li>• Connect with agricultural experts</li>
              <li>• Community queries and alerts</li>
              <li>• Water need and harvest predictions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AgricultureAIAssistant = memo(AgricultureAIAssistantComponent);
