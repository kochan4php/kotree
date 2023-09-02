/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import { ButtonProps } from '../interfaces';

const Button = ({ text, btncolor, icon, ...another }: ButtonProps) => (
    <button
        className={`btn ${btncolor} btn-block transition-all duration-300 outline-transparent rounded-md outline-none text-xl capitalize !text-white ${
            icon ? 'flex gap-2 items-center' : ''
        }`}
        {...another}
    >
        {icon ? (
            <>
                {icon}
                {text}
            </>
        ) : (
            <>{text}</>
        )}
    </button>
);

export default Button;
