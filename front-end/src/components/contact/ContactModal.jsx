// magazine-front/src/components/contact/ContactModal.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import './ContactModal.css';

const ContactModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');

  const maxLength = 5000;
  const remainingChars = maxLength - formData.message.length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage(t('contact.errors.allFields'));
      setSubmitStatus('error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage(t('contact.errors.invalidEmail'));
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const response = await axiosInstance.post('/contact/send', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim()
      });

      if (response.data && !response.data.error) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          message: ''
        });

        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setErrorMessage(response.data.error || t('contact.errors.sendError'));
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setErrorMessage(
        error.response?.data?.error ||
        error.response?.data?.details ||
        t('contact.errors.sendError')
      );
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="contact-modal-overlay" onClick={handleOverlayClick}>
      <div className="contact-modal-container">
        <div className="contact-modal-header">
          <h2 className="contact-modal-title">{t('contact.title')}</h2>
          <button
            className="contact-close-button"
            onClick={onClose}
            aria-label={t('common.buttons.close')}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contact-modal-content">
          <div className="contact-form-group">
            <label htmlFor="name" className="contact-label">{t('contact.form.name')}</label>
            <input
              type="text"
              id="name"
              name="name"
              className="contact-input"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('contact.form.namePlaceholder')}
              maxLength={100}
              disabled={isSubmitting || submitStatus === 'success'}
            />
          </div>

          <div className="contact-form-group">
            <label htmlFor="email" className="contact-label">{t('contact.form.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              className="contact-input"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('contact.form.emailPlaceholder')}
              disabled={isSubmitting || submitStatus === 'success'}
            />
          </div>

          <div className="contact-form-group">
            <label htmlFor="message" className="contact-label">{t('contact.form.message')}</label>
            <textarea
              id="message"
              name="message"
              className="contact-textarea"
              value={formData.message}
              onChange={handleChange}
              placeholder={t('contact.form.messagePlaceholder')}
              maxLength={maxLength}
              rows={8}
              disabled={isSubmitting || submitStatus === 'success'}
            />
            <div className="contact-char-counter">
              {t('contact.form.charactersRemaining', { count: remainingChars })}
            </div>
          </div>

          {submitStatus === 'error' && (
            <div className="contact-error-message">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="contact-success-message">
              <CheckCircle size={20} />
              <span>{t('contact.successMessage')}</span>
            </div>
          )}

          <div className="contact-modal-footer">
            <button
              type="button"
              className="contact-cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.buttons.close')}
            </button>
            <button
              type="submit"
              className="contact-submit-button"
              disabled={isSubmitting || submitStatus === 'success' || !formData.name.trim() || !formData.email.trim() || !formData.message.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="contact-spinner"></div>
                  <span>{t('contact.form.sending')}</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>{t('contact.form.send')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ContactModal;
