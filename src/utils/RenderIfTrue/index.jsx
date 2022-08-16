/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import PropTypes from "prop-types";

const RenderIfTrue = ({ children, isTrue }) => (isTrue ? children : null);

RenderIfTrue.propTypes = {
  children: PropTypes.node.isRequired,
  isTrue: PropTypes.bool.isRequired,
};

export default RenderIfTrue;
