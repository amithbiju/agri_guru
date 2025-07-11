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
} from "firebase/firestore";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { MessageSquare, Users } from 'lucide-react';

// Types
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  isAIMessage: boolean;
}

interface SendMessageArgs {
  name: string;
  content: string;
}

interface FindUserArgs {
  interests: string[];
  ageRange: {
    min: number;
    max: number;
  };
}

interface SendConnectArgs {
  userid: string;
  friendName: string;
}
interface user {
  name: string;
  interests: string[];
  age: number;
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

// Option 1: If GenerativeContentBlob is an interface
interface GenerativeContentBlob {
  // existing properties
  model_turn?: string; // Adding the new property
}
// Option 3: If you can't modify the original type, create an extended type
type ExtendedGenerativeContentBlob = GenerativeContentBlob & {
  model_turn: string;
};
// Tool Definitions remain the same
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "send_message",
        description:
          "Sends a message to a specific user through the AI assistant",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
            },
            content: {
              type: SchemaType.STRING,
            },
          },
          required: ["name", "content"],
        },
      },
      {
        name: "find_users",
        description: "Finds users based on interests and age range",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            interests: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
              },
            },
            ageRange: {
              type: SchemaType.OBJECT,
              properties: {
                min: { type: SchemaType.NUMBER },
                max: { type: SchemaType.NUMBER },
              },
            },
          },
          required: ["interests", "ageRange"],
        },
      },
      {
        name: "connect_user",
        description:
          "Add a specific user to connected friends list through the AI assistant, take the userid and friendName as userid and name in the find_users function",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            userid: {
              type: SchemaType.STRING,
            },
            friendName: {
              type: SchemaType.STRING,
            },
          },
          required: ["userid", "friendName"],
        },
      },
      {
        name: "add_symptoms",
        description:
          "adds the details of symptoms and problems faced by the user in simplified language",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content: {
              type: SchemaType.STRING,
            },
          },
          required: ["content"],
        },
      },
      {
        name: "read_message",
        description: "Reads the message content aloud using text-to-speech",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            messageContent: {
              type: SchemaType.STRING,
            },
          },
          required: ["messageContent"],
        },
      },
    ],
  },
];

// System Instructions remain the same
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

Before giving farming advice or alerts, check for user’s location, crop details, and current issues (if provided). Your goal is to be a patient, friendly, and knowledgeable digital companion for every farmer—whether small-scale or large-scale—helping them grow smarter and live better.`,
    },
  ],
};

// Chips arrays remain the same
const INITIAL_SCREEN_CHIPS = [
  { label: "👋 Say Hello", message: "I'd like to say hello to someone new" },
  {
    label: "🎨 Find Hobby Friends",
    message: "Find people who share my interests",
  },
  { label: "💭 Start Chat", message: "I want to start a conversation" },
  { label: "🤝 Meet Others", message: "Help me meet other people" },
];

const CHAT_SCREEN_CHIPS = [
  { label: "📢 Read Message", message: "Please read this message aloud" },
  { label: "💡 Suggestion", message: "Help me write a friendly response" },
  { label: "😊 Add Emojis", message: "Make my message more engaging" },
  { label: "🔍 Find Similar", message: "Find people with similar interests" },
];

const ElderlyAIAssistantComponent: React.FC<{ currentUserId: string }> = ({
  currentUserId,
}) => {
  const { client, setConfig, connect, connected } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio", // switch to "audio" for audio out
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: systemInstructionObject,
      tools: toolObject,
    });
  }, [setConfig]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  const db = getFirestore(app);
  // Config and message listener effects remain the same...

  // Handle tool calls with fixed types
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
                string_value: `${fCall.name} OK.`,
              },
            },
          };

          switch (fCall.name) {
            case "send_message": {
              const args = fCall.args as SendMessageArgs;

              const usersRef = collection(db, "connected");
              const q = query(usersRef, where("friendName", "==", args.name));

              const querySnapshot = await getDocs(q);

              if (!querySnapshot.empty) {
                // Assuming only one match
                const recipientDoc = querySnapshot.docs[0];
                const recipientData = recipientDoc.data();
                const recipientId = recipientData.friendId; // or recipientData.uid if UID is stored inside

                await addDoc(collection(db, "messages"), {
                  senderId: currentUserId,
                  recipientId: recipientId,
                  content: args.content,
                  timestamp: serverTimestamp(),
                  isAIMessage: false,
                });
              } else {
                console.error("Recipient not found for friendName:", args.name);
                functionResponse.response.result = {
                  object_value: { error: "Failed to fetch users." }, // ✅ Wrap error in object_value
                };
              }

              break;
            }

            case "find_users": {
              const args = fCall.args as FindUserArgs;
              const usersRef = collection(db, "users");
              const q = query(
                usersRef,
                where("interests", "array-contains-any", args.interests),
                where("age", ">=", args.ageRange.min),
                where("age", "<=", args.ageRange.max)
              );
              try {
                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs.map((doc) => ({
                  ...doc.data(),
                }));
                console.log("users are :-", users);
                functionResponse.response.result = {
                  object_value: { users }, // ✅ Wrap users in object_value
                };
              } catch (error) {
                console.error("Error fetching users:", error);
                functionResponse.response.result = {
                  object_value: { error: "Failed to fetch users." }, // ✅ Wrap error in object_value
                };
              }
              break;
            }
            case "connect_user": {
              const args = fCall.args as SendConnectArgs;
              await addDoc(collection(db, "connected"), {
                senderId: currentUserId,
                friendId: args.userid,
                friendName: args.friendName,
              });
              break;
            }
            case "add_symptoms": {
              const args = fCall.args as SendMessageArgs;
              await addDoc(collection(db, "symptoms"), {
                senderId: currentUserId,
                content: args.content,
                timestamp: serverTimestamp(),
                isAIMessage: false,
              });
              break;
            }
            case "read_message": {
              // Text-to-speech implementation would go here
              break;
            }
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

  //message anouncer
  // Add a realtime listener for incoming messages
  useEffect(() => {
    if (!currentUserId) return;

    const messagesRef = collection(db, "messages");
    // Query for messages where the recipient is the current user
    const q = query(
      messagesRef,
      where("recipientId", "==", currentUserId),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    // Set up a realtime listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        // Check for new messages
        querySnapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            // Only process newly added messages
            console.log(change);

            const messageData = change.doc.data();
            const messageTimestamp =
              messageData.timestamp?.toDate() || new Date();

            // Only process recent messages (within the last minute)
            // const isRecent =
            //   new Date().getTime() - messageTimestamp.getTime() < 6000000;

            // If it's a new message (not from history) and not from the AI
            if (messageData.recipientId === currentUserId) {
              // Send the message to the model using sendContent method
              client.send({
                text: `Please read this message to the user: You've received a new message from ${messageData.senderId}: "${messageData.content}"`,
              });

              // Add this message to the messages state using the correct Message format
              const newMessage: Message = {
                id: change.doc.id,
                senderId: messageData.senderId,
                recipientId: messageData.recipientId,
                content: messageData.content,
                timestamp: messageData.timestamp,
                isAIMessage: false,
              };

              setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
          }
        });
      },
      (error) => {
        console.error("Error listening for new messages:", error);
      }
    );

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [currentUserId, db, client]);

  // Rest of the component remains the same...

  return (
    <div className="flex h-screen p-4">
      {/* <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Friendly Chat Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-[400px] overflow-y-auto border rounded-lg p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.isAIMessage ? 'text-blue-600' : ''
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="text-lg"
                disabled={isProcessing}
              />
              <Button 
                onClick={() => sendMessage(messageInput)}
                disabled={isProcessing || !messageInput.trim()}
                className="text-lg px-6"
              >
                Send
              </Button>
            </div>

            <div className="mt-4">
              <div className="text-lg font-medium mb-2">Quick Actions:</div>
              <div className="flex flex-wrap gap-2">
                {(messages.length === 0 ? INITIAL_SCREEN_CHIPS : CHAT_SCREEN_CHIPS).map((chip) => (
                  <Button
                    key={chip.label}
                    variant="outline"
                    onClick={() => {
                      if (!isProcessing) {
                        sendMessage(chip.message);
                      }
                    }}
                    className="text-lg"
                  >
                    {chip.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export const ElderlyAIAssistant = memo(ElderlyAIAssistantComponent);
