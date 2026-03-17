import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { Auth } from '../utils/api';

export default function VerifyEmail() {
  const [params]  = useSearchParams();
  const token     = params.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) { setStatus('error'); setMessage('Token não encontrado.'); return; }
    Auth.verifyEmail(token).then(r => {
      if (r.ok) {
        setStatus('success');
        setMessage(r.data.message || 'E-mail confirmado!');
      } else {
        setStatus('error');
        setMessage(r.data?.message || 'Token inválido ou expirado.');
      }
    });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
            <JubaOSLogo size={56} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={36} className="animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Verificando seu e-mail...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={36} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">E-mail confirmado!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Ir para o login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={36} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Falha na verificação</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl transition-colors"
              >
                Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
