/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */
import { Profile, SocialMedia, Footer } from "@/sections";

const App = () => (
  <div className="w-full sm:max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center px-3 md:px-0">
    <div className="text-white justify-around min-h-screen flex gap-8 flex-col w-full py-8">
      <Profile />
      <SocialMedia />
      <Footer />
    </div>
  </div>
);

export default App;
