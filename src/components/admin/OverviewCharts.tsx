'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

export default function OverviewCharts({ userGrowthData, roomActivityData }: { userGrowthData: any[], roomActivityData: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* User Growth Chart */}
      <div className="bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-bold mb-4 font-mono text-sm uppercase">User Growth (Last 7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ border: '2px solid black', borderRadius: 0, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontWeight: 'bold' }} 
              />
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={4} dot={{ strokeWidth: 3, r: 5, fill: 'white' }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Rooms Chart */}
      <div className="bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-bold mb-4 font-mono text-sm uppercase">Top Active Rooms</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(val) => val.length > 8 ? val.substring(0, 8) + '...' : val} tickLine={false} axisLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ border: '2px solid black', borderRadius: 0, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontWeight: 'bold' }} 
                cursor={{fill: '#f3f4f6'}} 
              />
              <Bar dataKey="online" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
