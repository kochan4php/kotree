/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */
import { Profile, SocialMedia } from "@/sections";

const App = () => (
  <div className="w-full sm:max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center px-3 md:px-0">
    <div className="text-white justify-evenly min-h-screen flex flex-col gap-1 w-full">
      <Profile />
      <SocialMedia />
    </div>
  </div>
);

export default App;
