/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Users, Database, Clock, Terminal } from 'lucide-react';

interface GlobalLog {
    id: string;
    msg: string;
    lvl: string;
    username: string;
    serverTime: any;
    ts: number;
}

export const AdminApp: React.FC = () => {
    const [logs, setLogs] = useState<GlobalLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        // Query the global system_logs collection
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
            setUserCount(uniqueUsers.size);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded border border-red-900">
                        <Users size={14} />
                        <span>ACTIVE USERS: {userCount}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded border border-red-900">
                        <Database size={14} />
                        <span>LOGS: {logs.length}+</span>
                    </div>
                </div>
            </div>

            {/* Main Data Stream */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-red-900/30 text-[10px] uppercase text-red-700 font-bold bg-black">
                    <div className="col-span-2">Timestamp</div>
                    <div className="col-span-2">Operative</div>
                    <div className="col-span-1">Level</div>
                    <div className="col-span-7">Action Payload</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black">
                    {loading && <div className="text-center py-10 animate-pulse">ESTABLISHING ROOT UPLINK...</div>}
                    
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