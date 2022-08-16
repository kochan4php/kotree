import PropTypes from "prop-types";
import { RenderIfTrue, RenderIfFalse } from "@/utils";

const Button = ({ text, btncolor = "bg-gray-900", icon, ...another }) => (
  <button
    className={`btn ${btncolor} btn-block rounded-full text-lg capitalize ${
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
