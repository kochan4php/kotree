/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import PropTypes from "prop-types";
import { RenderIfTrue, RenderIfFalse } from "@/utils";

const Button = ({ text, btncolor, icon, ...another }) => (
  <button
    className={`btn ${btncolor} btn-block transition-all duration-300 outline-transparent rounded-md outline-none text-lg capitalize !text-white ${
      icon ? "flex gap-2 items-center" : ""
    }`}
    {...another}
  >
    <RenderIfTrue isTrue={icon}>
      {icon}
      {text}
    </RenderIfTrue>
    <RenderIfFalse isFalse={icon}>{text}</RenderIfFalse>
  </button>
);

Button.propTypes = {
  text: PropTypes.string.isRequired,
  btncolor: PropTypes.string,
};

export default Button;
