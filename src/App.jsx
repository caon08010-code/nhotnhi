import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, MessageSquare, Settings, Sparkles, Image as ImageIcon, 
  Trash2, Send, Database, ShieldAlert, Cpu, Key, RefreshCw, FileText
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('community');
  const [cards, setCards] = useState([
    {
      id: '1',
      name: 'Eldrin the Mage',
      creator: 'ArcaneMaster',
      description: 'An ancient sorcerer specialized in dark magic and forgotten rituals.',
      personality: 'Mysterious, cynical, highly knowledgeable, protective.',
      first_mes: 'Why have you summoned me, mortal? Speak quickly before my patience runs thin.',
      tags: ['Fantasy', 'Magic', 'RPG'],
      avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=60'
    }
  ]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [apiProvider, setApiProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('meta-llama/llama-3-8b-instruct:free');
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [newCard, setNewCard] = useState({
    name: '',
    creator: '',
    description: '',
    personality: '',
    first_mes: '',
    tags: '',
    avatar: ''
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const data = json.data || json;
          setNewCard({
            name: data.name || '',
            creator: data.creator || data.creator_notes || 'Anonymous',
            description: data.description || '',
            personality: data.personality || '',
            first_mes: data.first_mes || data.first_message || '',
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
            avatar: data.avatar || ''
          });
        } catch (err) {
          alert('Không thể đọc tệp JSON này.');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        setNewCard(prev => ({
          ...prev,
          avatar: imageUrl,
          name: prev.name || file.name.replace(/\.[^/.]+$/, "")
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCard = () => {
    if (!newCard.name) {
      alert('Vui lòng nhập tên nhân vật!');
      return;
    }
    const cardObj = {
      ...newCard,
      id: Date.now().toString(),
      tags: newCard.tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    setCards([cardObj, ...cards]);
    setActiveTab('community');
    setNewCard({ name: '', creator: '', description: '', personality: '', first_mes: '', tags: '', avatar: '' });
  };

  const startChatWithCard = (card) => {
    setSelectedCard(card);
    setChatMessages([
      { sender: 'char', text: card.first_mes || 'Chưa có lời chào mặc định.' }
    ]);
    setActiveTab('chat');
  };

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !selectedCard || isLoading) return;

    const userText = inputMsg;
    setInputMsg('');
    const updatedMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(updatedMessages);
    setIsLoading(true);

    try {
      let botResponse = '';
      const systemPrompt = `You are roleplaying as ${selectedCard.name}. 
Description: ${selectedCard.description}
Personality: ${selectedCard.personality}
Stay completely in character.`;

      if (apiProvider === 'gemini') {
        if (!apiKey) throw new Error('Vui lòng nhập Gemini API Key!');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...updatedMessages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
              }))
            ]
          })
        });
        const resData = await response.json();
        if (resData.error) throw new Error(resData.error.message);
        botResponse = resData.candidates[0].content.parts[0].text;
      } else if (apiProvider === 'openrouter') {
        if (!apiKey) throw new Error('Vui lòng nhập OpenRouter API Key!');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [
              { role: 'system', content: systemPrompt },
              ...updatedMessages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
              }))
            ]
          })
        });
        const resData = await response.json();
        if (resData.error) throw new Error(resData.error.message);
        botResponse = resData.choices[0].message.content;
      }

      setChatMessages([...updatedMessages, { sender: 'char', text: botResponse }]);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
          return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex gap-3 items-center">
          <Sparkles className="w-6 h-6 text-violet-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
            Character Card Studio & Hub
          </h1>
        </div>
        <nav className="flex gap-2">
          <button onClick={() => setActiveTab('community')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === 'community' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Database className="w-4 h-4" /> Cộng đồng
          </button>
          <button onClick={() => setActiveTab('studio')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === 'studio' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Upload className="w-4 h-4" /> Import / Tạo Thẻ
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === 'settings' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Settings className="w-4 h-4" /> Cấu hình API
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'community' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-200">Danh sách Thẻ Nhân Vật</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map(card => (
                <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition flex flex-col">
                  <div className="h-48 bg-slate-800 relative overflow-hidden">
                    {card.avatar ? <img src={card.avatar} alt={card.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="w-12 h-12" /></div>}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-100">{card.name}</h3>
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">by {card.creator || 'Anon'}</span>
                      </div>
                      <p className="text-slate-400 text-sm mt-2 line-clamp-3">{card.description}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {card.tags?.map((t, idx) => (
                          <span key={idx} className="text-xs bg-violet-950/60 text-violet-300 border border-violet-800/40 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                      <button onClick={() => startChatWithCard(card)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition">
                        <MessageSquare className="w-4 h-4" /> Bắt đầu Chat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-violet-400" /> Nhập khẩu hoặc Tạo mới Thẻ Nhân vật</h2>
            <div className="border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-xl p-6 text-center space-y-2 bg-slate-950/40">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-300">Tải lên tệp nhân vật dạng **.JSON** hoặc ảnh **.PNG**</p>
              <input type="file" accept=".json,image/png,image/jpeg" onChange={handleFileUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer" />
            </div>

            <div className="space-y-4 text-sm">
              <div><label className="block text-slate-400 mb-1">Tên nhân vật *</label><input type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Tác giả</label><input type="text" value={newCard.creator} onChange={e => setNewCard({...newCard, creator: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Mô tả (Description)</label><textarea rows={3} value={newCard.description} onChange={e => setNewCard({...newCard, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Tính cách (Personality)</label><textarea rows={2} value={newCard.personality} onChange={e => setNewCard({...newCard, personality: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Lời chào (First Message)</label><textarea rows={3} value={newCard.first_mes} onChange={e => setNewCard({...newCard, first_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Thẻ / Tag</label><input type="text" value={newCard.tags} onChange={e => setNewCard({...newCard, tags: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
            </div>
            <button onClick={handleSaveCard} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition">Đăng Thẻ Lên Cộng Đồng</button>
          </div>
        )}

        {activeTab === 'chat' && selectedCard && (
          <div className="max-w-4xl mx-auto h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedCard.avatar || 'https://via.placeholder.com/150'} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div><h3 className="font-bold text-slate-100">{selectedCard.name}</h3><p className="text-xs text-slate-400">Trực tuyến</p></div>
              </div>
              <button onClick={() => setActiveTab('community')} className="text-xs bg-slate-800 px-3 py-1.5 rounded text-slate-300">Đổi Nhân Vật</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>{msg.text}</div>
                </div>
              ))}
              {isLoading && <div className="flex justify-start"><div className="bg-slate-800 text-slate-400 rounded-2xl px-4 py-2 text-xs flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Đang suy nghĩ...</div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex gap-2">
              <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Nhắn tin..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:border-violet-500 outline-none text-sm" />
              <button onClick={handleSendMessage} disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white px-5 rounded-xl flex items-center justify-center transition disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Key className="w-5 h-5 text-violet-400" /> Cấu hình API Khóa AI</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Chọn Nhà Cung Cấp</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setApiProvider('gemini')} className={`p-4 rounded-xl border text-left font-medium flex items-center gap-3 transition ${apiProvider === 'gemini' ? 'border-violet-500 bg-violet-950/30 text-white' : 'border-slate-800 text-slate-400 bg-slate-950/40'}`}>
                    <Cpu className="w-5 h-5 text-violet-400" /><div><div>Gemini API</div><div className="text-xs text-slate-500 font-normal">Miễn phí</div></div>
                  </button>
                  <button onClick={() => setApiProvider('openrouter')} className={`p-4 rounded-xl border text-left font-medium flex items-center gap-3 transition ${apiProvider === 'openrouter' ? 'border-violet-500 bg-violet-950/30 text-white' : 'border-slate-800 text-slate-400 bg-slate-950/40'}`}>
                    <Sparkles className="w-5 h-5 text-pink-400" /><div><div>OpenRouter API</div><div className="text-xs text-slate-500 font-normal">Đa dạng Model</div></div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Khóa API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Dán khóa vào đây..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none text-sm" />
              </div>
              {apiProvider === 'openrouter' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tên Model</label>
                  <input type="text" value={openRouterModel} onChange={e => setOpenRouterModel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none text-sm" />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
                                         }
                                                                                                                                                         
