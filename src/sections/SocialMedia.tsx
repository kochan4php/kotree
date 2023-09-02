/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import Button from '../components/Button';
import Socmed from '../data';

export default function SocialMedia() {
    return (
        <div className="flex flex-col gap-4">
            {Socmed.map(({ text, path, btncolor, Icon }, idx) => (
                <Button
                    key={idx}
                    text={text}
                    icon={Icon ? <Icon size={22} /> : false}
                    btncolor={btncolor ?? null}
                    onClick={() => window.open(path, '_blank')}
                />
            ))}
        </div>
    );
}
