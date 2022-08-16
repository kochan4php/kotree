/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import { Button } from "@/components";
import Socmed from "@/data/socmed";

const Profile = () => (
  <div className="flex flex-col items-center gap-8">
    <div className="avatar online">
      <div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
        <img
          src="/asuka.jpg"
          alt="avatar"
          className="object-cover object-center"
        />
      </div>
    </div>
    <h1 className="text-2xl font-bold">Deo Subarno</h1>
  </div>
);

const SocialMedia = () => (
  <div className="flex flex-col gap-5">
    {Socmed.map(({ text, path, btncolor, Icon }, idx) => (
      <Button
        key={idx}
        text={text}
        icon={Icon ? <Icon size={23} /> : false}
        btncolor={btncolor ?? null}
        onClick={() => window.open(path, "_blank")}
      />
    ))}
  </div>
);

const App = () => (
  <div className="w-full sm:max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center px-3 md:px-0">
    <div className="text-white justify-center min-h-screen flex flex-col gap-10 w-full">
      <Profile />
      <SocialMedia />
    </div>
  </div>
);

export default App;
