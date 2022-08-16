/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import PropTypes from "prop-types";

const RenderIfFalse = ({ children, isFalse }) => (isFalse ? null : children);

RenderIfFalse.propTypes = {
  children: PropTypes.node.isRequired,
  isFalse: PropTypes.bool.isRequired,
};

export default RenderIfFalse;
