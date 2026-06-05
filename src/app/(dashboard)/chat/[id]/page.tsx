"use client";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { Send, User as UserIcon, Bot, Paperclip, X } from "lucide-react";
// import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, use } from "react";

export default function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const { id } = use(params);
  // const router = useRouter();
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchChat = async () => {
      const { data, error } = await supabase
        .from("chat")
        .select("chat")
        .eq("chat_id", Number(id))
        .single();

      if (!error && data) {
        setChatLog(data.chat || []);
      }
      setLoading(false);
    };

    fetchChat();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || sending) return;

    const userText = input.trim() || "[Gambar]";
    // Append [IMAGE] indicator in chat log if there's an image
    const logText = selectedImage ? `User: ${userText}\n[Gambar Terlampir]` : `User: ${userText}`;
    const updatedLogUser = [...chatLog, logText];
    
    setChatLog(updatedLogUser);
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setSending(true);

    try {
      // API call to Gemini (using existing route but simplified payload)
      // Since our new schema just uses string array for chat:
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chatId: id, 
          message: userText,
          imageBase64: imageToSend,
          history: updatedLogUser.map(msg => {
            const isUser = msg.startsWith("User:");
            return {
              role: isUser ? "user" : "model",
              text: msg.replace(/^(User:|AI:)\s*/, "")
            };
          }) 
        }),
      });

      if (!res.ok) throw new Error("API error");
      const resData = await res.json();
      
      let aiText = resData.text;

      // Handle extracted actions to insert into database
      if (resData.extractedActions && resData.extractedActions.length > 0) {
        for (const action of resData.extractedActions) {
          if (action.action === "add to reminder database") {
            const timeToSet = new Date();
            // Just saving an outline to jadwal_obat
            await supabase.from("jadwal_obat").insert([{
              pasien_id: user?.id,
              nama_obat: action.description?.substring(0, 50) || "Obat dari Chat",
              jenis_obat: "Pill",
              dosis: action.frequency,
              waktu_minum: timeToSet.toISOString()
            }]);
          }
        }
        
        aiText += "\n\n*(Sistem: Agen telah menambahkan obat di atas ke dalam Database Jadwal Obat Anda)*";
      }

      const updatedLogAI = [...updatedLogUser, `AI: ${aiText}`];

      setChatLog(updatedLogAI);

      // Save to DB
      await supabase
        .from("chat")
        .update({ chat: updatedLogAI, respon_ai: aiText })
        .eq("chat_id", Number(id));

    } catch (err) {
      console.error("Failed", err);
      alert("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading chat...</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatLog.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            Start a conversation!
          </div>
        ) : (
          chatLog.map((msg, idx) => {
            const isUser = msg.startsWith("User:");
            const text = msg.replace(/^(User:|AI:)\s*/, "");
            return (
              <div
                key={idx}
                className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {isUser ? <UserIcon size={18} /> : <Bot size={18} />}
                </div>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-gray-100 text-gray-800 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
                </div>
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
              <Bot size={18} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-none flex items-center gap-1">
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        {selectedImage && (
          <div className="max-w-4xl mx-auto mb-2 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg object-cover border border-gray-200" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-blue-600 p-2"
          >
            <Paperclip size={24} />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pertanyaan kesehatan Anda..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !selectedImage)}
            className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
