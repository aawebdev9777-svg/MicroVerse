/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Users, Database, Clock, Terminal, Search, Lock, Activity } from 'lucide-react';

interface GlobalLog {
    id: string;
    msg: string;
    lvl: string;
    username: string;
    serverTime: any;
    ts: number;
}

interface UserData {
    id: string;
    username: string;
    email: string;
    role: string;
    messageCode: string;
    createdAt?: any;
}

export const AdminApp: React.FC = () => {
    const [view, setView] = useState<'logs' | 'database'>('logs');
    const [logs, setLogs] = useState<GlobalLog[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);

    // Logs Subscription
    useEffect(() => {
        const q = query(
            collection(db, 'system_logs'),
            orderBy('ts', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: GlobalLog[] = [];
            const uniqueUsers = new Set();

            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedLogs.push({ id: doc.id, ...data } as GlobalLog);
                if (data.username) uniqueUsers.add(data.username);
            });

            setLogs(fetchedLogs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Users (Database) Fetch
    useEffect(() => {
        const fetchUsers = async () => {
             const q = query(collection(db, 'users'));
             const snap = await getDocs(q);
             const userList: UserData[] = [];
             snap.forEach(doc => {
                 userList.push({ id: doc.id, ...doc.data() } as UserData);
             });
             setUsers(userList);
             setUserCount(userList.length);
        };
        fetchUsers();
    }, [view]); // Refresh when switching to view

    return (
        <div className="h-full w-full bg-black text-red-500 font-mono flex flex-col border-4 border-red-900/50">
            {/* Admin Header */}
            <div className="bg-red-950/30 border-b border-red-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={24} className="animate-pulse" />
                    <div>
                        <h1 className="text-xl font-bold tracking-widest text-red-500">GOD MODE // ADMIN</h1>
                        <p className="text-[10px] text-red-400/50 uppercase">Global Oversight System</p>
                    </div>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                     <button 
                        onClick={() => setView('logs')}
                        className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${view === 'logs' ? 'bg-red-900 text-white border-red-500' : 'bg-black/50 border-red-900 hover:bg-red-900/30'}`}
                    >
                        <Activity size={14} /> SYSTEM LOGS
                    </button>
                    <button 
                        onClick={() => setView('database')}
                        className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${view === 'database' ? 'bg-red-900 text-white border-red-500' : 'bg-black/50 border-red-900 hover:bg-red-900/30'}`}
                    >
                        <Database size={14} /> USER DB
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 text-red-500 animate-pulse">ESTABLISHING ROOT UPLINK...</div>}
                
                {view === 'logs' ? (
                    <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-red-900/30 text-[10px] uppercase text-red-700 font-bold bg-black">
                            <div className="col-span-2">Timestamp</div>
                            <div className="col-span-2">Operative</div>
                            <div className="col-span-1">Level</div>
                            <div className="col-span-7">Action Payload</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black">
                            {logs.map((log) => (
                                <div key={log.id} className="grid grid-cols-12 gap-2 text-xs border-b border-red-900/10 pb-1 hover:bg-red-900/10 transition-colors">
                                    <div className="col-span-2 opacity-50 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(log.ts).toLocaleTimeString()}
                                    </div>
                                    <div className="col-span-2 font-bold text-white">
                                        {log.username}
                                    </div>
                                    <div className={`col-span-1 font-bold uppercase ${
                                        log.lvl === 'error' ? 'text-red-500' :
                                        log.lvl === 'warning' ? 'text-yellow-500' :
                                        log.lvl === 'success' ? 'text-green-500' :
                                        'text-blue-500'
                                    }`}>
                                        {log.lvl}
                                    </div>
                                    <div className="col-span-7 text-red-200 truncate font-mono">
                                        <span className="opacity-50 mr-2">&gt;</span>{log.msg}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    /* DATABASE VIEW */
                    <>
                         <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-red-900/30 text-[10px] uppercase text-red-700 font-bold bg-black">
                            <div className="col-span-3">ID / Code</div>
                            <div className="col-span-3">Username</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-3">Role / Status</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black">
                            {users.map(user => (
                                <div key={user.id} className="grid grid-cols-12 gap-2 text-xs border-b border-red-900/10 pb-2 hover:bg-red-900/10 transition-colors items-center">
                                    <div className="col-span-3 font-mono text-red-400">
                                        {user.messageCode}
                                        <div className="text-[9px] opacity-40">{user.id.substring(0,8)}...</div>
                                    </div>
                                    <div className="col-span-3 font-bold text-white">
                                        {user.username}
                                    </div>
                                     <div className="col-span-3 opacity-70 truncate">
                                        {user.email}
                                    </div>
                                    <div className="col-span-3 flex items-center gap-2">
                                        {user.role === 'admin' ? <ShieldAlert size={12} className="text-yellow-500" /> : <Users size={12} />}
                                        <span className={user.role === 'admin' ? 'text-yellow-500 font-bold' : ''}>{user.role || 'Operative'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Command Footer */}
            <div className="p-2 border-t border-red-900 bg-black flex items-center gap-2 text-xs">
                <Terminal size={14} className="text-red-600" />
                <span className="text-red-700">ROOT@MICROVERSE:~#</span>
                <span className="animate-pulse">_</span>
            </div>
        </div>
    );
};