import { useState, useRef } from 'react';
import { Camera, User as UserIcon, Lock, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Users, Upload as UploadAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';

export default function Profile() {
  const { user, updateUser } = useAuth();

  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initials = user?.name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

  // Form — informações básicas
  const [nameForm,    setNameForm]    = useState({ name: user?.name || '' });
  const [savingName,  setSavingName]  = useState(false);

  // Form — senha
  const [pwdForm,    setPwdForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [pwdError,   setPwdError]   = useState('');

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const r = await UploadAPI.file(file, 'avatar');
    setUploadingAvatar(false);
    e.target.value = '';
    if (r.ok) { updateUser({ profileImage: r.data?.data?.url }); toast('Foto atualizada!'); }
    else      toast(r.data?.message || 'Erro ao atualizar foto.', 'error');
  };

  const handleSaveName = async () => {
    if (!nameForm.name.trim()) return;
    setSavingName(true);
    const r = await Users.updateMe({ name: nameForm.name.trim() });
    setSavingName(false);
    if (r.ok) { updateUser({ name: r.data.data.name }); toast('Nome atualizado!'); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  const handleSavePwd = async () => {
    setPwdError('');
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      return setPwdError('Preencha todos os campos de senha.');
    }
    if (pwdForm.newPassword.length < 6) {
      return setPwdError('A nova senha deve ter ao menos 6 caracteres.');
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return setPwdError('As senhas não coincidem.');
    }
    setSavingPwd(true);
    const r = await Users.updateMe({
      currentPassword: pwdForm.currentPassword,
      newPassword:     pwdForm.newPassword,
    });
    setSavingPwd(false);
    if (r.ok) {
      toast('Senha alterada com sucesso!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setPwdError(r.data?.message || 'Erro ao alterar senha.');
    }
  };

  return (
    <div className="max-w-xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-5">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 cursor-pointer overflow-hidden group"
          >
            {user?.profileImage
              ? <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
              : initials
            }
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>
                    <Camera size={16} className="text-white" />
                    <span className="text-white text-[10px] mt-1">Alterar</span>
                  </>
              }
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={user?.role} />
              <span className="text-xs text-gray-400 dark:text-gray-600">{user?.barbershopName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações básicas */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <UserIcon size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informações pessoais</h2>
        </div>

        <Input
          label="Nome completo"
          value={nameForm.name}
          onChange={e => setNameForm({ name: e.target.value })}
          placeholder="Seu nome"
        />
        <Input
          label="E-mail"
          value={user?.email || ''}
          disabled
          className="opacity-60 cursor-not-allowed"
        />

        <div className="flex justify-end">
          <Button onClick={handleSaveName} loading={savingName}>
            <Save size={14} className="mr-1.5" /> Salvar nome
          </Button>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alterar senha</h2>
        </div>

        <Input
          label="Senha atual"
          type="password"
          placeholder="••••••••"
          value={pwdForm.currentPassword}
          onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
        />
        <Input
          label="Nova senha"
          type="password"
          placeholder="••••••••"
          value={pwdForm.newPassword}
          onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          placeholder="••••••••"
          value={pwdForm.confirmPassword}
          onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
        />

        {pwdError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{pwdError}</p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSavePwd} loading={savingPwd}>
            <Lock size={14} className="mr-1.5" /> Alterar senha
          </Button>
        </div>
      </div>
    </div>
  );
}
