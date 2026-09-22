// magazine-front/src/components/common/RollText.jsx
//
// Text with a "roll up" hover effect (replicated from ginivini.com's menu):
// two identical copies are stacked in a column inside an overflow-hidden box; on
// hover of the parent button (.nav-link / .more-dropdown-btn) the column slides
// up one line, so the first copy leaves upward and the second enters from below.
// The hover is triggered by the parent, so it stacks on the button's existing
// color hover. Styling lives in Header.css (.roll*).
function RollText({ text }) {
  return (
    <span className="roll">
      <span className="roll__col">
        <span className="roll__line">{text}</span>
        <span className="roll__line" aria-hidden="true">{text}</span>
      </span>
    </span>
  );
}

export default RollText;
