/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

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

export default Profile;
