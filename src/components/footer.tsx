export default function Footer() {
  return (
    <div className="text-center mt-8 text-white/60 text-sm mb-2">
      <p>&copy; Copyright 2022 &#8211; {new Date().getFullYear()} Deo Subarno</p>
      <p className="mt-2">Made with ❤️ Built with Next.js & Tailwind CSS</p>
    </div>
  );
}
