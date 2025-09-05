import { useEffect, useState } from 'react';

const STORAGE_PWD_HASH = 'solarie_pwd_hash';
const STORAGE_AUTH = 'solarie_auth';

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const Account: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSaved('');
    setError('');
  }, [currentPassword, newPassword, confirm]);

  const save = async () => {
    setSaved('');
    setError('');
    // validar atual
    if (!currentPassword) {
      setError('Informe a senha atual.');
      return;
    }
    const stored = localStorage.getItem(STORAGE_PWD_HASH) || '';
    const currentHash = await sha256Hex(currentPassword);
    if (!stored || stored !== currentHash) {
      setError('Senha atual incorreta.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('Senha deve ter ao menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    const hash = await sha256Hex(newPassword);
    try {
      localStorage.setItem(STORAGE_PWD_HASH, hash);
      setSaved('Senha atualizada com sucesso.');
    } catch {
      setError('Falha ao salvar senha.');
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_AUTH);
      // dispara evento simples para que o App reaja e mostre login
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Autenticação</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
            placeholder="Digite a senha atual"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field"
            placeholder="Digite a nova senha"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-field"
            placeholder="Confirme a nova senha"
          />
        </div>
      </div>
      {error && <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
      {saved && <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">{saved}</div>}
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="btn-primary">Salvar Senha</button>
        <button onClick={logout} className="btn-secondary">Sair</button>
      </div>
    </div>
  );
};

export default Account;
