// magazine-front/src/components/chat/ChatButton.jsx
//
// «Charlar» (a dialogue icon) on an author's card or an artist's exhibition:
// a socio/a asks them to chat (ChatContext.request); already accepted, it
// opens the chat; already asked, it says so («Solicitud enviada»). Signed
// out: sign in first; not a member: the «Hazte socio/a» window. Not shown on
// one's own card. `className` gives it the look of the place it's in.
import { useTranslation } from 'react-i18next';
import { MessagesSquare } from 'lucide-react';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useChat } from '../../app_context/ChatContext';
import { useSubscription } from '../../app_context/SubscriptionContext';
import './Chat.css';

function ChatButton({ host, origin = 'authors', className = 'chat-button', iconSize = 18 }) {
  const { t } = useTranslation();
  const { currentUser, isSuperAdmin } = useAuth();
  const { navigateToLogin, showInfo } = useUI();
  const subscription = useSubscription();
  const chat = useChat();
  if (!chat || !host?.id_user || Number(host.id_user) === Number(currentUser?.id_user)) return null;

  const conversation = chat.conversationWith(host.id_user);
  const asked = conversation?.status === 'requested';

  const onClick = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      showInfo(t('chat.loginRequired', 'Inicia sesión para charlar con las autoras/es y artistas'));
      navigateToLogin();
      return;
    }
    if (conversation?.status === 'active') { chat.openChats(conversation.id_conversation); return; }
    if (asked) {
      showInfo(t('chat.alreadyAsked', { name: host.name_user, defaultValue: 'Ya le has pedido charlar a {{name}}: te avisaremos cuando responda.' }));
      return;
    }
    // Members only (super admins too); the server checks as well.
    if (subscription?.mineReady && !subscription.isSubscriber && !isSuperAdmin) { subscription.openModal('chat'); return; }
    await chat.request(host, origin);
  };

  return (
    <button
      type="button"
      className={`${className} ${asked ? 'is-asked' : ''}`}
      onClick={onClick}
      disabled={chat.busy}
      title={asked ? t('chat.askedTitle', 'Esperando su respuesta') : t('chat.buttonTitle', { name: host.name_user, defaultValue: 'Charlar con {{name}}' })}
    >
      <MessagesSquare size={iconSize} aria-hidden="true" />
      <span>{asked ? t('chat.asked', 'Solicitud enviada') : t('chat.button', 'Charlar')}</span>
    </button>
  );
}

export default ChatButton;
