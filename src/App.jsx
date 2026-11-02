import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, MessageSquare, Settings, Sparkles, Image as ImageIcon, 
  Trash2, Send, Database, ShieldAlert, Cpu, Key, RefreshCw, FileText, Download
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('community');
  
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('app_cards');
    return saved ? JSON.parse(saved) : [
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
    ];
  });

  const [selectedCard, setSelectedCard] = useState(null);
  
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('api_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('api_key') || '');
  const [openRouterModel, setOpenRouterModel] = useState(() => localStorage.getItem('openrouter_model') || 'meta-llama/llama-3-8b-instruct:free');
  
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
    localStorage.setItem('app_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('api_provider', apiProvider);
  }, [apiProvider]);

  useEffect(() => {
    localStorage.setItem('api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('openrouter_model', openRouterModel);
  }, [openRouterModel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const getBase64 = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      });
    };

    const imageUrl = await getBase64(file);

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
            avatar: data.avatar || imageUrl
          });
        } catch (err) {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder();
        let offset = 8;
        let charaJson = null;

        while (offset < bytes.length) {
          let length = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
          let type = decoder.decode(bytes.slice(offset+4, offset+8));
          
          if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
            let chunkData = bytes.slice(offset+8, offset+8+length);
            let text = decoder.decode(chunkData);
            
            if (text.includes('chara') || text.includes('name') || text.length > 50) {
              try {
                let jsonStartIndex = text.indexOf('{');
                let jsonEndIndex = text.lastIndexOf('}');
                if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                  let jsonStr = text.substring(jsonStartIndex, jsonEndIndex + 1);
                  let parsed = JSON.parse(jsonStr);
                  if (parsed.name || parsed.data || parsed.description) {
                    charaJson = parsed;
                    break;
                  }
                }
              } catch (e) {}

              try {
                let parts = text.split('\0');
                for (let part of parts) {
                  if (part.length > 20) {
                    try {
                      let decoded = atob(part);
                      let parsed = JSON.parse(decoded);
                      if (parsed.name || parsed.data) {
                        charaJson = parsed;
                        break;
                      }
                    } catch (err2) {}
                  }
                }
              } catch (err) {}
            }
          }
          offset += 12 + length;
          if (type === 'IEND') break;
        }

        const data = charaJson ? (charaJson.data || charaJson) : {};
        setNewCard({
          name: data.name || file.name.replace(/\.[^/.]+$/, ""),
          creator: data.creator || data.creator_notes || 'Anonymous',
          description: data.description || '',
          personality: data.personality || data.extensions?.personality || '',
          first_mes: data.first_mes || data.first_message || '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
          avatar: imageUrl
        });
      } catch (err) {
        setNewCard(prev => ({
          ...prev,
          avatar: imageUrl,
          name: prev.name || file.name.replace(/\.[^/.]+$/, "")
        }));
      }
    }
  };
          const handleSaveCard = () => {
    if (!newCard.name) {
      alert('Please enter character name!');
      return;
    }
    const cardObj = {
      ...newCard,
      id: Date.now().toString(),
      tags: typeof newCard.tags === 'string' ? newCard.tags.split(',').map(t => t.trim()).filter(Boolean) : newCard.tags
    };
    setCards([cardObj, ...cards]);
    setActiveTab('community');
    setNewCard({ name: '', creator: '', description: '', personality: '', first_mes: '', tags: '', avatar: '' });
  };

  const startChatWithCard = (card) => {
    setSelectedCard(card);
    setChatMessages([
      { sender: 'char', text: card.first_mes || 'No default greeting provided.' }
    ]);
    setActiveTab('chat');
  };

  const handleDownloadCard = (card) => {
    if (card.avatar && card.avatar.startsWith('data:image')) {
      const a = document.createElement('a');
      a.href = card.avatar;
      a.download = `${card.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(card, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${card.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
        if (!apiKey) throw new Error('Please enter Gemini API Key!');
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
        if (!apiKey) throw new Error('Please enter OpenRouter API Key!');
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
      alert(`Error: ${err.message}`);
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
            <Database className="w-4 h-4" /> Community
          </button>
          <button onClick={() => setActiveTab('studio')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === 'studio' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Upload className="w-4 h-4" /> Studio / Import
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === 'settings' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Settings className="w-4 h-4" /> API Settings
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'community' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-200">Character Cards Hub</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map(card => (
                <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition flex flex-col">
                  <div className="h-48 bg-slate-800 relative overflow-hidden group">
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
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {card.tags?.map((t, idx) => (
                          <span key={idx} className="text-xs bg-violet-950/60 text-violet-300 border border-violet-800/40 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => startChatWithCard(card)} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm">
                          <MessageSquare className="w-4 h-4" /> Chat
                        </button>
                        <button onClick={() => handleDownloadCard(card)} title="Download Character Card" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg flex items-center justify-center transition border border-slate-700">
                          <Download className="w-4 h-4 text-violet-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-violet-400" /> Import or Create Character Card</h2>
            <div className="border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-xl p-6 text-center space-y-2 bg-slate-950/40">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-300">Upload character file in **.JSON** or image **.PNG** format</p>
              <input type="file" accept=".json,image/png,image/jpeg" onChange={handleFileUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer" />
            </div>

            <div className="space-y-4 text-sm">
              <div><label className="block text-slate-400 mb-1">Character Name *</label><input type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Creator</label><input type="text" value={newCard.creator} onChange={e => setNewCard({...newCard, creator: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Description</label><textarea rows={3} value={newCard.description} onChange={e => setNewCard({...newCard, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Personality</label><textarea rows={2} value={newCard.personality} onChange={e => setNewCard({...newCard, personality: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">First Message</label><textarea rows={3} value={newCard.first_mes} onChange={e => setNewCard({...newCard, first_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
              <div><label className="block text-slate-400 mb-1">Tags</label><input type="text" value={newCard.tags} onChange={e => setNewCard({...newCard, tags: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none" /></div>
            </div>
            <button onClick={handleSaveCard} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition">Publish Card to Community</button>
          </div>
        )}

        {activeTab === 'chat' && selectedCard && (
          <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedCard.avatar || 'https://via.placeholder.com/150'} alt="" className="w-11 h-11 rounded-full object-cover border border-violet-500/40 shadow" />
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedCard.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-emerald-400 font-medium">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveTab('community')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl transition font-medium border border-slate-700/50">
                Switch Character
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${msg.sender === 'user' ? 'bg-violet-600 text-white rounded-br-xs' : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-xs'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2.5 shadow">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" /> 
                    <span>Character is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur flex gap-3 items-center">
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                placeholder={`Type a message to ${selectedCard.name}...`} 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none text-sm transition shadow-inner" 
              />
              <button 
                onClick={handleSendMessage} 
                disabled={isLoading} 
                className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-xl flex items-center justify-center transition disabled:opacity-50 shadow-lg shadow-violet-600/25 font-medium"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Key className="w-5 h-5 text-violet-400" /> API Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Provider</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setApiProvider('gemini')} className={`p-4 rounded-xl border text-left font-medium flex items-center gap-3 transition ${apiProvider === 'gemini' ? 'border-violet-500 bg-violet-950/30 text-white' : 'border-slate-800 text-slate-400 bg-slate-950/40'}`}>
                    <Cpu className="w-5 h-5 text-violet-400" /><div><div>Gemini API</div><div className="text-xs text-slate-500 font-normal">Free</div></div>
                  </button>
                  <button onClick={() => setApiProvider('openrouter')} className={`p-4 rounded-xl border text-left font-medium flex items-center gap-3 transition ${apiProvider === 'openrouter' ? 'border-violet-500 bg-violet-950/30 text-white' : 'border-slate-800 text-slate-400 bg-slate-950/40'}`}>
                    <Sparkles className="w-5 h-5 text-pink-400" /><div><div>OpenRouter API</div><div className="text-xs text-slate-500 font-normal">Multiple Models</div></div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your API key here..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-violet-500 outline-none text-sm" />
              </div>
              {apiProvider === 'openrouter' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Model Name</label>
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
                                                                                                                                                     
