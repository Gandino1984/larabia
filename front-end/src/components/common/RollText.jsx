// magazine-front/src/components/common/RollText.jsx
//
// Text with a "roll up" hover effect (replicated from ginivini.com's menu):
// two identical copies inside an overflow-hidden box; the second sits one line
// below (absolute). On hover of the parent button (.nav-link / .more-dropdown-btn)
// both slide up one line, so the first leaves upward and the second enters from
// below. Combines with the button's existing color hover. Styling: Header.css.
function RollText({ text }) {
  return (
    <span className="roll">
      <span className="roll__line">{text}</span>
      <span className="roll__line" aria-hidden="true">{text}</span>
    </span>
  );
}

export default RollText;
