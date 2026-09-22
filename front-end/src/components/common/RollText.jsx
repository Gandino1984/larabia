// magazine-front/src/components/common/RollText.jsx
//
// Text with a "roll up" hover effect (replicated from ginivini.com's menu):
// inside an overflow-hidden box, the label slides up on hover while an identical
// copy (a ::after using data-label) enters from below. The hover is triggered by
// the parent button (.nav-link / .more-dropdown-btn), so it stacks on top of the
// button's existing color hover. Styling lives in Header.css (.roll*).
function RollText({ text }) {
  return (
    <span className="roll">
      <span className="roll__label" data-label={text}>{text}</span>
    </span>
  );
}

export default RollText;
