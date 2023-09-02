/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import Footer from './sections/Footer';
import Profile from './sections/Profile';
import SocialMedia from './sections/SocialMedia';

export default function App() {
    return (
        <div className="w-full sm:max-w-xl mx-auto flex flex-col items-center justify-center px-3 md:px-0">
            <div className="text-white justify-around min-h-screen flex gap-10 flex-col w-full py-9">
                <Profile />
                <SocialMedia />
                <Footer />
            </div>
        </div>
    );
}
