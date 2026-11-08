// magazine-front/src/components/workshops/WorkshopEditor.jsx
//
// The workshop editor, like the publications creator: a full page with four
// steps (the workshop → when and where → cover and talleristas → review and
// save) and «Mis talleres y concursos», the ones you manage (super admins:
// all). It makes contests too (utils/contests.js): chosen in step 1 when
// creating (fixed afterwards); their step 2 is the sign-up and jury days and
// the awards. A contest by anyone but a super admin is sent for review.
// Its talleristas on the team edit a workshop like an article's authors do
// (useWorkshopAccess.canManageWorkshop, isWorkshopManager on the server);
// creating one is for admins and super admins. Opened from the workshops
// page, a workshop's ⋯ options and Admin › Talleres (UIContext:
// navigateToWorkshopEditor / navigateToMyWorkshops).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Plus, Edit, Check, ChevronLeft, ChevronRight, Save, Eye, Trash2,
  CalendarDays, Users, Baby, User, MapPin, Gift, Lock, Trophy, Medal, Send
} from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import { canManageWorkshop } from '../../app_context/useWorkshopAccess';
import LocationPicker from '../maps/LocationPicker';
import { localDate, serverDate } from '../../utils/locale';
import { toForm, toAuthors, toPayload, formDate, resolveCover } from './workshopForm';
import WorkshopAccessTag from './WorkshopAccessTag';
import WorkshopKindTag, { WorkshopReviewTag, WorkshopFinishedTag } from './WorkshopKindTag';
import { isContest, formatDay, signupRange, AWARD_PLACES, awardLabel, reviewStateOf } from '../../utils/contests';
import { workshopDate, isPastWorkshop } from '../../utils/workshopFilters';
import '../admin/ArticleEditorBlocks.css';
import './WorkshopEditor.css';

const TOTAL_STEPS = 4;
const TITLE_MAX = 255;

const whenOf = (w) => {
  const d = serverDate(w?.date_workshop);
  return d ? localDate(d, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
};
const AWARD_TEXT_MAX = 255;

function WorkshopEditor() {
  const { t } = useTranslation();
  // Talleristas' photos: their author profile's first (as in «Autoras/es»).
  const photoOf = useAuthorPhoto();
  const {
    workshopEditor, navigateToTalleres, navigateToWorkshopDetail, navigateToAdmin
  } = useUI();
  const { currentUser, isSuperAdmin, isAdmin, canCreateContent } = useAuth();
  const {
    workshops, fetchWorkshops, fetchWorkshopById, createWorkshop, updateWorkshop,
    uploadWorkshopCover, deleteWorkshop, setSelectedWorkshop
  } = useWorkshop();
  const { editors, fetchEditors } = useMagazine();
  const canCreate = isAdmin || isSuperAdmin;

  const initial = workshopEditor?.workshop || null;
  const [view, setView] = useState(workshopEditor?.view === 'mine' || (!initial && !canCreate) ? 'mine' : 'wizard');
  const [editing, setEditing] = useState(initial);
  const [form, setForm] = useState(() => toForm(initial, workshopEditor?.kind));
  const [authors, setAuthors] = useState(() => toAuthors(initial, currentUser));
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(() => resolveCover(initial?.cover_image_workshop));
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [step, setStep] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [mineFilter, setMineFilter] = useState('upcoming');
  // A day or time typed only halfway: the field's value stays empty
  // (validity.badInput), so it's tracked apart to warn about it.
  const [halfTyped, setHalfTyped] = useState({ date_day: false, date_time: false });
  const blobRef = useRef(null);

  useEffect(() => { fetchWorkshops(); fetchEditors(); }, [fetchWorkshops, fetchEditors]);
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  // Load a workshop into the form (the list's copy may lack fields: the
  // whole workshop comes from the server).
  const loadWorkshop = useCallback((w) => {
    setEditing(w);
    setForm(toForm(w, workshopEditor?.kind));
    setAuthors(toAuthors(w, currentUser));
    setCoverFile(null);
    setCoverRemoved(false);
    setCoverPreview(resolveCover(w?.cover_image_workshop));
    setErrors({});
    setDirty(false);
    setStep(1);
  }, [currentUser]);

  const editingId = editing?.id_workshop || null;
  useEffect(() => {
    if (!editingId) return;
    let alive = true;
    fetchWorkshopById(editingId).then((res) => {
      if (alive && res?.success && res.data) {
        setEditing(res.data);
        setForm((f) => (dirty ? f : toForm(res.data)));
        setAuthors((a) => (dirty ? a : toAuthors(res.data, currentUser)));
        if (!dirty) setCoverPreview(resolveCover(res.data.cover_image_workshop));
      }
    });
    return () => { alive = false; };
    // Only when another workshop is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const contest = form.kind_workshop === 'contest';
  const setAward = (place, key, value) => {
    setForm((f) => ({ ...f, awards_workshop: { ...f.awards_workshop, [place]: { ...f.awards_workshop[place], [key]: value } } }));
    setDirty(true);
  };

  // ---- Steps ----------------------------------------------------------------
  const stepProblem = (n) => {
    if (n === 1) {
      if (!form.title_workshop.trim()) return { field: 'title_workshop', message: t('workshops.editor.need.title', 'Escribe el título del taller') };
      if (form.title_workshop.length > TITLE_MAX) return { field: 'title_workshop', message: t('workshops.editor.need.titleLong', { max: TITLE_MAX, defaultValue: 'El título es demasiado largo (máximo {{max}} caracteres)' }) };
    }
    if (n === 2 && contest) {
      const { registration_start_workshop: start, registration_end_workshop: end, resolution_date_workshop: jury } = form;
      if (!start) return { field: 'registration_start_workshop', message: t('contests.editor.need.start', 'Pon el día en que se abren las inscripciones') };
      if (!end) return { field: 'registration_end_workshop', message: t('contests.editor.need.end', 'Pon el último día de inscripciones') };
      if (!jury) return { field: 'resolution_date_workshop', message: t('contests.editor.need.jury', 'Pon el día del fallo del jurado') };
      if (end < start) return { field: 'registration_end_workshop', message: t('contests.editor.need.endAfterStart', 'Las inscripciones no pueden cerrarse antes de abrirse') };
      if (jury < end) return { field: 'resolution_date_workshop', message: t('contests.editor.need.juryAfterEnd', 'El fallo del jurado no puede ser antes del cierre de inscripciones') };
      return null;
    }
    if (n === 2) {
      if (halfTyped.date_day) return { field: 'date_day', message: t('workshops.editor.need.dayIncomplete', 'La fecha está incompleta: pon el día, el mes y el año') };
      if (halfTyped.date_time) return { field: 'date_time', message: t('workshops.editor.need.timeIncomplete', 'La hora está incompleta: pon la hora y los minutos') };
      if (form.date_day && !form.date_time) return { field: 'date_time', message: t('workshops.editor.need.time', 'Pon también la hora del taller') };
      if (form.date_time && !form.date_day) return { field: 'date_day', message: t('workshops.editor.need.day', 'Pon también la fecha del taller') };
      if (form.capacity_workshop !== '') {
        const c = Number(form.capacity_workshop);
        if (!Number.isInteger(c) || c < 0) return { field: 'capacity_workshop', message: t('workshops.editor.need.capacity', 'El aforo tiene que ser un número entero (0 o más)') };
      }
    }
    return null;
  };
  const FIELD_IDS = {
    title_workshop: 'ws-title', capacity_workshop: 'ws-capacity', date_day: 'ws-date', date_time: 'ws-time',
    registration_start_workshop: 'ct-start', registration_end_workshop: 'ct-end', resolution_date_workshop: 'ct-jury'
  };
  const showProblem = (p) => {
    setErrors({ [p.field]: p.message });
    setTimeout(() => document.getElementById(FIELD_IDS[p.field])?.focus(), 0);
  };
  // Editing: any step. Creating: once the steps before it are complete.
  const canVisitStep = (n) => !!editingId || [...Array(n - 1)].every((_, i) => !stepProblem(i + 1));
  const goNext = () => {
    const p = stepProblem(step);
    if (p) { showProblem(p); return; }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    window.scrollTo(0, 0);
  };
  const goPrev = () => { setStep((s) => Math.max(1, s - 1)); window.scrollTo(0, 0); };

  // ---- Saving ---------------------------------------------------------------
  const save = async () => {
    for (const n of [1, 2]) {
      const p = stepProblem(n);
      if (p) { setStep(n); showProblem(p); return; }
    }
    setSaving(true);
    try {
      const payload = toPayload(form, authors);
      if (coverRemoved && !coverFile) payload.cover_image_workshop = null;
      const result = editingId ? await updateWorkshop(editingId, payload) : await createWorkshop(payload);
      if (!result?.success || !result.data) return;
      let saved = result.data;
      if (coverFile) {
        const up = await uploadWorkshopCover(saved.id_workshop, coverFile);
        if (up?.success) await fetchWorkshops();
      }
      const fresh = await fetchWorkshopById(saved.id_workshop);
      if (fresh?.success && fresh.data) saved = fresh.data;
      setEditing(saved);
      setCoverFile(null);
      setCoverRemoved(false);
      setCoverPreview(resolveCover(saved.cover_image_workshop));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // ---- Leaving --------------------------------------------------------------
  const confirmLeave = () => !dirty || window.confirm(t('workshops.editor.confirmLeave', 'Tienes cambios sin guardar en el taller. ¿Salir igualmente?'));

  const openWorkshop = (w) => {
    if (!confirmLeave()) return;
    setSelectedWorkshop(w);
    navigateToWorkshopDetail();
  };

  const close = () => {
    if (!confirmLeave()) return;
    const back = workshopEditor?.returnTo;
    if (back === 'workshopDetail' && editing) {
      setSelectedWorkshop(editing);
      navigateToWorkshopDetail();
    } else if (back === 'admin') {
      navigateToAdmin('workshops');
    } else {
      navigateToTalleres();
    }
  };

  const startNew = () => {
    if (!confirmLeave()) return;
    loadWorkshop(null);
    setView('wizard');
  };

  const editFromList = (w) => {
    if (editingId !== w.id_workshop && !confirmLeave()) return;
    if (editingId !== w.id_workshop) loadWorkshop(w);
    setView('wizard');
    window.scrollTo(0, 0);
  };

  const removeWorkshop = async (w) => {
    const sure = isContest(w)
      ? t('contests.confirmDelete', '¿Eliminar este concurso? Se borrarán también sus inscripciones. Esta acción no se puede deshacer.')
      : t('workshops.confirmDelete', '¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.');
    if (!window.confirm(sure)) return;
    const res = await deleteWorkshop(w.id_workshop);
    if (res?.success && editingId === w.id_workshop) loadWorkshop(null);
  };

  // ---- Cover and talleristas -----------------------------------------------
  const pickCover = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = URL.createObjectURL(f);
    setCoverFile(f);
    setCoverPreview(blobRef.current);
    setCoverRemoved(false);
    setDirty(true);
  };
  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(true);
    setDirty(true);
  };
  const addAuthor = (rawId) => {
    const id = parseInt(rawId, 10);
    if (!id || authors.some((a) => a.id_user === id)) return;
    const ed = editors.find((e) => e.id_user === id);
    if (ed) {
      setAuthors((prev) => [...prev, { id_user: ed.id_user, name_user: ed.name_user, image_user: ed.image_user }]);
      setDirty(true);
    }
  };
  const removeAuthor = (id) => { setAuthors((prev) => prev.filter((a) => a.id_user !== id)); setDirty(true); };

  // ---- «Mis talleres» ---------------------------------------------------------
  const mine = useMemo(() => {
    const managed = (workshops || []).filter((w) => canManageWorkshop(w, currentUser, { isSuperAdmin, canCreateContent }));
    const ts = (w) => workshopDate(w)?.getTime() ?? null;
    // Finished as on the page: a workshop's day / a contest's jury day is over.
    const upcoming = managed.filter((w) => !isPastWorkshop(w))
      .sort((a, b) => (ts(a) ?? Infinity) - (ts(b) ?? Infinity));
    const past = managed.filter((w) => isPastWorkshop(w)).sort((a, b) => ts(b) - ts(a));
    return { upcoming, past, all: [...upcoming, ...past] };
  }, [workshops, currentUser, isSuperAdmin, canCreateContent]);
  const MINE_FILTERS = [
    { key: 'upcoming', label: t('workshops.editor.mine.upcoming', 'Próximos') },
    { key: 'past', label: t('workshops.editor.mine.past', 'Pasados') },
    { key: 'all', label: t('workshops.editor.mine.all', 'Todos') }
  ];

  if (!currentUser || !canCreateContent) {
    return (
      <div className="unauthorized-message">
        <h2>{t('editor.unauthorized.title')}</h2>
        <p>{t('workshops.editor.unauthorized', 'Solo el equipo de la revista puede editar talleres.')}</p>
        <button onClick={navigateToTalleres} className="btn-back-nav btn-back"><ChevronLeft size={20} />{t('workshops.backToList', 'Volver a talleres')}</button>
      </div>
    );
  }

  const STEPS = contest ? [
    { n: 1, short: t('contests.editor.step.contest', 'Concurso'), long: t('contests.editor.step.contestLong', 'El concurso') },
    { n: 2, short: t('contests.editor.step.dates', 'Fechas y premios'), long: t('contests.editor.step.datesLong', 'Fechas y premios') },
    { n: 3, short: t('contests.editor.step.people', 'Portada y organización'), long: t('contests.editor.step.peopleLong', 'Portada y organización') },
    { n: 4, short: t('workshops.editor.step.review', 'Guardar'), long: t('workshops.editor.step.reviewLong', 'Revisar y guardar') }
  ] : [
    { n: 1, short: t('workshops.editor.step.workshop', 'Taller'), long: t('workshops.editor.step.workshopLong', 'El taller') },
    { n: 2, short: t('workshops.editor.step.where', 'Cuándo y dónde'), long: t('workshops.editor.step.whereLong', 'Cuándo y dónde') },
    { n: 3, short: t('workshops.editor.step.people', 'Portada y talleristas'), long: t('workshops.editor.step.peopleLong', 'Portada y talleristas') },
    { n: 4, short: t('workshops.editor.step.review', 'Guardar'), long: t('workshops.editor.step.reviewLong', 'Revisar y guardar') }
  ];
  // A contest by anyone but a super admin waits for one (its review: shown
  // while editing one that's pending or was sent back).
  const needsReview = contest && !isSuperAdmin;
  const review = editing ? reviewStateOf(editing) : 'approved';
  const audienceLabel = (a) => (a === 'infantil' ? t('workshops.form.audienceKids', 'Taller infantil') : t('workshops.form.audienceGeneral', 'Taller'));
  const change = (n) => <button type="button" className="pub-link" onClick={() => setStep(n)}>{t('editor.wizard.review.change', 'Cambiar')}</button>;
  const errorOf = (field) => (errors[field] ? <span className="field-error-msg" role="alert">{errors[field]}</span> : null);

  // ---- Step 1: the workshop (or the contest) ----
  const stepWorkshop = (
    <>
      {editingId ? (
        <p className="pub-step-hint workshop-editor__kind-fixed">
          <WorkshopKindTag workshop={editing} /> {t('contests.editor.kindFixed', 'Lo que es (taller o concurso) no se cambia una vez creado.')}
        </p>
      ) : (
        <fieldset className="pub-fieldset">
          <legend>{t('contests.editor.kind', '¿Qué vas a crear?')}</legend>
          <div className="pub-choice-grid">
            {[
              { key: 'workshop', Icon: Users, title: t('workshops.form.audienceGeneral', 'Taller'), desc: t('contests.editor.kindWorkshopDesc', 'Con fecha, lugar y plazas: la gente reserva la suya.') },
              { key: 'contest', Icon: Trophy, title: t('contests.kind', 'Concurso'), desc: t('contests.editor.kindContestDesc', 'Con días de inscripción y de fallo del jurado, y premios. Sin aforo: se inscribe cualquiera con cuenta.') }
            ].map(({ key, Icon, title, desc }) => (
              <button
                key={key}
                type="button"
                className={`pub-choice ${form.kind_workshop === key ? 'is-selected' : ''}`}
                onClick={() => set('kind_workshop', key)}
                aria-pressed={form.kind_workshop === key}
              >
                <Icon size={28} />
                <span className="pub-choice__title">{title}</span>
                <span className="pub-choice__desc">{desc}</span>
              </button>
            ))}
          </div>
          {needsReview && <p className="pub-step-hint">{t('contests.editor.reviewHint', 'Un super admin revisará el concurso antes de publicarlo.')}</p>}
        </fieldset>
      )}

      <div className="form-group full-width">
        <label htmlFor="ws-title">{t('workshops.editor.titleLabel', 'Título *')}</label>
        <input
          type="text"
          id="ws-title"
          value={form.title_workshop}
          maxLength={TITLE_MAX}
          onChange={(e) => set('title_workshop', e.target.value)}
          placeholder={contest ? t('contests.editor.titlePlaceholder', 'Título del concurso') : t('workshops.form.titlePlaceholder', 'Título del taller')}
          className={errors.title_workshop ? 'input-error' : ''}
          aria-invalid={!!errors.title_workshop}
        />
        {errorOf('title_workshop')}
      </div>

      {!contest && (<>
      <fieldset className="pub-fieldset">
        <legend>{t('workshops.form.audience', 'Tipo de taller')}</legend>
        <div className="pub-choice-grid">
          {[
            { key: 'general', Icon: Users, title: t('workshops.form.audienceGeneral', 'Taller'), desc: t('workshops.editor.generalDesc', 'Para personas adultas. Aparece en «Talleres».') },
            { key: 'infantil', Icon: Baby, title: t('workshops.form.audienceKids', 'Taller infantil'), desc: t('workshops.editor.kidsDesc', 'Para niñas y niños. Aparece en «Talleres infantiles».') }
          ].map(({ key, Icon, title, desc }) => (
            <button
              key={key}
              type="button"
              className={`pub-choice ${form.audience_workshop === key ? 'is-selected' : ''}`}
              onClick={() => set('audience_workshop', key)}
              aria-pressed={form.audience_workshop === key}
            >
              <Icon size={28} />
              <span className="pub-choice__title">{title}</span>
              <span className="pub-choice__desc">{desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pub-fieldset">
        <legend>{t('workshops.editor.access', 'Quién puede reservar plaza')}</legend>
        <div className="pub-choice-grid">
          {[
            { free: false, Icon: Lock, title: t('workshops.access.members', 'Para socios/as'), desc: t('workshops.editor.membersDesc', 'Solo reservan plaza los socios/as de la revista (y el equipo).') },
            { free: true, Icon: Gift, title: t('workshops.access.free', 'Gratuito'), desc: t('workshops.editor.freeDesc', 'Cualquier persona con cuenta en la revista puede reservar plaza, sin ser socio/a.') }
          ].map(({ free, Icon, title, desc }) => (
            <button
              key={String(free)}
              type="button"
              className={`pub-choice ${form.free_workshop === free ? 'is-selected' : ''}`}
              onClick={() => set('free_workshop', free)}
              aria-pressed={form.free_workshop === free}
            >
              <Icon size={28} />
              <span className="pub-choice__title">{title}</span>
              <span className="pub-choice__desc">{desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      </>)}

      <div className="form-group full-width">
        <label htmlFor="ws-description">{contest ? t('contests.editor.description', 'Descripción y bases') : t('workshops.form.description', 'Descripción')}</label>
        <textarea
          id="ws-description"
          rows={contest ? 10 : 6}
          value={form.description_workshop}
          onChange={(e) => set('description_workshop', e.target.value)}
          placeholder={contest
            ? t('contests.editor.descriptionPlaceholder', '¿De qué trata? ¿Quién puede participar, cómo y qué hay que presentar?')
            : t('workshops.form.descriptionPlaceholder', '¿De qué trata el taller?')}
        />
      </div>
    </>
  );

  // ---- Step 2 (a contest): its days and awards ----
  const stepContestDates = (
    <>
      <p className="pub-step-hint">{t('contests.editor.datesHint', 'Las inscripciones se abren el primer día y se cierran al acabar el último. El día del fallo se publican las ganadoras y los ganadores.')}</p>
      <div className="workshop-editor__row workshop-editor__row--three">
        {[
          { field: 'registration_start_workshop', id: 'ct-start', label: t('contests.editor.start', 'Se abren las inscripciones') },
          { field: 'registration_end_workshop', id: 'ct-end', label: t('contests.editor.end', 'Último día de inscripción') },
          { field: 'resolution_date_workshop', id: 'ct-jury', label: t('contests.editor.jury', 'Fallo del jurado') }
        ].map(({ field, id, label }) => (
          <div className="form-group" key={field}>
            <label htmlFor={id}>{label}</label>
            <input
              type="date"
              id={id}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              className={errors[field] ? 'input-error' : ''}
              aria-invalid={!!errors[field]}
            />
            {errorOf(field)}
          </div>
        ))}
      </div>

      <fieldset className="pub-fieldset">
        <legend>{t('contests.editor.awards', 'Premios')}</legend>
        <p className="pub-step-hint">{t('contests.editor.awardsHint', 'Opcional. El premio de cada puesto se ve desde el principio; las ganadoras y los ganadores, a partir del día del fallo (escríbelos cuando el jurado decida).')}</p>
        <div className="contest-editor__awards">
          {AWARD_PLACES.map((place) => (
            <div key={place} className="contest-editor__award">
              <span className="contest-editor__place">
                {place === 'mention' ? <Medal size={16} aria-hidden="true" /> : <Trophy size={16} aria-hidden="true" />}
                {awardLabel(place, t)}
              </span>
              <div className="form-group">
                <label htmlFor={`ct-prize-${place}`}>{t('contests.editor.prize', 'Premio')}</label>
                <input
                  type="text"
                  id={`ct-prize-${place}`}
                  maxLength={AWARD_TEXT_MAX}
                  value={form.awards_workshop[place].prize}
                  onChange={(e) => setAward(place, 'prize', e.target.value)}
                  placeholder={place === 'mention'
                    ? t('contests.editor.mentionPrizePlaceholder', 'Ej. publicación en la revista')
                    : t('contests.editor.prizePlaceholder', 'Ej. 300 € y publicación')}
                />
              </div>
              <div className="form-group">
                <label htmlFor={`ct-winner-${place}`}>
                  {place === 'mention' ? t('contests.editor.mentionWinners', 'Quién la recibe') : t('contests.editor.winner', 'Ganador/a')}
                </label>
                {place === 'mention' ? (
                  <textarea
                    id={`ct-winner-${place}`}
                    rows={2}
                    maxLength={1000}
                    value={form.awards_workshop[place].winner}
                    onChange={(e) => setAward(place, 'winner', e.target.value)}
                    placeholder={t('contests.editor.mentionPlaceholder', 'Uno o varios nombres (y sus obras)')}
                  />
                ) : (
                  <input
                    type="text"
                    id={`ct-winner-${place}`}
                    maxLength={AWARD_TEXT_MAX}
                    value={form.awards_workshop[place].winner}
                    onChange={(e) => setAward(place, 'winner', e.target.value)}
                    placeholder={t('contests.editor.winnerPlaceholder', 'Nombre (y su obra)')}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );

  // ---- Step 2: when and where ----
  const stepWhere = (
    <>
      <p className="pub-step-hint">{t('workshops.editor.dateHint', 'La fecha y la hora salen en la tarjeta y en la página del taller. Déjalas vacías si aún no están decididas.')}</p>
      <div className="workshop-editor__row">
        {[
          { field: 'date_day', id: 'ws-date', type: 'date', label: t('workshops.editor.day', 'Fecha') },
          { field: 'date_time', id: 'ws-time', type: 'time', label: t('workshops.editor.time', 'Hora') }
        ].map(({ field, id, type, label }) => (
          <div className="form-group" key={field}>
            <label htmlFor={id}>{label}</label>
            <input
              type={type}
              id={id}
              value={form[field]}
              onChange={(e) => { set(field, e.target.value); setHalfTyped((h) => ({ ...h, [field]: e.target.validity.badInput })); }}
              onBlur={(e) => setHalfTyped((h) => ({ ...h, [field]: e.target.validity.badInput }))}
              className={errors[field] ? 'input-error' : ''}
              aria-invalid={!!errors[field]}
            />
            {errorOf(field)}
          </div>
        ))}
      </div>
      <div className="workshop-editor__row">
        <div className="form-group">
          <label htmlFor="ws-capacity">{t('workshops.form.capacity', 'Aforo (plazas)')}</label>
          <input
            type="number"
            id="ws-capacity"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.capacity_workshop}
            onChange={(e) => set('capacity_workshop', e.target.value)}
            placeholder={t('workshops.form.capacityPlaceholder', 'Ej. 20')}
            className={errors.capacity_workshop ? 'input-error' : ''}
            aria-invalid={!!errors.capacity_workshop}
          />
          <p className="pub-step-hint">{t('workshops.editor.capacityHint', 'Vacío = sin límite de plazas.')}</p>
          {errorOf('capacity_workshop')}
        </div>
      </div>
      <div className="form-group full-width">
        <label htmlFor="ws-place">{t('workshops.form.place', 'Lugar')}</label>
        <input
          type="text"
          id="ws-place"
          value={form.location_workshop}
          onChange={(e) => set('location_workshop', e.target.value)}
          placeholder={t('workshops.form.placePlaceholder', 'Lugar del taller')}
        />
      </div>
      <div className="form-group full-width workshop-editor__map">
        <span className="pub-field-label">{t('workshops.form.mapLocation', 'Ubicación en el mapa')}</span>
        <p className="pub-step-hint">{t('workshops.editor.mapHint', 'Busca la dirección o mueve el marcador. Es lo que verá la gente en la página del taller.')}</p>
        <LocationPicker
          lat={form.lat_workshop}
          lng={form.lng_workshop}
          initialQuery={form.location_workshop}
          onChange={({ lat, lng }) => { setForm((f) => ({ ...f, lat_workshop: lat, lng_workshop: lng })); setDirty(true); }}
        />
      </div>
    </>
  );

  // ---- Step 3: cover and talleristas ----
  const stepPeople = (
    <>
      <div className="form-group full-width cover-image-group">
        <label>{t('workshops.form.cover', 'Imagen de portada')}</label>
        <div className="cover-image-upload">
          {coverPreview ? (
            <div className="cover-image-preview">
              <img src={coverPreview} alt="" />
              <button type="button" className="btn-remove-preview" onClick={removeCover} aria-label={t('workshops.editor.removeCover', 'Quitar la imagen')} title={t('workshops.editor.removeCover', 'Quitar la imagen')}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <input type="file" id="ws-cover" accept="image/*" onChange={pickCover} className="cover-image-input" />
              <label htmlFor="ws-cover" className="cover-image-label">
                <Plus size={24} />
                <span>{t('editor.coverImage.select')}</span>
              </label>
            </>
          )}
        </div>
      </div>

      <fieldset className="pub-fieldset">
        <legend>{contest ? t('contests.editor.organizers', 'Organizan') : t('workshops.form.hosts', 'Autoras/es (talleristas)')}</legend>
        <p className="pub-step-hint">
          {contest
            ? t('contests.editor.organizersHint', 'Quien organiza el concurso. Las personas del equipo que lo organizan también pueden editarlo y ver las inscripciones.')
            : t('workshops.editor.hostsHint', 'Quien imparte el taller. Sus talleristas del equipo también pueden editarlo y gestionar las plazas.')}
        </p>
        <div className="workshop-editor__hosts">
          {authors.length === 0 && <span className="pub-step-hint">{contest ? t('contests.editor.noOrganizers', 'Nadie todavía.') : t('workshops.editor.noHosts', 'Sin talleristas todavía.')}</span>}
          {authors.map((a) => (
            <span key={a.id_user} className="workshop-editor__host">
              {photoOf(a) ? <img src={photoOf(a)} alt="" /> : <User size={14} />}
              <span>{a.name_user}</span>
              <button type="button" onClick={() => removeAuthor(a.id_user)} aria-label={t('workshops.form.removeHost', 'Quitar')} title={t('workshops.form.removeHost', 'Quitar')}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="form-group">
          <label htmlFor="ws-add-host" className="workshop-editor__sr">{contest ? t('contests.editor.addOrganizer', '+ Añadir a la organización') : t('workshops.form.addHost', '+ Añadir tallerista')}</label>
          <select id="ws-add-host" value="" onChange={(e) => { if (e.target.value) addAuthor(e.target.value); }}>
            <option value="">{contest ? t('contests.editor.addOrganizer', '+ Añadir a la organización') : t('workshops.form.addHost', '+ Añadir tallerista')}</option>
            {editors.filter((e) => !authors.some((a) => a.id_user === e.id_user)).map((ed) => (
              <option key={ed.id_user} value={ed.id_user}>{ed.name_user}</option>
            ))}
          </select>
        </div>
      </fieldset>
    </>
  );

  // ---- Step 4: review and save ----
  const when = formDate(form) ? localDate(formDate(form), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const stepReview = (
    <div className="pub-review">
      <dl className="pub-review__list">
        <dt>{t('workshops.form.title', 'Título')}</dt>
        <dd>{form.title_workshop || '—'} {change(1)}</dd>
        {contest ? (<>
        <dt>{t('contests.editor.kind', '¿Qué vas a crear?')}</dt>
        <dd>{t('contests.kind', 'Concurso')} {!editingId && change(1)}</dd>
        <dt>{t('contests.editor.signups', 'Inscripciones')}</dt>
        <dd>{t('contests.editor.range', { from: signupRange(form.registration_start_workshop, form.registration_end_workshop).from || '—', to: formatDay(form.registration_end_workshop) || '—', defaultValue: 'Del {{from}} al {{to}}' })} {change(2)}</dd>
        <dt>{t('contests.editor.jury', 'Fallo del jurado')}</dt>
        <dd>{formatDay(form.resolution_date_workshop) || '—'} {change(2)}</dd>
        <dt>{t('contests.editor.awards', 'Premios')}</dt>
        <dd>
          {AWARD_PLACES.filter((p) => form.awards_workshop[p].prize || form.awards_workshop[p].winner).map((p) => (
            <span key={p} className="contest-editor__review-award">
              <strong>{awardLabel(p, t)}</strong>
              {[form.awards_workshop[p].prize, form.awards_workshop[p].winner].filter(Boolean).join(' — ')}
            </span>
          ))}
          {!AWARD_PLACES.some((p) => form.awards_workshop[p].prize || form.awards_workshop[p].winner) && '—'} {change(2)}
        </dd>
        <dt>{t('contests.editor.organizers', 'Organizan')}</dt>
        <dd>{authors.map((a) => a.name_user).join(', ') || '—'} {change(3)}</dd>
        <dt>{t('workshops.form.cover', 'Imagen de portada')}</dt>
        <dd>{coverPreview ? <img src={coverPreview} alt="" className="pub-review__cover" /> : t('editor.wizard.review.noCover', 'Sin portada')} {change(3)}</dd>
        </>) : (<>
        <dt>{t('workshops.form.audience', 'Tipo de taller')}</dt>
        <dd>{audienceLabel(form.audience_workshop)} {change(1)}</dd>
        <dt>{t('workshops.editor.access', 'Quién puede reservar plaza')}</dt>
        <dd>{form.free_workshop ? t('workshops.access.free', 'Gratuito') : t('workshops.access.members', 'Para socios/as')} {change(1)}</dd>
        <dt>{t('workshops.form.date', 'Fecha y hora')}</dt>
        <dd>{when || t('admin.workshops.noDate', 'Sin fecha')} {change(2)}</dd>
        <dt>{t('workshops.form.place', 'Lugar')}</dt>
        <dd>{form.location_workshop || '—'} {change(2)}</dd>
        <dt>{t('workshops.form.capacity', 'Aforo (plazas)')}</dt>
        <dd>{form.capacity_workshop === '' ? t('workshops.editor.noLimit', 'Sin límite') : form.capacity_workshop} {change(2)}</dd>
        <dt>{t('workshops.form.hosts', 'Autoras/es (talleristas)')}</dt>
        <dd>{authors.map((a) => a.name_user).join(', ') || '—'} {change(3)}</dd>
        <dt>{t('workshops.form.cover', 'Imagen de portada')}</dt>
        <dd>{coverPreview ? <img src={coverPreview} alt="" className="pub-review__cover" /> : t('editor.wizard.review.noCover', 'Sin portada')} {change(3)}</dd>
        </>)}
      </dl>

      {needsReview && !editingId && <p className="pub-step-note">{t('contests.editor.reviewNote', 'Al guardarlo se envía a revisión: se publicará cuando lo apruebe un super admin.')}</p>}

      {dirty && editingId && <p className="pub-step-note">{t('workshops.editor.unsaved', 'Hay cambios sin guardar.')}</p>}

      <div className="pub-review__actions">
        {editingId && (
          <button type="button" className="pub-btn pub-btn--ghost" onClick={() => openWorkshop(editing)}>
            <Eye size={18} />
            <span>{contest ? t('contests.editor.view', 'Ver el concurso') : t('workshops.editor.view', 'Ver el taller')}</span>
          </button>
        )}
        <button type="button" className="pub-btn pub-btn--primary" onClick={save} disabled={saving}>
          {(needsReview && !editingId) || (contest && review === 'rejected') ? <Send size={18} /> : <Save size={18} />}
          <span>
            {saving
              ? t('editor.saving')
              : contest && review === 'rejected' ? t('contests.editor.resubmit', 'Guardar y enviar de nuevo a revisión')
              : editingId ? t('editor.wizard.saveChanges', 'Guardar cambios')
              : !contest ? t('workshops.create', 'Crear taller')
              : needsReview ? t('contests.editor.submit', 'Enviar a revisión')
              : t('contests.create', 'Crear concurso')}
          </span>
        </button>
      </div>
    </div>
  );

  const mineShown = mine[mineFilter];

  return (
    <div className="article-editor-blocks workshop-editor">
      <div className="editor-container pub-editor">
        <header className="pub-editor-header">
          <div className="pub-editor-toolbar">
            {view === 'wizard' ? (
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setView('mine')} title={t('workshops.editor.mine.button', 'Mis talleres y concursos')}>
                <CalendarDays size={18} />
                <span className="pub-btn__text">{t('workshops.editor.mine.button', 'Mis talleres y concursos')}</span>
              </button>
            ) : (
              <>
                {(editingId || dirty) && (
                  <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setView('wizard')} title={t('workshops.editor.mine.backToEditor', 'Volver al que estabas editando')}>
                    <Edit size={18} />
                    <span className="pub-btn__text">{t('workshops.editor.mine.backToEditor', 'Volver al que estabas editando')}</span>
                  </button>
                )}
                {canCreate && (
                  <button type="button" className="pub-btn pub-btn--primary" onClick={startNew} title={t('workshops.editor.mine.new', 'Nuevo taller o concurso')}>
                    <Plus size={18} />
                    <span className="pub-btn__text">{t('workshops.editor.mine.new', 'Nuevo taller o concurso')}</span>
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className="pub-editor-close"
              onClick={close}
              title={t('workshops.editor.close', 'Cerrar el editor de talleres')}
              aria-label={t('workshops.editor.close', 'Cerrar el editor de talleres')}
            >
              <X size={24} />
            </button>
          </div>

          <h1 className="pub-editor-title">
            {view === 'mine'
              ? t('workshops.editor.mine.button', 'Mis talleres y concursos')
              : contest
              ? (editingId ? t('contests.edit', 'Editar concurso') : t('contests.editor.createTitle', 'Crea un concurso'))
              : editingId ? t('workshops.edit', 'Editar taller') : t('workshops.editor.createTitle', 'Crea un taller')}
          </h1>

          {view === 'wizard' && (
            <nav className="pub-progress" aria-label={t('workshops.editor.stepsLabel', 'Pasos del taller')}>
              <ol className="pub-steps">
                {STEPS.map(({ n, short }) => {
                  const state = n < step ? 'is-done' : n === step ? 'is-current' : 'is-next';
                  const clickable = n !== step && canVisitStep(n);
                  return (
                    <li key={n} className={`pub-step ${state}`}>
                      <button
                        type="button"
                        className="pub-step__btn"
                        onClick={() => clickable && setStep(n)}
                        disabled={!clickable && n !== step}
                        aria-current={n === step ? 'step' : undefined}
                      >
                        <span className="pub-step__bar" aria-hidden="true" />
                        <span className="pub-step__num">
                          {String(n).padStart(2, '0')}
                          {n < step && <Check size={13} className="pub-step__check" />}
                        </span>
                        <span className="pub-step__label">{short}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </header>

        {view === 'wizard' && (
          <div className="pub-wizard">
            <section className="pub-step-panel" aria-labelledby="ws-step-title">
              <div className="pub-step-heading">
                <span className="pub-step-eyebrow">
                  {t('editor.wizard.stepOf', { n: step, total: TOTAL_STEPS, defaultValue: 'Paso {{n}} de {{total}}' })}
                </span>
                <h2 id="ws-step-title" className="pub-step-title">{STEPS[step - 1].long}</h2>
              </div>
              {/* A contest of theirs waiting for review, or sent back: why. */}
              {editingId && review !== 'approved' && (
                <p className={`workshop-review-note workshop-review-note--${review}`} role="status">
                  {review === 'rejected'
                    ? t('contests.review.rejectedNote', { reason: editing.rejection_reason_workshop || t('contests.review.noReason', 'sin motivo'), defaultValue: 'Un super admin lo ha devuelto: {{reason}}. Edítalo y guárdalo para enviarlo de nuevo a revisión.' })
                    : t('contests.review.pendingNote', 'En revisión: la gente lo verá cuando lo apruebe un super admin.')}
                </p>
              )}
              {step === 1 && stepWorkshop}
              {step === 2 && (contest ? stepContestDates : stepWhere)}
              {step === 3 && stepPeople}
              {step === 4 && stepReview}
            </section>

            <div className="pub-wizard-footer">
              <div className="pub-wizard-footer__side">
                {step > 1 && (
                  <button type="button" className="pub-btn pub-btn--ghost" onClick={goPrev}>
                    <ChevronLeft size={18} />
                    <span>{t('editor.wizard.prev', 'Anterior')}</span>
                  </button>
                )}
              </div>
              {step < TOTAL_STEPS && editingId && (
                <button type="button" className="pub-btn pub-btn--ghost" onClick={save} disabled={saving}>
                  <Save size={18} />
                  <span>{saving ? t('editor.saving') : t('editor.wizard.saveChanges', 'Guardar cambios')}</span>
                </button>
              )}
              <div className="pub-wizard-footer__side pub-wizard-footer__side--end">
                {step < TOTAL_STEPS && (
                  <button type="button" className="pub-btn pub-btn--primary" onClick={goNext}>
                    <span>{t('editor.wizard.next', 'Siguiente')}</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'mine' && (
          <div className="pub-mine">
            <p className="list-subtitle">
              {isSuperAdmin
                ? t('workshops.editor.mine.subtitleAll', 'Como super-administrador ves todos los talleres y concursos. Edítalos, elimínalos o ábrelos.')
                : t('workshops.editor.mine.subtitle', 'Los talleres y concursos que impartes, organizas o creaste. Edítalos, elimínalos o ábrelos.')}
            </p>
            <div className="articles-filter">
              {MINE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`articles-filter__btn ${mineFilter === f.key ? 'is-active' : ''}`}
                  onClick={() => setMineFilter(f.key)}
                >
                  {f.label} <span className="articles-filter__count">{mine[f.key].length}</span>
                </button>
              ))}
            </div>
            {mineShown.length === 0 ? (
              <div className="empty-state">
                <p>{t('workshops.editor.mine.empty', 'No hay talleres aquí.')}</p>
                {canCreate && <p>{t('workshops.editor.mine.emptyHint', 'Crea uno con «Nuevo taller o concurso».')}</p>}
              </div>
            ) : (
              <div className="articles-grid">
                {mineShown.map((w) => {
                  const contestItem = isContest(w);
                  const date = contestItem
                    ? t('contests.editor.range', { from: signupRange(w.registration_start_workshop, w.registration_end_workshop).from || '—', to: formatDay(w.registration_end_workshop) || '—', defaultValue: 'Del {{from}} al {{to}}' })
                    : whenOf(w);
                  const spots = contestItem
                    ? t('contests.signedUp', { count: w.reservation_count || 0 })
                    : w.capacity_workshop != null
                    ? t('workshops.editor.mine.spots', { taken: w.reservation_count || 0, total: w.capacity_workshop, defaultValue: '{{taken}}/{{total}} plazas' })
                    : t('workshops.editor.mine.signedUp', { count: w.reservation_count || 0 });
                  return (
                    <div key={w.id_workshop} className={`article-item ${editingId === w.id_workshop ? 'is-current' : ''}`}>
                      <div className="article-item-info">
                        <h4>{w.title_workshop}</h4>
                        <p className="article-meta">
                          <WorkshopKindTag workshop={w} />
                          <WorkshopFinishedTag workshop={w} />
                          {!contestItem && <WorkshopAccessTag workshop={w} />}
                          <WorkshopReviewTag workshop={w} />
                          <span>{spots}</span>
                        </p>
                        <p className="article-author workshop-editor__when">
                          <CalendarDays size={14} aria-hidden="true" /> {date || t('admin.workshops.noDate', 'Sin fecha')}
                        </p>
                        {w.location_workshop && (
                          <p className="article-author workshop-editor__when">
                            <MapPin size={14} aria-hidden="true" /> {w.location_workshop}
                          </p>
                        )}
                        {w.authors?.length > 0 && (
                          <p className="article-author">{w.authors.map((a) => a.name_user).join(', ')}</p>
                        )}
                      </div>
                      <div className="article-item-actions">
                        <button type="button" className="btn-view-article" onClick={() => openWorkshop(w)} title={contestItem ? t('contests.editor.view', 'Ver el concurso') : t('workshops.editor.view', 'Ver el taller')}>
                          <Eye size={16} />
                          <span>{contestItem ? t('contests.editor.view', 'Ver el concurso') : t('workshops.editor.view', 'Ver el taller')}</span>
                        </button>
                        <button type="button" className="btn-edit" onClick={() => editFromList(w)} title={t('common.buttons.edit', 'Editar')} aria-label={t('common.buttons.edit', 'Editar')}>
                          <Edit size={18} />
                        </button>
                        <button type="button" className="btn-delete" onClick={() => removeWorkshop(w)} title={t('common.buttons.delete', 'Eliminar')} aria-label={t('common.buttons.delete', 'Eliminar')}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkshopEditor;
