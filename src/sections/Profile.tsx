/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import { BiServer } from 'react-icons/bi';

export default function Profile() {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="avatar">
                <div className="w-[124px] rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img src="https://avatars.githubusercontent.com/kochan4php" alt="avatar" className="object-cover object-center" />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-center mt-3">Deo Subarno</h1>
            <p className="text-md mt-2 font-medium text-center bg-slate-500 py-1 px-2 rounded-2xl flex gap-2 items-center">
                <span>
                    <BiServer size={20} />
                </span>
                <span>Junior Backend Engineer</span>
            </p>
        </div>
    );
}
