import { useEffect, useState } from 'react';
import { ensureDefaultPassword, getPasswordHash, sha256Hex } from '../services/authConfig';

const FIXED_EMAIL = 'solarieacessorioss@gmail.com';
const STORAGE_AUTH = 'solarie_auth';
const STORAGE_PWD_HASH = 'solarie_pwd_hash';

type Props = {
  onSuccess: () => void;
};

const Login: React.FC<Props> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // garante senha remota e sincroniza cache local
        await ensureDefaultPassword();
        const remoteHash = await getPasswordHash();
        localStorage.setItem(STORAGE_PWD_HASH, remoteHash);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_PWD_HASH) || '';
      const provided = await sha256Hex(password);
      if (stored && provided === stored) {
        localStorage.setItem(STORAGE_AUTH, '1');
        onSuccess();
      } else {
        setError('Senha inválida.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <img src="/sol-icon.png.png" alt="Sol" className="h-12 w-12 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Acessar Aplicação</h2>
          <p className="text-sm text-gray-500 mt-1">Use seu e-mail fixo e a senha</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={FIXED_EMAIL}
              disabled
              className="input-field bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Digite sua senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;