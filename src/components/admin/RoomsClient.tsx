'use client';

import { useState } from 'react';
import { Search, Radio, Power, Maximize, PlayCircle, RefreshCw, Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type AdminRoom = {
  id: string;
  name: string | null;
  isPublic: boolean;
  onlineCount: number;
  maxUsers: number;
  currentVideoTitle: string;
  currentVideoUrl: string;
  createdAt: Date;
  host: { id: string; username: string } | null;
  _count: { messages: number };
};

export default function RoomsClient({ initialRooms }: { initialRooms: AdminRoom[] }) {
  const [rooms, setRooms] = useState<AdminRoom[]>(initialRooms);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<{ id: string, maxUsers: number } | null>(null);
  const { addToast } = useToast();

  const activeRooms = rooms.filter(r => r.onlineCount > 0);
  const filteredRooms = rooms.filter(r => (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || r.id.includes(searchQuery));

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    if (!confirm('Are you sure you want to broadcast this message to ALL connected users across ALL rooms?')) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage }),
      });

      if (!res.ok) throw new Error('Failed to broadcast');
      
      addToast({ type: 'success', title: 'Broadcast Sent', message: 'Message sent to all connected clients.' });
      setBroadcastMessage('');
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to send global broadcast' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleForceClose = async (room: AdminRoom) => {
    if (!confirm(`Are you sure you want to FORCE CLOSE the room "${room.name || room.id}"? This will disconnect all users inside.`)) return;

    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete room');
      
      setRooms(rooms.filter(r => r.id !== room.id));
      addToast({ type: 'success', title: 'Room Closed', message: `Room ${room.name || room.id} has been forcefully closed.` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to close room.' });
    }
  };

  const handleUpdateCapacity = async (roomId: string) => {
    if (!editingCapacity || editingCapacity.id !== roomId) return;
    
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUsers: editingCapacity.maxUsers }),
      });

      if (!res.ok) throw new Error('Failed to update capacity');

      setRooms(rooms.map(r => r.id === roomId ? { ...r, maxUsers: editingCapacity.maxUsers } : r));
      setEditingCapacity(null);
      addToast({ type: 'success', title: 'Capacity Updated', message: 'Room capacity has been updated.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update capacity.' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Global Broadcast Tool */}
      <div className="bg-red-50 border-4 border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] p-6">
        <h2 className="text-xl font-black uppercase text-red-600 mb-2 flex items-center gap-2">
          <Radio size={24} /> Global Broadcast Override
        </h2>
        <p className="text-sm font-mono text-red-800 mb-4">Send an alert banner across all active movie rooms instantly. Use for maintenance announcements or emergencies.</p>
        
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="SERVER RESTART: Maintenance in 5 minutes..."
            className="flex-1 px-4 py-3 border-4 border-red-500 font-mono text-sm outline-none bg-white focus:bg-red-100 placeholder:text-red-300"
          />
          <button
            onClick={handleBroadcast}
            disabled={isBroadcasting || !broadcastMessage.trim()}
            className="px-6 py-3 font-black text-sm uppercase bg-red-600 text-white border-4 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBroadcasting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            SEND ALERT
          </button>
        </div>
      </div>

      {/* active rooms stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-gray-500 font-mono text-xs uppercase font-bold mb-1">Total Rooms</div>
            <div className="text-2xl font-black">{rooms.length}</div>
        </div>
        <div className="bg-green-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-green-800 font-mono text-xs uppercase font-bold mb-1">Active Now</div>
            <div className="text-2xl font-black">{activeRooms.length}</div>
        </div>
        <div className="bg-blue-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-blue-800 font-mono text-xs uppercase font-bold mb-1">Total Viewers</div>
            <div className="text-2xl font-black">{activeRooms.reduce((acc, r) => acc + r.onlineCount, 0)}</div>
        </div>
      </div>

      <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b-4 border-black bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find room..."
                className="w-full pl-9 pr-3 py-2 border-2 border-black font-mono text-sm outline-none focus:bg-blue-50 transition-colors"
                />
            </div>
          </div>
          
          <div className="text-xs font-mono font-bold text-gray-500">
            Showing {filteredRooms.length} rooms
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm whitespace-nowrap">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Room / Host</th>
                <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Status</th>
                <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Now Playing</th>
                <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Capacity</th>
                <th className="p-3 uppercase tracking-widest font-black text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, i) => (
                <tr key={room.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b-2 border-black hover:bg-blue-50 transition-colors`}>
                  <td className="p-3 border-r-2 border-gray-200">
                    <div className="font-bold font-sans text-base">{room.name || 'Unnamed Room'}</div>
                    <div className="text-xs text-gray-500">
                        Hosted by {room.host ? <span className="font-bold">{room.host.username}</span> : 'System'} • {room.isPublic ? '🌐 Public' : '🔒 Private'}
                    </div>
                  </td>
                  <td className="p-3 border-r-2 border-gray-200">
                     {room.onlineCount > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 border-2 border-green-800 text-xs font-black">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {room.onlineCount} ONLINE
                        </div>
                     ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 border-2 border-gray-300 text-xs font-bold">
                            EMPTY
                        </div>
                     )}
                  </td>
                  <td className="p-3 border-r-2 border-gray-200">
                    <div className="flex items-center gap-2 max-w-xs overflow-hidden text-ellipsis">
                      <PlayCircle size={16} className={room.onlineCount > 0 ? 'text-green-500' : 'text-gray-400'} />
                      <span className="truncate" title={room.currentVideoTitle || 'Nothing playing'}>
                        {room.currentVideoTitle || 'Nothing playing'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 border-r-2 border-gray-200">
                    {editingCapacity?.id === room.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={editingCapacity.maxUsers}
                          onChange={(e) => setEditingCapacity({ id: room.id, maxUsers: parseInt(e.target.value) || room.maxUsers })}
                          className="w-16 border-2 border-black p-1 text-xs font-bold"
                          min="1"
                        />
                        <button onClick={() => handleUpdateCapacity(room.id)} className="text-green-600 font-bold hover:underline">SAVE</button>
                        <button onClick={() => setEditingCapacity(null)} className="text-red-500 hover:underline">CANCEL</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingCapacity({ id: room.id, maxUsers: room.maxUsers })}>
                        <span>{room.onlineCount} / {room.maxUsers}</span>
                        <Maximize size={14} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button 
                        onClick={() => handleForceClose(room)}
                        className="p-2 bg-black text-white border-2 border-black hover:bg-red-600 hover:border-red-600 hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none inline-flex items-center justify-center gap-2"
                        title="Force Close Room"
                    >
                        <Power size={14} />
                        <span className="text-xs font-black uppercase">Close</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 italic">No rooms found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
