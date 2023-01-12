/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */
import Fade from "react-reveal/Fade";
import { Profile, SocialMedia, Footer } from "@/sections";

const App = () => (
  <div className="w-full sm:max-w-xl mx-auto flex flex-col items-center justify-center px-3 md:px-0">
    <Fade left>
      <div className="text-white justify-around min-h-screen flex gap-10 flex-col w-full py-9">
        <Profile />
        <SocialMedia />
        <Footer />
      </div>
    </Fade>
  </div>
);

export default App;
