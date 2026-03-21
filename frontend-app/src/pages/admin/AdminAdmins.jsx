import { useState, useEffect } from 'react';
import { PlatformAdmin } from '../../utils/api';
import { ShieldCheck, Plus, KeyRound, Mail } from 'lucide-react';

export default function AdminAdmins() {
  const [admins, setAdmins]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName]       = useState('');
  const [invEmail, setInvEmail]     = useState('');
  const [invRole, setInvRole]       = useState('admin');
  const [inviting, setInviting]     = useState(false);

  const load = () => {
    setLoading(true);
    PlatformAdmin.getAdmins().then(r => {
      setLoading(false);
      if (r.ok) setAdmins(r.data.data);
    });
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    const r = await PlatformAdmin.inviteAdmin({ name: invName, email: invEmail, role: invRole });
    setInviting(false);
    if (r.ok) {
      setShowInvite(false);
      setInvName(''); setInvEmail(''); setInvRole('admin');
      load();
    }
  };

  const handleReset = async (id) => {
    if (!confirm('Redefinir senha deste admin?')) return;
    await PlatformAdmin.resetPassword(id);
    alert('Nova senha enviada por email.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Administradores</h1>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Convidar
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Convidar novo admin</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={invName} onChange={e => setInvName(e.target.value)} required placeholder="Nome"
              className="bg-gray-800 border border-gray-700 rounded-xl text-white text-sm px-3 py-2 focus:border-violet-500 outline-none" />
            <input value={invEmail} onChange={e => setInvEmail(e.target.value)} required type="email" placeholder="Email"
              className="bg-gray-800 border border-gray-700 rounded-xl text-white text-sm px-3 py-2 focus:border-violet-500 outline-none" />
            <div className="flex gap-2">
              <select value={invRole} onChange={e => setInvRole(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm px-3 py-2 focus:border-violet-500 outline-none">
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <button type="submit" disabled={inviting}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {inviting ? '...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="divide-y divide-gray-800">
          {admins.map(a => (
            <div key={a._id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.role === 'superadmin' ? 'bg-amber-600/20 text-amber-400' : 'bg-violet-600/20 text-violet-400'}`}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{a.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Mail size={10} /> {a.email}
                    {!a.inviteAccepted && <span className="ml-2 text-amber-400">(Convite pendente)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.role === 'superadmin' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
                  {a.role}
                </span>
                <button onClick={() => handleReset(a._id)} title="Redefinir senha"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-gray-800 transition-colors">
                  <KeyRound size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
